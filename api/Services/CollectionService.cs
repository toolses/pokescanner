using Dapper;
using Npgsql;
using PokeScanner.Api.Models;

namespace PokeScanner.Api.Services;

public sealed class CollectionService
{
    private const string SelectJoin = """
        SELECT uc.id, uc.user_id, uc.tcgdex_card_id, c.card_name, c.set_id, c.set_name,
               c.local_id, c.rarity, c.card_image_url, c.category,
               uc.variant, uc.condition, uc.quantity, uc.notes, uc.scan_image_url,
               c.hp, c.types, c.illustrator, c.stage, c.evolve_from, c.description,
               uc.added_at
        FROM user_collection uc
        JOIN cards c ON c.tcgdex_card_id = uc.tcgdex_card_id
        """;

    private readonly NpgsqlDataSource _dataSource;
    private readonly TcgDexService _tcgDex;

    public CollectionService(NpgsqlDataSource dataSource, TcgDexService tcgDex)
    {
        _dataSource = dataSource;
        _tcgDex = tcgDex;
    }

    public async Task<IEnumerable<CollectionCard>> GetAllAsync(Guid userId, CancellationToken ct)
    {
        await using var conn = await _dataSource.OpenConnectionAsync(ct);
        return await conn.QueryAsync<CollectionCard>(
            $"{SelectJoin} WHERE uc.user_id = @UserId ORDER BY uc.added_at DESC",
            new { UserId = userId });
    }

    public async Task<CollectionCard?> GetByIdAsync(Guid id, Guid userId, CancellationToken ct)
    {
        await using var conn = await _dataSource.OpenConnectionAsync(ct);
        return await conn.QueryFirstOrDefaultAsync<CollectionCard>(
            $"{SelectJoin} WHERE uc.id = @Id AND uc.user_id = @UserId",
            new { Id = id, UserId = userId });
    }

    public async Task<CollectionCard> AddAsync(Guid userId, AddCollectionCardRequest req, CancellationToken ct)
    {
        await using var conn = await _dataSource.OpenConnectionAsync(ct);

        // Upsert into global cards table
        await conn.ExecuteAsync(
            """
            INSERT INTO cards
                (tcgdex_card_id, card_name, set_id, set_name, local_id, rarity,
                 card_image_url, category, hp, types, illustrator, stage, evolve_from, description)
            VALUES
                (@TcgdexCardId, @CardName, @SetId, @SetName, @LocalId, @Rarity,
                 @CardImageUrl, @Category, @Hp, @Types, @Illustrator, @Stage, @EvolveFrom, @Description)
            ON CONFLICT (tcgdex_card_id) DO UPDATE SET
                card_name     = COALESCE(NULLIF(EXCLUDED.card_name, ''), cards.card_name),
                card_image_url = COALESCE(EXCLUDED.card_image_url, cards.card_image_url),
                hp            = COALESCE(EXCLUDED.hp, cards.hp),
                types         = COALESCE(EXCLUDED.types, cards.types),
                illustrator   = COALESCE(EXCLUDED.illustrator, cards.illustrator),
                stage         = COALESCE(EXCLUDED.stage, cards.stage),
                evolve_from   = COALESCE(EXCLUDED.evolve_from, cards.evolve_from),
                description   = COALESCE(EXCLUDED.description, cards.description)
            """, req);

        // Insert user ownership row
        var id = await conn.QuerySingleAsync<Guid>(
            """
            INSERT INTO user_collection
                (user_id, tcgdex_card_id, variant, condition, quantity, notes, scan_image_url)
            VALUES
                (@UserId, @TcgdexCardId, @Variant, @Condition, @Quantity, @Notes, @ScanImageUrl)
            RETURNING id
            """,
            new { UserId = userId, req.TcgdexCardId, req.Variant, req.Condition, req.Quantity, req.Notes, req.ScanImageUrl });

        return (await conn.QueryFirstAsync<CollectionCard>(
            $"{SelectJoin} WHERE uc.id = @Id", new { Id = id }));
    }

    public async Task<bool> UpdateAsync(Guid id, Guid userId, UpdateCollectionCardRequest req, CancellationToken ct)
    {
        await using var conn = await _dataSource.OpenConnectionAsync(ct);
        var affected = await conn.ExecuteAsync(
            """
            UPDATE user_collection
            SET variant   = COALESCE(@Variant, variant),
                condition = COALESCE(@Condition, condition),
                quantity  = COALESCE(@Quantity, quantity),
                notes     = COALESCE(@Notes, notes)
            WHERE id = @Id AND user_id = @UserId
            """,
            new { Id = id, UserId = userId, req.Variant, req.Condition, req.Quantity, req.Notes });
        return affected > 0;
    }

    public async Task<bool> DeleteAsync(Guid id, Guid userId, CancellationToken ct)
    {
        await using var conn = await _dataSource.OpenConnectionAsync(ct);
        return await conn.ExecuteAsync(
            "DELETE FROM user_collection WHERE id = @Id AND user_id = @UserId",
            new { Id = id, UserId = userId }) > 0;
    }

    public async Task<CollectionStats> GetStatsAsync(Guid userId, CancellationToken ct)
    {
        await using var conn = await _dataSource.OpenConnectionAsync(ct);

        var totalCards = await conn.QuerySingleAsync<int>(
            "SELECT COALESCE(SUM(quantity), 0) FROM user_collection WHERE user_id = @UserId",
            new { UserId = userId });

        var uniqueCards = await conn.QuerySingleAsync<int>(
            "SELECT COUNT(DISTINCT tcgdex_card_id) FROM user_collection WHERE user_id = @UserId",
            new { UserId = userId });

        var totalSets = await conn.QuerySingleAsync<int>(
            """
            SELECT COUNT(DISTINCT c.set_id)
            FROM user_collection uc JOIN cards c ON c.tcgdex_card_id = uc.tcgdex_card_id
            WHERE uc.user_id = @UserId AND c.set_id IS NOT NULL
            """,
            new { UserId = userId });

        var allCards = (await conn.QueryAsync<CollectionCard>(
            $"{SelectJoin} WHERE uc.user_id = @UserId ORDER BY uc.added_at DESC",
            new { UserId = userId })).ToArray();

        var recent = allCards.Take(5).ToArray();

        var estimatedValue = await CalculateEstimatedValueAsync(allCards, ct);

        return new CollectionStats
        {
            TotalCards = totalCards,
            UniqueCards = uniqueCards,
            TotalSets = totalSets,
            EstimatedValue = estimatedValue,
            RecentAdditions = recent,
        };
    }

    private async Task<decimal> CalculateEstimatedValueAsync(
        CollectionCard[] cards, CancellationToken ct)
    {
        if (cards.Length == 0) return 0;

        var groups = cards
            .Where(c => !string.IsNullOrEmpty(c.TcgdexCardId))
            .GroupBy(c => c.TcgdexCardId)
            .ToArray();

        var total = 0m;
        var semaphore = new SemaphoreSlim(5);

        var tasks = groups.Select(async g =>
        {
            await semaphore.WaitAsync(ct);
            try
            {
                var detail = await _tcgDex.GetCardAsync(g.Key, ct);
                if (detail?.Pricing is null) return 0m;

                var unitPrice =
                    detail.Pricing.Cardmarket?.Avg
                    ?? detail.Pricing.Tcgplayer?.Normal?.MarketPrice
                    ?? 0m;

                var qty = g.Sum(c => c.Quantity);
                return unitPrice * qty;
            }
            catch
            {
                return 0m;
            }
            finally
            {
                semaphore.Release();
            }
        });

        var values = await Task.WhenAll(tasks);
        total = values.Sum();
        return Math.Round(total, 2);
    }
}
