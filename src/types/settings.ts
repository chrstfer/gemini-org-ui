/**
 * User Settings & Configuration State
 */

export interface ExtensionSettings {
    fullWidth: boolean;
    autoRenderOrg: boolean;
    widthPercent: number;
    hudCollapsed: boolean;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
    fullWidth: true,
    autoRenderOrg: true,
    widthPercent: 94,
    hudCollapsed: false,
};
