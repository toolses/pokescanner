using Microsoft.AspNetCore.Http.HttpResults;
using PokeScanner.Api.Models;
using PokeScanner.Api.Services;

namespace PokeScanner.Api.Endpoints;

public static class ExpertEndpoints
{
    public static IEndpointRouteBuilder MapExpertEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/expert").WithTags("Expert");

        group.MapPost("/ask", AskExpert);
        group.MapGet("/sessions", GetSessions);
        group.MapGet("/sessions/{id:guid}/messages", GetSessionMessages);

        return app;
    }

    private static async Task<Results<Ok<object>, ProblemHttpResult>> AskExpert(
        AskExpertRequest req, ExpertService service, TcgDexService tcgDex,
        CollectionService collection, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Question))
            return TypedResults.Problem("Question is required", statusCode: 400);

        var (answer, modelUsed, sessionId) = await service.AskAsync(req.Question, req.SessionId, ct);

        if (answer is null)
            return TypedResults.Problem("All AI providers failed. Please try again later.", statusCode: 502);

        // Parse the structured card list the AI embeds in its response
        var (cleanAnswer, cardNames) = ExtractPokeCardsLine(answer);

        object[]? cardResults = null;

        // Load collection once so we can prefer the user's own copies
        var collectionCards = (await collection.GetAllAsync(ct)).ToList();

        if (cardNames.Length > 0)
        {
            var results = new List<object>();
            foreach (var name in cardNames.Take(8))
            {
                // Prefer a card from the user's collection with a matching name
                var owned = collectionCards.FirstOrDefault(c =>
                    string.Equals(c.CardName, name, StringComparison.OrdinalIgnoreCase));

                if (owned is not null)
                {
                    // CardImageUrl in DB already includes the quality suffix (e.g. /high.webp).
                    // Strip it so the client gets a bare base URL, consistent with TCGDex results.
                    var imageBase = owned.CardImageUrl is not null
                        ? System.Text.RegularExpressions.Regex.Replace(
                            owned.CardImageUrl, @"/(high|low|[\w]+)\.webp$", "")
                        : null;
                    results.Add(new
                    {
                        Id = owned.TcgdexCardId,
                        Name = owned.CardName,
                        Image = imageBase,
                        LocalId = owned.LocalId
                    });
                    continue;
                }

                // Fall back to TCGDex search
                var cards = await tcgDex.SearchCardsAsync(name, ct);
                var match = cards.FirstOrDefault();
                if (match is not null)
                    results.Add(new { match.Id, match.Name, match.Image, match.LocalId });
            }

            cardResults = results.Count > 0 ? results.ToArray<object>() : null;
        }
        else
        {
            // Fallback: generic search term extracted from the question
            var searchTerm = ExtractCardSearchTerm(req.Question);
            if (searchTerm is not null)
            {
                var cards = await tcgDex.SearchCardsAsync(searchTerm, ct);
                if (cards.Length > 0)
                    cardResults = cards.Take(8).Select(c => new { c.Id, c.Name, c.Image, c.LocalId }).ToArray<object>();
            }
        }

        return TypedResults.Ok<object>(new { answer = cleanAnswer, modelUsed, sessionId, cards = cardResults });
    }

    /// <summary>
    /// Extracts the POKECARDS: structured line the AI appends, strips it from the answer,
    /// and returns the clean answer alongside the list of card names.
    /// </summary>
    private static (string CleanAnswer, string[] CardNames) ExtractPokeCardsLine(string answer)
    {
        const string prefix = "POKECARDS:";
        var lines = answer.Split('\n');

        // Search the last few lines (model may add trailing whitespace)
        for (var i = lines.Length - 1; i >= Math.Max(0, lines.Length - 4); i--)
        {
            var line = lines[i].Trim();
            if (!line.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)) continue;

            var names = line[prefix.Length..]
                .Split('|', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Where(n => n.Length >= 2)
                .ToArray();

            var cleanAnswer = string.Join('\n', lines.Take(i)).TrimEnd();
            return (cleanAnswer, names);
        }

        return (answer, []);
    }

    /// <summary>
    /// Detects if the user is asking to search/find/show specific cards or sets.
    /// Returns the search term or null.
    /// </summary>
    private static string? ExtractCardSearchTerm(string question)
    {
        var q = question.Trim();

        // Pattern: "any X card(s)", "X card(s) in", "X card(s) from" etc.
        // e.g. "Are there any Pikachu cards in the 151 set?"
        var cardPattern = System.Text.RegularExpressions.Regex.Match(
            q, @"\b(?:any\s+)?([A-Z][\w\s-]{1,30?})\s+cards?\b",
            System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        if (cardPattern.Success)
        {
            var term = cardPattern.Groups[1].Value.Trim().TrimEnd('?', '.', '!');
            if (term.Length >= 2 && term.Length <= 50)
                return term;
        }

        var searchPrefixes = new[] {
            "search for ", "find ", "show me ", "look up ",
            "find cards ", "search cards ", "show cards ",
            "what does ", "show "
        };

        foreach (var prefix in searchPrefixes)
        {
            var idx = q.IndexOf(prefix, StringComparison.OrdinalIgnoreCase);
            if (idx >= 0)
            {
                var term = q[(idx + prefix.Length)..].Trim();
                // Strip trailing punctuation/common suffixes
                term = term.TrimEnd('?', '.', '!');
                var stopWords = new[] { " card", " cards", " look like", " pokemon" };
                foreach (var sw in stopWords)
                {
                    var swIdx = term.IndexOf(sw, StringComparison.OrdinalIgnoreCase);
                    if (swIdx > 0) term = term[..swIdx];
                }
                if (term.Length >= 2 && term.Length <= 50)
                    return term;
            }
        }
        return null;
    }

    private static async Task<Ok<ExpertSession[]>> GetSessions(
        ExpertService service, CancellationToken ct)
    {
        var sessions = await service.GetSessionsAsync(ct);
        return TypedResults.Ok(sessions);
    }

    private static async Task<Ok<ExpertMessage[]>> GetSessionMessages(
        Guid id, ExpertService service, CancellationToken ct)
    {
        var messages = await service.GetSessionMessagesAsync(id, ct);
        return TypedResults.Ok(messages);
    }
}
