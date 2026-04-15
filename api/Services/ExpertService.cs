using Dapper;
using Npgsql;
using PokeScanner.Api.Configuration;
using PokeScanner.Api.Models;
using PokeScanner.Api.Services.AiProviders;

namespace PokeScanner.Api.Services;

public sealed class ExpertService
{
    private const string SystemPrompt = """
        You are PokéExpert — a knowledgeable and friendly Pokémon TCG assistant.
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
        string question, Guid? sessionId, CancellationToken ct)
    {
        var correlationId = Guid.NewGuid();

        // Build collection context
        var collectionContext = await BuildCollectionContextAsync(ct);

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
        var sid = sessionId ?? await CreateSessionAsync(question, ct);
        await SaveMessageAsync(sid, "user", question, null, ct);
        await SaveMessageAsync(sid, "assistant", result.Answer!, result.UsedModel, ct);

        return (result.Answer, result.UsedModel, sid);
    }

    public async Task<ExpertSession[]> GetSessionsAsync(CancellationToken ct)
    {
        await using var conn = await _dataSource.OpenConnectionAsync(ct);
        var sessions = await conn.QueryAsync<ExpertSession>(
            "SELECT * FROM expert_sessions ORDER BY updated_at DESC LIMIT 20");
        return sessions.ToArray();
    }

    public async Task<ExpertMessage[]> GetSessionMessagesAsync(Guid sessionId, CancellationToken ct)
    {
        await using var conn = await _dataSource.OpenConnectionAsync(ct);
        var messages = await conn.QueryAsync<ExpertMessage>(
            "SELECT * FROM expert_messages WHERE session_id = @SessionId ORDER BY created_at",
            new { SessionId = sessionId });
        return messages.ToArray();
    }

    private async Task<string> BuildCollectionContextAsync(CancellationToken ct)
    {
        try
        {
            await using var conn = await _dataSource.OpenConnectionAsync(ct);
            var total = await conn.QuerySingleAsync<int>(
                "SELECT COALESCE(SUM(quantity), 0) FROM collection_cards");
            var unique = await conn.QuerySingleAsync<int>(
                "SELECT COUNT(DISTINCT tcgdex_card_id) FROM collection_cards");
            var recent = await conn.QueryAsync<dynamic>(
                "SELECT card_name, set_name, rarity FROM collection_cards ORDER BY added_at DESC LIMIT 10");

            var recentStr = string.Join("\n", recent.Select(r => $"- {r.card_name} ({r.set_name}, {r.rarity})"));
            return $"Total cards: {total}, Unique: {unique}\nRecent additions:\n{recentStr}";
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

    private async Task<Guid> CreateSessionAsync(string question, CancellationToken ct)
    {
        await using var conn = await _dataSource.OpenConnectionAsync(ct);
        var title = question.Length > 60 ? question[..60] + "…" : question;
        return await conn.QuerySingleAsync<Guid>(
            "INSERT INTO expert_sessions (title) VALUES (@Title) RETURNING id",
            new { Title = title });
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
