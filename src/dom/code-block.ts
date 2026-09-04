/**
 * Code Block Lifecycle and Rendering Controller for Gemini UI
 * Encapsulates in-situ DOM injection, Preact mounting, and AST caching behind a deep module interface.
 */

import { h, render } from "preact";
import {
    SELECTOR_ACTIONS,
    SELECTOR_CODE_CONTAINER,
    SELECTOR_DECORATION,
    SELECTOR_LANG_SPAN,
} from "../constants.ts";
import { globalLanguageRegistry } from "../languages/index.ts";
import {
    globalToolbarRegistry,
    OrgDocumentView,
    OrgToolbar,
    parseOrgDocument,
    ToolbarToolRegistry,
} from "../org/index.ts";
import { SettingsStore } from "../storage/settings-store.ts";
import { CodeBlockRecord } from "./dom.ts";

export class CodeBlockController {
    private registry = new Map<string, CodeBlockRecord>();
    private blockElements = new WeakMap<HTMLElement, string>();
    private store: SettingsStore;
    private toolbarRegistry: ToolbarToolRegistry;
    private blockIdCounter = 0;

    constructor(
        store: SettingsStore,
        toolbarRegistry: ToolbarToolRegistry = globalToolbarRegistry,
    ) {
        this.store = store;
        this.toolbarRegistry = toolbarRegistry;
    }

    public getToolbarRegistry(): ToolbarToolRegistry {
        return this.toolbarRegistry;
    }

    public getRecord(id: string): CodeBlockRecord | undefined {
        return this.registry.get(id);
    }

    public getRecordByElement(blockEl: HTMLElement): CodeBlockRecord | undefined {
        const id = this.blockElements.get(blockEl) || blockEl.getAttribute("data-gemini-org-id");
        return id ? this.registry.get(id) : undefined;
    }

    public getAllRecords(): CodeBlockRecord[] {
        return Array.from(this.registry.values());
    }

    /**
     * Extracts the raw code text content from a code element
     */
    public extractCodeText(codeEl: HTMLElement): string {
        return (codeEl.textContent || codeEl.innerText || "").replace(/\r\n/g, "\n");
    }

    /**
     * Mounts the Org rendered view container adjacent to the raw pre element
     */
    private createRenderedView(blockId: string, preEl: HTMLElement): HTMLElement {
        const renderedView = document.createElement("div");
        renderedView.className = "org-rendered-view";
        renderedView.setAttribute("data-gemini-org", "rendered-view");
        renderedView.setAttribute("data-gemini-org-block-id", blockId);
        renderedView.style.display = "none";

        if (preEl.parentNode) {
            preEl.parentNode.insertBefore(renderedView, preEl.nextSibling);
        }

        return renderedView;
    }

    /**
     * Injects the action toolbar mount container into Gemini's header buttons container or floats it
     */
    private mountToolbarContainer(
        blockEl: HTMLElement,
        headerEl: HTMLElement | null,
    ): HTMLElement {
        const toolbarMount = document.createElement("div");
        toolbarMount.className = "org-toolbar-container";

        if (headerEl) {
            const actionsContainer = headerEl.querySelector<HTMLElement>(SELECTOR_ACTIONS);
            if (actionsContainer) {
                actionsContainer.insertBefore(toolbarMount, actionsContainer.firstChild);
                return toolbarMount;
            }

            const iconBtn = headerEl.querySelector("gem-icon-button, button, [role='button']");
            if (iconBtn && iconBtn.parentNode) {
                iconBtn.parentNode.insertBefore(toolbarMount, iconBtn);
                return toolbarMount;
            }

            headerEl.appendChild(toolbarMount);
        } else {
            toolbarMount.classList.add("org-toolbar-floating");
            blockEl.style.position = "relative";
            blockEl.insertBefore(toolbarMount, blockEl.firstChild);
        }

        return toolbarMount;
    }

    /**
     * Updates the Preact Toolbar view for a given block record
     */
    private updateToolbar(record: CodeBlockRecord): void {
        const langTools = record.lang ? globalLanguageRegistry.getToolsForLanguage(record.lang) : [];
        const baseTools = this.toolbarRegistry.getAll();
        // Merge base tools and language-specific tools, avoiding duplicate tool IDs
        const toolMap = new Map<string, typeof baseTools[0]>();
        for (const t of baseTools) toolMap.set(t.id, t);
        for (const t of langTools) toolMap.set(t.id, t);
        const mergedTools = Array.from(toolMap.values()).sort((a, b) => (a.order ?? 50) - (b.order ?? 50));

        render(
            h(OrgToolbar, {
                blockId: record.id,
                isRendered: record.isRendered,
                allFolded: record.allFolded,
                onToggleRender: () => this.toggleRender(record),
                onToggleFold: () => this.toggleFold(record),
                tools: mergedTools,
                extraContext: {
                    record,
                    controller: this,
                    lang: record.lang,
                },
            }),
            record.toolbarMountEl,
        );
    }

    /**
     * Handles live streaming content updates for an already registered code block
     */
    public handleStreamingUpdate(record: CodeBlockRecord, currentText: string): void {
        if (record.lastText === currentText) return;
        record.lastText = currentText;

        // Invalidate cached AST on text change
        record.cachedDoc = undefined;

        if (!currentText.trim()) {
            record.renderedEl.textContent = "";
            return;
        }

        if (record.isRendered) {
            record.cachedDoc = parseOrgDocument(currentText);
            render(
                h(OrgDocumentView, {
                    doc: record.cachedDoc,
                    forceFoldAll: record.allFolded,
                }),
                record.renderedEl,
            );
        }
    }

    /**
     * Toggles rendering between Org-mode view and raw code view
     */
    public toggleRender(recordOrId: CodeBlockRecord | string, forceState?: boolean): void {
        const record = typeof recordOrId === "string" ? this.registry.get(recordOrId) : recordOrId;
        if (!record) return;

        record.isRendered = typeof forceState === "boolean" ? forceState : !record.isRendered;

        if (record.isRendered) {
            const text = this.extractCodeText(record.codeEl);
            record.lastText = text;

            if (!record.cachedDoc) {
                record.cachedDoc = parseOrgDocument(text);
            }

            render(
                h(OrgDocumentView, {
                    doc: record.cachedDoc,
                    forceFoldAll: record.allFolded,
                }),
                record.renderedEl,
            );

            record.preEl.style.display = "none";
            record.renderedEl.style.display = "block";
        } else {
            record.preEl.style.display = "";
            record.renderedEl.style.display = "none";
        }

        this.updateToolbar(record);
    }

    /**
     * Toggles folding / unfolding of all outline sections in this block
     */
    public toggleFold(recordOrId: CodeBlockRecord | string, forceState?: boolean): void {
        const record = typeof recordOrId === "string" ? this.registry.get(recordOrId) : recordOrId;
        if (!record) return;

        record.allFolded = typeof forceState === "boolean" ? forceState : !record.allFolded;

        if (record.isRendered && record.cachedDoc) {
            render(
                h(OrgDocumentView, {
                    doc: record.cachedDoc,
                    forceFoldAll: record.allFolded,
                }),
                record.renderedEl,
            );
        }

        this.updateToolbar(record);
    }

    /**
     * Toggles Org rendering across all registered blocks
     */
    public toggleRenderAll(forceState?: boolean): void {
        const records = this.getAllRecords();
        const targetState = typeof forceState === "boolean"
            ? forceState
            : records.some((r) => !r.isRendered);

        for (const record of records) {
            this.toggleRender(record, targetState);
        }
    }

    /**
     * Toggles fold/expand across all currently rendered Org blocks
     */
    public toggleFoldAll(forceState?: boolean): void {
        const renderedRecords = this.getAllRecords().filter((r) => r.isRendered);
        if (renderedRecords.length === 0) return;

        const targetFold = typeof forceState === "boolean"
            ? forceState
            : renderedRecords.some((r) => !r.allFolded);

        for (const record of renderedRecords) {
            this.toggleFold(record, targetFold);
        }
    }

    /**
     * Unmounts and cleans up a specific code block
     */
    public unmount(blockEl: HTMLElement): void {
        const record = this.getRecordByElement(blockEl);
        if (!record) return;

        render(null, record.renderedEl);
        render(null, record.toolbarMountEl);

        record.renderedEl.remove();
        record.toolbarMountEl.remove();

        this.registry.delete(record.id);
        this.blockElements.delete(blockEl);
    }

    /**
     * Prunes disconnected DOM nodes to prevent memory leaks during SPA navigation
     */
    public prune(): void {
        for (const [id, record] of this.registry.entries()) {
            if (!record.blockEl.isConnected) {
                render(null, record.renderedEl);
                render(null, record.toolbarMountEl);
                this.registry.delete(id);
                this.blockElements.delete(record.blockEl);
            }
        }
    }

    /**
     * Registers and mounts an Org code block into the controller lifecycle
     */
    public process(blockEl: HTMLElement): CodeBlockRecord | undefined {
        if (!blockEl || typeof blockEl.querySelector !== "function") return undefined;

        // Check if block is already registered
        const existingRecord = this.getRecordByElement(blockEl);
        if (existingRecord) {
            const currentText = this.extractCodeText(existingRecord.codeEl);
            this.handleStreamingUpdate(existingRecord, currentText);
            return existingRecord;
        }

        // Locate code container and header using canonical selectors
        const codeEl = blockEl.querySelector<HTMLElement>(SELECTOR_CODE_CONTAINER) ||
            blockEl.querySelector<HTMLElement>("code") ||
            blockEl.querySelector<HTMLElement>("pre") ||
            blockEl;
        const preEl = blockEl.querySelector<HTMLElement>("pre") || blockEl;
        const headerEl = blockEl.querySelector<HTMLElement>(SELECTOR_DECORATION);
        const currentText = this.extractCodeText(codeEl);

        // Assign Unique Block ID
        this.blockIdCounter++;
        const blockId = `org-block-${this.blockIdCounter}`;

        blockEl.setAttribute("data-gemini-org", "root");
        blockEl.setAttribute("data-gemini-org-id", blockId);

        // Create Rendered View Container
        const renderedView = this.createRenderedView(blockId, preEl);

        // Create Toolbar Mount Container
        const toolbarMount = this.mountToolbarContainer(blockEl, headerEl);

        // Extract language from header decoration or default to org
        const langSpan = headerEl?.querySelector<HTMLElement>(SELECTOR_LANG_SPAN);
        const rawLang = langSpan?.textContent?.trim() || "";
        const langDef = globalLanguageRegistry.resolve(rawLang);
        const lang = langDef ? langDef.id : (rawLang.toLowerCase() || "org");

        const record: CodeBlockRecord = {
            id: blockId,
            blockEl,
            preEl,
            codeEl,
            renderedEl: renderedView,
            toolbarMountEl: toolbarMount,
            isRendered: false,
            allFolded: false,
            lastText: currentText,
            lang,
        };

        this.registry.set(blockId, record);
        this.blockElements.set(blockEl, blockId);

        // Initial Toolbar Render
        this.updateToolbar(record);

        // Auto-render if enabled
        if (this.store.settings.autoRenderOrg) {
            this.toggleRender(record, true);
        }

        return record;
    }
}
