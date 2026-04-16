using Dapper;
using Microsoft.AspNetCore.Http.HttpResults;
using Npgsql;

namespace PokeScanner.Api.Endpoints;

public static class AdminUserEndpoints
{
    public static IEndpointRouteBuilder MapAdminUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/admin/users")
            .WithTags("Admin")
            .RequireAuthorization("AdminOnly");

        group.MapGet("/", GetAllUsers)
            .WithName("GetAllUsers")
            .WithSummary("List all user profiles for admin management");

        group.MapPatch("/{id:guid}/admin", ToggleAdmin)
            .WithName("ToggleUserAdmin")
            .WithSummary("Toggle a user's admin status");

        return app;
    }

    private static async Task<Results<Ok<IEnumerable<AdminUserListItem>>, ProblemHttpResult>> GetAllUsers(
        string? search,
        NpgsqlDataSource dataSource,
        CancellationToken ct)
    {
        await using var conn = await dataSource.OpenConnectionAsync(ct);

        const string sql = """
            SELECT
                up.user_id                              AS Id,
                up.email_address                        AS Email,
                up.user_name                            AS DisplayName,
                up.is_admin                             AS IsAdmin,
                up.created_at                           AS CreatedAt
            FROM user_profiles up
            WHERE (@Search IS NULL
                   OR up.email_address ILIKE '%' || @Search || '%'
                   OR up.user_name     ILIKE '%' || @Search || '%')
            ORDER BY up.created_at DESC
            """;

        var rows = await conn.QueryAsync<AdminUserListItem>(sql, new { Search = search });
        return TypedResults.Ok(rows);
    }

    private static async Task<Results<Ok<AdminUserListItem>, ProblemHttpResult>> ToggleAdmin(
        Guid id,
        AdminToggleRequest request,
        NpgsqlDataSource dataSource,
        CancellationToken ct)
    {
        await using var conn = await dataSource.OpenConnectionAsync(ct);

        var affected = await conn.ExecuteAsync(
            """
            UPDATE user_profiles
            SET is_admin = @IsAdmin, updated_at = NOW()
            WHERE user_id = @Id
            """,
            new { IsAdmin = request.IsAdmin, Id = id });

        if (affected == 0)
            return TypedResults.Problem(detail: "User not found.", statusCode: 404);

        var updated = await conn.QuerySingleAsync<AdminUserListItem>(
            """
            SELECT
                up.user_id                              AS Id,
                up.email_address                        AS Email,
                up.user_name                            AS DisplayName,
                up.is_admin                             AS IsAdmin,
                up.created_at                           AS CreatedAt
            FROM user_profiles up
            WHERE up.user_id = @Id
            """,
            new { Id = id });

        return TypedResults.Ok(updated);
    }
}

public record AdminUserListItem(Guid Id, string Email, string DisplayName, bool IsAdmin, DateTime CreatedAt);
public record AdminToggleRequest(bool IsAdmin);
