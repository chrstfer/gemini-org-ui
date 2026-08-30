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

        const selectors = [
            "code-block",
            ".code-block",
            'div[class*="code-block"]',
            "pre",
            ".formatted-code",
            "div.response-container pre",
        ];

        const blocks = targetRoot.querySelectorAll<HTMLElement>(selectors.join(", "));
        blocks.forEach((el) => {
            // Skip nested pre if parent code-block was already targeted
            if (el.tagName === "PRE" && el.closest('code-block, .code-block, div[class*="code-block"]')) {
                return;
            }
            this.manager.process(el);

            // Pierce open Shadow DOM if present
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
                if (m.addedNodes.length > 0 || m.type === "characterData") {
                    needsScan = true;
                    break;
                }
            }
            if (needsScan) {
                if (this.debounceTimer) clearTimeout(this.debounceTimer);
                this.debounceTimer = setTimeout(() => this.scan(), 80);
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
