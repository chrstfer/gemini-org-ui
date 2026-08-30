import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseOrgDocument, renderLatexToString } from "../src/org/index.ts";

describe("renderer and latex", () => {
    it("renders LaTeX math to KaTeX HTML without errors", () => {
        const math = "E = mc^2";
        const html = renderLatexToString(math, false);
        assert.ok(html.includes("katex"));
        assert.ok(html.includes("E"));
        assert.ok(html.includes("m"));
        assert.ok(html.includes("c"));

        const displayMath = "\\frac{\\lambda^k e^{-\\lambda}}{k!}";
        const displayHtml = renderLatexToString(displayMath, true);
        assert.ok(displayHtml.includes("katex"));
    });

    it("parses complex Org document with math, source blocks, tables, and nested tasks", () => {
        const doc = `#+TITLE: Performance Analysis
#+AUTHOR: Systems

* Operations :INFRA:
** Task List
- [-] Cluster deployment
  - [X] Step 1: Base images
  - [ ] Step 2: Mesh topology
  - [ ] Step 3: Node validation

#+NAME: latency_calc
#+BEGIN_SRC python :exports both
def p99(): return 3.41
#+END_SRC

#+RESULTS: latency_calc
: 3.41 ms

** Mathematical Modeling
\\begin{equation}
F(x) = 1 - e^{-\\lambda x}
\\end{equation}`;

        const ast = parseOrgDocument(doc);
        assert.equal(ast.metadata[0].val, "Performance Analysis");
        assert.equal(ast.sections.length, 1);
        assert.equal(ast.sections[0].heading.title, "Operations");
        assert.equal(ast.sections[0].children.length, 2);

        // Section 1 child 0: Task List
        const taskListSec = ast.sections[0].children[0];
        const listNode = taskListSec.body.find((n) => n.type === "list");
        assert.ok(listNode);
        if (listNode && listNode.type === "list") {
            assert.equal(listNode.items.length, 1);
            assert.equal(listNode.items[0].text, "Cluster deployment");
            assert.equal(listNode.items[0].children.length, 3);
            assert.equal(listNode.items[0].children[0].checkbox, "checked");
            assert.equal(listNode.items[0].children[1].checkbox, "unchecked");
        }

        // Src block with results
        const srcNode = taskListSec.body.find((n) => n.type === "src_block");
        assert.ok(srcNode);
        if (srcNode && srcNode.type === "src_block") {
            assert.equal(srcNode.name, "latency_calc");
            assert.ok(srcNode.results);
            assert.deepEqual(srcNode.results?.content, ["3.41 ms"]);
        }

        // Section 1 child 1: Mathematical Modeling with LaTeX
        const mathSec = ast.sections[0].children[1];
        const latexNode = mathSec.body.find((n) => n.type === "latex_block");
        assert.ok(latexNode);
        if (latexNode && latexNode.type === "latex_block") {
            assert.equal(latexNode.environment, "equation");
            assert.ok(latexNode.content.includes("1 - e^{-\\lambda x}"));
        }
    });
});
