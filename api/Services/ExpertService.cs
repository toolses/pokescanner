using Dapper;
using Npgsql;
using PokeScanner.Api.Configuration;
using PokeScanner.Api.Models;
using PokeScanner.Api.Services.AiProviders;

namespace PokeScanner.Api.Services;

public sealed class ExpertService
{
    private const string SystemPrompt = """
        You are PokéTrainer — a knowledgeable and friendly Pokémon TCG assistant.
        Today's date is {DATE}.

        You help users with:
        - Card values and price trends
        - Deck building advice and meta analysis
        - Set information and card identification
        - Collecting strategies and investment tips
        - Trading advice

        Rules:
        - Be friendly, concise, and knowledgeable.
        - When discussing card values, mention that prices fluctuate and suggest checking current market prices.
        - If you suggest specific cards, explain WHY they're worth considering.
        - If you don't know something, say so honestly.
        - Format your responses with markdown for readability.
        - IMPORTANT — POKECARDS line: Whenever your response mentions any Pokémon by name — including when discussing specific cards, sets, or answering questions about whether a Pokémon appears in a set — you MUST append this as the absolute last line (nothing after it, no trailing text or punctuation):
          POKECARDS:PokemonName1|PokemonName2|PokemonName3
          Use the Pokémon's exact name (e.g. Pikachu, Bulbasaur, Charizard). Include every Pokémon you name, up to a maximum of 8. If your response mentions no Pokémon names at all, omit this line entirely.

        User's collection context (if available):
        {COLLECTION_CONTEXT}
        """;

    private readonly AiProviderChain _aiChain;
    private readonly IntegrationSettings _settings;
    private readonly NpgsqlDataSource _dataSource;
    private readonly ILogger<ExpertService> _logger;

    public ExpertService(
        AiProviderChain aiChain,
        IntegrationSettings settings,
        NpgsqlDataSource dataSource,
        ILogger<ExpertService> logger)
    {
        _aiChain = aiChain;
        _settings = settings;
        _dataSource = dataSource;
        _logger = logger;
    }

    public async Task<(string? Answer, string? ModelUsed, Guid? SessionId)> AskAsync(
        Guid userId, string question, Guid? sessionId, CancellationToken ct)
    {
        var correlationId = Guid.NewGuid();

        // Build collection context
        var collectionContext = await BuildCollectionContextAsync(userId, ct);

        var systemPrompt = SystemPrompt
            .Replace("{DATE}", DateTime.UtcNow.ToString("yyyy-MM-dd"))
            .Replace("{COLLECTION_CONTEXT}", collectionContext);

        // Get conversation history if session exists
        var conversationContext = question;
        if (sessionId.HasValue)
        {
            var history = await GetSessionHistoryAsync(sessionId.Value, ct);
            if (history.Length > 0)
                conversationContext = $"Previous conversation:\n{history}\n\nNew question: {question}";
        }

        var result = await _aiChain.ChatAsync(
            _settings.AiFallback.ExpertChatPriority,
            systemPrompt,
            conversationContext,
            ct,
            correlationId);

        if (!result.IsSuccess)
        {
            _logger.LogWarning("ExpertService: all providers failed for question");
            return (null, null, null);
        }

        // Create or update session
        var sid = sessionId ?? await CreateSessionAsync(userId, question, ct);
        await SaveMessageAsync(sid, "user", question, null, ct);
        await SaveMessageAsync(sid, "assistant", result.Answer!, result.UsedModel, ct);

        return (result.Answer, result.UsedModel, sid);
    }

    public async Task<ExpertSession[]> GetSessionsAsync(Guid userId, CancellationToken ct)
    {
        await using var conn = await _dataSource.OpenConnectionAsync(ct);
        var sessions = await conn.QueryAsync<ExpertSession>(
            "SELECT * FROM expert_sessions WHERE user_id = @UserId ORDER BY updated_at DESC LIMIT 20",
            new { UserId = userId });
        return sessions.ToArray();
    }

    public async Task<ExpertMessage[]> GetSessionMessagesAsync(Guid sessionId, Guid userId, CancellationToken ct)
    {
        await using var conn = await _dataSource.OpenConnectionAsync(ct);
        var messages = await conn.QueryAsync<ExpertMessage>(
            """
            SELECT em.* FROM expert_messages em
            JOIN expert_sessions es ON es.id = em.session_id
            WHERE em.session_id = @SessionId AND es.user_id = @UserId
            ORDER BY em.created_at
            """,
            new { SessionId = sessionId, UserId = userId });
        return messages.ToArray();
    }

    private async Task<string> BuildCollectionContextAsync(Guid userId, CancellationToken ct)
    {
        try
        {
            await using var conn = await _dataSource.OpenConnectionAsync(ct);
            var total = await conn.QuerySingleAsync<int>(
                "SELECT COALESCE(SUM(quantity), 0) FROM user_collection WHERE user_id = @UserId",
                new { UserId = userId });
            var unique = await conn.QuerySingleAsync<int>(
                "SELECT COUNT(DISTINCT tcgdex_card_id) FROM user_collection WHERE user_id = @UserId",
                new { UserId = userId });
            var allCards = await conn.QueryAsync<dynamic>(
                """
                SELECT c.card_name, c.set_name, c.rarity, uc.quantity, uc.condition
                FROM user_collection uc
                JOIN cards c ON c.tcgdex_card_id = uc.tcgdex_card_id
                WHERE uc.user_id = @UserId
                ORDER BY c.card_name
                """,
                new { UserId = userId });

            var cardLines = allCards.Select(r =>
                $"- {r.card_name} ({r.set_name}, {r.rarity}, {r.condition}, qty: {r.quantity})");
            var cardStr = string.Join("\n", cardLines);
            return $"Total cards: {total}, Unique: {unique}\nFull collection:\n{cardStr}";
        }
        catch
        {
            return "No collection data available.";
        }
    }

    private async Task<string> GetSessionHistoryAsync(Guid sessionId, CancellationToken ct)
    {
        await using var conn = await _dataSource.OpenConnectionAsync(ct);
        var messages = await conn.QueryAsync<ExpertMessage>(
            """
            SELECT * FROM expert_messages
            WHERE session_id = @SessionId
            ORDER BY created_at DESC LIMIT 10
            """,
            new { SessionId = sessionId });

        return string.Join("\n", messages.Reverse().Select(m => $"{m.Role}: {m.Content}"));
    }

    private async Task<Guid> CreateSessionAsync(Guid userId, string question, CancellationToken ct)
    {
        await using var conn = await _dataSource.OpenConnectionAsync(ct);
        var title = question.Length > 60 ? question[..60] + "…" : question;
        return await conn.QuerySingleAsync<Guid>(
            "INSERT INTO expert_sessions (title, user_id) VALUES (@Title, @UserId) RETURNING id",
            new { Title = title, UserId = userId });
    }

    private async Task SaveMessageAsync(Guid sessionId, string role, string content, string? modelUsed, CancellationToken ct)
    {
        await using var conn = await _dataSource.OpenConnectionAsync(ct);
        await conn.ExecuteAsync(
            """
            INSERT INTO expert_messages (session_id, role, content, model_used)
            VALUES (@SessionId, @Role, @Content, @ModelUsed)
            """,
            new { SessionId = sessionId, Role = role, Content = content, ModelUsed = modelUsed });

        await conn.ExecuteAsync(
            "UPDATE expert_sessions SET updated_at = NOW() WHERE id = @Id",
            new { Id = sessionId });
    }
}
