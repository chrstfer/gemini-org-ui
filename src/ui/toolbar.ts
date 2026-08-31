/**
 * Code Block Action Toolbar Component
 */

export interface ToolbarElements {
    container: HTMLElement;
    toggleBtn: HTMLButtonElement;
    foldAllBtn: HTMLButtonElement;
}

export function createCodeBlockToolbar(blockId: string): ToolbarElements {
    const container = document.createElement("div");
    container.className = "org-block-toolbar";
    container.setAttribute("data-gemini-org", "toolbar");
    container.setAttribute("data-gemini-org-block-id", blockId);

    // 1. Toggle Button (Label consistently says "Render Org", highlight indicates active Org state)
    const toggleBtn = document.createElement("button");
    toggleBtn.className = "org-block-btn org-toggle-btn";
    toggleBtn.type = "button";
    toggleBtn.title = "Toggle Org-mode rendering";
    toggleBtn.setAttribute("data-gemini-org", "toggle-btn");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "org-icon");
    svg.setAttribute("viewBox", "0 0 24 24");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z");
    svg.appendChild(path);

    const labelSpan = document.createElement("span");
    labelSpan.textContent = "Render Org";

    toggleBtn.appendChild(svg);
    toggleBtn.appendChild(labelSpan);

    // 2. Fold / Expand All Button
    const foldAllBtn = document.createElement("button");
    foldAllBtn.className = "org-block-btn org-fold-all-btn";
    foldAllBtn.type = "button";
    foldAllBtn.title = "Fold or expand all subheadings in this block";
    foldAllBtn.setAttribute("data-gemini-org", "fold-all-btn");
    foldAllBtn.setAttribute("data-gemini-org-block-id", blockId);

    const foldSpan = document.createElement("span");
    foldSpan.textContent = "Fold All";
    foldAllBtn.appendChild(foldSpan);

    container.appendChild(toggleBtn);
    container.appendChild(foldAllBtn);

    return {
        container,
        toggleBtn,
        foldAllBtn,
    };
}
