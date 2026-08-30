import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { escapeHtml, parseInline } from "../src/parser/inline-lexer.ts";

describe("inline-lexer", () => {
    it("escapeHtml safely escapes XML/HTML characters", () => {
        assert.equal(
            escapeHtml(`<div>"Hello" & 'World'</div>`),
            `&lt;div&gt;&quot;Hello&quot; &amp; &#039;World&#039;&lt;/div&gt;`,
        );
    });

    it("token safety protects URLs containing slashes/underscores from regex corruption", () => {
        const input = "Visit [[https://example.com/api/v1/user_profile][User Profile API]] for details.";
        const rendered = parseInline(input);

        assert.ok(rendered.includes('<a href="https://example.com/api/v1/user_profile"'));
        assert.ok(rendered.includes('class="org-link">User Profile API</a>'));
        assert.equal(rendered.includes('href="https:<em'), false);
        assert.equal(rendered.includes("api<em"), false);
        assert.equal(rendered.includes("user<span"), false);
    });

    it("formatting tokens (bold, italic, underline, strike, code, verbatim)", () => {
        const input = "This is *bold*, /italic/, _underline_, +strike+, ~const x = 1~ and =verbatim=";
        const out = parseInline(input);

        assert.ok(out.includes('<strong class="org-bold">bold</strong>'));
        assert.ok(out.includes('<em class="org-italic">italic</em>'));
        assert.ok(out.includes('<span class="org-underline">underline</span>'));
        assert.ok(out.includes('<del class="org-strike">strike</del>'));
        assert.ok(out.includes('<code class="org-code">const x = 1</code>'));
        assert.ok(out.includes('<code class="org-verbatim">verbatim</code>'));
    });

    it("timestamps, planning, priorities, stats cookies, footnotes", () => {
        const input = "DEADLINE: <2026-08-28 Fri 15:00> SCHEDULED: <2026-08-27> CLOSED: [2026-08-26] [#A] [2/5] [fn:1]";
        const out = parseInline(input);

        assert.ok(out.includes("org-deadline"));
        assert.ok(out.includes("DEADLINE:"));
        assert.ok(out.includes("org-scheduled"));
        assert.ok(out.includes("SCHEDULED:"));
        assert.ok(out.includes("org-closed"));
        assert.ok(out.includes("CLOSED:"));
        assert.ok(out.includes("org-priority-A"));
        assert.ok(out.includes("org-stats-cookie"));
        assert.ok(out.includes("[2/5]"));
        assert.ok(out.includes("org-footnote-ref"));
        assert.ok(out.includes("[1]"));
    });
});
