using System.Security.Claims;
using Microsoft.AspNetCore.Http.HttpResults;
using PokeScanner.Api.Models;
using PokeScanner.Api.Services;

namespace PokeScanner.Api.Endpoints;

public static class BinderEndpoints
{
    public static IEndpointRouteBuilder MapBinderEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/binders")
            .WithTags("Binders")
            .RequireAuthorization();

        group.MapGet("/", GetBinders);
        group.MapPost("/", CreateBinder);
        group.MapPut("/{id:guid}", UpdateBinder);
        group.MapDelete("/{id:guid}", DeleteBinder);
        group.MapGet("/{id:guid}/cards", GetBinderCards);
        group.MapPost("/{id:guid}/cards", AddBinderCards);
        group.MapDelete("/{id:guid}/cards/{cardId:guid}", RemoveBinderCard);

        return app;
    }

    private static Guid GetUserId(ClaimsPrincipal user)
        => Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private static async Task<Ok<IEnumerable<Binder>>> GetBinders(
        ClaimsPrincipal user, BinderService service, CancellationToken ct)
    {
        var binders = await service.GetBindersAsync(GetUserId(user), ct);
        return TypedResults.Ok(binders);
    }

    private static async Task<Created<Binder>> CreateBinder(
        CreateBinderRequest req, ClaimsPrincipal user, BinderService service, CancellationToken ct)
    {
        var binder = await service.CreateBinderAsync(GetUserId(user), req, ct);
        return TypedResults.Created($"/api/binders/{binder.Id}", binder);
    }

    private static async Task<Results<Ok<Binder>, NotFound>> UpdateBinder(
        Guid id, UpdateBinderRequest req, ClaimsPrincipal user, BinderService service, CancellationToken ct)
    {
        var binder = await service.UpdateBinderAsync(id, GetUserId(user), req, ct);
        if (binder is null) return TypedResults.NotFound();
        return TypedResults.Ok(binder);
    }

    private static async Task<Results<Ok, NotFound>> DeleteBinder(
        Guid id, ClaimsPrincipal user, BinderService service, CancellationToken ct)
    {
        var deleted = await service.DeleteBinderAsync(id, GetUserId(user), ct);
        if (!deleted) return TypedResults.NotFound();
        return TypedResults.Ok();
    }

    private static async Task<Ok<IEnumerable<BinderCard>>> GetBinderCards(
        Guid id, ClaimsPrincipal user, BinderService service, CancellationToken ct)
    {
        var cards = await service.GetBinderCardsAsync(id, GetUserId(user), ct);
        return TypedResults.Ok(cards);
    }

    private static async Task<Ok> AddBinderCards(
        Guid id, AddBinderCardsRequest req, ClaimsPrincipal user, BinderService service, CancellationToken ct)
    {
        await service.AddBinderCardsAsync(id, GetUserId(user), req.Cards, ct);
        return TypedResults.Ok();
    }

    private static async Task<Results<Ok, NotFound>> RemoveBinderCard(
        Guid id, Guid cardId, ClaimsPrincipal user, BinderService service, CancellationToken ct)
    {
        var deleted = await service.RemoveBinderCardAsync(id, cardId, GetUserId(user), ct);
        if (!deleted) return TypedResults.NotFound();
        return TypedResults.Ok();
    }
}
