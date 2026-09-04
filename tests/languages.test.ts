/**
 * Unit Tests for Language Registry and Language-Specific Tool Index
 */

import { assertEquals, assertExists } from "@std/assert";
import {
    globalLanguageRegistry,
    LanguageDefinition,
    LanguageRegistry,
    RECOGNIZED_LANGUAGES,
} from "../src/languages/index.ts";

Deno.test("LanguageRegistry", async (t) => {
    await t.step("initializes with recognized languages database", () => {
        const registry = new LanguageRegistry(RECOGNIZED_LANGUAGES);
        assertEquals(registry.getAll().length >= 35, true);
        assertEquals(registry.isKnown("python"), true);
        assertEquals(registry.isKnown("py"), true);
        assertEquals(registry.isKnown("typescript"), true);
        assertEquals(registry.isKnown("ts"), true);
        assertEquals(registry.isKnown("org"), true);
        assertEquals(registry.isKnown("rust"), true);
        assertEquals(registry.isKnown("rs"), true);
    });

    await t.step("resolves aliases to canonical language definitions", () => {
        const pyDef = globalLanguageRegistry.resolve("py3");
        assertExists(pyDef);
        assertEquals(pyDef.id, "python");
        assertEquals(pyDef.name, "Python");

        const tsDef = globalLanguageRegistry.resolve("tsx");
        assertExists(tsDef);
        assertEquals(tsDef.id, "typescript");

        const orgDef = globalLanguageRegistry.resolve("org-mode");
        assertExists(orgDef);
        assertEquals(orgDef.id, "org");
    });

    await t.step("retrieves tools mapped specifically to a language", () => {
        const orgTools = globalLanguageRegistry.getToolsForLanguage("org");
        assertEquals(orgTools.length >= 2, true);
        assertEquals(orgTools.some((t) => t.id === "render-toggle"), true);

        const pyTools = globalLanguageRegistry.getToolsForLanguage("python");
        assertEquals(pyTools.length >= 1, true);
        assertEquals(pyTools.some((t) => t.id === "copy-clean-python"), true);
    });

    await t.step("allows dynamic tool registration for specific languages", () => {
        const registry = new LanguageRegistry(RECOGNIZED_LANGUAGES);
        let notified = false;
        const unsubscribe = registry.subscribe(() => {
            notified = true;
        });

        registry.registerToolForLanguage("rust", {
            id: "cargo-check",
            order: 40,
            title: "Run cargo check",
            render: () => "Cargo Check",
        });

        assertEquals(notified, true);
        const rustTools = registry.getToolsForLanguage("rust");
        assertEquals(rustTools.some((t) => t.id === "cargo-check"), true);

        // Unregister
        const removed = registry.unregisterToolForLanguage("rust", "cargo-check");
        assertEquals(removed, true);
        const rustToolsAfter = registry.getToolsForLanguage("rust");
        assertEquals(rustToolsAfter.some((t) => t.id === "cargo-check"), false);

        unsubscribe();
    });

    await t.step("allows registering custom new languages dynamically", () => {
        const registry = new LanguageRegistry(RECOGNIZED_LANGUAGES);

        const customLang: LanguageDefinition = {
            id: "zig",
            name: "Zig",
            aliases: ["zig", "zir"],
            category: "programming",
            fileExtension: ".zig",
            tools: [
                {
                    id: "zig-build",
                    title: "Run zig build",
                },
            ],
        };

        registry.register(customLang);
        assertEquals(registry.isKnown("zig"), true);
        assertEquals(registry.isKnown("zir"), true);

        const zigDef = registry.resolve("zir");
        assertExists(zigDef);
        assertEquals(zigDef.id, "zig");

        const zigTools = registry.getToolsForLanguage("zir");
        assertEquals(zigTools.length, 1);
        assertEquals(zigTools[0].id, "zig-build");
    });
});
