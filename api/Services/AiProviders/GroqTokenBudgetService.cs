using Dapper;
using Npgsql;
using PokeScanner.Api.Configuration;

namespace PokeScanner.Api.Services.AiProviders;

/// <summary>
/// Tracks Groq token consumption in a 60-second sliding window using api_usage_logs.
/// When recent usage approaches the 6 000 TPM limit the chain can proactively skip Groq.
/// </summary>
public sealed class GroqTokenBudgetService
{
    private readonly NpgsqlDataSource _dataSource;
    private readonly int _budgetPerMinute;
    private readonly ILogger<GroqTokenBudgetService> _logger;

    public GroqTokenBudgetService(
        NpgsqlDataSource dataSource,
        IntegrationSettings settings,
        ILogger<GroqTokenBudgetService> logger)
    {
        _dataSource = dataSource;
        _budgetPerMinute = settings.AiFallback.GroqTokenBudgetPerMinute;
        _logger = logger;
    }

    public async Task<int> GetRemainingBudgetAsync(CancellationToken ct)
    {
        try
        {
            await using var conn = await _dataSource.OpenConnectionAsync(ct);
            var used = await conn.QuerySingleAsync<int>(
                """
                SELECT COALESCE(SUM(total_tokens_used), 0)
                FROM api_usage_logs
                WHERE provider = 'groq'
                  AND created_at > NOW() - INTERVAL '60 seconds'
                """);

            var remaining = _budgetPerMinute - used;
            if (remaining <= 0)
                _logger.LogInformation("GroqTokenBudget: exhausted ({Used}/{Budget})", used, _budgetPerMinute);

            return remaining;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "GroqTokenBudget: query failed, assuming available");
            return _budgetPerMinute;
        }
    }

    public async Task<bool> HasBudgetAsync(CancellationToken ct, int estimatedTokens = 3500)
        => await GetRemainingBudgetAsync(ct) >= estimatedTokens;
}
