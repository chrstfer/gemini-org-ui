/**
 * Floating HUD Status & Control Panel
 */

import { LayoutManager } from "../layout/layout-manager.ts";
import { SettingsStore } from "../storage/settings-store.ts";

export class HudController {
    private store: SettingsStore;
    private layout: LayoutManager;
    private onRenderAll: () => void;
    private onFoldAll: () => void;

    constructor(
        store: SettingsStore,
        layout: LayoutManager,
        onRenderAll: () => void,
        onFoldAll: () => void,
    ) {
        this.store = store;
        this.layout = layout;
        this.onRenderAll = onRenderAll;
        this.onFoldAll = onFoldAll;
    }

    mount(): void {
        if (typeof document === "undefined") return;
        if (document.getElementById("orgmod-hud")) return;

        const s = this.store.settings;

        const hud = document.createElement("div");
        hud.id = "orgmod-hud";
        hud.setAttribute("data-gemini-org", "hud");

        const header = document.createElement("div");
        header.className = "orgmod-hud-header";
        header.id = "orgmod-hud-toggle";
        header.setAttribute("data-gemini-org", "hud-header");

        const title = document.createElement("span");
        title.className = "orgmod-hud-title";
        title.setAttribute("data-gemini-org", "hud-title");
        title.textContent = "⚡ OrgUI";

        const collapseIcon = document.createElement("span");
        collapseIcon.className = "orgmod-hud-collapse-icon";
        collapseIcon.id = "orgmod-hud-collapse-btn";
        collapseIcon.setAttribute("data-gemini-org", "hud-collapse-btn");
        collapseIcon.textContent = s.hudCollapsed ? "+" : "−";

        header.appendChild(title);
        header.appendChild(collapseIcon);

        const body = document.createElement("div");
        body.className = "orgmod-hud-body";
        body.id = "orgmod-hud-body";
        body.setAttribute("data-gemini-org", "hud-body");
        body.style.display = s.hudCollapsed ? "none" : "flex";

        const row1 = document.createElement("div");
        row1.className = "orgmod-hud-row";

        const widthBtn = document.createElement("button");
        widthBtn.className = `orgmod-hud-btn ${s.fullWidth ? "active" : ""}`;
        widthBtn.id = "orgmod-hud-width";
        widthBtn.setAttribute("data-gemini-org", "hud-width");
        widthBtn.title = "Toggle Full-Screen Width (Alt+W)";
        widthBtn.textContent = `Width: ${s.fullWidth ? `${s.widthPercent}%` : "Off"}`;

        const presets = document.createElement("div");
        presets.className = "orgmod-hud-presets";
        presets.setAttribute("data-gemini-org", "hud-presets");

        [80, 90, 94, 100].forEach((val) => {
            const pBtn = document.createElement("button");
            pBtn.className = `orgmod-hud-preset ${s.widthPercent === val && s.fullWidth ? "active" : ""}`;
            pBtn.setAttribute("data-gemini-org", "hud-preset");
            pBtn.dataset.val = val.toString();
            pBtn.textContent = `${val}%`;
            presets.appendChild(pBtn);
        });

        row1.appendChild(widthBtn);
        row1.appendChild(presets);

        const row2 = document.createElement("div");
        row2.className = "orgmod-hud-row";

        const autoBtn = document.createElement("button");
        autoBtn.className = `orgmod-hud-btn ${s.autoRenderOrg ? "active" : ""}`;
        autoBtn.id = "orgmod-hud-auto";
        autoBtn.setAttribute("data-gemini-org", "hud-auto");
        autoBtn.title = "Auto-render Org Mode Blocks";
        autoBtn.textContent = `Auto-Org: ${s.autoRenderOrg ? "ON" : "OFF"}`;

        const renderAllBtn = document.createElement("button");
        renderAllBtn.className = "orgmod-hud-btn";
        renderAllBtn.id = "orgmod-hud-renderall";
        renderAllBtn.setAttribute("data-gemini-org", "hud-renderall");
        renderAllBtn.title = "Toggle Render All Blocks (Alt+O)";
        renderAllBtn.textContent = "Render All";

        const foldAllBtn = document.createElement("button");
        foldAllBtn.className = "orgmod-hud-btn";
        foldAllBtn.id = "orgmod-hud-foldall";
        foldAllBtn.setAttribute("data-gemini-org", "hud-foldall");
        foldAllBtn.title = "Toggle Fold/Expand All Rendered Blocks (Alt+F)";
        foldAllBtn.textContent = "Fold All";

        row2.appendChild(autoBtn);
        row2.appendChild(renderAllBtn);
        row2.appendChild(foldAllBtn);

        body.appendChild(row1);
        body.appendChild(row2);

        hud.appendChild(header);
        hud.appendChild(body);

        document.body.appendChild(hud);

        // Event Bindings
        document.getElementById("orgmod-hud-toggle")?.addEventListener("click", (e) => {
            const target = e.target as HTMLElement;
            if (target.id === "orgmod-hud-collapse-btn" || target.classList.contains("orgmod-hud-collapse-icon")) {
                const next = !this.store.settings.hudCollapsed;
                this.store.update({ hudCollapsed: next });
                this.update();
            }
        });

        document.getElementById("orgmod-hud-width")?.addEventListener("click", () => {
            const next = !this.store.settings.fullWidth;
            this.store.update({ fullWidth: next });
            this.layout.apply(this.store.settings);
            this.update();
        });

        document.querySelectorAll<HTMLElement>('.orgmod-hud-preset, [data-gemini-org="hud-preset"]').forEach((
            btn,
        ) => {
            btn.addEventListener("click", () => {
                const val = parseInt(btn.dataset.val || "94", 10);
                this.store.update({ widthPercent: val, fullWidth: true });
                this.layout.apply(this.store.settings);
                this.update();
            });
        });

        document.getElementById("orgmod-hud-auto")?.addEventListener("click", () => {
            const next = !this.store.settings.autoRenderOrg;
            this.store.update({ autoRenderOrg: next });
            this.update();
        });

        document.getElementById("orgmod-hud-renderall")?.addEventListener("click", () => {
            this.onRenderAll();
        });

        document.getElementById("orgmod-hud-foldall")?.addEventListener("click", () => {
            this.onFoldAll();
        });

        this.update();
    }

    update(): void {
        if (typeof document === "undefined") return;
        const s = this.store.settings;

        const hud = document.getElementById("orgmod-hud");
        const hudBody = document.getElementById("orgmod-hud-body");
        const collapseIcon = document.getElementById("orgmod-hud-collapse-btn");
        const widthBtn = document.getElementById("orgmod-hud-width");
        const autoBtn = document.getElementById("orgmod-hud-auto");

        if (hud && hudBody && collapseIcon) {
            if (s.hudCollapsed) {
                hud.classList.add("minimized");
                hudBody.style.display = "none";
                collapseIcon.textContent = "+";
            } else {
                hud.classList.remove("minimized");
                hudBody.style.display = "flex";
                collapseIcon.textContent = "−";
            }
        }

        if (widthBtn) {
            widthBtn.textContent = `Width: ${s.fullWidth ? `${s.widthPercent}%` : "Off"}`;
            widthBtn.classList.toggle("active", s.fullWidth);
        }

        document.querySelectorAll<HTMLElement>('.orgmod-hud-preset, [data-gemini-org="hud-preset"]').forEach((
            btn,
        ) => {
            const val = parseInt(btn.dataset.val || "94", 10);
            btn.classList.toggle("active", s.fullWidth && s.widthPercent === val);
        });

        if (autoBtn) {
            autoBtn.textContent = `Auto-Org: ${s.autoRenderOrg ? "ON" : "OFF"}`;
            autoBtn.classList.toggle("active", s.autoRenderOrg);
        }
    }
}
