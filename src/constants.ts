/**
 * Global Constants & Canonical DOM Selectors for Gemini UI
 */

import { globalLanguageRegistry } from "./languages/index.ts";

/**
 * Dynamic set of all recognized non-Org languages derived from the Language Registry
 */
export const KNOWN_LANGUAGES: ReadonlySet<string> = {
    has(value: string): boolean {
        const lower = value.toLowerCase();
        // Ignore "org" aliases as they should be processed as Org-mode
        if (lower === "org" || lower === "org-mode" || lower === "orgmode" || lower === "text/org") {
            return false;
        }
        return globalLanguageRegistry.isKnown(lower);
    },
    get size(): number {
        return globalLanguageRegistry.getAllAliases().size;
    },
    [Symbol.iterator](): IterableIterator<string> {
        return globalLanguageRegistry.getAllAliases()[Symbol.iterator]();
    },
    forEach(callbackfn: (value: string, value2: string, set: ReadonlySet<string>) => void): void {
        globalLanguageRegistry.getAllAliases().forEach((v) => callbackfn(v, v, this));
    },
    entries(): IterableIterator<[string, string]> {
        return Array.from(globalLanguageRegistry.getAllAliases().entries())[Symbol.iterator]();
    },
    keys(): IterableIterator<string> {
        return globalLanguageRegistry.getAllAliases().keys();
    },
    values(): IterableIterator<string> {
        return globalLanguageRegistry.getAllAliases().values();
    },
};

// Canonical DOM selectors for Gemini UI
export const SELECTOR_ROOT = ".response-element code-block, response-element code-block, code-block";
export const SELECTOR_DECORATION = ".code-block-decoration, .code-block-decoration-header, header";
export const SELECTOR_LANG_SPAN = ".code-block-decoration-title, .language-label, :scope > span";
export const SELECTOR_CODE_CONTAINER = 'code.code-container[data-test-id="code-content"], code, pre';
export const SELECTOR_ACTIONS = ".buttons, .code-block-decoration-actions, .header-actions";
export const SELECTOR_NOT_PROCESSED = ":not([data-code-processed])";
