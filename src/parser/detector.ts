/**
 * Heuristic detector for Org-mode syntax.
 */

export function isOrgContent(text: string): boolean {
    if (!text || typeof text !== "string") return false;
    const lines = text.trim().split("\n");
    let score = 0;

    for (let i = 0; i < Math.min(lines.length, 35); i++) {
        const line = lines[i].trim();
        if (/^\*{1,6}\s+/.test(line)) score += 3; // Headlines (*, **, ***)
        if (/^:PROPERTIES:\s*$/i.test(line)) score += 4; // Properties drawer
        if (/^:(?:LOGBOOK|DRAWER|CLOCK):/i.test(line)) score += 3;
        if (/^#\+(?:TITLE|AUTHOR|DATE|OPTIONS|FILETAGS|STARTUP|DESCRIPTION):/i.test(line)) score += 4;
        if (/^#\+(?:BEGIN_SRC|BEGIN_EXAMPLE|BEGIN_QUOTE|BEGIN_VERSE|BEGIN_CENTER)/i.test(line)) score += 4;
        if (/^\|.*\|.*\|\s*$/.test(line)) score += 2; // Table row
        if (/^[-+*]\s+\[[ xX-]\]\s+/.test(line)) score += 3; // Checkbox item
        if (/(?:\[\d{4}-\d{2}-\d{2}[^\]]*\]|<\d{4}-\d{2}-\d{2}[^>]*>)/.test(line)) score += 2; // Timestamp
        if (/(?:DEADLINE|SCHEDULED|CLOSED):/.test(line)) score += 3; // Planning keywords
        if (/\[#[A-Z]\]/.test(line)) score += 2; // Priority cookie
        if (/^\s*[-+*]\s+.*::\s+/.test(line)) score += 3; // Description list
    }

    return score >= 3;
}
