using System.Security.Claims;
using Microsoft.AspNetCore.Http.HttpResults;
using PokeScanner.Api.Models;
using PokeScanner.Api.Services;

namespace PokeScanner.Api.Endpoints;

public static class CollectionEndpoints
{
    public static IEndpointRouteBuilder MapCollectionEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/collection")
            .WithTags("Collection")
            .RequireAuthorization();

        group.MapGet("/", GetCollection);
        group.MapGet("/{id:guid}", GetCollectionCard);
        group.MapPost("/", AddToCollection);
        group.MapPut("/{id:guid}", UpdateCollectionCard);
        group.MapDelete("/{id:guid}", DeleteCollectionCard);

        return app;
    }

    private static Guid GetUserId(ClaimsPrincipal user)
        => Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private static async Task<Ok<IEnumerable<CollectionCard>>> GetCollection(
        ClaimsPrincipal user, CollectionService service, CancellationToken ct)
    {
        var cards = await service.GetAllAsync(GetUserId(user), ct);
        return TypedResults.Ok(cards);
    }

    private static async Task<Results<Ok<CollectionCard>, NotFound>> GetCollectionCard(
        Guid id, ClaimsPrincipal user, CollectionService service, CancellationToken ct)
    {
        var card = await service.GetByIdAsync(id, GetUserId(user), ct);
        if (card is null) return TypedResults.NotFound();
        return TypedResults.Ok(card);
    }

    private static async Task<Created<CollectionCard>> AddToCollection(
        AddCollectionCardRequest req, ClaimsPrincipal user, CollectionService service, CancellationToken ct)
    {
        var card = await service.AddAsync(GetUserId(user), req, ct);
        return TypedResults.Created($"/api/collection/{card.Id}", card);
    }

    private static async Task<Results<Ok, NotFound>> UpdateCollectionCard(
        Guid id, UpdateCollectionCardRequest req, ClaimsPrincipal user, CollectionService service, CancellationToken ct)
    {
        var updated = await service.UpdateAsync(id, GetUserId(user), req, ct);
        if (!updated) return TypedResults.NotFound();
        return TypedResults.Ok();
    }

    private static async Task<Results<Ok, NotFound>> DeleteCollectionCard(
        Guid id, ClaimsPrincipal user, CollectionService service, CancellationToken ct)
    {
        var deleted = await service.DeleteAsync(id, GetUserId(user), ct);
        if (!deleted) return TypedResults.NotFound();
        return TypedResults.Ok();
    }
}
