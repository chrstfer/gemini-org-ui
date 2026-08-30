/**
 * Code Block Lifecycle and Streaming Controller
 */

import { OrgParser } from "../parser/index.ts";
import { SettingsStore } from "../storage/settings-store.ts";
import { CodeBlockRecord } from "../types/dom.ts";
import { createCodeBlockToolbar } from "../ui/toolbar.ts";
import { setupInteractiveListeners } from "./interactive.ts";

export class CodeBlockManager {
    private registry = new WeakMap<HTMLElement, CodeBlockRecord>();
    private store: SettingsStore;

    constructor(store: SettingsStore) {
        this.store = store;
    }

    private getBlockText(codeEl: HTMLElement): string {
        return codeEl.innerText || codeEl.textContent || "";
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

    process(blockEl: HTMLElement): void {
        if (!blockEl || typeof blockEl.querySelector !== "function") return;

        const preEl = blockEl.querySelector<HTMLElement>("pre") || blockEl;
        const codeEl = blockEl.querySelector<HTMLElement>("code") || preEl;
        const currentText = this.getBlockText(codeEl);

        if (!currentText.trim()) return;

        let record = this.registry.get(blockEl);

        // If block is already registered, handle dynamic streaming updates
        if (record) {
            if (record.lastText !== currentText) {
                record.lastText = currentText;
                if (record.isRendered) {
                    record.renderedEl.innerHTML = OrgParser.render(currentText);
                    setupInteractiveListeners(record.renderedEl);
                }
            }
            return;
        }

        // Check if this block contains Org syntax or explicit language label
        const isOrg = OrgParser.isOrgContent(currentText);
        const headerTitle = blockEl.querySelector(".code-block-decoration-title, .language-label")?.textContent || "";
        const hasOrgTag = /\b(?:org|org-mode|orgmode)\b/i.test(headerTitle);

        if (!isOrg && !hasOrgTag) return;

        // Create Rendered View Container
        const renderedView = document.createElement("div");
        renderedView.className = "org-rendered-view";
        renderedView.style.display = "none";

        // Insert rendered view after raw pre element
        if (preEl.parentNode) {
            preEl.parentNode.insertBefore(renderedView, preEl.nextSibling);
        }

        // Create Action Toolbar
        const { container: toolbar, toggleBtn, foldAllBtn, copyOrgBtn } = createCodeBlockToolbar();

        // Attach Toolbar to Gemini's header or fallback floating position
        const geminiHeader = this.findHeader(blockEl);
        if (geminiHeader) {
            const copyBtn = geminiHeader.querySelector('button, [role="button"]');
            if (copyBtn?.parentNode) {
                copyBtn.parentNode.insertBefore(toolbar, copyBtn);
            } else {
                geminiHeader.appendChild(toolbar);
            }
        } else {
            toolbar.classList.add("org-toolbar-floating");
            blockEl.style.position = "relative";
            blockEl.insertBefore(toolbar, blockEl.firstChild);
        }

        record = {
            blockEl,
            preEl,
            codeEl,
            renderedEl: renderedView,
            toolbarEl: toolbar,
            toggleBtn,
            foldAllBtn,
            copyOrgBtn,
            isRendered: false,
            allFolded: false,
            lastText: currentText,
        };
        this.registry.set(blockEl, record);

        const toggleRender = (forceState?: boolean) => {
            if (!record) return;
            record.isRendered = typeof forceState === "boolean" ? forceState : !record.isRendered;

            if (record.isRendered) {
                const text = this.getBlockText(codeEl);
                record.lastText = text;
                renderedView.innerHTML = OrgParser.render(text);
                setupInteractiveListeners(renderedView);

                preEl.style.display = "none";
                renderedView.style.display = "block";
                toggleBtn.classList.add("is-active");
                const span = toggleBtn.querySelector("span");
                if (span) span.textContent = "Raw Code";
                foldAllBtn.style.display = "inline-flex";
            } else {
                preEl.style.display = "";
                renderedView.style.display = "none";
                toggleBtn.classList.remove("is-active");
                const span = toggleBtn.querySelector("span");
                if (span) span.textContent = "Org View";
                foldAllBtn.style.display = "none";
            }
        };

        toggleBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleRender();
        });

        foldAllBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            if (!record) return;
            record.allFolded = !record.allFolded;
            const sections = renderedView.querySelectorAll(".org-section");
            sections.forEach((sec) => sec.classList.toggle("org-folded", record.allFolded));
            const span = foldAllBtn.querySelector("span");
            if (span) span.textContent = record.allFolded ? "Expand All" : "Fold All";
        });

        copyOrgBtn.addEventListener("click", async (e) => {
            e.stopPropagation();
            const textToCopy = this.getBlockText(codeEl);
            try {
                if (typeof navigator !== "undefined" && navigator.clipboard) {
                    await navigator.clipboard.writeText(textToCopy);
                }
                const span = copyOrgBtn.querySelector("span");
                if (span) {
                    const orig = span.textContent;
                    span.textContent = "Copied!";
                    copyOrgBtn.classList.add("copied");
                    setTimeout(() => {
                        span.textContent = orig;
                        copyOrgBtn.classList.remove("copied");
                    }, 1800);
                }
            } catch (err) {
                console.error("[GeminiOrgMod] Failed to copy Org code:", err);
            }
        });

        // Auto-render if enabled
        if (this.store.settings.autoRenderOrg) {
            toggleRender(true);
        } else {
            foldAllBtn.style.display = "none";
        }
    }
}
