/**
 * Semantic HTML Renderer for Org-Mode AST
 */

import {
    OrgContentNode,
    OrgDocument,
    OrgDrawerNode,
    OrgListNode,
    OrgSectionNode,
    OrgSrcBlockNode,
    OrgTableNode,
} from "../types/ast.ts";
import { escapeHtml, parseInline } from "./inline-lexer.ts";

let globalCheckboxCounter = 0;

export function renderContentNode(node: OrgContentNode): string {
    switch (node.type) {
        case "paragraph":
            return `<p class="org-paragraph">${parseInline(node.text)}</p>\n`;

        case "blank_line":
            return '<div class="org-blank-line"></div>\n';

        case "horizontal_rule":
            return '<hr class="org-hr"/>\n';

        case "src_block":
            return renderSrcBlock(node);

        case "drawer":
            return renderDrawer(node);

        case "table":
            return renderTable(node);

        case "list":
            return renderList(node);

        default:
            return "";
    }
}

function renderSrcBlock(node: OrgSrcBlockNode): string {
    const codeContent = escapeHtml(node.content.join("\n"));

    if (node.blockType === "src") {
        const langLabel = node.lang ? escapeHtml(node.lang.toUpperCase()) : "CODE";
        return `
      <div class="org-src-block">
        <div class="org-src-header">
          <span class="org-src-lang">${langLabel}</span>
          <button type="button" class="org-src-copy-btn" title="Copy source block">Copy</button>
        </div>
        <pre class="org-src-pre"><code>${codeContent}</code></pre>
      </div>\n`;
    }

    if (node.blockType === "example") {
        return `<div class="org-example-block"><pre><code>${codeContent}</code></pre></div>\n`;
    }

    if (node.blockType === "quote") {
        return `<blockquote class="org-quote">${node.content.map((l) => parseInline(l)).join("<br/>")}</blockquote>\n`;
    }

    if (node.blockType === "verse") {
        return `<div class="org-verse">${node.content.map((l) => parseInline(l)).join("<br/>")}</div>\n`;
    }

    if (node.blockType === "center") {
        return `<div class="org-center">${node.content.map((l) => parseInline(l)).join("<br/>")}</div>\n`;
    }

    return "";
}

function renderDrawer(node: OrgDrawerNode): string {
    let out = `<details class="org-drawer" open><summary class="org-drawer-summary"><span class="org-drawer-tag">:${
        escapeHtml(node.name)
    }:</span></summary><div class="org-drawer-body"><table class="org-drawer-table">`;
    for (const entry of node.entries) {
        if (entry.type === "kv" && entry.key) {
            out += `<tr><td class="org-prop-key">:${escapeHtml(entry.key)}:</td><td class="org-prop-val">${
                parseInline(entry.val || "")
            }</td></tr>`;
        } else if (entry.raw) {
            out += `<tr><td colspan="2" class="org-prop-raw">${parseInline(entry.raw)}</td></tr>`;
        }
    }
    out += `</table></div></details>\n`;
    return out;
}

function renderTable(node: OrgTableNode): string {
    let out = '<div class="org-table-wrapper"><table class="org-table"><tbody>';
    let isFirstRow = true;

    for (let r = 0; r < node.rows.length; r++) {
        const row = node.rows[r];
        if (row.isDivider) {
            continue;
        }

        const isHeader = isFirstRow || (node.hasHeader && r === 0);
        out += `<tr class="${isHeader ? "org-table-header-row" : ""}">`;

        for (const cell of row.cells) {
            const isNum = /^-?\d+(?:\.\d+)?%?$|^\$?\d+(?:,\d{3})*(?:\.\d+)?$/.test(cell);
            const tag = isHeader ? "th" : "td";
            const numClass = isNum ? " org-table-num" : "";
            out += `<${tag} class="${numClass}">${parseInline(cell)}</${tag}>`;
        }

        out += "</tr>";
        isFirstRow = false;
    }

    out += "</tbody></table></div>\n";
    return out;
}

function renderList(node: OrgListNode): string {
    const tag = node.isOrdered ? "ol" : "ul";
    let out = `<${tag} class="org-list" data-indent="${node.indent}">\n`;

    for (const item of node.items) {
        if (item.checkbox !== "none") {
            globalCheckboxCounter++;
            const isChecked = item.checkbox === "checked";
            const isPartial = item.checkbox === "partial";
            out += `  <li class="org-list-item org-checkbox-item">
    <input type="checkbox" class="org-checkbox" id="org-cb-${globalCheckboxCounter}" ${isChecked ? "checked" : ""} ${
                isPartial ? 'data-indeterminate="true"' : ""
            } data-cb-id="${globalCheckboxCounter}">
    <label for="org-cb-${globalCheckboxCounter}" class="org-checkbox-label ${isChecked ? "org-checked" : ""}">${
                parseInline(item.text)
            }</label>
  </li>\n`;
        } else if (item.term) {
            out += `  <li class="org-list-item org-desc-item"><strong class="org-desc-term">${
                parseInline(item.term)
            }</strong>: <span class="org-desc-def">${parseInline(item.text)}</span></li>\n`;
        } else {
            out += `  <li class="org-list-item">${parseInline(item.text)}</li>\n`;
        }
    }

    out += `</${tag}>\n`;
    return out;
}

export function renderSection(section: OrgSectionNode): string {
    const { heading, body, children } = section;
    const level = heading.level;

    let tagsHtml = "";
    if (heading.tags.length > 0) {
        tagsHtml = `<span class="org-tags">${
            heading.tags.map((t) => `<span class="org-tag">:${escapeHtml(t)}:</span>`).join("")
        }</span>`;
    }

    let statusHtml = "";
    if (heading.status) {
        statusHtml = `<span class="org-status org-status-${heading.status}">${heading.status}</span>`;
    }

    let priorityHtml = "";
    if (heading.priority) {
        priorityHtml = `<span class="org-priority org-priority-${escapeHtml(heading.priority)}">[#${
            escapeHtml(heading.priority)
        }]</span>`;
    }

    let statsHtml = "";
    if (heading.statsCookie) {
        statsHtml = `<span class="org-stats-cookie">${escapeHtml(heading.statsCookie)}</span>`;
    }

    let bodyHtml = "";
    for (const node of body) {
        bodyHtml += renderContentNode(node);
    }

    let childrenHtml = "";
    for (const child of children) {
        childrenHtml += renderSection(child);
    }

    return `
    <div class="org-section org-sec-${level}" data-level="${level}">
      <div class="org-heading org-h${level}" data-level="${level}">
        <button type="button" class="org-fold-btn" aria-label="Toggle section"><span class="org-fold-icon">▼</span></button>
        <span class="org-heading-title">${statusHtml}${priorityHtml}${statsHtml}${parseInline(heading.title)}</span>
        ${tagsHtml}
      </div>
      <div class="org-section-content" data-level="${level}">
        ${bodyHtml}
        ${childrenHtml}
      </div>
    </div>\n`;
}

export function renderDocument(doc: OrgDocument): string {
    let metaHtml = "";
    if (doc.metadata.length > 0) {
        metaHtml = '<div class="org-meta-banner">';
        for (const m of doc.metadata) {
            metaHtml += `<div class="org-meta-row"><span class="org-meta-key">#+${
                escapeHtml(m.key)
            }:</span> <span class="org-meta-val">${parseInline(m.val)}</span></div>`;
        }
        metaHtml += "</div>\n";
    }

    let preambleHtml = "";
    for (const node of doc.preamble) {
        preambleHtml += renderContentNode(node);
    }

    let sectionsHtml = "";
    for (const section of doc.sections) {
        sectionsHtml += renderSection(section);
    }

    return metaHtml + preambleHtml + sectionsHtml;
}
