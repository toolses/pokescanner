namespace PokeScanner.Api.Configuration;

public sealed class IntegrationSettings
{
    public const string SectionName = "Integration";

    /// <summary>Maximum card scans per day (across all users, single-user mode).</summary>
    public int DailyScanLimit { get; init; } = 50;

    public GroqSettings Groq { get; init; } = new();
    public DeepSeekSettings DeepSeek { get; init; } = new();
    public TcgDexSettings TcgDex { get; init; } = new();
    public AiFallbackSettings AiFallback { get; init; } = new();
}

public sealed class GroqSettings
{
    public string BaseUrl { get; init; } = "https://api.groq.com/openai";
}

public sealed class DeepSeekSettings
{
    public string BaseUrl { get; init; } = "https://api.deepseek.com";
}

public sealed class TcgDexSettings
{
    public string BaseUrl { get; init; } = "https://api.tcgdex.net/v2/en";
}

public sealed class AiFallbackSettings
{
    public string[] CardScanPriority { get; init; } = ["Groq"];
    public string[] ExpertChatPriority { get; init; } = ["Groq", "DeepSeek"];
    public int GroqTokenBudgetPerMinute { get; init; } = 5500;
}
