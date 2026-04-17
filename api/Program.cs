using System.Security.Claims;
using DbUp;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.HttpLogging;
using Microsoft.Extensions.Http.Resilience;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using Scalar.AspNetCore;
using PokeScanner.Api.Configuration;
using PokeScanner.Api.Endpoints;
using PokeScanner.Api.Services;
using PokeScanner.Api.Services.AiProviders;

// Dapper: map snake_case DB columns (e.g. tcgdex_card_id) to PascalCase C# props (TcgdexCardId).
Dapper.DefaultTypeMap.MatchNamesWithUnderscores = true;

// Npgsql 9.x maps timestamptz to DateTime (UTC) by default; enable legacy
// behaviour so Dapper can populate DateTimeOffset properties correctly.
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

// ── Integration settings ──────────────────────────────────────────────────────
var integrationSettings = builder.Configuration
    .GetSection(IntegrationSettings.SectionName)
    .Get<IntegrationSettings>() ?? new IntegrationSettings();
builder.Services.AddSingleton(integrationSettings);

// ── CORS ──────────────────────────────────────────────────────────────────────
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy
            .SetIsOriginAllowed(OriginPolicy.IsAllowed)
            .AllowAnyMethod()
            .AllowAnyHeader());
});

// ── OpenAPI ───────────────────────────────────────────────────────────────────
builder.Services.AddOpenApi();

// ── HTTP Logging ─────────────────────────────────────────────────────────────
builder.Services.AddHttpLogging(options =>
{
    options.LoggingFields = HttpLoggingFields.RequestMethod
                          | HttpLoggingFields.RequestPath
                          | HttpLoggingFields.ResponseStatusCode
                          | HttpLoggingFields.Duration;
});

// ── HTTP clients ──────────────────────────────────────────────────────────────
// DeepSeek: OpenAI-compatible API with resilience.
builder.Services.AddHttpClient("deepseek", client =>
    {
        client.Timeout = TimeSpan.FromSeconds(60);
    })
    .AddStandardResilienceHandler(opts =>
    {
        opts.Retry.MaxRetryAttempts          = 2;
        opts.AttemptTimeout.Timeout          = TimeSpan.FromSeconds(45);
        opts.TotalRequestTimeout.Timeout     = TimeSpan.FromSeconds(90);
        opts.CircuitBreaker.SamplingDuration  = TimeSpan.FromSeconds(120);
    });

// Groq: OpenAI-compatible API — NO auto-retry (429 → immediate fallback).
builder.Services.AddHttpClient("groq", client =>
    {
        client.Timeout = TimeSpan.FromSeconds(60);
    });

// TCGdex: free public API with resilience.
builder.Services.AddHttpClient("tcgdex", client =>
    {
        client.Timeout = TimeSpan.FromSeconds(15);
    })
    .AddStandardResilienceHandler(opts =>
    {
        opts.Retry.MaxRetryAttempts          = 2;
        opts.AttemptTimeout.Timeout          = TimeSpan.FromSeconds(15);
        opts.TotalRequestTimeout.Timeout     = TimeSpan.FromSeconds(30);
        opts.CircuitBreaker.SamplingDuration  = TimeSpan.FromSeconds(30);
    });

// ── Application services ──────────────────────────────────────────────────────
builder.Services.AddMemoryCache();

// AI providers
builder.Services.AddScoped<IAiChatProvider, GroqChatProvider>();
builder.Services.AddScoped<IAiChatProvider, DeepSeekChatProvider>();
builder.Services.AddScoped<AiProviderChain>();
builder.Services.AddSingleton<GroqTokenBudgetService>();

// Application services
builder.Services.AddScoped<IApiUsageService, ApiUsageService>();
builder.Services.AddScoped<CardScanService>();
builder.Services.AddScoped<TcgDexService>();
builder.Services.AddScoped<CardMatchingService>();
builder.Services.AddScoped<CollectionService>();
builder.Services.AddScoped<WishlistService>();
builder.Services.AddScoped<BinderService>();
builder.Services.AddScoped<ExpertService>();
builder.Services.AddScoped<UserProfileService>();

// ── Auth (Supabase JWT via JWKS) ─────────────────────────────────────────────
var supabaseUrl = builder.Configuration["SUPABASE_URL"] ?? string.Empty;

if (!string.IsNullOrWhiteSpace(supabaseUrl))
{
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.Authority        = $"{supabaseUrl}/auth/v1";
            options.MetadataAddress  = $"{supabaseUrl}/auth/v1/.well-known/openid-configuration";
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer           = true,
                ValidIssuer              = $"{supabaseUrl}/auth/v1",
                ValidateAudience         = true,
                ValidAudience            = "authenticated",
                ValidateLifetime         = true,
                ValidateIssuerSigningKey = true,
            };
        });
}
else
{
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer();
}

// ── Admin policy ─────────────────────────────────────────────────────────────
var adminUserIds = (builder.Configuration["ADMIN_USER_IDS"] ?? "")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
    .Where(s => Guid.TryParse(s, out _))
    .Select(s => Guid.Parse(s))
    .ToHashSet();

builder.Services.AddSingleton(new AdminSettings(adminUserIds));

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy =>
        policy.RequireAssertion(ctx =>
        {
            var sub = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier)
                   ?? ctx.User.FindFirstValue("sub");
            return sub is not null
                && Guid.TryParse(sub, out var uid)
                && adminUserIds.Contains(uid);
        }));
});

// ── Database ──────────────────────────────────────────────────────────────────
var connectionString = builder.Configuration["SUPABASE_CONNECTION_STRING"] ?? string.Empty;

if (!string.IsNullOrWhiteSpace(connectionString))
{
    var csBuilder = new NpgsqlConnectionStringBuilder(connectionString)
    {
        MaxPoolSize             = 10,
        MinPoolSize             = 1,
        ConnectionIdleLifetime  = 300,
        Timeout                 = 15,
        CommandTimeout          = 30,
    };
    builder.Services.AddNpgsqlDataSource(csBuilder.ConnectionString);
}
else
{
    builder.Services.AddNpgsqlDataSource("Host=localhost;Database=pokescanner_placeholder");
}

// ── Cloud host port binding (Railway / Render / etc.) ─────────────────────
var hostPort = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrEmpty(hostPort))
    builder.WebHost.UseUrls($"http://+:{hostPort}");

// ── Build ─────────────────────────────────────────────────────────────────────
var app = builder.Build();

// ── Database migrations (DbUp) ────────────────────────────────────────────────
if (!string.IsNullOrWhiteSpace(connectionString))
{
    var upgrader = DeployChanges.To
        .PostgresqlDatabase(connectionString)
        .WithScriptsEmbeddedInAssembly(typeof(Program).Assembly)
        .LogToConsole()
        .Build();

    var result = upgrader.PerformUpgrade();
    if (!result.Successful)
    {
        Console.ForegroundColor = ConsoleColor.Red;
        Console.WriteLine($"Database migration failed: {result.Error}");
        Console.ResetColor();
        return;
    }

    Console.ForegroundColor = ConsoleColor.Green;
    Console.WriteLine("Database migrations applied successfully.");
    Console.ResetColor();
}

// ── Middleware ────────────────────────────────────────────────────────────────
app.UseExceptionHandler(err => err.Run(async ctx =>
{
    var logger = ctx.RequestServices.GetRequiredService<ILogger<Program>>();
    var ex = ctx.Features.Get<IExceptionHandlerFeature>()?.Error;
    logger.LogError(ex, "Unhandled exception for {Method} {Path}", ctx.Request.Method, ctx.Request.Path);
    ctx.Response.StatusCode  = 500;
    ctx.Response.ContentType = "application/problem+json";
    await ctx.Response.WriteAsJsonAsync(new { detail = "An unexpected error occurred" });
}));

app.UseHttpLogging();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference(opt => opt.WithTitle("PokéScanner API"));
}

app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();

// ── Endpoints ─────────────────────────────────────────────────────────────────
app.MapHealthEndpoint();
app.MapAuthEndpoints();
app.MapCardScanEndpoints();
app.MapCardEndpoints();
app.MapSetEndpoints();
app.MapCollectionEndpoints();
app.MapWishlistEndpoints();
app.MapBinderEndpoints();
app.MapExpertEndpoints();
app.MapStatsEndpoints();
app.MapAdminAuthEndpoints();
app.MapAdminUsageEndpoints();
app.MapAdminTraceEndpoints();
app.MapAdminUserEndpoints();
app.MapAdminApiTestEndpoints();

app.Run();

// ── Helpers ───────────────────────────────────────────────────────────────────
static class OriginPolicy
{
    private static readonly string[] _extra = (
        Environment.GetEnvironmentVariable("CORS_ALLOWED_ORIGINS") ?? string.Empty)
        .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    public static bool IsAllowed(string origin)
    {
        if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri)) return false;
        return uri.Host is "localhost" or "127.0.0.1"
            || uri.Host.EndsWith(".vercel.app", StringComparison.OrdinalIgnoreCase)
            || _extra.Contains(uri.Host, StringComparer.OrdinalIgnoreCase);
    }
}
