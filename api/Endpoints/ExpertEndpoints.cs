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
        AskExpertRequest req, ExpertService service, TcgDexService tcgDex, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Question))
            return TypedResults.Problem("Question is required", statusCode: 400);

        var (answer, modelUsed, sessionId) = await service.AskAsync(req.Question, req.SessionId, ct);

        if (answer is null)
            return TypedResults.Problem("All AI providers failed. Please try again later.", statusCode: 502);

        // If the AI response mentions searching for cards, do a card search
        object[]? cardResults = null;
        var searchTerm = ExtractCardSearchTerm(req.Question);
        if (searchTerm is not null)
        {
            var cards = await tcgDex.SearchCardsAsync(searchTerm, ct);
            if (cards.Length > 0)
                cardResults = cards.Take(8).Select(c => new { c.Id, c.Name, c.Image, c.LocalId }).ToArray<object>();
        }

        return TypedResults.Ok<object>(new { answer, modelUsed, sessionId, cards = cardResults });
    }

    /// <summary>
    /// Detects if the user is asking to search/find/show specific cards or sets.
    /// Returns the search term or null.
    /// </summary>
    private static string? ExtractCardSearchTerm(string question)
    {
        var q = question.Trim();
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
