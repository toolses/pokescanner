using Dapper;
using Npgsql;
using PokeScanner.Api.Models;

namespace PokeScanner.Api.Services;

public sealed class WishlistService
{
    private const string SelectJoin = """
        SELECT uw.id, uw.user_id, uw.tcgdex_card_id, c.card_name, c.set_id, c.set_name,
               c.local_id, c.rarity, c.card_image_url, c.set_logo, c.set_symbol,
               uw.priority, uw.notes, uw.added_at
        FROM user_wishlist uw
        JOIN cards c ON c.tcgdex_card_id = uw.tcgdex_card_id
        """;

    private readonly NpgsqlDataSource _dataSource;

    public WishlistService(NpgsqlDataSource dataSource) => _dataSource = dataSource;

    public async Task<IEnumerable<WishlistCard>> GetAllAsync(Guid userId, CancellationToken ct)
    {
        await using var conn = await _dataSource.OpenConnectionAsync(ct);
        return await conn.QueryAsync<WishlistCard>(
            $"{SelectJoin} WHERE uw.user_id = @UserId ORDER BY uw.priority DESC, uw.added_at DESC",
            new { UserId = userId });
    }

    public async Task<WishlistCard> AddAsync(Guid userId, AddWishlistCardRequest req, CancellationToken ct)
    {
        await using var conn = await _dataSource.OpenConnectionAsync(ct);

        // Upsert into global cards table
        await conn.ExecuteAsync(
            """
            INSERT INTO cards
                (tcgdex_card_id, card_name, set_id, set_name, local_id, rarity,
                 card_image_url, set_logo, set_symbol)
            VALUES
                (@TcgdexCardId, @CardName, @SetId, @SetName, @LocalId, @Rarity,
                 @CardImageUrl, @SetLogo, @SetSymbol)
            ON CONFLICT (tcgdex_card_id) DO UPDATE SET
                card_name      = COALESCE(NULLIF(EXCLUDED.card_name, ''), cards.card_name),
                card_image_url = COALESCE(EXCLUDED.card_image_url, cards.card_image_url),
                set_logo       = COALESCE(EXCLUDED.set_logo, cards.set_logo),
                set_symbol     = COALESCE(EXCLUDED.set_symbol, cards.set_symbol)
            """, req);

        // Insert user wishlist row
        var id = await conn.QuerySingleAsync<Guid>(
            """
            INSERT INTO user_wishlist
                (user_id, tcgdex_card_id, priority, notes)
            VALUES
                (@UserId, @TcgdexCardId, @Priority, @Notes)
            RETURNING id
            """,
            new { UserId = userId, req.TcgdexCardId, req.Priority, req.Notes });

        return (await conn.QueryFirstAsync<WishlistCard>(
            $"{SelectJoin} WHERE uw.id = @Id", new { Id = id }));
    }

    public async Task<bool> DeleteAsync(Guid id, Guid userId, CancellationToken ct)
    {
        await using var conn = await _dataSource.OpenConnectionAsync(ct);
        return await conn.ExecuteAsync(
            "DELETE FROM user_wishlist WHERE id = @Id AND user_id = @UserId",
            new { Id = id, UserId = userId }) > 0;
    }
}
