using System.Security.Claims;
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
            .WithTags("Stats")
            .RequireAuthorization();

        return app;
    }

    private static async Task<Ok<CollectionStats>> GetStats(
        ClaimsPrincipal user, CollectionService service, CancellationToken ct)
    {
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var stats = await service.GetStatsAsync(userId, ct);
        return TypedResults.Ok(stats);
    }
}
