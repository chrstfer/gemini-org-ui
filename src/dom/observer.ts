/**
 * DOM Scanner and MutationObserver with Shadow DOM Support
 */

import { CodeBlockManager } from "./code-block.ts";

export class DomObserver {
    private manager: CodeBlockManager;
    private debounceTimer: ReturnType<typeof setTimeout> | null = null;
    private observer: MutationObserver | null = null;

    constructor(manager: CodeBlockManager) {
        this.manager = manager;
    }

    scan(root?: Node): void {
        if (typeof document === "undefined") return;
        const targetRoot = (root || document.body) as ParentNode;
        if (!targetRoot || typeof targetRoot.querySelectorAll !== "function") return;

        // Prune any disconnected records from previous DOM removals
        this.manager.prune();

        // Strict top-level selectors only (avoid wildcards matching child decorations)
        const selectors = [
            "code-block",
            ".code-block",
            ".formatted-code",
            "pre",
        ];

        const candidateBlocks = targetRoot.querySelectorAll<HTMLElement>(selectors.join(", "));
        candidateBlocks.forEach((el) => {
            // 1. Skip if element is a child of a code-block container already being processed
            if (
                el.tagName === "PRE" &&
                el.closest('code-block, .code-block, .formatted-code, [data-gemini-org="root"]') !== el
            ) {
                const parentBlock = el.closest<HTMLElement>(
                    'code-block, .code-block, .formatted-code, [data-gemini-org="root"]',
                );
                if (parentBlock) {
                    this.manager.process(parentBlock);
                    return;
                }
            }

            // 2. Skip if element is an internal decoration, toolbar, or rendered view
            if (
                el.classList.contains("code-block-decoration") ||
                el.classList.contains("code-block-decoration-header") ||
                el.classList.contains("code-block-wrapper") ||
                el.classList.contains("org-block-toolbar") ||
                el.classList.contains("org-rendered-view") ||
                el.closest(".org-rendered-view, .org-block-toolbar, #orgmod-hud")
            ) {
                return;
            }

            this.manager.process(el);

            // 3. Pierce open Shadow DOM if present on custom elements
            if (el.shadowRoot) {
                this.scan(el.shadowRoot);
            }
        });
    }

    start(): void {
        if (typeof document === "undefined" || !document.body || typeof MutationObserver === "undefined") return;

        this.scan();

        this.observer = new MutationObserver((mutations) => {
            let needsScan = false;
            for (const m of mutations) {
                if (m.addedNodes.length > 0 || m.removedNodes.length > 0 || m.type === "characterData") {
                    needsScan = true;
                    break;
                }
            }
            if (needsScan) {
                if (this.debounceTimer) clearTimeout(this.debounceTimer);
                // Fast 25ms debounce for high responsiveness during live streaming
                this.debounceTimer = setTimeout(() => this.scan(), 25);
            }
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true,
        });
    }

    stop(): void {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
    }
}
