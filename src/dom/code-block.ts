/**
 * Code Block Lifecycle and Streaming Controller
 */

import { OrgParser } from "../parser/index.ts";
import { SettingsStore } from "../storage/settings-store.ts";
import { CodeBlockRecord } from "../types/dom.ts";
import { createCodeBlockToolbar } from "../ui/toolbar.ts";
import { setupInteractiveListeners } from "./interactive.ts";

export class CodeBlockManager {
    private registry = new Map<string, CodeBlockRecord>();
    private blockElements = new WeakMap<HTMLElement, string>();
    private store: SettingsStore;
    private blockIdCounter = 0;

    constructor(store: SettingsStore) {
        this.store = store;
    }

    private getBlockText(codeEl: HTMLElement): string {
        // textContent preserves raw source line breaks and indentation without layout interference
        return (codeEl.textContent || codeEl.innerText || "").replace(/\r\n/g, "\n");
    }

    private findHeader(blockEl: HTMLElement): HTMLElement | null {
        let header = blockEl.querySelector<HTMLElement>(".code-block-decoration") ||
            blockEl.querySelector<HTMLElement>(".code-block-decoration-header") ||
            blockEl.querySelector<HTMLElement>("header") ||
            blockEl.querySelector<HTMLElement>(".header-content");

        if (!header && blockEl.parentElement?.classList.contains("code-block-wrapper")) {
            header = blockEl.parentElement.querySelector<HTMLElement>(".code-block-decoration");
        }

        return header;
    }

    getRecord(id: string): CodeBlockRecord | undefined {
        return this.registry.get(id);
    }

    getAllRecords(): CodeBlockRecord[] {
        return Array.from(this.registry.values());
    }

    prune(): void {
        for (const [id, record] of this.registry.entries()) {
            if (!record.blockEl.isConnected) {
                this.registry.delete(id);
            }
        }
    }

    process(blockEl: HTMLElement): void {
        if (!blockEl || typeof blockEl.querySelector !== "function") return;

        // Skip if this is a decoration/header element or inside an existing toolbar/rendered view
        if (
            blockEl.classList.contains("code-block-decoration") ||
            blockEl.classList.contains("code-block-decoration-header") ||
            blockEl.classList.contains("org-block-toolbar") ||
            blockEl.classList.contains("org-rendered-view") ||
            blockEl.closest(".org-rendered-view, .org-block-toolbar")
        ) {
            return;
        }

        // 1. Check if this block is already registered (Dynamic streaming updates)
        const existingId = this.blockElements.get(blockEl) || blockEl.getAttribute("data-gemini-org-id");
        if (existingId && this.registry.has(existingId)) {
            const record = this.registry.get(existingId)!;
            const currentText = this.getBlockText(record.codeEl);

            if (record.lastText !== currentText) {
                record.lastText = currentText;

                // When raw content is cleared during streaming restart, clear the rendered view immediately
                if (!currentText.trim()) {
                    record.renderedEl.innerHTML = "";
                    return;
                }

                if (record.isRendered) {
                    record.renderedEl.innerHTML = OrgParser.render(currentText);
                    setupInteractiveListeners(record.renderedEl);
                } else if (this.store.settings.autoRenderOrg && OrgParser.isOrgContent(currentText)) {
                    // Dynamically activate Org rendering when streaming content satisfies detector threshold
                    record.renderedEl.innerHTML = OrgParser.render(currentText);
                    setupInteractiveListeners(record.renderedEl);
                    record.isRendered = true;
                    record.preEl.style.display = "none";
                    record.renderedEl.style.display = "block";
                    record.toggleBtn.classList.add("is-active");
                    record.toggleBtn.title = "Org rendered (click to view raw code)";
                    record.foldAllBtn.style.display = "inline-flex";
                    record.allFolded = false;
                    const foldSpan = record.foldAllBtn.querySelector("span");
                    if (foldSpan) foldSpan.textContent = "Fold All";
                }
            }
            return;
        }

        // 2. Skip if block already has an injected toolbar
        if (blockEl.querySelector('[data-gemini-org="toolbar"]')) {
            return;
        }

        const preEl = blockEl.querySelector<HTMLElement>("pre") || blockEl;
        const codeEl = blockEl.querySelector<HTMLElement>("code") || preEl;
        const currentText = this.getBlockText(codeEl);

        if (!currentText.trim()) return;

        // Check if this block contains Org syntax or explicit language label
        const isOrg = OrgParser.isOrgContent(currentText);
        const headerTitle = blockEl.querySelector(".code-block-decoration-title, .language-label")?.textContent || "";
        const hasOrgTag = /\b(?:org|org-mode|orgmode)\b/i.test(headerTitle);

        if (!isOrg && !hasOrgTag) return;

        // Assign Unique Block ID
        this.blockIdCounter++;
        const blockId = `org-block-${this.blockIdCounter}`;

        blockEl.setAttribute("data-gemini-org", "root");
        blockEl.setAttribute("data-gemini-org-id", blockId);

        // Create Rendered View Container
        const renderedView = document.createElement("div");
        renderedView.className = "org-rendered-view";
        renderedView.setAttribute("data-gemini-org", "rendered-view");
        renderedView.setAttribute("data-gemini-org-block-id", blockId);
        renderedView.style.display = "none";

        // Insert rendered view after raw pre element
        if (preEl.parentNode) {
            preEl.parentNode.insertBefore(renderedView, preEl.nextSibling);
        }

        // Create Action Toolbar
        const { container: toolbar, toggleBtn, foldAllBtn } = createCodeBlockToolbar(blockId);

        // Attach Toolbar to Gemini's header actions (.buttons) without wrapping or displacing native gem-icon-buttons
        const geminiHeader = this.findHeader(blockEl);
        if (geminiHeader) {
            const actionsContainer = geminiHeader.querySelector<HTMLElement>(
                ".buttons, .code-block-decoration-actions, .header-actions",
            );
            if (actionsContainer) {
                // Insert as first sibling in the buttons container
                actionsContainer.insertBefore(toolbar, actionsContainer.firstChild);
            } else {
                const iconBtn = geminiHeader.querySelector("gem-icon-button, button, [role='button']");
                if (iconBtn && iconBtn.parentNode) {
                    iconBtn.parentNode.insertBefore(toolbar, iconBtn);
                } else {
                    geminiHeader.appendChild(toolbar);
                }
            }
        } else {
            toolbar.classList.add("org-toolbar-floating");
            blockEl.style.position = "relative";
            blockEl.insertBefore(toolbar, blockEl.firstChild);
        }

        const record: CodeBlockRecord = {
            id: blockId,
            blockEl,
            preEl,
            codeEl,
            renderedEl: renderedView,
            toolbarEl: toolbar,
            toggleBtn,
            foldAllBtn,
            isRendered: false,
            allFolded: false,
            lastText: currentText,
        };

        this.registry.set(blockId, record);
        this.blockElements.set(blockEl, blockId);

        const toggleRender = (forceState?: boolean) => {
            record.isRendered = typeof forceState === "boolean" ? forceState : !record.isRendered;

            if (record.isRendered) {
                const text = this.getBlockText(codeEl);
                record.lastText = text;
                renderedView.innerHTML = OrgParser.render(text);
                setupInteractiveListeners(renderedView);

                preEl.style.display = "none";
                renderedView.style.display = "block";
                toggleBtn.classList.add("is-active");
                toggleBtn.title = "Org rendered (click to view raw code)";
                foldAllBtn.style.display = "inline-flex";

                // Reset fold state to expanded to match fresh render
                record.allFolded = false;
                const foldSpan = foldAllBtn.querySelector("span");
                if (foldSpan) foldSpan.textContent = "Fold All";
            } else {
                preEl.style.display = "";
                renderedView.style.display = "none";
                toggleBtn.classList.remove("is-active");
                toggleBtn.title = "Raw code (click to render Org)";
                foldAllBtn.style.display = "none";
            }
        };

        toggleBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleRender();
        });

        foldAllBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            record.allFolded = !record.allFolded;
            const sections = renderedView.querySelectorAll<HTMLElement>('.org-section, [data-gemini-org="section"]');
            sections.forEach((sec) => sec.classList.toggle("org-folded", record.allFolded));
            const span = foldAllBtn.querySelector("span");
            if (span) span.textContent = record.allFolded ? "Expand All" : "Fold All";
        });

        // Auto-render if enabled
        if (this.store.settings.autoRenderOrg) {
            toggleRender(true);
        } else {
            foldAllBtn.style.display = "none";
        }
    }
}
