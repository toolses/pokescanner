using Microsoft.AspNetCore.Http.HttpResults;
using PokeScanner.Api.Models;
using PokeScanner.Api.Services;

namespace PokeScanner.Api.Endpoints;

public static class CardScanEndpoints
{
    private static readonly string[] AllowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
    private const long MaxImageBytes = 10 * 1024 * 1024; // 10 MB

    public static IEndpointRouteBuilder MapCardScanEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/cards/scan", ScanCard)
            .WithName("ScanCard")
            .WithSummary("Upload a card image, identify it via AI vision, and return TCGdex match candidates")
            .WithTags("Scan")
            .DisableAntiforgery();

        return app;
    }

    private static async Task<Results<Ok<ScanResponse>, ProblemHttpResult>> ScanCard(
        IFormFile image,
        CardScanService scanService,
        CardMatchingService matchingService,
        ILogger<Program> logger,
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
        logger.LogInformation("ScanCard: {FileName} ({ContentType}, {Bytes} bytes)",
            image.FileName, image.ContentType, image.Length);

        var scanResult = await scanService.ScanCardAsync(imageBytes, image.ContentType, ct, correlationId);

        if (scanResult is null)
            return TypedResults.Problem("Failed to analyze card image. Please try again.", statusCode: 502);

        var (exactMatch, candidates) = await matchingService.FindMatchesAsync(scanResult, ct);

        return TypedResults.Ok(new ScanResponse(scanResult, exactMatch, candidates));
    }
}
