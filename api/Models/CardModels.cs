namespace PokeScanner.Api.Models;

// ── Collection card stored in the database ─────────────────────────────────
public record CollectionCard
{
    public Guid Id { get; init; }
    public string TcgdexCardId { get; init; } = string.Empty;
    public string CardName { get; init; } = string.Empty;
    public string? SetId { get; init; }
    public string? SetName { get; init; }
    public string? LocalId { get; init; }
    public string? Rarity { get; init; }
    public string? CardImageUrl { get; init; }
    public string? Category { get; init; }
    public string Variant { get; init; } = "normal";
    public string Condition { get; init; } = "near_mint";
    public int Quantity { get; init; } = 1;
    public string? Notes { get; init; }
    public string? ScanImageUrl { get; init; }
    public int? Hp { get; init; }
    public string[]? Types { get; init; }
    public string? Illustrator { get; init; }
    public string? Stage { get; init; }
    public string? EvolveFrom { get; init; }
    public string? Description { get; init; }
    public DateTimeOffset AddedAt { get; init; }
}

// ── Wishlist card ──────────────────────────────────────────────────────────
public record WishlistCard
{
    public Guid Id { get; init; }
    public string TcgdexCardId { get; init; } = string.Empty;
    public string CardName { get; init; } = string.Empty;
    public string? SetId { get; init; }
    public string? SetName { get; init; }
    public string? LocalId { get; init; }
    public string? Rarity { get; init; }
    public string? CardImageUrl { get; init; }
    public int Priority { get; init; }
    public string? Notes { get; init; }
    public DateTimeOffset AddedAt { get; init; }
}

// ── DTOs for create / update ───────────────────────────────────────────────
public record AddCollectionCardRequest(
    string TcgdexCardId,
    string CardName,
    string? SetId,
    string? SetName,
    string? LocalId,
    string? Rarity,
    string? CardImageUrl,
    string? Category,
    string Variant = "normal",
    string Condition = "near_mint",
    int Quantity = 1,
    string? Notes = null,
    string? ScanImageUrl = null,
    int? Hp = null,
    string[]? Types = null,
    string? Illustrator = null,
    string? Stage = null,
    string? EvolveFrom = null,
    string? Description = null);

public record UpdateCollectionCardRequest(
    string? Variant = null,
    string? Condition = null,
    int? Quantity = null,
    string? Notes = null);

public record AddWishlistCardRequest(
    string TcgdexCardId,
    string CardName,
    string? SetId,
    string? SetName,
    string? LocalId,
    string? Rarity,
    string? CardImageUrl,
    int Priority = 0,
    string? Notes = null);

// ── Card scan result from AI vision ────────────────────────────────────────
public record CardScanResult
{
    public string? Name { get; init; }
    public string? SetName { get; init; }
    public string? SetCode { get; init; }
    public string? SetId { get; init; }
    public string? LocalId { get; init; }
    public string? CardNumber { get; init; }
    public int? Hp { get; init; }
    public string[]? Types { get; init; }
    public string? Rarity { get; init; }
    public string? Stage { get; init; }
    public string? RawText { get; init; }
}

// ── TCGdex API model (brief) ──────────────────────────────────────────────
public record TcgDexCardBrief
{
    public string Id { get; init; } = string.Empty;
    public string? LocalId { get; init; }
    public string Name { get; init; } = string.Empty;
    public string? Image { get; init; }
}

// ── TCGdex full card ──────────────────────────────────────────────────────
public record TcgDexCard
{
    public string Id { get; init; } = string.Empty;
    public string? LocalId { get; init; }
    public string Name { get; init; } = string.Empty;
    public string? Image { get; init; }
    public string? Category { get; init; }
    public string? Illustrator { get; init; }
    public string? Rarity { get; init; }
    public int? Hp { get; init; }
    public string[]? Types { get; init; }
    public string? EvolveFrom { get; init; }
    public string? Description { get; init; }
    public string? Stage { get; init; }
    public TcgDexSetBrief? Set { get; init; }
    public TcgDexVariants? Variants { get; init; }
    public TcgDexAttack[]? Attacks { get; init; }
    public TcgDexWeakness[]? Weaknesses { get; init; }
    public int? Retreat { get; init; }
    public string? RegulationMark { get; init; }
    public TcgDexPricing? Pricing { get; init; }
}

public record TcgDexSetBrief
{
    public string Id { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string? Logo { get; init; }
    public string? Symbol { get; init; }
    public TcgDexCardCount? CardCount { get; init; }
}

public record TcgDexCardCount
{
    public int? Total { get; init; }
    public int? Official { get; init; }
}

public record TcgDexVariants
{
    public bool? Normal { get; init; }
    public bool? Reverse { get; init; }
    public bool? Holo { get; init; }
    public bool? FirstEdition { get; init; }
}

public record TcgDexAttack
{
    public string[]? Cost { get; init; }
    public string? Name { get; init; }
    public string? Effect { get; init; }
    public object? Damage { get; init; }
}

public record TcgDexWeakness
{
    public string? Type { get; init; }
    public string? Value { get; init; }
}

public record TcgDexPricing
{
    public TcgDexTcgPlayerPricing? Tcgplayer { get; init; }
    public TcgDexCardmarketPricing? Cardmarket { get; init; }
}

public record TcgDexTcgPlayerPricing
{
    public string? Updated { get; init; }
    public string? Unit { get; init; }
    public TcgDexPriceVariant? Normal { get; init; }
    public TcgDexPriceVariant? Holofoil { get; init; }
    public TcgDexPriceVariant? Reverse { get; init; }
}

public record TcgDexPriceVariant
{
    public decimal? LowPrice { get; init; }
    public decimal? MidPrice { get; init; }
    public decimal? HighPrice { get; init; }
    public decimal? MarketPrice { get; init; }
    public decimal? DirectLowPrice { get; init; }
}

public record TcgDexCardmarketPricing
{
    public string? Updated { get; init; }
    public string? Unit { get; init; }
    public decimal? Avg { get; init; }
    public decimal? Low { get; init; }
    public decimal? Trend { get; init; }
}

// ── TCGdex Set full ───────────────────────────────────────────────────────
public record TcgDexSet
{
    public string Id { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string? Logo { get; init; }
    public string? Symbol { get; init; }
    public TcgDexCardCount? CardCount { get; init; }
    public TcgDexCardBrief[]? Cards { get; init; }
    public TcgDexSerieBrief? Serie { get; init; }
}

public record TcgDexSerieBrief
{
    public string Id { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string? Logo { get; init; }
}

public record TcgDexSerie
{
    public string Id { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string? Logo { get; init; }
    public TcgDexSetBrief[]? Sets { get; init; }
}

// ── Scan endpoint response ────────────────────────────────────────────────
public record ScanResponse(
    CardScanResult ScanResult,
    TcgDexCard? ExactMatch,
    TcgDexCardBrief[] Candidates);

// ── Collection stats ──────────────────────────────────────────────────────
public record CollectionStats
{
    public int TotalCards { get; init; }
    public int UniqueCards { get; init; }
    public int TotalSets { get; init; }
    public decimal EstimatedValue { get; init; }
    public CollectionCard[] RecentAdditions { get; init; } = [];
}

// ── Expert session/message models ─────────────────────────────────────────
public record ExpertSession
{
    public Guid Id { get; init; }
    public string? Title { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
}

public record ExpertMessage
{
    public Guid Id { get; init; }
    public Guid SessionId { get; init; }
    public string Role { get; init; } = string.Empty;
    public string Content { get; init; } = string.Empty;
    public string? ModelUsed { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
}

public record AskExpertRequest(
    string Question,
    Guid? SessionId = null);
