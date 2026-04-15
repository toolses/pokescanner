using Microsoft.AspNetCore.Http.HttpResults;
using PokeScanner.Api.Models;
using PokeScanner.Api.Services;

namespace PokeScanner.Api.Endpoints;

public static class CardEndpoints
{
    public static IEndpointRouteBuilder MapCardEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/cards").WithTags("Cards");

        group.MapGet("/search", SearchCards)
            .WithName("SearchCards")
            .WithSummary("Search TCGdex cards by name");

        group.MapGet("/{id}", GetCard)
            .WithName("GetCard")
            .WithSummary("Get a full card from TCGdex by ID");

        return app;
    }

    private static async Task<Ok<TcgDexCardBrief[]>> SearchCards(
        string name, TcgDexService tcgDex, CancellationToken ct)
    {
        var results = await tcgDex.SearchCardsAsync(name, ct);
        return TypedResults.Ok(results);
    }

    private static async Task<Results<Ok<TcgDexCard>, NotFound>> GetCard(
        string id, TcgDexService tcgDex, CancellationToken ct)
    {
        var card = await tcgDex.GetCardAsync(id, ct);
        if (card is null)
            return TypedResults.NotFound();

        return TypedResults.Ok(card);
    }
}
