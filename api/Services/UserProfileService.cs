using Dapper;
using Npgsql;
using PokeScanner.Api.Models;

namespace PokeScanner.Api.Services;

public class UserProfileService(NpgsqlDataSource dataSource)
{
    public async Task<UserProfile?> GetByUserIdAsync(Guid userId, CancellationToken ct = default)
    {
        await using var conn = await dataSource.OpenConnectionAsync(ct);
        return await conn.QuerySingleOrDefaultAsync<UserProfile>(
            "SELECT * FROM user_profiles WHERE user_id = @UserId",
            new { UserId = userId });
    }

    public async Task<string?> ResolveUsernameAsync(string userName, CancellationToken ct = default)
    {
        await using var conn = await dataSource.OpenConnectionAsync(ct);
        return await conn.QuerySingleOrDefaultAsync<string>(
            "SELECT email_address FROM user_profiles WHERE LOWER(user_name) = LOWER(@UserName)",
            new { UserName = userName });
    }

    public async Task CreateProfileAsync(Guid userId, string userName, string emailAddress, CancellationToken ct = default)
    {
        await using var conn = await dataSource.OpenConnectionAsync(ct);
        await conn.ExecuteAsync(
            """
            INSERT INTO user_profiles (user_id, user_name, email_address)
            VALUES (@UserId, @UserName, @EmailAddress)
            ON CONFLICT (user_id) DO NOTHING
            """,
            new { UserId = userId, UserName = userName, EmailAddress = emailAddress });
    }
}
