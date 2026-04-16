using System.Security.Claims;
using PokeScanner.Api.Models;
using PokeScanner.Api.Services;

namespace PokeScanner.Api.Endpoints;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth")
            .WithTags("Auth");

        group.MapPost("/resolve-username", ResolveUsername)
            .WithName("ResolveUsername")
            .WithSummary("Resolve a username to an email for login")
            .AllowAnonymous();

        group.MapPost("/register-profile", RegisterProfile)
            .WithName("RegisterProfile")
            .WithSummary("Create user profile after Supabase signup")
            .RequireAuthorization();

        return app;
    }

    private static async Task<IResult> ResolveUsername(
        ResolveUsernameRequest request,
        UserProfileService profileService,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.UserName))
            return Results.BadRequest(new { detail = "Username is required." });

        var email = await profileService.ResolveUsernameAsync(request.UserName, ct);

        if (email is null)
            return Results.NotFound(new { detail = "Username not found." });

        return Results.Ok(new ResolveUsernameResponse(email));
    }

    private static async Task<IResult> RegisterProfile(
        RegisterProfileRequest request,
        ClaimsPrincipal user,
        UserProfileService profileService,
        CancellationToken ct)
    {
        var sub = user.FindFirstValue(ClaimTypes.NameIdentifier)
               ?? user.FindFirstValue("sub");

        if (sub is null || !Guid.TryParse(sub, out var userId))
            return Results.Unauthorized();

        if (string.IsNullOrWhiteSpace(request.UserName) || string.IsNullOrWhiteSpace(request.EmailAddress))
            return Results.BadRequest(new { detail = "Username and email are required." });

        await profileService.CreateProfileAsync(userId, request.UserName.Trim(), request.EmailAddress.Trim(), ct);

        return Results.Ok(new { success = true });
    }
}
