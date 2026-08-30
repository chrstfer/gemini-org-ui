/**
 * Main Content Script Entry Point
 */

import { CodeBlockManager } from "./dom/code-block.ts";
import { DomObserver } from "./dom/observer.ts";
import { LayoutManager } from "./layout/layout-manager.ts";
import { SettingsStore } from "./storage/settings-store.ts";
import { HudController } from "./ui/hud.ts";

async function bootstrap() {
    const store = new SettingsStore();
    const layout = new LayoutManager();
    const codeBlockManager = new CodeBlockManager(store);

    const handleRenderAll = () => {
        const allButtons = document.querySelectorAll<HTMLButtonElement>(".org-toggle-btn");
        const anyUnrendered = Array.from(allButtons).some((b) => !b.classList.contains("is-active"));
        allButtons.forEach((b) => {
            if (anyUnrendered && !b.classList.contains("is-active")) b.click();
            else if (!anyUnrendered && b.classList.contains("is-active")) b.click();
        });
    };

    const hud = new HudController(store, layout, handleRenderAll);
    const observer = new DomObserver(codeBlockManager);

    // 1. Load persisted settings
    const settings = await store.load();

    // 2. Apply initial layout
    layout.apply(settings);

    // 3. Mount floating HUD
    hud.mount();

    // 4. Start DOM observer
    observer.start();

    // 5. Global Keyboard Shortcuts
    globalThis.addEventListener("keydown", (e) => {
        const keyEvent = e as KeyboardEvent;
        // Alt + W : Toggle Full Width
        if (keyEvent.altKey && (keyEvent.key === "w" || keyEvent.key === "W")) {
            keyEvent.preventDefault();
            const next = !store.settings.fullWidth;
            store.update({ fullWidth: next });
            layout.apply(store.settings);
            hud.update();
        }
        // Alt + O : Toggle Render All Blocks
        if (keyEvent.altKey && (keyEvent.key === "o" || keyEvent.key === "O")) {
            keyEvent.preventDefault();
            handleRenderAll();
        }
    });
}

if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => bootstrap());
    } else {
        bootstrap();
    }
}
