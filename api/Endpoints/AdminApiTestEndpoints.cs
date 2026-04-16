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

        return app;
    }

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

    private static async Task<Results<Ok<AdminExpertTestResult>, ProblemHttpResult>> TestExpert(
        AdminExpertTestRequest request,
        AiProviderChain aiChain,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Message))
            return TypedResults.Problem("Message is required.", statusCode: 400);

        var correlationId = Guid.NewGuid();
        var systemPrompt = "You are a Pokémon TCG expert. Answer the following question concisely.";
        var sw = System.Diagnostics.Stopwatch.StartNew();

        var response = await aiChain.ChatAsync(ExpertPriority, systemPrompt, request.Message, ct, correlationId);
        sw.Stop();

        return TypedResults.Ok(new AdminExpertTestResult(
            correlationId,
            response.Answer ?? "(no response)",
            response.ProviderName,
            (int)sw.ElapsedMilliseconds));
    }
}

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
