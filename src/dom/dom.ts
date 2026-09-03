/**
 * DOM Management Types
 */

import { OrgDocument } from "../org/types/ast.ts";

export interface CodeBlockRecord {
    id: string;
    blockEl: HTMLElement;
    preEl: HTMLElement;
    codeEl: HTMLElement;
    renderedEl: HTMLElement;
    toolbarMountEl: HTMLElement;
    isRendered: boolean;
    allFolded: boolean;
    lastText: string;
    cachedDoc?: OrgDocument;
}

export interface BlockDomStructure {
    decoration: HTMLElement | null;
    codeContainer: HTMLElement;
    preEl: HTMLElement;
}
