using Dapper;
using Npgsql;

namespace PokeScanner.Api.Services;

public interface IApiUsageService
{
    Task LogAsync(
        string provider,
        string endpoint,
        int?   statusCode,
        int    responseTimeMs,
        CancellationToken ct,
        string? requestBody     = null,
        string? responseBody    = null,
        Guid?   correlationId   = null,
        string? usedModel       = null,
        int?    totalTokensUsed = null);
}

public sealed class ApiUsageService : IApiUsageService
{
    private const int MaxBodyLength = 4000;

    private readonly NpgsqlDataSource _dataSource;
    private readonly ILogger<ApiUsageService> _logger;

    public ApiUsageService(NpgsqlDataSource dataSource, ILogger<ApiUsageService> logger)
    {
        _dataSource = dataSource;
        _logger = logger;
    }

    public async Task LogAsync(
        string provider, string endpoint, int? statusCode, int responseTimeMs,
        CancellationToken ct,
        string? requestBody = null, string? responseBody = null,
        Guid? correlationId = null, string? usedModel = null, int? totalTokensUsed = null)
    {
        try
        {
            await using var conn = await _dataSource.OpenConnectionAsync(ct);
            await conn.ExecuteAsync(
                """
                INSERT INTO api_usage_logs
                    (provider, endpoint, status_code, response_time_ms,
                     request_body, response_body, correlation_id,
                     used_model, total_tokens_used)
                VALUES
                    (@Provider, @Endpoint, @StatusCode, @ResponseTimeMs,
                     @RequestBody, @ResponseBody, @CorrelationId,
                     @UsedModel, @TotalTokensUsed)
                """,
                new
                {
                    Provider        = provider,
                    Endpoint        = endpoint,
                    StatusCode      = statusCode,
                    ResponseTimeMs  = responseTimeMs,
                    RequestBody     = Truncate(requestBody),
                    ResponseBody    = Truncate(responseBody),
                    CorrelationId   = correlationId,
                    UsedModel       = usedModel,
                    TotalTokensUsed = totalTokensUsed,
                });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "ApiUsageService: failed to log {Provider} call", provider);
        }
    }

    private static string? Truncate(string? value)
        => value is not null && value.Length > MaxBodyLength
            ? value[..MaxBodyLength] + "…[truncated]"
            : value;
}
