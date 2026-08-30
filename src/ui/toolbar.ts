/**
 * Code Block Action Toolbar Component
 */

export interface ToolbarElements {
    container: HTMLElement;
    toggleBtn: HTMLButtonElement;
    foldAllBtn: HTMLButtonElement;
    copyOrgBtn: HTMLButtonElement;
}

export function createCodeBlockToolbar(): ToolbarElements {
    const container = document.createElement("div");
    container.className = "org-block-toolbar";

    // 1. Toggle Button
    const toggleBtn = document.createElement("button");
    toggleBtn.className = "org-block-btn org-toggle-btn";
    toggleBtn.type = "button";
    toggleBtn.title = "Switch between rendered Org view and raw code";
    toggleBtn.innerHTML = `
    <svg class="org-icon" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
    <span>Org View</span>
  `;

    // 2. Fold / Expand All Button
    const foldAllBtn = document.createElement("button");
    foldAllBtn.className = "org-block-btn org-fold-all-btn";
    foldAllBtn.type = "button";
    foldAllBtn.title = "Fold or expand all subheadings in this block";
    foldAllBtn.innerHTML = `<span>Fold All</span>`;

    // 3. Copy Raw Org Button
    const copyOrgBtn = document.createElement("button");
    copyOrgBtn.className = "org-block-btn org-copy-btn";
    copyOrgBtn.type = "button";
    copyOrgBtn.title = "Copy complete raw Org markup";
    copyOrgBtn.innerHTML = `<span>Copy Org</span>`;

    container.appendChild(toggleBtn);
    container.appendChild(foldAllBtn);
    container.appendChild(copyOrgBtn);

    return {
        container,
        toggleBtn,
        foldAllBtn,
        copyOrgBtn,
    };
}
