export function calculateRelevanceScore(title: string, query: string): number {
    if (!title || !query) return 0;

    const normalizedTitle = title.toLowerCase().trim();
    const normalizedQuery = query.toLowerCase().trim();

    // 1. Exact Match (highest priority)
    if (normalizedTitle === normalizedQuery) return 100;

    // 2. Starts With (very high priority)
    if (normalizedTitle.startsWith(normalizedQuery)) return 80;

    // 3. Contains Query as Word (high priority)
    const words = normalizedTitle.split(/[\s\W]+/).filter(w => w.length > 0);
    const queryWords = normalizedQuery.split(/[\s\W]+/).filter(w => w.length > 0);

    // valid if all query words are present as distinct words in title
    const allQueryWordsPresent = queryWords.every(qw => words.includes(qw));
    if (allQueryWordsPresent) return 60;

    // 4. Contains Query String (medium priority)
    if (normalizedTitle.includes(normalizedQuery)) return 40;

    // 5. Fuzzy / Partial Word Match (low priority)
    const someQueryWordsPresent = queryWords.some(qw => normalizedTitle.includes(qw));
    if (someQueryWordsPresent) return 20;

    return 0;
}
