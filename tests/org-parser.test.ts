import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { OrgParser } from "../src/parser/index.ts";

describe("OrgParser facade", () => {
    it("full pipeline end-to-end", () => {
        const sample = `#+TITLE: Full Pipeline Test
#+AUTHOR: chrstfer

* TODO [#A] Verify complete Org pipeline :TEST:
This is a *bold* link to [[https://example.com/api][API Docs]] with a ~code block~.

** Subtask
- [X] Step 1
- [ ] Step 2

| Col 1 | Col 2 |
|-------+-------|
| Val A | 100   |

#+BEGIN_SRC bash
echo "hello world"
#+END_SRC`;

        // 1. Detection
        assert.equal(OrgParser.isOrgContent(sample), true);

        // 2. AST parsing
        const ast = OrgParser.parseAst(sample);
        assert.equal(ast.metadata[0].val, "Full Pipeline Test");
        assert.equal(ast.sections.length, 1);
        assert.equal(ast.sections[0].children.length, 1);

        // 3. Rendering
        const html = OrgParser.render(sample);
        assert.ok(html.includes("Full Pipeline Test"));
        assert.ok(html.includes("org-status-TODO"));
        assert.ok(html.includes("org-priority-A"));
        assert.ok(html.includes(":TEST:"));
        assert.ok(html.includes('<a href="https://example.com/api"'));
        assert.ok(html.includes('<strong class="org-bold">bold</strong>'));
        assert.ok(html.includes('<code class="org-code">code block</code>'));
        assert.ok(html.includes("org-sec-1"));
        assert.ok(html.includes("org-sec-2"));
        assert.ok(html.includes("org-checkbox"));
        assert.ok(html.includes("org-table"));
        assert.ok(html.includes("org-src-block"));
    });
});
