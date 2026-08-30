/**
 * DOM Management Types
 */

export interface CodeBlockRecord {
    id: string;
    blockEl: HTMLElement;
    preEl: HTMLElement;
    codeEl: HTMLElement;
    renderedEl: HTMLElement;
    toolbarEl: HTMLElement;
    toggleBtn: HTMLButtonElement;
    foldAllBtn: HTMLButtonElement;
    isRendered: boolean;
    allFolded: boolean;
    lastText: string;
}
