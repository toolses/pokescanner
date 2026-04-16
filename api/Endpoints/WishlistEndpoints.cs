using System.Security.Claims;
using Microsoft.AspNetCore.Http.HttpResults;
using PokeScanner.Api.Models;
using PokeScanner.Api.Services;

namespace PokeScanner.Api.Endpoints;

public static class WishlistEndpoints
{
    public static IEndpointRouteBuilder MapWishlistEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/wishlist")
            .WithTags("Wishlist")
            .RequireAuthorization();

        group.MapGet("/", GetWishlist);
        group.MapPost("/", AddToWishlist);
        group.MapDelete("/{id:guid}", RemoveFromWishlist);

        return app;
    }

    private static Guid GetUserId(ClaimsPrincipal user)
        => Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private static async Task<Ok<IEnumerable<WishlistCard>>> GetWishlist(
        ClaimsPrincipal user, WishlistService service, CancellationToken ct)
    {
        var cards = await service.GetAllAsync(GetUserId(user), ct);
        return TypedResults.Ok(cards);
    }

    private static async Task<Created<WishlistCard>> AddToWishlist(
        AddWishlistCardRequest req, ClaimsPrincipal user, WishlistService service, CancellationToken ct)
    {
        var card = await service.AddAsync(GetUserId(user), req, ct);
        return TypedResults.Created($"/api/wishlist/{card.Id}", card);
    }

    private static async Task<Results<Ok, NotFound>> RemoveFromWishlist(
        Guid id, ClaimsPrincipal user, WishlistService service, CancellationToken ct)
    {
        var deleted = await service.DeleteAsync(id, GetUserId(user), ct);
        if (!deleted) return TypedResults.NotFound();
        return TypedResults.Ok();
    }
}
