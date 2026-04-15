using System.Diagnostics;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using PokeScanner.Api.Configuration;
using PokeScanner.Api.Models;

namespace PokeScanner.Api.Services;

/// <summary>
/// Vision-based card scanning using Groq Llama 4 Scout.
/// Sends a card image to the vision model and extracts card identity.
/// </summary>
public sealed class CardScanService
{
    private const string GroqVisionModel = "meta-llama/llama-4-scout-17b-16e-instruct";

    private const string VisionPrompt = """
        You are a Pokémon Trading Card Game expert.
        Analyze this card image and extract the following information.
        Return ONLY raw JSON (no markdown formatting, no code fences).
        JSON structure:
        {
          "name": string,
          "setName": string or null,
          "setCode": string or null,
          "localId": string or null,
          "cardNumber": string or null,
          "hp": integer or null,
          "types": string[] or null,
          "rarity": string or null,
          "stage": string or null,
          "rawText": string
        }

        IMPORTANT RULES:
        - "name": The Pokémon's name exactly as printed on the card.
        - "setName": The set name if you can identify it from the set symbol or other clues.
        - "setCode": The 2-4 letter set abbreviation code printed on the card, usually found near the
          card number at the bottom (e.g. "MEW", "SIT", "PAL", "OBF", "PAR", "SFA", "TWM", "SVI",
          "CRZ", "LOR", "ASR", "BRS", "FST", "EVS", "CRE", "BST", "SHF", "VIV", "DAA", "RCL",
          "SSH", "CEC", "UNM", "UNB", "TEU", "LOT", "DRM", "CES", "FLI", "UPR", "CIN", "SLG",
          "BUS", "GRI", "SUM", "EVO", "STS", "FCO", "BKP", "BKT", "AOR", "ROS", "PRC", "PHF").
          Extract EXACTLY what is printed — do NOT convert or guess a TCGdex set ID.
          For older sets without a code, this may be null.
        - "localId": The card's number within the set. Look at the bottom of the card for
          a number like "166/165" — the localId is the part BEFORE the slash ("166").
          For promo or special cards it may be a code like "TG01" or "GG01". Include leading zeros if present.
        - "cardNumber": The full card number string as printed (e.g., "166/165").
        - "hp": The HP value as an integer.
        - "types": The Pokémon's type(s) (e.g., ["Fire"], ["Water", "Electric"]).
        - "rarity": The rarity symbol (Common, Uncommon, Rare, Rare Holo, etc.).
        - "stage": Basic, Stage 1, Stage 2, V, VMAX, ex, etc.
        - "rawText": ALL text you can read from the card, especially the bottom area near
          the card number, copyright line, and set abbreviation.

        PRIORITY: Getting "setCode" and "localId" correct is the MOST IMPORTANT task.
        Read the bottom of the card very carefully for the set abbreviation code.
        If you cannot determine a field, set it to null.
        """;

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly IntegrationSettings _settings;
    private readonly IApiUsageService _apiUsage;
    private readonly ILogger<CardScanService> _logger;

    public CardScanService(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        IntegrationSettings settings,
        IApiUsageService apiUsage,
        ILogger<CardScanService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _settings = settings;
        _apiUsage = apiUsage;
        _logger = logger;
    }

    public async Task<CardScanResult?> ScanCardAsync(
        byte[] imageBytes, string mimeType, CancellationToken ct, Guid? correlationId = null)
    {
        var apiKey = _configuration["GROQ_API_KEY"];
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            _logger.LogWarning("CardScanService: GROQ_API_KEY not configured");
            return null;
        }

        var baseUrl = _settings.Groq.BaseUrl.TrimEnd('/');

        var contentParts = new List<object>
        {
            new { type = "text", text = VisionPrompt },
            new
            {
                type = "image_url",
                image_url = new { url = $"data:{mimeType};base64,{Convert.ToBase64String(imageBytes)}" }
            }
        };

        var payload = new
        {
            model = GroqVisionModel,
            messages = new object[]
            {
                new
                {
                    role = "user",
                    content = contentParts.ToArray()
                }
            },
            temperature = 0.2,
            max_tokens = 1024
        };

        var client = _httpClientFactory.CreateClient("groq");
        var sw = Stopwatch.StartNew();

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl}/v1/chat/completions")
            {
                Content = JsonContent.Create(payload)
            };
            request.Headers.TryAddWithoutValidation("Authorization", $"Bearer {apiKey}");

            var response = await client.SendAsync(request, ct);
            sw.Stop();

            if (response.StatusCode is HttpStatusCode.TooManyRequests)
            {
                _ = _apiUsage.LogAsync("groq", "CardScan", 429, (int)sw.ElapsedMilliseconds, ct,
                    correlationId: correlationId, usedModel: "L4S");
                _logger.LogWarning("CardScanService: Groq 429 rate limited");
                return null;
            }

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(ct);
                _ = _apiUsage.LogAsync("groq", "CardScan", (int)response.StatusCode, (int)sw.ElapsedMilliseconds, ct,
                    responseBody: errorBody, correlationId: correlationId, usedModel: "L4S");
                _logger.LogWarning("CardScanService: Groq {Status}: {Body}", response.StatusCode, errorBody);
                return null;
            }

            var json = await response.Content.ReadAsStringAsync(ct);
            using var doc = JsonDocument.Parse(json);
            var text = doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString() ?? string.Empty;

            var totalTokens = doc.RootElement.TryGetProperty("usage", out var usage)
                && usage.TryGetProperty("total_tokens", out var tok)
                ? tok.GetInt32()
                : (int?)null;

            // Strip markdown code fences
            text = Regex.Replace(text.Trim(), @"^```(?:json)?\s*|\s*```$", "", RegexOptions.Multiline).Trim();

            _ = _apiUsage.LogAsync("groq", "CardScan", (int)response.StatusCode, (int)sw.ElapsedMilliseconds, ct,
                responseBody: text, correlationId: correlationId, usedModel: "L4S", totalTokensUsed: totalTokens);

            var extraction = JsonSerializer.Deserialize<CardScanResult>(
                text, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            _logger.LogInformation("CardScanService: extracted '{Name}' ({Ms}ms, {Tokens} tokens)",
                extraction?.Name, sw.ElapsedMilliseconds, totalTokens);

            return extraction;
        }
        catch (TaskCanceledException ex) when (!ct.IsCancellationRequested)
        {
            sw.Stop();
            _ = _apiUsage.LogAsync("groq", "CardScan", null, (int)sw.ElapsedMilliseconds, ct,
                correlationId: correlationId, usedModel: "L4S");
            _logger.LogWarning(ex, "CardScanService: Groq vision timed out");
            return null;
        }
        catch (Exception ex)
        {
            sw.Stop();
            _ = _apiUsage.LogAsync("groq", "CardScan", null, (int)sw.ElapsedMilliseconds, ct,
                correlationId: correlationId, usedModel: "L4S");
            _logger.LogWarning(ex, "CardScanService: Groq vision failed");
            return null;
        }
    }
}
