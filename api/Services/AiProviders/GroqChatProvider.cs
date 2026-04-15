using System.Diagnostics;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using PokeScanner.Api.Configuration;

namespace PokeScanner.Api.Services.AiProviders;

/// <summary>
/// AI chat provider that calls the Groq API (OpenAI-compatible format).
/// Model: qwen/qwen3-32b (Expert Chat).
/// </summary>
public sealed class GroqChatProvider : IAiChatProvider
{
    public string Name => "Groq";

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly IApiUsageService _apiUsage;
    private readonly ILogger<GroqChatProvider> _logger;
    private readonly string _baseUrl;

    public GroqChatProvider(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        IApiUsageService apiUsage,
        ILogger<GroqChatProvider> logger,
        IntegrationSettings settings)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _apiUsage = apiUsage;
        _logger = logger;
        _baseUrl = settings.Groq.BaseUrl.TrimEnd('/');
    }

    public bool IsAvailable => !string.IsNullOrWhiteSpace(_configuration["GROQ_API_KEY"]);

    public async Task<AiChatResult> ChatAsync(
        string systemPrompt,
        string userContent,
        CancellationToken ct,
        Guid? correlationId = null)
    {
        var apiKey = _configuration["GROQ_API_KEY"];
        if (string.IsNullOrWhiteSpace(apiKey))
            return new AiChatResult(null, Name, false);

        var payload = new GroqRequest(
            Model: "qwen/qwen3-32b",
            Messages:
            [
                new("system", systemPrompt),
                new("user", userContent),
            ],
            Temperature: 0.5,
            MaxTokens: 2048
        );

        var client = _httpClientFactory.CreateClient("groq");

        HttpResponseMessage response;
        var sw = Stopwatch.StartNew();
        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}/v1/chat/completions")
            {
                Content = JsonContent.Create(payload, options: JsonOpts)
            };
            request.Headers.TryAddWithoutValidation("Authorization", $"Bearer {apiKey}");

            response = await client.SendAsync(request, ct);
            sw.Stop();
        }
        catch (TaskCanceledException ex) when (!ct.IsCancellationRequested)
        {
            sw.Stop();
            _ = _apiUsage.LogAsync("groq", "ExpertChat", null, (int)sw.ElapsedMilliseconds, ct,
                requestBody: userContent, correlationId: correlationId, usedModel: "Q3");
            _logger.LogWarning(ex, "GroqChatProvider: request timed out");
            return new AiChatResult(null, Name, false) { IsTransient = true, UsedModel = "Q3" };
        }
        catch (Exception ex)
        {
            sw.Stop();
            _ = _apiUsage.LogAsync("groq", "ExpertChat", null, (int)sw.ElapsedMilliseconds, ct,
                requestBody: userContent, correlationId: correlationId, usedModel: "Q3");
            _logger.LogWarning(ex, "GroqChatProvider: request failed");
            return new AiChatResult(null, Name, false) { IsTransient = true, UsedModel = "Q3" };
        }

        if (response.StatusCode is HttpStatusCode.TooManyRequests)
        {
            var body = await response.Content.ReadAsStringAsync(ct);
            _ = _apiUsage.LogAsync("groq", "ExpertChat", 429, (int)sw.ElapsedMilliseconds, ct,
                requestBody: userContent, responseBody: body, correlationId: correlationId, usedModel: "Q3");
            _logger.LogWarning("GroqChatProvider: 429 rate limited");
            return new AiChatResult(null, Name, false) { IsTransient = true, UsedModel = "Q3" };
        }

        if (response.StatusCode is HttpStatusCode.ServiceUnavailable
            or HttpStatusCode.GatewayTimeout
            or HttpStatusCode.BadGateway)
        {
            var body = await response.Content.ReadAsStringAsync(ct);
            _ = _apiUsage.LogAsync("groq", "ExpertChat", (int)response.StatusCode, (int)sw.ElapsedMilliseconds, ct,
                requestBody: userContent, responseBody: body, correlationId: correlationId, usedModel: "Q3");
            return new AiChatResult(null, Name, false) { IsTransient = true, UsedModel = "Q3" };
        }

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(ct);
            _ = _apiUsage.LogAsync("groq", "ExpertChat", (int)response.StatusCode, (int)sw.ElapsedMilliseconds, ct,
                requestBody: userContent, responseBody: body, correlationId: correlationId, usedModel: "Q3");
            return new AiChatResult(null, Name, false) { UsedModel = "Q3" };
        }

        try
        {
            var result = await response.Content.ReadFromJsonAsync<GroqResponse>(JsonOpts, ct);
            var text = result?.Choices?.FirstOrDefault()?.Message?.Content?.Trim();
            var totalTokens = result?.Usage?.TotalTokens;

            if (string.IsNullOrWhiteSpace(text))
                return new AiChatResult(null, Name, false) { UsedModel = "Q3", TotalTokensUsed = totalTokens };

            text = StripThinkingBlocks(text);

            _ = _apiUsage.LogAsync("groq", "ExpertChat", (int)response.StatusCode, (int)sw.ElapsedMilliseconds, ct,
                requestBody: userContent, responseBody: text, correlationId: correlationId,
                usedModel: "Q3", totalTokensUsed: totalTokens);

            _logger.LogInformation("GroqChatProvider: success ({Ms}ms, {Tokens} tokens)",
                sw.ElapsedMilliseconds, totalTokens);
            return new AiChatResult(text, Name, true) { UsedModel = "Q3", TotalTokensUsed = totalTokens };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GroqChatProvider: failed to parse response");
            return new AiChatResult(null, Name, false) { UsedModel = "Q3" };
        }
    }

    private static string StripThinkingBlocks(string text)
    {
        var result = Regex.Replace(text, @"<think>[\s\S]*?</think>", "", RegexOptions.IgnoreCase);
        return result.Trim();
    }

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    private record GroqRequest(
        string Model,
        GroqMessage[] Messages,
        double? Temperature = null,
        [property: JsonPropertyName("max_tokens")] int? MaxTokens = null);

    private record GroqMessage(string Role, string Content);
    private record GroqResponse(GroqChoice[]? Choices, GroqUsage? Usage);
    private record GroqChoice(GroqMessage? Message);
    private record GroqUsage([property: JsonPropertyName("total_tokens")] int? TotalTokens);
}
