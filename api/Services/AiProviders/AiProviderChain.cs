namespace PokeScanner.Api.Services.AiProviders;

/// <summary>
/// Resolves and iterates through the configured priority list of AI providers,
/// returning the first successful result or falling back to the next on transient failure.
/// </summary>
public sealed class AiProviderChain
{
    private readonly IEnumerable<IAiChatProvider> _chatProviders;
    private readonly GroqTokenBudgetService _groqBudget;
    private readonly ILogger<AiProviderChain> _logger;

    public AiProviderChain(
        IEnumerable<IAiChatProvider> chatProviders,
        GroqTokenBudgetService groqBudget,
        ILogger<AiProviderChain> logger)
    {
        _chatProviders = chatProviders;
        _groqBudget = groqBudget;
        _logger = logger;
    }

    public async Task<AiChatResult> ChatAsync(
        string[] priority, string systemPrompt, string userContent, CancellationToken ct,
        Guid? correlationId = null)
    {
        var providers = await ResolveChatAsync(priority, ct);

        foreach (var provider in providers)
        {
            var result = await provider.ChatAsync(systemPrompt, userContent, ct, correlationId);

            if (result.IsSuccess)
                return result;

            _logger.LogWarning("AiProviderChain: {Provider} failed (transient={Transient}), trying next",
                provider.Name, result.IsTransient);
        }

        _logger.LogError("AiProviderChain: all chat providers exhausted");
        return new AiChatResult(null, "none", false);
    }

    private async Task<List<IAiChatProvider>> ResolveChatAsync(string[] priority, CancellationToken ct)
    {
        var ordered = new List<IAiChatProvider>();
        foreach (var name in priority)
        {
            var provider = _chatProviders.FirstOrDefault(
                p => p.Name.Equals(name, StringComparison.OrdinalIgnoreCase));

            if (provider is null || !provider.IsAvailable)
            {
                _logger.LogDebug("AiProviderChain: '{Name}' not available, skipping", name);
                continue;
            }

            if (name.Equals("Groq", StringComparison.OrdinalIgnoreCase)
                && !await _groqBudget.HasBudgetAsync(ct))
            {
                _logger.LogInformation("AiProviderChain: skipping Groq — TPM budget exhausted");
                continue;
            }

            ordered.Add(provider);
        }
        return ordered;
    }
}
