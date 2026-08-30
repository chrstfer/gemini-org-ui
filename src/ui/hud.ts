/**
 * Floating HUD Status & Control Panel
 */

import { LayoutManager } from "../layout/layout-manager.ts";
import { SettingsStore } from "../storage/settings-store.ts";

export class HudController {
    private store: SettingsStore;
    private layout: LayoutManager;
    private onRenderAll: () => void;

    constructor(store: SettingsStore, layout: LayoutManager, onRenderAll: () => void) {
        this.store = store;
        this.layout = layout;
        this.onRenderAll = onRenderAll;
    }

    mount(): void {
        if (typeof document === "undefined") return;
        if (document.getElementById("orgmod-hud")) return;

        const s = this.store.settings;

        const hud = document.createElement("div");
        hud.id = "orgmod-hud";
        hud.setAttribute("data-gemini-org", "hud");
        hud.innerHTML = `
      <div class="orgmod-hud-header" id="orgmod-hud-toggle" data-gemini-org="hud-header">
        <span class="orgmod-hud-title" data-gemini-org="hud-title">⚡ OrgUI</span>
        <span class="orgmod-hud-collapse-icon" id="orgmod-hud-collapse-btn" data-gemini-org="hud-collapse-btn">${
            s.hudCollapsed ? "+" : "−"
        }</span>
      </div>
      <div class="orgmod-hud-body" id="orgmod-hud-body" data-gemini-org="hud-body" style="display: ${
            s.hudCollapsed ? "none" : "flex"
        }">
        <div class="orgmod-hud-row">
          <button class="orgmod-hud-btn ${
            s.fullWidth ? "active" : ""
        }" id="orgmod-hud-width" data-gemini-org="hud-width" title="Toggle Full-Screen Width (Alt+W)">Width: ${
            s.fullWidth ? `${s.widthPercent}%` : "Off"
        }</button>
          <div class="orgmod-hud-presets" data-gemini-org="hud-presets">
            <button class="orgmod-hud-preset ${
            s.widthPercent === 80 && s.fullWidth ? "active" : ""
        }" data-gemini-org="hud-preset" data-val="80">80%</button>
            <button class="orgmod-hud-preset ${
            s.widthPercent === 90 && s.fullWidth ? "active" : ""
        }" data-gemini-org="hud-preset" data-val="90">90%</button>
            <button class="orgmod-hud-preset ${
            s.widthPercent === 94 && s.fullWidth ? "active" : ""
        }" data-gemini-org="hud-preset" data-val="94">94%</button>
            <button class="orgmod-hud-preset ${
            s.widthPercent === 100 && s.fullWidth ? "active" : ""
        }" data-gemini-org="hud-preset" data-val="100">100%</button>
          </div>
        </div>
        <div class="orgmod-hud-row">
          <button class="orgmod-hud-btn ${
            s.autoRenderOrg ? "active" : ""
        }" id="orgmod-hud-auto" data-gemini-org="hud-auto" title="Auto-render Org Mode Blocks">Auto-Org: ${
            s.autoRenderOrg ? "ON" : "OFF"
        }</button>
          <button class="orgmod-hud-btn" id="orgmod-hud-renderall" data-gemini-org="hud-renderall" title="Toggle Render All Blocks (Alt+O)">Render All</button>
        </div>
      </div>
    `;

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
