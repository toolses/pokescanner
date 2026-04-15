using Microsoft.AspNetCore.Http.HttpResults;
using PokeScanner.Api.Models;
using PokeScanner.Api.Services;

namespace PokeScanner.Api.Endpoints;

public static class SetEndpoints
{
    public static IEndpointRouteBuilder MapSetEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/sets").WithTags("Sets");

        group.MapGet("/", GetSets)
            .WithName("GetSets")
            .WithSummary("List all TCGdex sets");

        group.MapGet("/{id}", GetSet)
            .WithName("GetSet")
            .WithSummary("Get a full set with all cards from TCGdex");

        group.MapGet("/series", GetSeries)
            .WithName("GetSeries")
            .WithSummary("List all TCGdex series");

        return app;
    }

    private static async Task<Ok<TcgDexSetBrief[]>> GetSets(
        TcgDexService tcgDex, CancellationToken ct)
    {
        var sets = await tcgDex.SearchSetsAsync(ct);
        return TypedResults.Ok(sets);
    }

    private static async Task<Results<Ok<TcgDexSet>, NotFound>> GetSet(
        string id, TcgDexService tcgDex, CancellationToken ct)
    {
        var set = await tcgDex.GetSetAsync(id, ct);
        if (set is null)
            return TypedResults.NotFound();

        return TypedResults.Ok(set);
    }

    private static async Task<Ok<TcgDexSerie[]>> GetSeries(
        TcgDexService tcgDex, CancellationToken ct)
    {
        var series = await tcgDex.GetSeriesAsync(ct);
        return TypedResults.Ok(series);
    }
}
