/**
 * DOM Management Types
 */

export interface CodeBlockRecord {
    blockEl: HTMLElement;
    preEl: HTMLElement;
    codeEl: HTMLElement;
    renderedEl: HTMLElement;
    toolbarEl: HTMLElement;
    toggleBtn: HTMLButtonElement;
    foldAllBtn: HTMLButtonElement;
    copyOrgBtn: HTMLButtonElement;
    isRendered: boolean;
    allFolded: boolean;
    lastText: string;
}
