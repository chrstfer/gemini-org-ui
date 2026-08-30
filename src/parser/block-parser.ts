/**
 * Org-Mode Line-by-Line Block Parser building typed AST
 */

import {
    OrgBlockType,
    OrgCheckboxState,
    OrgContentNode,
    OrgDocument,
    OrgDrawerEntry,
    OrgHeading,
    OrgListItemNode,
    OrgSectionNode,
    OrgTableRow,
} from "../types/ast.ts";

export function parseOrgDocument(rawOrg: string): OrgDocument {
    const doc: OrgDocument = {
        metadata: [],
        preamble: [],
        sections: [],
    };

    if (!rawOrg || typeof rawOrg !== "string") return doc;

    const lines = rawOrg.split("\n");

    // Stack of currently open sections for recursive outline nesting
    const sectionStack: OrgSectionNode[] = [];

    function currentContainer(): OrgContentNode[] {
        if (sectionStack.length > 0) {
            return sectionStack[sectionStack.length - 1].body;
        }
        return doc.preamble;
    }

    // Temporary collectors for multi-line block constructs
    let inSrc = false;
    let srcBlockType: OrgBlockType = "src";
    let srcLang = "";
    let srcParams = "";
    let srcBuffer: string[] = [];

    let inDrawer = false;
    let drawerName = "PROPERTIES";
    let drawerEntries: OrgDrawerEntry[] = [];

    let inTable = false;
    let tableRows: OrgTableRow[] = [];

    let inList = false;
    let listItems: OrgListItemNode[] = [];

    function flushList() {
        if (!inList || listItems.length === 0) return;
        const isOrdered = listItems[0].isOrdered;
        const indent = listItems[0].indent;
        currentContainer().push({
            type: "list",
            isOrdered,
            indent,
            items: listItems,
        });
        inList = false;
        listItems = [];
    }

    function flushTable() {
        if (!inTable || tableRows.length === 0) return;
        const hasDivider = tableRows.some((r) => r.isDivider);
        currentContainer().push({
            type: "table",
            hasHeader: hasDivider || tableRows.length > 1,
            rows: tableRows,
        });
        inTable = false;
        tableRows = [];
    }

    function closeSectionsDownTo(targetLevel: number) {
        while (sectionStack.length > 0 && sectionStack[sectionStack.length - 1].heading.level >= targetLevel) {
            sectionStack.pop();
        }
    }

    for (let i = 0; i < lines.length; i++) {
        const rawLine = lines[i];
        const line = rawLine.trimEnd();
        const trimmed = line.trim();

        // 1. Source & Special Blocks (#+BEGIN_SRC, #+BEGIN_EXAMPLE, #+BEGIN_QUOTE, etc.)
        const blockStartMatch = trimmed.match(/^#\+BEGIN_([A-Za-z]+)(?:\s+([\w+-]+))?(?:\s+(.*))?$/i);
        if (blockStartMatch && !inSrc) {
            flushList();
            flushTable();
            inSrc = true;
            const bType = blockStartMatch[1].toLowerCase() as OrgBlockType;
            srcBlockType = ["src", "example", "quote", "verse", "center", "comment"].includes(bType) ? bType : "src";
            srcLang = blockStartMatch[2] || "";
            srcParams = blockStartMatch[3] || "";
            srcBuffer = [];
            continue;
        }
        if (inSrc) {
            if (/^#\+END_[A-Za-z]+/i.test(trimmed)) {
                inSrc = false;
                currentContainer().push({
                    type: "src_block",
                    blockType: srcBlockType,
                    lang: srcLang,
                    params: srcParams,
                    content: srcBuffer,
                });
                srcBuffer = [];
            } else {
                srcBuffer.push(rawLine);
            }
            continue;
        }

        // 2. Drawers (:PROPERTIES:, :LOGBOOK:, :DRAWER: ... :END:)
        const drawerMatch = trimmed.match(/^:([A-Za-z0-9_-]+):\s*$/);
        if (drawerMatch && !inDrawer) {
            flushList();
            flushTable();
            inDrawer = true;
            drawerName = drawerMatch[1].toUpperCase();
            drawerEntries = [];
            continue;
        }
        if (inDrawer) {
            if (/^:END:\s*$/i.test(trimmed)) {
                inDrawer = false;
                currentContainer().push({
                    type: "drawer",
                    name: drawerName,
                    entries: drawerEntries,
                });
                drawerEntries = [];
            } else {
                const kvMatch = trimmed.match(/^:([^:]+):\s*(.*)$/);
                if (kvMatch) {
                    drawerEntries.push({ type: "kv", key: kvMatch[1], val: kvMatch[2] });
                } else {
                    drawerEntries.push({ type: "raw", raw: trimmed });
                }
            }
            continue;
        }

        // 3. Metadata Directives (#+TITLE, #+AUTHOR, #+DATE, #+OPTIONS, etc.)
        const metaMatch = trimmed.match(/^#\+([A-Za-z0-9_-]+):(?:\s+(.*))?$/);
        if (metaMatch) {
            flushList();
            flushTable();
            const key = metaMatch[1].toUpperCase();
            const val = metaMatch[2] ? metaMatch[2].trim() : "";
            doc.metadata.push({ key, val });
            continue;
        }

        // 4. Horizontal Rules (-----)
        if (/^-----+\s*$/.test(trimmed)) {
            flushList();
            flushTable();
            currentContainer().push({ type: "horizontal_rule" });
            continue;
        }

        // 5. Tables (| col1 | col2 |)
        if (/^\s*\|.*\|\s*$/.test(line)) {
            flushList();
            inTable = true;
            const isDivider = /^\s*\|[-+\s|]+\|\s*$/.test(line);
            const cells = isDivider ? [] : line.split("|").slice(1, -1).map((c) => c.trim());
            tableRows.push({ isDivider, cells });
            continue;
        } else if (inTable) {
            flushTable();
        }

        // 6. Headlines (*, **, *** ...) with Recursive Tree Nesting
        const headlineMatch = line.match(/^(\*{1,6})\s+(.*)$/);
        if (headlineMatch) {
            flushList();
            flushTable();

            const level = headlineMatch[1].length;
            let rawTitle = headlineMatch[2].trim();

            // Extract trailing tags (:TAG1:TAG2:)
            const tags: string[] = [];
            const tagMatch = rawTitle.match(/\s+:([a-zA-Z0-9_@#:]+):\s*$/);
            if (tagMatch) {
                tags.push(...tagMatch[1].split(":").filter(Boolean));
                rawTitle = rawTitle.slice(0, tagMatch.index).trim();
            }

            // Extract status keyword
            let status: string | undefined;
            const statusMatch = rawTitle.match(
                /^(TODO|DONE|WAITING|NEXT|IN-PROGRESS|CANCELLED|HOLD|PROJECT|FIXME|BUG)\s+(.*)$/,
            );
            if (statusMatch) {
                status = statusMatch[1];
                rawTitle = statusMatch[2];
            }

            // Extract priority cookie [#A]
            let priority: string | undefined;
            const priMatch = rawTitle.match(/^\[#([A-Z])\]\s+(.*)$/);
            if (priMatch) {
                priority = priMatch[1];
                rawTitle = priMatch[2];
            }

            // Extract statistics cookie [2/5] or [40%]
            let statsCookie: string | undefined;
            const statsMatch = rawTitle.match(/^\[(\d+\/\d+|\d+%)\]\s+(.*)$/);
            if (statsMatch) {
                statsCookie = `[${statsMatch[1]}]`;
                rawTitle = statsMatch[2];
            }

            const heading: OrgHeading = {
                level,
                rawText: line,
                title: rawTitle,
                status,
                priority,
                tags,
                statsCookie,
            };

            const newSection: OrgSectionNode = {
                type: "section",
                heading,
                body: [],
                children: [],
            };

            // Close sections of level >= this level
            closeSectionsDownTo(level);

            if (sectionStack.length > 0) {
                // Nested under current open section
                sectionStack[sectionStack.length - 1].children.push(newSection);
            } else {
                // Top-level section
                doc.sections.push(newSection);
            }

            sectionStack.push(newSection);
            continue;
        }

        // 7. Lists & Checkboxes
        // Checkbox item: - [ ], + [X], 1. [ ]
        const checkMatch = line.match(/^(\s*)([-+*]|\d+[.)])\s+\[([ xX-])\]\s+(.*)$/);
        if (checkMatch) {
            inList = true;
            const indent = checkMatch[1].length;
            const bullet = checkMatch[2];
            const checkRaw = checkMatch[3].toLowerCase();
            const text = checkMatch[4];
            const isOrdered = /^\d/.test(bullet);

            let checkbox: OrgCheckboxState = "none";
            if (checkRaw === "x") checkbox = "checked";
            else if (checkRaw === "-") checkbox = "partial";
            else checkbox = "unchecked";

            listItems.push({
                type: "list_item",
                indent,
                isOrdered,
                bullet,
                checkbox,
                text,
            });
            continue;
        }

        // Bullet or numbered item: - Item or 1. Item
        const bulletMatch = line.match(/^(\s*)([-+*]|\d+[.)])\s+(.*)$/);
        if (bulletMatch) {
            inList = true;
            const indent = bulletMatch[1].length;
            const bullet = bulletMatch[2];
            const itemText = bulletMatch[3];
            const isOrdered = /^\d/.test(bullet);

            const descMatch = itemText.match(/^(.+?)\s+::\s+(.*)$/);
            let term: string | undefined;
            let text = itemText;

            if (descMatch) {
                term = descMatch[1];
                text = descMatch[2];
            }

            listItems.push({
                type: "list_item",
                indent,
                isOrdered,
                bullet,
                checkbox: "none",
                term,
                text,
            });
            continue;
        }

        // Regular line / blank line closes lists
        flushList();

        // 8. Blank lines and Paragraphs
        if (trimmed === "") {
            currentContainer().push({ type: "blank_line" });
        } else {
            currentContainer().push({ type: "paragraph", text: line });
        }
    }

    // Final cleanup
    flushList();
    flushTable();

    return doc;
}
