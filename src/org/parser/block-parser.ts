/**
 * Org-Mode Block Parser building Typed AST
 * Supports Hierarchical Lists, LaTeX environments, Collapsible Source Blocks & Results.
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
    OrgSrcBlockNode,
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
    const sectionStack: OrgSectionNode[] = [];

    function currentContainer(): OrgContentNode[] {
        if (sectionStack.length > 0) {
            return sectionStack[sectionStack.length - 1].body;
        }
        return doc.preamble;
    }

    // Collectors
    let inSrc = false;
    let srcBlockType: OrgBlockType = "src";
    let srcLang = "";
    let srcParams = "";
    let srcName: string | undefined;
    let srcBuffer: string[] = [];

    let inLatexEnv = false;
    let latexEnvName = "";
    let latexBuffer: string[] = [];

    let inDrawer = false;
    let drawerName = "PROPERTIES";
    let drawerEntries: OrgDrawerEntry[] = [];

    let inTable = false;
    let tableRows: OrgTableRow[] = [];

    // Hierarchical list building
    let inList = false;
    let rawListItems: Array<{
        indent: number;
        isOrdered: boolean;
        bullet: string;
        checkbox: OrgCheckboxState;
        term?: string;
        text: string;
    }> = [];

    function flushList() {
        if (!inList || rawListItems.length === 0) return;

        // Build hierarchical tree from raw items based on indentation
        const rootItems: OrgListItemNode[] = [];
        const itemStack: OrgListItemNode[] = [];

        for (const raw of rawListItems) {
            const node: OrgListItemNode = {
                type: "list_item",
                indent: raw.indent,
                isOrdered: raw.isOrdered,
                bullet: raw.bullet,
                checkbox: raw.checkbox,
                term: raw.term,
                text: raw.text,
                children: [],
            };

            while (itemStack.length > 0 && itemStack[itemStack.length - 1].indent >= raw.indent) {
                itemStack.pop();
            }

            if (itemStack.length > 0) {
                itemStack[itemStack.length - 1].children.push(node);
            } else {
                rootItems.push(node);
            }

            itemStack.push(node);
        }

        const isOrdered = rawListItems[0].isOrdered;
        const baseIndent = rawListItems[0].indent;

        currentContainer().push({
            type: "list",
            isOrdered,
            indent: baseIndent,
            items: rootItems,
        });

        inList = false;
        rawListItems = [];
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

    let pendingBlockName: string | undefined;

    for (let i = 0; i < lines.length; i++) {
        const rawLine = lines[i];
        const line = rawLine.trimEnd();
        const trimmed = line.trim();

        // 1. Multi-line LaTeX Environment (\begin{equation} ... \end{equation})
        const latexStartMatch = trimmed.match(/^\\begin\{([a-zA-Z*]+)\}/);
        if (latexStartMatch && !inLatexEnv && !inSrc) {
            flushList();
            flushTable();
            inLatexEnv = true;
            latexEnvName = latexStartMatch[1];
            latexBuffer = [rawLine];
            if (trimmed.includes(`\\end{${latexEnvName}}`)) {
                inLatexEnv = false;
                currentContainer().push({
                    type: "latex_block",
                    environment: latexEnvName,
                    content: latexBuffer.join("\n"),
                });
                latexBuffer = [];
            }
            continue;
        }
        if (inLatexEnv) {
            latexBuffer.push(rawLine);
            if (trimmed.includes(`\\end{${latexEnvName}}`)) {
                inLatexEnv = false;
                currentContainer().push({
                    type: "latex_block",
                    environment: latexEnvName,
                    content: latexBuffer.join("\n"),
                });
                latexBuffer = [];
            }
            continue;
        }

        // 2. Block Display Math ($$...$$ or \[...\])
        if (!inSrc && (trimmed.startsWith("$$") || trimmed.startsWith("\\["))) {
            flushList();
            flushTable();
            if (
                (trimmed.startsWith("$$") && trimmed.endsWith("$$") && trimmed.length > 3) ||
                (trimmed.startsWith("\\[") && trimmed.endsWith("\\]") && trimmed.length > 3)
            ) {
                const mathContent = trimmed.startsWith("$$") ? trimmed.slice(2, -2) : trimmed.slice(2, -2);
                currentContainer().push({
                    type: "latex_block",
                    content: mathContent.trim(),
                });
                continue;
            }
        }

        // 3. Source & Special Blocks (#+BEGIN_SRC, #+BEGIN_EXAMPLE, #+BEGIN_QUOTE, etc.)
        const blockStartMatch = trimmed.match(/^#\+BEGIN_([A-Za-z]+)(?:\s+([\w+-]+))?(?:\s+(.*))?$/i);
        if (blockStartMatch && !inSrc) {
            flushList();
            flushTable();
            inSrc = true;
            const bType = blockStartMatch[1].toLowerCase() as OrgBlockType;
            srcBlockType = ["src", "example", "quote", "verse", "center", "comment", "results"].includes(bType)
                ? bType
                : "src";
            srcLang = blockStartMatch[2] || "";
            srcParams = blockStartMatch[3] || "";
            srcName = pendingBlockName;
            pendingBlockName = undefined;
            srcBuffer = [];
            continue;
        }
        if (inSrc) {
            if (/^#\+END_[A-Za-z]+/i.test(trimmed)) {
                inSrc = false;
                const srcNode: OrgSrcBlockNode = {
                    type: "src_block",
                    blockType: srcBlockType,
                    lang: srcLang,
                    name: srcName,
                    params: srcParams,
                    content: srcBuffer,
                };
                currentContainer().push(srcNode);
                srcBuffer = [];
            } else {
                srcBuffer.push(rawLine);
            }
            continue;
        }

        // 4. Standalone #+RESULTS: Block Output Association
        const resultsMatch = trimmed.match(/^#\+RESULTS:(?:\s+(\S+))?/i);
        if (resultsMatch) {
            flushList();
            flushTable();
            const resultsName = resultsMatch[1];
            const resultLines: string[] = [];

            // Peek forward to gather following verbatim colon lines (: output) or example block
            let j = i + 1;
            while (j < lines.length) {
                const nextLine = lines[j].trimEnd();
                const nextTrimmed = nextLine.trim();
                if (nextTrimmed.startsWith(": ")) {
                    resultLines.push(nextTrimmed.slice(2));
                    j++;
                } else if (nextTrimmed === ":") {
                    resultLines.push("");
                    j++;
                } else {
                    break;
                }
            }

            if (resultLines.length > 0) {
                i = j - 1; // Advance main line counter

                // Attach to preceding src block in current container (search backward, ignoring blank lines)
                const container = currentContainer();
                let targetSrc: OrgSrcBlockNode | undefined;

                for (let k = container.length - 1; k >= 0; k--) {
                    const node = container[k];
                    if (node.type === "src_block") {
                        if (!resultsName || node.name === resultsName || !targetSrc) {
                            targetSrc = node;
                            break;
                        }
                    }
                }

                if (targetSrc) {
                    targetSrc.results = {
                        name: resultsName,
                        content: resultLines,
                    };
                } else {
                    container.push({
                        type: "src_block",
                        blockType: "results",
                        name: resultsName,
                        content: resultLines,
                    });
                }
                continue;
            }
        }

        // 5. #+NAME: directive for attaching to subsequent block
        const nameMatch = trimmed.match(/^#\+NAME:\s*(\S+)/i);
        if (nameMatch) {
            pendingBlockName = nameMatch[1];
            continue;
        }

        // 6. Drawers (:PROPERTIES:, :LOGBOOK: ... :END:)
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

        // 7. Metadata Directives (#+TITLE, #+AUTHOR, #+DATE, #+OPTIONS, etc.)
        const metaMatch = trimmed.match(/^#\+([A-Za-z0-9_-]+):(?:\s+(.*))?$/);
        if (metaMatch) {
            flushList();
            flushTable();
            const key = metaMatch[1].toUpperCase();
            const val = metaMatch[2] ? metaMatch[2].trim() : "";
            doc.metadata.push({ key, val });
            continue;
        }

        // 8. Horizontal Rules (-----)
        if (/^-----+\s*$/.test(trimmed)) {
            flushList();
            flushTable();
            currentContainer().push({ type: "horizontal_rule" });
            continue;
        }

        // 9. Tables (| col1 | col2 |)
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

        // 10. Headlines (*, **, *** ...) with Recursive Tree Nesting
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

            closeSectionsDownTo(level);

            if (sectionStack.length > 0) {
                sectionStack[sectionStack.length - 1].children.push(newSection);
            } else {
                doc.sections.push(newSection);
            }

            sectionStack.push(newSection);
            continue;
        }

        // 11. Lists & Checkboxes
        // Checkbox item: - [ ], + [X], - [-], 1. [ ]
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

            rawListItems.push({
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

            rawListItems.push({
                indent,
                isOrdered,
                bullet,
                checkbox: "none",
                term,
                text,
            });
            continue;
        }

        // Non-list line closes lists
        flushList();

        // 12. Blank lines and Paragraphs
        if (trimmed === "") {
            const container = currentContainer();
            if (container.length > 0 && container[container.length - 1].type !== "blank_line") {
                container.push({ type: "blank_line" });
            }
        } else {
            currentContainer().push({ type: "paragraph", text: line });
        }
    }

    // Final flushes
    flushList();
    flushTable();

    return doc;
}
