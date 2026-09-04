/**
 * Languages Subsystem Public Exports
 */

import { RECOGNIZED_LANGUAGES } from "./definitions.ts";
import { LanguageRegistry } from "./registry.ts";

export * from "./definitions.ts";
export * from "./registry.ts";
export * from "./types.ts";

/**
 * Global singleton Language Registry initialized with recognized languages
 */
export const globalLanguageRegistry = new LanguageRegistry(RECOGNIZED_LANGUAGES);
