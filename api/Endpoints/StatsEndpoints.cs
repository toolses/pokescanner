using Microsoft.AspNetCore.Http.HttpResults;
using PokeScanner.Api.Models;
using PokeScanner.Api.Services;

namespace PokeScanner.Api.Endpoints;

public static class StatsEndpoints
{
    public static IEndpointRouteBuilder MapStatsEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/stats", GetStats)
            .WithName("GetCollectionStats")
            .WithTags("Stats");

        return app;
    }

    private static async Task<Ok<CollectionStats>> GetStats(
        CollectionService service, CancellationToken ct)
    {
        var stats = await service.GetStatsAsync(ct);
        return TypedResults.Ok(stats);
    }
}
