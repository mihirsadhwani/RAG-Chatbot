// Centralized fund configuration
// "name" = friendly UI display name
// "scheme" = exact name in the scraped knowledge base / embeddings
// "slug" = URL-safe identifier

export const FUNDS = [
    {
        name: "HDFC Balanced Advantage Fund",
        scheme: "HDFC Balanced Advantage Fund Direct Growth",
        slug: "hdfc-balanced-advantage"
    },
    {
        name: "HDFC Flexi Cap Fund",
        scheme: "HDFC Flexi Cap Direct Plan Growth",
        slug: "hdfc-flexi-cap"
    },
    {
        name: "HDFC Mid Cap Fund",
        scheme: "HDFC Mid Cap Fund Direct Growth",
        slug: "hdfc-mid-cap"
    },
    {
        name: "HDFC Large Cap Fund",
        scheme: "HDFC Large Cap Fund Direct Growth",
        slug: "hdfc-large-cap"
    },
    {
        name: "HDFC Small Cap Fund",
        scheme: "HDFC Small Cap Fund Direct Growth",
        slug: "hdfc-small-cap"
    }
];

// Map casual keywords in user queries → exact scheme names
export const FUND_KEYWORDS = {
    "large cap": "HDFC Large Cap Fund Direct Growth",
    "largecap": "HDFC Large Cap Fund Direct Growth",
    "top 100": "HDFC Large Cap Fund Direct Growth",
    "small cap": "HDFC Small Cap Fund Direct Growth",
    "smallcap": "HDFC Small Cap Fund Direct Growth",
    "flexi cap": "HDFC Flexi Cap Direct Plan Growth",
    "flexicap": "HDFC Flexi Cap Direct Plan Growth",
    "mid cap": "HDFC Mid Cap Fund Direct Growth",
    "midcap": "HDFC Mid Cap Fund Direct Growth",
    "balanced advantage": "HDFC Balanced Advantage Fund Direct Growth",
    "balanced": "HDFC Balanced Advantage Fund Direct Growth",
};

// Given a raw user query, replace casual fund keywords with exact scheme names
export function normalizeQuery(query) {
    let normalized = query;
    const q = query.toLowerCase();

    // Sort keywords by length descending so longer matches are tried first
    const sortedKeys = Object.keys(FUND_KEYWORDS).sort((a, b) => b.length - a.length);

    for (const keyword of sortedKeys) {
        if (q.includes(keyword)) {
            // Replace the keyword portion with the exact scheme name
            const regex = new RegExp(keyword, "gi");
            normalized = normalized.replace(regex, FUND_KEYWORDS[keyword]);
            break; // Only replace the first (longest) match
        }
    }
    return normalized;
}
