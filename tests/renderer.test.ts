import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { OrgParser } from "../src/parser/index.ts";

describe("renderer", () => {
    it("renders complete document with metadata banner, tags, status, and subtrees", () => {
        const doc = `#+TITLE: Diagnostic Suite
#+AUTHOR: Antigravity

* TODO [#A] Urgent fix for switch bouncing :HARDWARE:URGENT:
Details about the fix.
** Subtask 1
- [ ] Measure bounce
- [X] Inspect trace
*** Deep Note
Deep subtask info.
* DONE Task 2
All set.`;

        const html = OrgParser.render(doc);

        // Metadata banner
        assert.ok(html.includes("org-meta-banner"));
        assert.ok(html.includes("#+TITLE:"));
        assert.ok(html.includes("Diagnostic Suite"));
        assert.ok(html.includes("#+AUTHOR:"));
        assert.ok(html.includes("Antigravity"));

        // Status & Priority & Tags
        assert.ok(html.includes("org-status-TODO"));
        assert.ok(html.includes("org-priority-A"));
        assert.ok(html.includes(":HARDWARE:"));
        assert.ok(html.includes(":URGENT:"));

        // Hierarchy levels
        assert.ok(html.includes("org-sec-1"));
        assert.ok(html.includes("org-sec-2"));
        assert.ok(html.includes("org-sec-3"));

        // Interactive Checkboxes
        assert.ok(html.includes("org-checkbox-item"));
        assert.ok(html.includes('type="checkbox"'));
        assert.ok(html.includes("checked"));

        // Verify balanced section open/close tags
        const openCount = (html.match(/<div class="org-section /g) || []).length;
        assert.equal(openCount, 4); // Sec 1, Subtask 1, Deep Note, Task 2
    });

    it("renders property drawers as collapsible details", () => {
        const doc = `* System Specs
:PROPERTIES:
:CPU: AMD Ryzen 9
:RAM: 64GB
:END:`;

        const html = OrgParser.render(doc);
        assert.ok(html.includes('class="org-drawer"'));
        assert.ok(html.includes('data-gemini-org="drawer"'));
        assert.ok(html.includes(":PROPERTIES:"));
        assert.ok(html.includes(":CPU:"));
        assert.ok(html.includes("AMD Ryzen 9"));
        assert.ok(html.includes(":RAM:"));
        assert.ok(html.includes("64GB"));
    });

    it("renders tables with header rows and numeric cell alignment", () => {
        const doc = `| Metric | Sample | Duration | Pass |
|--------+--------+----------+------|
| Jitter | 1000 | 4.2ms | TRUE |
| Latency | 50 | 12.8ms | TRUE |`;

        const html = OrgParser.render(doc);
        assert.ok(html.includes('class="org-table"'));
        assert.ok(html.includes('data-gemini-org="table"'));
        assert.ok(html.includes("org-table-header-row"));
        assert.ok(html.includes('<th class="">Metric</th>'));
        assert.ok(html.includes('<th class="">Sample</th>'));
        assert.ok(html.includes('<td class=" org-table-num">1000</td>'));
        assert.ok(html.includes('<td class=" org-table-num">50</td>'));
    });

    it("renders source blocks with language badge and copy snippet button", () => {
        const doc = `#+BEGIN_SRC python
def test():
    return True
#+END_SRC`;

        const html = OrgParser.render(doc);
        assert.ok(html.includes("org-src-block"));
        assert.ok(html.includes('data-gemini-org="src-block"'));
        assert.ok(html.includes("PYTHON"));
        assert.ok(html.includes("org-src-copy-btn"));
        assert.ok(html.includes("def test():"));
    });
});
