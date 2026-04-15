namespace PokeScanner.Api.Services.AiProviders;

/// <summary>
/// Result from an AI chat completion — includes the provider name for observability.
/// </summary>
public record AiChatResult(string? Answer, string ProviderName, bool IsSuccess)
{
    public bool IsTransient { get; init; }
    public string? UsedModel { get; init; }
    public int? TotalTokensUsed { get; init; }
}

/// <summary>
/// Abstraction for a text-based AI chat provider (Groq, DeepSeek, etc.).
/// </summary>
public interface IAiChatProvider
{
    string Name { get; }
    bool IsAvailable { get; }

    Task<AiChatResult> ChatAsync(
        string systemPrompt,
        string userContent,
        CancellationToken ct,
        Guid? correlationId = null);
}
