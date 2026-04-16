using System.Diagnostics;
using Microsoft.AspNetCore.Http.HttpResults;
using PokeScanner.Api.Models;
using PokeScanner.Api.Services;
using PokeScanner.Api.Services.AiProviders;

namespace PokeScanner.Api.Endpoints;

public static class AdminApiTestEndpoints
{
    private static readonly string[] AllowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
    private const long MaxImageBytes = 10 * 1024 * 1024;
    private static readonly string[] ExpertPriority = ["groq", "deepseek"];

    public static IEndpointRouteBuilder MapAdminApiTestEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/admin/api-test")
            .WithTags("Admin")
            .RequireAuthorization("AdminOnly");

        group.MapPost("/scan", TestScan)
            .WithName("AdminTestScan")
            .WithSummary("Test the card scan pipeline — returns full AI result and correlation ID")
            .DisableAntiforgery();

        group.MapPost("/expert", TestExpert)
            .WithName("AdminTestExpert")
            .WithSummary("Test the expert chat — returns raw AI response and correlation ID");

        group.MapGet("/tcgdex/search", TestTcgDexSearch)
            .WithName("AdminTestTcgDexSearch")
            .WithSummary("Test TCGdex card search by name");

        group.MapGet("/tcgdex/card/{id}", TestTcgDexGetCard)
            .WithName("AdminTestTcgDexGetCard")
            .WithSummary("Test TCGdex get card by ID");

        group.MapPost("/ai/chat", TestAiChat)
            .WithName("AdminTestAiChat")
            .WithSummary("Test a specific AI provider with a custom prompt");

        group.MapGet("/ai/providers", GetAiProviders)
            .WithName("AdminGetAiProviders")
            .WithSummary("List available AI providers and their status");

        return app;
    }

    // ── Card Scan Pipeline ─────────────────────────────────────────────────

    private static async Task<Results<Ok<AdminScanTestResult>, ProblemHttpResult>> TestScan(
        IFormFile image,
        CardScanService scanService,
        CardMatchingService matchingService,
        CancellationToken ct)
    {
        if (image is null || image.Length == 0)
            return TypedResults.Problem("No image file provided", statusCode: 400);

        if (image.Length > MaxImageBytes)
            return TypedResults.Problem("Image too large (max 10 MB)", statusCode: 400);

        if (!AllowedMimeTypes.Contains(image.ContentType, StringComparer.OrdinalIgnoreCase))
            return TypedResults.Problem("Unsupported image type. Use JPEG, PNG, or WebP.", statusCode: 400);

        byte[] imageBytes;
        using (var ms = new MemoryStream((int)image.Length))
        {
            await image.CopyToAsync(ms, ct);
            imageBytes = ms.ToArray();
        }

        var correlationId = Guid.NewGuid();
        var scanResult = await scanService.ScanCardAsync(imageBytes, image.ContentType, ct, correlationId);

        if (scanResult is null)
            return TypedResults.Problem("Failed to analyze card image.", statusCode: 502);

        var (exactMatch, candidates) = await matchingService.FindMatchesAsync(scanResult, ct);

        return TypedResults.Ok(new AdminScanTestResult(correlationId, scanResult, exactMatch, candidates));
    }

    // ── Expert Chat (provider chain) ───────────────────────────────────────

    private static async Task<Results<Ok<AdminExpertTestResult>, ProblemHttpResult>> TestExpert(
        AdminExpertTestRequest request,
        AiProviderChain aiChain,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Message))
            return TypedResults.Problem("Message is required.", statusCode: 400);

        var correlationId = Guid.NewGuid();
        var systemPrompt = "You are a Pokémon TCG expert. Answer the following question concisely.";
        var sw = Stopwatch.StartNew();

        var response = await aiChain.ChatAsync(ExpertPriority, systemPrompt, request.Message, ct, correlationId);
        sw.Stop();

        return TypedResults.Ok(new AdminExpertTestResult(
            correlationId,
            response.Answer ?? "(no response)",
            response.ProviderName,
            (int)sw.ElapsedMilliseconds));
    }

    // ── TCGdex ─────────────────────────────────────────────────────────────

    private static async Task<Results<Ok<AdminTcgDexSearchResult>, ProblemHttpResult>> TestTcgDexSearch(
        string name,
        TcgDexService tcgDex,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(name))
            return TypedResults.Problem("name query parameter is required.", statusCode: 400);

        var sw = Stopwatch.StartNew();
        var cards = await tcgDex.SearchCardsAsync(name.Trim(), ct);
        sw.Stop();

        return TypedResults.Ok(new AdminTcgDexSearchResult(cards, cards.Length, (int)sw.ElapsedMilliseconds));
    }

    private static async Task<Results<Ok<AdminTcgDexCardResult>, ProblemHttpResult>> TestTcgDexGetCard(
        string id,
        TcgDexService tcgDex,
        CancellationToken ct)
    {
        var sw = Stopwatch.StartNew();
        var card = await tcgDex.GetCardAsync(id, ct);
        sw.Stop();

        if (card is null)
            return TypedResults.Problem($"Card '{id}' not found.", statusCode: 404);

        return TypedResults.Ok(new AdminTcgDexCardResult(card, (int)sw.ElapsedMilliseconds));
    }

    // ── Direct AI Provider ─────────────────────────────────────────────────

    private static async Task<Results<Ok<AdminAiChatResult>, ProblemHttpResult>> TestAiChat(
        AdminAiChatRequest request,
        IEnumerable<IAiChatProvider> providers,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Provider))
            return TypedResults.Problem("provider is required.", statusCode: 400);
        if (string.IsNullOrWhiteSpace(request.Message))
            return TypedResults.Problem("message is required.", statusCode: 400);

        var provider = providers.FirstOrDefault(
            p => p.Name.Equals(request.Provider, StringComparison.OrdinalIgnoreCase));

        if (provider is null)
            return TypedResults.Problem($"Unknown provider '{request.Provider}'.", statusCode: 400);
        if (!provider.IsAvailable)
            return TypedResults.Problem($"Provider '{provider.Name}' is not configured (missing API key).", statusCode: 400);

        var correlationId = Guid.NewGuid();
        var systemPrompt = request.SystemPrompt ?? "You are a helpful Pokémon TCG assistant. Be concise.";
        var sw = Stopwatch.StartNew();

        var result = await provider.ChatAsync(systemPrompt, request.Message, ct, correlationId);
        sw.Stop();

        return TypedResults.Ok(new AdminAiChatResult(
            correlationId,
            result.Answer ?? "(no response)",
            result.ProviderName,
            result.UsedModel,
            result.TotalTokensUsed,
            result.IsSuccess,
            (int)sw.ElapsedMilliseconds));
    }

    private static Ok<AdminAiProviderInfo[]> GetAiProviders(IEnumerable<IAiChatProvider> providers)
    {
        var infos = providers.Select(p => new AdminAiProviderInfo(p.Name, p.IsAvailable)).ToArray();
        return TypedResults.Ok(infos);
    }
}

// ── Response records ───────────────────────────────────────────────────────

public record AdminScanTestResult(
    Guid CorrelationId,
    CardScanResult AiResult,
    TcgDexCard? ExactMatch,
    TcgDexCardBrief[] Candidates);

public record AdminExpertTestRequest(string Message);

public record AdminExpertTestResult(
    Guid CorrelationId,
    string Response,
    string Provider,
    int DurationMs);

public record AdminTcgDexSearchResult(TcgDexCardBrief[] Cards, int Count, int DurationMs);
public record AdminTcgDexCardResult(TcgDexCard Card, int DurationMs);

public record AdminAiChatRequest(string Provider, string Message, string? SystemPrompt = null);
public record AdminAiChatResult(
    Guid CorrelationId,
    string Response,
    string Provider,
    string? Model,
    int? TokensUsed,
    bool Success,
    int DurationMs);

public record AdminAiProviderInfo(string Name, bool Available);
