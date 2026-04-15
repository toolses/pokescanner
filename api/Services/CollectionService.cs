using Dapper;
using Npgsql;
using PokeScanner.Api.Models;

namespace PokeScanner.Api.Services;

public sealed class CollectionService
{
    private readonly NpgsqlDataSource _dataSource;

    public CollectionService(NpgsqlDataSource dataSource) => _dataSource = dataSource;

    public async Task<IEnumerable<CollectionCard>> GetAllAsync(CancellationToken ct)
    {
        await using var conn = await _dataSource.OpenConnectionAsync(ct);
        return await conn.QueryAsync<CollectionCard>(
            "SELECT * FROM collection_cards ORDER BY added_at DESC");
    }

    public async Task<CollectionCard?> GetByIdAsync(Guid id, CancellationToken ct)
    {
        await using var conn = await _dataSource.OpenConnectionAsync(ct);
        return await conn.QueryFirstOrDefaultAsync<CollectionCard>(
            "SELECT * FROM collection_cards WHERE id = @Id", new { Id = id });
    }

    public async Task<CollectionCard> AddAsync(AddCollectionCardRequest req, CancellationToken ct)
    {
        await using var conn = await _dataSource.OpenConnectionAsync(ct);
        var id = await conn.QuerySingleAsync<Guid>(
            """
            INSERT INTO collection_cards
                (tcgdex_card_id, card_name, set_id, set_name, local_id, rarity,
                 card_image_url, category, variant, condition, quantity, notes, scan_image_url,
                 hp, types, illustrator, stage, evolve_from, description)
            VALUES
                (@TcgdexCardId, @CardName, @SetId, @SetName, @LocalId, @Rarity,
                 @CardImageUrl, @Category, @Variant, @Condition, @Quantity, @Notes, @ScanImageUrl,
                 @Hp, @Types, @Illustrator, @Stage, @EvolveFrom, @Description)
            RETURNING id
            """, req);

        return (await conn.QueryFirstAsync<CollectionCard>(
            "SELECT * FROM collection_cards WHERE id = @Id", new { Id = id }));
    }

    public async Task<bool> UpdateAsync(Guid id, UpdateCollectionCardRequest req, CancellationToken ct)
    {
        await using var conn = await _dataSource.OpenConnectionAsync(ct);
        var affected = await conn.ExecuteAsync(
            """
            UPDATE collection_cards
            SET variant   = COALESCE(@Variant, variant),
                condition = COALESCE(@Condition, condition),
                quantity  = COALESCE(@Quantity, quantity),
                notes     = COALESCE(@Notes, notes)
            WHERE id = @Id
            """,
            new { Id = id, req.Variant, req.Condition, req.Quantity, req.Notes });
        return affected > 0;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken ct)
    {
        await using var conn = await _dataSource.OpenConnectionAsync(ct);
        return await conn.ExecuteAsync(
            "DELETE FROM collection_cards WHERE id = @Id", new { Id = id }) > 0;
    }

    public async Task<CollectionStats> GetStatsAsync(CancellationToken ct)
    {
        await using var conn = await _dataSource.OpenConnectionAsync(ct);

        var totalCards = await conn.QuerySingleAsync<int>(
            "SELECT COALESCE(SUM(quantity), 0) FROM collection_cards");

        var uniqueCards = await conn.QuerySingleAsync<int>(
            "SELECT COUNT(DISTINCT tcgdex_card_id) FROM collection_cards");

        var totalSets = await conn.QuerySingleAsync<int>(
            "SELECT COUNT(DISTINCT set_id) FROM collection_cards WHERE set_id IS NOT NULL");

        var recent = await conn.QueryAsync<CollectionCard>(
            "SELECT * FROM collection_cards ORDER BY added_at DESC LIMIT 5");

        return new CollectionStats
        {
            TotalCards = totalCards,
            UniqueCards = uniqueCards,
            TotalSets = totalSets,
            EstimatedValue = 0, // TODO: calculate from price_cache
            RecentAdditions = recent.ToArray(),
        };
    }
}
