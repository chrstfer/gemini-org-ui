/**
 * Token-safe Inline Lexer and Formatter for Org-Mode
 */

export function escapeHtml(str: string): string {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export function escapeAttr(str: string): string {
    if (!str) return "";
    return escapeHtml(str.trim());
}

/**
 * Parses inline Org-mode markup into safe HTML.
 * Uses placeholder tokenization to avoid corrupting HTML attributes with subsequent regexes.
 */
export function parseInline(text: string): string {
    if (!text) return "";

    const tokens: string[] = [];
    function pushToken(html: string): string {
        const id = `\x00ORGTOK_${tokens.length}\x00`;
        tokens.push(html);
        return id;
    }

    let res = text;

    // 1. Verbatim and Inline Code (~code~ and =verbatim=)
    res = res.replace(/~([^~\r\n]+)~/g, (_, content) => {
        return pushToken(`<code class="org-code">${escapeHtml(content)}</code>`);
    });
    res = res.replace(/=([^=\r\n]+)=/g, (_, content) => {
        return pushToken(`<code class="org-verbatim">${escapeHtml(content)}</code>`);
    });

    // 2. Org Links: [[url][label]] or [[url]]
    res = res.replace(/\[\[([^\]\r\n]+)\]\[([^\]\r\n]+)\]\]/g, (_, url, label) => {
        return pushToken(
            `<a href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer" class="org-link">${
                escapeHtml(label)
            }</a>`,
        );
    });
    res = res.replace(/\[\[([^\]\r\n]+)\]\]/g, (_, url) => {
        return pushToken(
            `<a href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer" class="org-link">${
                escapeHtml(url)
            }</a>`,
        );
    });

    // 3. Planning keywords: DEADLINE: <...>, SCHEDULED: <...>, CLOSED: [...]
    res = res.replace(/\b(DEADLINE):\s*<([^>\r\n]+)>/g, (_, kw, ts) => {
        return pushToken(
            `<span class="org-planning org-deadline"><span class="org-kw">${kw}:</span> <span class="org-timestamp org-timestamp-active">&lt;${
                escapeHtml(ts)
            }&gt;</span></span>`,
        );
    });
    res = res.replace(/\b(SCHEDULED):\s*<([^>\r\n]+)>/g, (_, kw, ts) => {
        return pushToken(
            `<span class="org-planning org-scheduled"><span class="org-kw">${kw}:</span> <span class="org-timestamp org-timestamp-active">&lt;${
                escapeHtml(ts)
            }&gt;</span></span>`,
        );
    });
    res = res.replace(/\b(CLOSED):\s*\[([^\]\r\n]+)\]/g, (_, kw, ts) => {
        return pushToken(
            `<span class="org-planning org-closed"><span class="org-kw">${kw}:</span> <span class="org-timestamp org-timestamp-inactive">[${
                escapeHtml(ts)
            }]</span></span>`,
        );
    });

    // 4. Timestamps: Active <YYYY-MM-DD ...> and Inactive [YYYY-MM-DD ...]
    res = res.replace(/<(\d{4}-\d{2}-\d{2}[^>\r\n]*)>/g, (_, ts) => {
        return pushToken(`<span class="org-timestamp org-timestamp-active">&lt;${escapeHtml(ts)}&gt;</span>`);
    });
    res = res.replace(/\[(\d{4}-\d{2}-\d{2}[^\]\r\n]*)\]/g, (_, ts) => {
        return pushToken(`<span class="org-timestamp org-timestamp-inactive">[${escapeHtml(ts)}]</span>`);
    });

    // 5. Priorities [#A], [#B], [#C]
    res = res.replace(/\[#([A-Z])\]/g, (_, pri) => {
        return pushToken(`<span class="org-priority org-priority-${escapeHtml(pri)}">[#${escapeHtml(pri)}]</span>`);
    });

    // 6. Statistics Cookies [2/5] or [40%]
    res = res.replace(/\[(\d+\/\d+|\d+%)\]/g, (_, cookie) => {
        return pushToken(`<span class="org-stats-cookie">[${escapeHtml(cookie)}]</span>`);
    });

    // 7. Footnote references [fn:1] or [1]
    res = res.replace(/\[fn:(\w+)\]/g, (_, id) => {
        return pushToken(`<sup class="org-footnote-ref"><a href="#fn-${escapeHtml(id)}">[${escapeHtml(id)}]</a></sup>`);
    });

    // 8. Escape HTML of regular text
    res = escapeHtml(res);

    // 9. Typographic Markup (Bold, Italic, Underline, Strike) with boundary checks
    // Bold: *bold*
    res = res.replace(
        /(?<=^|[\s(/'"{\[])\*([^\s*][^*]*[^\s*]|\S)\*(?=[\s.,:;!?/'"}\])\-]|$)/g,
        '<strong class="org-bold">$1</strong>',
    );
    // Italic: /italic/
    res = res.replace(
        /(?<=^|[\s(*'"{\[])\/([^\s/][^/]*[^\s/]|\S)\/(?=[\s.,:;!?*'"}\])\-]|$)/g,
        '<em class="org-italic">$1</em>',
    );
    // Underline: _underline_
    res = res.replace(
        /(?<=^|[\s(/'"{\[])_([^\s_][^_]*[^\s_]|\S)_(?=[\s.,:;!?/'"}\])\-]|$)/g,
        '<span class="org-underline">$1</span>',
    );
    // Strikethrough: +strike+
    res = res.replace(
        /(?<=^|[\s(/'"{\[])\+([^\s+][^+]*[^\s+]|\S)\+(?=[\s.,:;!?/'"}\])\-]|$)/g,
        '<del class="org-strike">$1</del>',
    );

    // 10. Restore tokens
    for (let i = tokens.length - 1; i >= 0; i--) {
        res = res.replace(`\x00ORGTOK_${i}\x00`, tokens[i]);
    }

    return res;
}
