/**
 * Org-Mode AST Type Definitions
 */

export interface OrgMetadata {
    key: string;
    val: string;
}

export type OrgBlockType = "src" | "example" | "quote" | "verse" | "center" | "comment";

export interface OrgSrcBlockNode {
    type: "src_block";
    blockType: OrgBlockType;
    lang?: string;
    params?: string;
    content: string[];
}

export interface OrgDrawerEntry {
    type: "kv" | "raw";
    key?: string;
    val?: string;
    raw?: string;
}

export interface OrgDrawerNode {
    type: "drawer";
    name: string;
    entries: OrgDrawerEntry[];
}

export interface OrgTableRow {
    isDivider: boolean;
    cells: string[];
}

export interface OrgTableNode {
    type: "table";
    hasHeader: boolean;
    rows: OrgTableRow[];
}

export type OrgCheckboxState = "unchecked" | "checked" | "partial" | "none";

export interface OrgListItemNode {
    type: "list_item";
    indent: number;
    isOrdered: boolean;
    bullet: string;
    checkbox: OrgCheckboxState;
    text: string;
    term?: string; // For definition lists: Term :: Description
}

export interface OrgListNode {
    type: "list";
    isOrdered: boolean;
    indent: number;
    items: OrgListItemNode[];
}

export interface OrgParagraphNode {
    type: "paragraph";
    text: string;
}

export interface OrgBlankLineNode {
    type: "blank_line";
}

export interface OrgHorizontalRuleNode {
    type: "horizontal_rule";
}

export type OrgContentNode =
    | OrgParagraphNode
    | OrgBlankLineNode
    | OrgHorizontalRuleNode
    | OrgSrcBlockNode
    | OrgDrawerNode
    | OrgTableNode
    | OrgListNode;

export interface OrgHeading {
    level: number;
    rawText: string;
    title: string;
    status?: string; // TODO, DONE, WAITING, etc.
    priority?: string; // A, B, C
    tags: string[];
    statsCookie?: string; // [2/5] or [40%]
}

export interface OrgSectionNode {
    type: "section";
    heading: OrgHeading;
    body: OrgContentNode[];
    children: OrgSectionNode[]; // Subtrees of level > this.level
}

export interface OrgDocument {
    metadata: OrgMetadata[];
    preamble: OrgContentNode[]; // Nodes before the first headline
    sections: OrgSectionNode[]; // Top-level headlines
}
