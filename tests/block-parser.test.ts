import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseOrgDocument } from "../src/parser/block-parser.ts";

describe("block-parser", () => {
    it("builds recursive AST headline tree with proper nesting", () => {
        const docText = `* Top Level 1
Top text
** Level 2 A
Level 2 A text
*** Level 3
Deep text
** Level 2 B
Level 2 B text
* Top Level 2
Next top text`;

        const ast = parseOrgDocument(docText);

        // Top level has 2 sections
        assert.equal(ast.sections.length, 2);
        assert.equal(ast.sections[0].heading.title, "Top Level 1");
        assert.equal(ast.sections[0].heading.level, 1);
        assert.equal(ast.sections[1].heading.title, "Top Level 2");
        assert.equal(ast.sections[1].heading.level, 1);

        // Section 1 has two children: Level 2 A and Level 2 B
        assert.equal(ast.sections[0].children.length, 2);
        assert.equal(ast.sections[0].children[0].heading.title, "Level 2 A");
        assert.equal(ast.sections[0].children[1].heading.title, "Level 2 B");

        // Level 2 A has one child: Level 3
        assert.equal(ast.sections[0].children[0].children.length, 1);
        assert.equal(ast.sections[0].children[0].children[0].heading.title, "Level 3");
    });

    it("extracts metadata directives into doc.metadata", () => {
        const text = `#+TITLE: Kernel Diagnostics\n#+AUTHOR: chrstfer\n#+OPTIONS: toc:nil\n* Heading`;
        const ast = parseOrgDocument(text);

        assert.equal(ast.metadata.length, 3);
        assert.deepEqual(ast.metadata[0], { key: "TITLE", val: "Kernel Diagnostics" });
        assert.deepEqual(ast.metadata[1], { key: "AUTHOR", val: "chrstfer" });
        assert.deepEqual(ast.metadata[2], { key: "OPTIONS", val: "toc:nil" });
    });

    it("parses property drawers and entries", () => {
        const text = `* Hardware Spec
:PROPERTIES:
:CPU: AMD Ryzen 9
:RAM: 64GB
:END:`;
        const ast = parseOrgDocument(text);

        assert.equal(ast.sections.length, 1);
        const body = ast.sections[0].body;
        assert.equal(body.length, 1);
        assert.equal(body[0].type, "drawer");
        if (body[0].type === "drawer") {
            assert.equal(body[0].name, "PROPERTIES");
            assert.equal(body[0].entries.length, 2);
            assert.deepEqual(body[0].entries[0], { type: "kv", key: "CPU", val: "AMD Ryzen 9" });
            assert.deepEqual(body[0].entries[1], { type: "kv", key: "RAM", val: "64GB" });
        }
    });

    it("parses tables with rows and dividers", () => {
        const text = `| Item | Qty | Price |
|------+-----+-------|
| Switch | 5 | $12.00 |`;
        const ast = parseOrgDocument(text);

        assert.equal(ast.preamble.length, 1);
        const table = ast.preamble[0];
        assert.equal(table.type, "table");
        if (table.type === "table") {
            assert.equal(table.rows.length, 3);
            assert.deepEqual(table.rows[0].cells, ["Item", "Qty", "Price"]);
            assert.equal(table.rows[1].isDivider, true);
            assert.deepEqual(table.rows[2].cells, ["Switch", "5", "$12.00"]);
        }
    });

    it("parses lists and checkboxes", () => {
        const text = `- [ ] Open task\n- [X] Completed task\n- [-] Partial task\n- Item :: Term description`;
        const ast = parseOrgDocument(text);

        assert.equal(ast.preamble.length, 1);
        const list = ast.preamble[0];
        assert.equal(list.type, "list");
        if (list.type === "list") {
            assert.equal(list.items.length, 4);
            assert.equal(list.items[0].checkbox, "unchecked");
            assert.equal(list.items[1].checkbox, "checked");
            assert.equal(list.items[2].checkbox, "partial");
            assert.equal(list.items[3].term, "Item");
            assert.equal(list.items[3].text, "Term description");
        }
    });

    it("parses source blocks", () => {
        const text = `#+BEGIN_SRC bash -n
sudo evtest /dev/input/mouse0
#+END_SRC`;
        const ast = parseOrgDocument(text);

        assert.equal(ast.preamble.length, 1);
        const src = ast.preamble[0];
        assert.equal(src.type, "src_block");
        if (src.type === "src_block") {
            assert.equal(src.blockType, "src");
            assert.equal(src.lang, "bash");
            assert.equal(src.params, "-n");
            assert.deepEqual(src.content, ["sudo evtest /dev/input/mouse0"]);
        }
    });
});
