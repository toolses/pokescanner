using System.Net.Http.Json;
using System.Text.Json;
using PokeScanner.Api.Configuration;
using PokeScanner.Api.Models;

namespace PokeScanner.Api.Services;

/// <summary>
/// REST client for the TCGdex API (https://api.tcgdex.net/v2/en/).
/// </summary>
public sealed class TcgDexService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly string _baseUrl;
    private readonly ILogger<TcgDexService> _logger;

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    public TcgDexService(
        IHttpClientFactory httpClientFactory,
        IntegrationSettings settings,
        ILogger<TcgDexService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _baseUrl = settings.TcgDex.BaseUrl.TrimEnd('/');
        _logger = logger;
    }

    public async Task<TcgDexCardBrief[]> SearchCardsAsync(string name, CancellationToken ct)
    {
        var client = _httpClientFactory.CreateClient("tcgdex");
        var url = $"{_baseUrl}/cards?name={Uri.EscapeDataString(name)}";

        try
        {
            var result = await client.GetFromJsonAsync<TcgDexCardBrief[]>(url, JsonOpts, ct);
            return result ?? [];
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "TcgDexService: SearchCards failed for '{Name}'", name);
            return [];
        }
    }

    /// <summary>
    /// Search cards with name + localId filters for more precise matching.
    /// Uses TCGdex filtering: /cards?name={name}&localId={localId}
    /// </summary>
    public async Task<TcgDexCardBrief[]> SearchCardsFilteredAsync(
        string name, string localId, CancellationToken ct)
    {
        var client = _httpClientFactory.CreateClient("tcgdex");
        var url = $"{_baseUrl}/cards?name={Uri.EscapeDataString(name)}&localId=eq:{Uri.EscapeDataString(localId)}";

        try
        {
            var result = await client.GetFromJsonAsync<TcgDexCardBrief[]>(url, JsonOpts, ct);
            return result ?? [];
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "TcgDexService: SearchCardsFiltered failed for '{Name}' localId={LocalId}",
                name, localId);
            return [];
        }
    }

    public async Task<TcgDexCard?> GetCardAsync(string id, CancellationToken ct)
    {
        var client = _httpClientFactory.CreateClient("tcgdex");
        var url = $"{_baseUrl}/cards/{Uri.EscapeDataString(id)}";

        try
        {
            return await client.GetFromJsonAsync<TcgDexCard>(url, JsonOpts, ct);
        }
        catch (HttpRequestException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "TcgDexService: GetCard failed for '{Id}'", id);
            return null;
        }
    }

    public async Task<TcgDexCard?> GetSetCardAsync(string setId, string localId, CancellationToken ct)
    {
        var client = _httpClientFactory.CreateClient("tcgdex");
        var url = $"{_baseUrl}/sets/{Uri.EscapeDataString(setId)}/{Uri.EscapeDataString(localId)}";

        try
        {
            return await client.GetFromJsonAsync<TcgDexCard>(url, JsonOpts, ct);
        }
        catch (HttpRequestException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "TcgDexService: GetSetCard failed for '{SetId}/{LocalId}'", setId, localId);
            return null;
        }
    }

    /// <summary>
    /// Lightweight check if a set exists by ID. Returns brief info or null.
    /// </summary>
    public async Task<TcgDexSetBrief?> GetSetInfoAsync(string setId, CancellationToken ct)
    {
        var client = _httpClientFactory.CreateClient("tcgdex");
        var url = $"{_baseUrl}/sets/{Uri.EscapeDataString(setId)}";

        try
        {
            return await client.GetFromJsonAsync<TcgDexSetBrief>(url, JsonOpts, ct);
        }
        catch (HttpRequestException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "TcgDexService: GetSetInfo failed for '{SetId}'", setId);
            return null;
        }
    }

    public async Task<TcgDexSetBrief[]> SearchSetsAsync(CancellationToken ct)
    {
        var client = _httpClientFactory.CreateClient("tcgdex");
        var url = $"{_baseUrl}/sets";

        try
        {
            return await client.GetFromJsonAsync<TcgDexSetBrief[]>(url, JsonOpts, ct) ?? [];
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "TcgDexService: SearchSets failed");
            return [];
        }
    }

    public async Task<TcgDexSet?> GetSetAsync(string id, CancellationToken ct)
    {
        var client = _httpClientFactory.CreateClient("tcgdex");
        var url = $"{_baseUrl}/sets/{Uri.EscapeDataString(id)}";

        try
        {
            return await client.GetFromJsonAsync<TcgDexSet>(url, JsonOpts, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "TcgDexService: GetSet failed for '{Id}'", id);
            return null;
        }
    }

    public async Task<TcgDexSerie[]> GetSeriesAsync(CancellationToken ct)
    {
        var client = _httpClientFactory.CreateClient("tcgdex");
        var url = $"{_baseUrl}/series";

        try
        {
            return await client.GetFromJsonAsync<TcgDexSerie[]>(url, JsonOpts, ct) ?? [];
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "TcgDexService: GetSeries failed");
            return [];
        }
    }

    public async Task<TcgDexSerie?> GetSerieAsync(string id, CancellationToken ct)
    {
        var client = _httpClientFactory.CreateClient("tcgdex");
        var url = $"{_baseUrl}/series/{Uri.EscapeDataString(id)}";

        try
        {
            return await client.GetFromJsonAsync<TcgDexSerie>(url, JsonOpts, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "TcgDexService: GetSerie failed for '{Id}'", id);
            return null;
        }
    }
}
