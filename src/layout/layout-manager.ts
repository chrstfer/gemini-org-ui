/**
 * Layout and Widescreen Manager
 */

import { ExtensionSettings } from "../types/settings.ts";

export class LayoutManager {
    apply(settings: ExtensionSettings): void {
        if (typeof document === "undefined") return;

        document.documentElement.style.setProperty("--orgmod-max-width", `${settings.widthPercent}%`);

        if (settings.fullWidth) {
            document.body.classList.add("orgmod-fullwidth-active");
        } else {
            document.body.classList.remove("orgmod-fullwidth-active");
        }
    }
}
