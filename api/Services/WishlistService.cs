using Dapper;
using Npgsql;
using PokeScanner.Api.Models;

namespace PokeScanner.Api.Services;

public sealed class WishlistService
{
    private readonly NpgsqlDataSource _dataSource;

    public WishlistService(NpgsqlDataSource dataSource) => _dataSource = dataSource;

    public async Task<IEnumerable<WishlistCard>> GetAllAsync(CancellationToken ct)
    {
        await using var conn = await _dataSource.OpenConnectionAsync(ct);
        return await conn.QueryAsync<WishlistCard>(
            "SELECT * FROM wishlist_cards ORDER BY priority DESC, added_at DESC");
    }

    public async Task<WishlistCard> AddAsync(AddWishlistCardRequest req, CancellationToken ct)
    {
        await using var conn = await _dataSource.OpenConnectionAsync(ct);
        var id = await conn.QuerySingleAsync<Guid>(
            """
            INSERT INTO wishlist_cards
                (tcgdex_card_id, card_name, set_id, set_name, local_id, rarity,
                 card_image_url, set_logo, set_symbol, priority, notes)
            VALUES
                (@TcgdexCardId, @CardName, @SetId, @SetName, @LocalId, @Rarity,
                 @CardImageUrl, @SetLogo, @SetSymbol, @Priority, @Notes)
            RETURNING id
            """, req);

        return (await conn.QueryFirstAsync<WishlistCard>(
            "SELECT * FROM wishlist_cards WHERE id = @Id", new { Id = id }));
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken ct)
    {
        await using var conn = await _dataSource.OpenConnectionAsync(ct);
        return await conn.ExecuteAsync(
            "DELETE FROM wishlist_cards WHERE id = @Id", new { Id = id }) > 0;
    }
}
