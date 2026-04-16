using PokeScanner.Api.Models;

namespace PokeScanner.Api.Services;

/// <summary>
/// Takes a CardScanResult from the AI vision and matches it against the TCGdex API.
/// Strategy: resolve printed set code → exact set/localId lookup → filtered search → name fallback.
/// </summary>
public sealed class CardMatchingService
{
    private readonly TcgDexService _tcgDex;
    private readonly ILogger<CardMatchingService> _logger;

    public CardMatchingService(TcgDexService tcgDex, ILogger<CardMatchingService> logger)
    {
        _tcgDex = tcgDex;
        _logger = logger;
    }

    public async Task<(TcgDexCard? ExactMatch, TcgDexCardBrief[] Candidates)> FindMatchesAsync(
        CardScanResult scan, CancellationToken ct)
    {
        // ── Step 1: Resolve the printed set code to a TCGdex set ID ─────────────
        var resolvedSetId = scan.SetId; // may already be set if AI guessed
        if (!string.IsNullOrWhiteSpace(scan.SetCode))
        {
            var tcgdexSetId = await ResolveSetCodeAsync(scan.SetCode, ct);
            if (tcgdexSetId is not null)
            {
                _logger.LogInformation(
                    "CardMatchingService: resolved printed code '{Code}' → TCGdex set '{SetId}'",
                    scan.SetCode, tcgdexSetId);
                resolvedSetId = tcgdexSetId;
            }
        }

        // ── Step 2: Try exact set-card lookup (/sets/{setId}/{localId}) ─────────
        if (!string.IsNullOrWhiteSpace(resolvedSetId) && !string.IsNullOrWhiteSpace(scan.LocalId))
        {
            _logger.LogInformation(
                "CardMatchingService: trying exact lookup sets/{SetId}/{LocalId}",
                resolvedSetId, scan.LocalId);

            var exact = await _tcgDex.GetSetCardAsync(resolvedSetId, scan.LocalId, ct);
            if (exact is not null)
            {
                _logger.LogInformation("CardMatchingService: exact match found — {Id}", exact.Id);
                var altCandidates = await SearchWithFallbackAsync(scan, ct);
                return (exact, altCandidates);
            }

            _logger.LogInformation("CardMatchingService: exact lookup returned nothing");
        }

        // ── Step 3: Fallback to search ───────────────────────────────────────
        var candidates = await SearchWithFallbackAsync(scan, ct);
        return (null, candidates);
    }

    /// <summary>
    /// Resolves a printed set abbreviation (e.g. "MEW", "SIT", "PAL") to a TCGdex set ID
    /// by searching all sets and matching on the name or abbreviation.
    /// </summary>
    private async Task<string?> ResolveSetCodeAsync(string printedCode, CancellationToken ct)
    {
        var code = printedCode.Trim().ToUpperInvariant();

        // Try direct lookup first — some set IDs match the printed code (lowercase)
        var directCard = await _tcgDex.GetSetInfoAsync(code.ToLowerInvariant(), ct);
        if (directCard is not null)
            return code.ToLowerInvariant();

        // Search all sets and find one whose name/id contains the code
        var allSets = await _tcgDex.SearchSetsAsync(ct);

        // Try exact match on set name (e.g. "151" for MEW set)
        // Also try matching the printed code against set IDs
        foreach (var set in allSets)
        {
            var setIdUpper = set.Id.ToUpperInvariant();
            var setNameUpper = set.Name.ToUpperInvariant();

            // Direct ID match
            if (setIdUpper == code)
                return set.Id;

            // The printed code might appear in the set name (e.g. code is part of name)
            if (setNameUpper.Contains(code, StringComparison.OrdinalIgnoreCase))
                return set.Id;
        }

        // Well-known printed code → TCGdex set ID mappings
        // This handles cases where the printed abbreviation doesn't match the TCGdex name
        var resolvedId = MapWellKnownSetCode(code);
        if (resolvedId is not null)
        {
            // Verify this set actually exists
            var verify = await _tcgDex.GetSetInfoAsync(resolvedId, ct);
            if (verify is not null)
                return resolvedId;
        }

        _logger.LogWarning("CardMatchingService: could not resolve set code '{Code}'", code);
        return null;
    }

    /// <summary>
    /// Hardcoded fallback mapping for common printed set codes to TCGdex IDs.
    /// Only used when dynamic resolution fails.
    /// </summary>
    private static string? MapWellKnownSetCode(string code) => code switch
    {
        // Mastery era
        "PFL" => "me02",
        // Scarlet & Violet era
        "MEW" => "sv03.5",
        "SVI" => "sv01",
        "PAL" => "sv02",
        "OBF" => "sv03",
        "PAR" => "sv04",
        "PAF" => "sv04.5",
        "TEF" => "sv05",
        "TWM" => "sv06",
        "SFA" => "sv06.5",
        "SCR" => "sv07",
        "SSP" => "sv08",
        "PRE" => "sv08.5",
        "JTG" => "sv09",
        // Sword & Shield era
        "SSH" => "swsh1",
        "RCL" => "swsh2",
        "DAA" => "swsh3",
        "VIV" => "swsh4",
        "BST" => "swsh5",
        "CRE" => "swsh6",
        "EVS" => "swsh7",
        "FST" => "swsh8",
        "BRS" => "swsh9",
        "ASR" => "swsh10",
        "LOR" => "swsh11",
        "SIT" => "swsh12",
        "CRZ" => "swsh12.5",
        "SHF" => "swsh4.5",
        // Sun & Moon era
        "SUM" => "sm1",
        "GRI" => "sm2",
        "BUS" => "sm3",
        "SLG" => "sm35",
        "CIN" => "sm4",
        "UPR" => "sm5",
        "FLI" => "sm6",
        "CES" => "sm7",
        "LOT" => "sm8",
        "TEU" => "sm9",
        "UNB" => "sm10",
        "UNM" => "sm11",
        "CEC" => "sm12",
        // XY era
        "ROS" => "xy6",
        "AOR" => "xy7",
        "BKT" => "xy8",
        "BKP" => "xy9",
        "FCO" => "xy10",
        "STS" => "xy11",
        "EVO" => "xy12",
        _ => null
    };

    private async Task<TcgDexCardBrief[]> SearchWithFallbackAsync(
        CardScanResult scan, CancellationToken ct)
    {
        // Try filtered search first: name + localId for precision
        if (!string.IsNullOrWhiteSpace(scan.Name) && !string.IsNullOrWhiteSpace(scan.LocalId))
        {
            var filtered = await _tcgDex.SearchCardsFilteredAsync(
                scan.Name, scan.LocalId, ct);

            if (filtered.Length > 0)
            {
                _logger.LogInformation(
                    "CardMatchingService: filtered search returned {Count} results", filtered.Length);
                return filtered.Take(10).ToArray();
            }
        }

        // Plain name search
        if (!string.IsNullOrWhiteSpace(scan.Name))
        {
            var byName = await _tcgDex.SearchCardsAsync(scan.Name, ct);
            if (byName.Length > 0)
                return byName.Take(10).ToArray();
        }

        _logger.LogInformation("CardMatchingService: no matches found for scan");
        return [];
    }
}
