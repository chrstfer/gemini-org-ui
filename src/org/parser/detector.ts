/**
 * Org-Mode Heuristic Content Detector
 * Identifies Org headlines, drawers, tables, directives, checkboxes, LaTeX blocks.
 */

export function isOrgContent(text: string): boolean {
    if (!text || typeof text !== "string") return false;

    const trimmed = text.trim();
    if (!trimmed) return false;

    // Direct strong indicators (1 occurrence is sufficient)
    const strongPatterns = [
        /^#\+(?:TITLE|AUTHOR|DATE|OPTIONS|TAGS|PROPERTY|NAME|RESULTS|SETUPFILE|STARTUP):/im,
        /^#\+BEGIN_(?:SRC|EXAMPLE|QUOTE|VERSE|CENTER|COMMENT)/im,
        /^:(?:PROPERTIES|LOGBOOK|DRAWER):/m,
        /^\*{1,6}\s+(?:TODO|DONE|WAITING|NEXT|IN-PROGRESS|CANCELLED|HOLD|PROJECT|FIXME|BUG)\b/m,
        /^\*{1,6}\s+.*:[a-zA-Z0-9_@#:]+:\s*$/m, // Heading with tags
        /^\*{1,6}\s+.*\[#[A-Z]\]/m, // Heading with priority
        /^\*{1,6}\s+.*\[(?:\d+\/\d+|\d+%)\]/m, // Heading with stats cookie
        /^\s*[-+*]\s+\[[ xX-]\]\s+/m, // Checkbox list item
        /^\s*[-+*]\s+.+?\s+::\s+/m, // Description list item
        /^\s*\|[-+\s|]+\|\s*$/m, // Table hline divider |---+---|
        /^#\+TBLFM:/m, // Table formula
        /^(?:DEADLINE|SCHEDULED|CLOSED):\s*(?:<[^>]+>|\[[^\]]+\])/im, // Planning timestamp
        /^\\begin\{(?:equation|align|gather|cases|matrix|bmatrix)\}/m, // LaTeX environment
    ];

    for (const pattern of strongPatterns) {
        if (pattern.test(trimmed)) return true;
    }

    // Secondary indicators (require threshold score >= 2)
    let score = 0;
    const lines = trimmed.split("\n");

    for (const line of lines) {
        const l = line.trim();
        if (/^\*{1,6}\s+\S+/.test(l)) score += 1;
        if (/^\s*\|.*\|\s*$/.test(l)) score += 0.5;
        if (/^(?:DEADLINE|SCHEDULED|CLOSED):\s*(?:<[^>]+>|\[[^\]]+\])/.test(l)) score += 1.5;
        if (/\[\[(?:https?:\/\/|file:|\*)[^\]]+\](?:\[[^\]]+\])?\]/.test(l)) score += 1;
        if (/\[fn:\d+\]/.test(l)) score += 1;

        if (score >= 2) return true;
    }

    return false;
}
