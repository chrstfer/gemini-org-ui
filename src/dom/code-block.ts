/**
 * Code Block Lifecycle and Streaming Controller for Gemini UI
 */

import { isOrgContent, renderOrgToDOM } from "../org/index.ts";
import { SettingsStore } from "../storage/settings-store.ts";
import { CodeBlockRecord } from "../types/dom.ts";
import { createCodeBlockToolbar } from "../ui/toolbar.ts";

export const KNOWN_NON_ORG_LANGUAGES = new Set([
    "python", "py", "python3", "py3",
    "javascript", "js", "jsx", "mjs", "cjs",
    "typescript", "ts", "tsx", "mts", "cts",
    "c", "cpp", "c++", "cc", "cxx", "h", "hpp", "csharp", "c#", "cs",
    "java", "rust", "rs", "go", "golang",
    "ruby", "rb", "php", "swift", "kotlin", "kt", "scala",
    "html", "htm", "css", "scss", "sass", "less",
    "sql", "mysql", "pgsql", "postgres", "plsql", "sqlite",
    "bash", "shell", "sh", "zsh", "fish", "powershell", "ps1", "batch", "bat", "cmd",
    "json", "json5", "jsonc", "yaml", "yml", "toml", "xml", "svg",
    "markdown", "md", "latex", "tex",
    "graphql", "gql", "dockerfile", "docker", "makefile", "make", "cmake",
    "r", "julia", "jl", "lua", "perl", "pl", "haskell", "hs", "elixir", "ex", "erlang", "erl", "dart",
    "assembly", "asm", "wasm", "diff", "patch", "vim", "viml", "ini", "env", "proto", "protobuf",
]);

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

        if (!header) {
            const container = blockEl.closest<HTMLElement>(
                'code-block, .code-block, .formatted-code-block-internal-container, .animated-opacity, .code-block-wrapper, response-element',
            );
            if (container && container !== blockEl) {
                header = container.querySelector<HTMLElement>(
                    ".code-block-decoration, .code-block-decoration-header, header, .header-content",
                );
            }
        }

        return header;
    }

    private getHeaderLanguage(headerEl: HTMLElement | null): string {
        if (!headerEl) return "";
        const span = headerEl.querySelector<HTMLElement>(
            ".code-block-decoration-title, .language-label, .header-formatted > span:not(.buttons *), :scope > span:not(.buttons *)",
        );
        if (span && span.textContent) {
            return span.textContent.trim().toLowerCase();
        }
        for (const child of Array.from(headerEl.childNodes)) {
            if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
                return child.textContent.trim().toLowerCase();
            }
            if (
                child.nodeType === Node.ELEMENT_NODE &&
                !(child as HTMLElement).classList.contains("buttons") &&
                (child as HTMLElement).tagName === "SPAN"
            ) {
                return ((child as HTMLElement).textContent || "").trim().toLowerCase();
            }
        }
        return "";
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
                    record.renderedEl.textContent = "";
                    return;
                }

                if (record.isRendered) {
                    renderOrgToDOM(currentText, record.renderedEl, record.allFolded);
                } else if (this.store.settings.autoRenderOrg && isOrgContent(currentText)) {
                    // Dynamically activate Org rendering when streaming content satisfies detector threshold
                    renderOrgToDOM(currentText, record.renderedEl, false);
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

        // Check language label and content type
        const geminiHeader = this.findHeader(blockEl);
        const headerTitle = this.getHeaderLanguage(geminiHeader);
        const isExplicitOrg = /\b(?:org|org-mode|orgmode)\b/i.test(headerTitle);
        const isKnownNonOrg = KNOWN_NON_ORG_LANGUAGES.has(headerTitle);

        // If the header explicitly identifies a known non-Org programming language, skip completely
        if (isKnownNonOrg) return;

        // Check if this block contains Org syntax or explicit language label
        const isOrg = isExplicitOrg || isOrgContent(currentText);

        if (!isOrg) return;

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
                renderOrgToDOM(text, renderedView, record.allFolded);

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
            renderOrgToDOM(record.lastText, renderedView, record.allFolded);
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
