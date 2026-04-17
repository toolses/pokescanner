using Dapper;
using Npgsql;
using PokeScanner.Api.Models;

namespace PokeScanner.Api.Services;

public sealed class BinderService
{
    private readonly NpgsqlDataSource _dataSource;

    public BinderService(NpgsqlDataSource dataSource)
    {
        _dataSource = dataSource;
    }

    public async Task<IEnumerable<Binder>> GetBindersAsync(Guid userId, CancellationToken ct)
    {
        await using var conn = await _dataSource.OpenConnectionAsync(ct);
        return await conn.QueryAsync<Binder>(
            """
            SELECT b.id, b.user_id, b.name, b.art_card_tcgdex_id, b.art_card_image_url,
                   b.created_at, COUNT(bc.id)::int AS card_count
            FROM user_binders b
            LEFT JOIN binder_cards bc ON bc.binder_id = b.id
            WHERE b.user_id = @UserId
            GROUP BY b.id
            ORDER BY b.created_at DESC
            """,
            new { UserId = userId });
    }

    public async Task<Binder?> GetBinderAsync(Guid id, Guid userId, CancellationToken ct)
    {
        await using var conn = await _dataSource.OpenConnectionAsync(ct);
        return await conn.QueryFirstOrDefaultAsync<Binder>(
            """
            SELECT b.id, b.user_id, b.name, b.art_card_tcgdex_id, b.art_card_image_url,
                   b.created_at, COUNT(bc.id)::int AS card_count
            FROM user_binders b
            LEFT JOIN binder_cards bc ON bc.binder_id = b.id
            WHERE b.id = @Id AND b.user_id = @UserId
            GROUP BY b.id
            """,
            new { Id = id, UserId = userId });
    }

    public async Task<Binder> CreateBinderAsync(Guid userId, CreateBinderRequest req, CancellationToken ct)
    {
        await using var conn = await _dataSource.OpenConnectionAsync(ct);
        var id = await conn.QuerySingleAsync<Guid>(
            """
            INSERT INTO user_binders (user_id, name, art_card_tcgdex_id, art_card_image_url)
            VALUES (@UserId, @Name, @ArtCardTcgdexId, @ArtCardImageUrl)
            RETURNING id
            """,
            new { UserId = userId, req.Name, req.ArtCardTcgdexId, req.ArtCardImageUrl });

        return (await GetBinderAsync(id, userId, ct))!;
    }

    public async Task<Binder?> UpdateBinderAsync(Guid id, Guid userId, UpdateBinderRequest req, CancellationToken ct)
    {
        await using var conn = await _dataSource.OpenConnectionAsync(ct);
        var rows = await conn.ExecuteAsync(
            """
            UPDATE user_binders
            SET name = @Name, art_card_tcgdex_id = @ArtCardTcgdexId, art_card_image_url = @ArtCardImageUrl
            WHERE id = @Id AND user_id = @UserId
            """,
            new { Id = id, UserId = userId, req.Name, req.ArtCardTcgdexId, req.ArtCardImageUrl });
        if (rows == 0) return null;
        return await GetBinderAsync(id, userId, ct);
    }

    public async Task<bool> DeleteBinderAsync(Guid id, Guid userId, CancellationToken ct)
    {
        await using var conn = await _dataSource.OpenConnectionAsync(ct);
        return await conn.ExecuteAsync(
            "DELETE FROM user_binders WHERE id = @Id AND user_id = @UserId",
            new { Id = id, UserId = userId }) > 0;
    }

    public async Task<IEnumerable<BinderCard>> GetBinderCardsAsync(Guid binderId, Guid userId, CancellationToken ct)
    {
        await using var conn = await _dataSource.OpenConnectionAsync(ct);
        var owns = await conn.QueryFirstOrDefaultAsync<bool?>(
            "SELECT TRUE FROM user_binders WHERE id = @BinderId AND user_id = @UserId",
            new { BinderId = binderId, UserId = userId });
        if (owns is not true) return [];

        return await conn.QueryAsync<BinderCard>(
            """
            SELECT id, binder_id, tcgdex_card_id, card_name, card_image_url, added_at
            FROM binder_cards
            WHERE binder_id = @BinderId
            ORDER BY added_at DESC
            """,
            new { BinderId = binderId });
    }

    public async Task AddBinderCardsAsync(Guid binderId, Guid userId, IEnumerable<BinderCardInput> cards, CancellationToken ct)
    {
        await using var conn = await _dataSource.OpenConnectionAsync(ct);
        var owns = await conn.QueryFirstOrDefaultAsync<bool?>(
            "SELECT TRUE FROM user_binders WHERE id = @BinderId AND user_id = @UserId",
            new { BinderId = binderId, UserId = userId });
        if (owns is not true) return;

        foreach (var card in cards)
        {
            await conn.ExecuteAsync(
                """
                INSERT INTO binder_cards (binder_id, tcgdex_card_id, card_name, card_image_url)
                VALUES (@BinderId, @TcgdexCardId, @CardName, @CardImageUrl)
                ON CONFLICT (binder_id, tcgdex_card_id) DO NOTHING
                """,
                new { BinderId = binderId, card.TcgdexCardId, card.CardName, card.CardImageUrl });
        }
    }

    public async Task<bool> RemoveBinderCardAsync(Guid binderId, Guid cardId, Guid userId, CancellationToken ct)
    {
        await using var conn = await _dataSource.OpenConnectionAsync(ct);
        return await conn.ExecuteAsync(
            """
            DELETE FROM binder_cards bc
            USING user_binders b
            WHERE bc.binder_id = b.id
              AND bc.id = @CardId
              AND b.id = @BinderId
              AND b.user_id = @UserId
            """,
            new { CardId = cardId, BinderId = binderId, UserId = userId }) > 0;
    }
}
