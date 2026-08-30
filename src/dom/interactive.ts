/**
 * Interactive DOM Event Handlers (Subtree folding, Checkbox toggling, Copy buttons)
 */

export function setupInteractiveListeners(container: HTMLElement): void {
    // 1. Interactive Section Folding
    const foldHeaders = container.querySelectorAll<HTMLElement>('.org-heading, [data-gemini-org="heading"]');
    foldHeaders.forEach((heading) => {
        if (heading.dataset.orgBound === "true") return;
        heading.dataset.orgBound = "true";

        heading.addEventListener("click", (e) => {
            const target = e.target as HTMLElement;
            // Prevent folding when clicking on links, buttons, or checkboxes
            if (target.closest("a, button, input, .org-checkbox, .org-fold-btn")) {
                // If fold button clicked directly, let it fold
                if (!target.closest(".org-fold-btn")) return;
            }

            const section = heading.closest<HTMLElement>('.org-section, [data-gemini-org="section"]');
            if (section) {
                section.classList.toggle("org-folded");
            }
        });
    });

    // 2. Interactive Source Block Copy Buttons
    const srcCopyButtons = container.querySelectorAll<HTMLButtonElement>(
        '.org-src-copy-btn, [data-gemini-org="src-copy-btn"]',
    );
    srcCopyButtons.forEach((btn) => {
        if (btn.dataset.orgBound === "true") return;
        btn.dataset.orgBound = "true";

        btn.addEventListener("click", async (e) => {
            e.stopPropagation();
            const block = btn.closest<HTMLElement>('.org-src-block, [data-gemini-org="src-block"]');
            const codePre = block?.querySelector<HTMLElement>("code, pre");
            if (!codePre) return;

            const textToCopy = (codePre.textContent || codePre.innerText || "").trim();
            try {
                if (typeof navigator !== "undefined" && navigator.clipboard) {
                    await navigator.clipboard.writeText(textToCopy);
                }
                const originalText = btn.textContent;
                btn.textContent = "Copied!";
                btn.classList.add("copied");
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.classList.remove("copied");
                }, 1800);
            } catch (err) {
                console.error("[GeminiOrgMod] Failed to copy snippet:", err);
            }
        });
    });

    // 3. Interactive Checkboxes with Parent Heading Stats Cookie Recalculation
    const checkboxes = container.querySelectorAll<HTMLInputElement>(
        '.org-checkbox, input[data-gemini-org="checkbox"]',
    );
    checkboxes.forEach((cb) => {
        if (cb.dataset.orgBound === "true") return;
        cb.dataset.orgBound = "true";

        cb.addEventListener("change", () => {
            const label = cb.parentElement?.querySelector<HTMLElement>(".org-checkbox-label");
            if (label) {
                label.classList.toggle("org-checked", cb.checked);
            }

            // Recalculate parent section stats cookie [n/m] or [x%]
            const parentSection = cb.closest<HTMLElement>('.org-section, [data-gemini-org="section"]');
            if (parentSection) {
                const sectionContent = parentSection.querySelector<HTMLElement>(
                    '.org-section-content, [data-gemini-org="section-content"]',
                );
                if (sectionContent) {
                    const allInSec = sectionContent.querySelectorAll<HTMLInputElement>(
                        '.org-checkbox, input[data-gemini-org="checkbox"]',
                    );
                    const checkedInSec = sectionContent.querySelectorAll<HTMLInputElement>(
                        '.org-checkbox:checked, input[data-gemini-org="checkbox"]:checked',
                    );
                    const total = allInSec.length;
                    const done = checkedInSec.length;

                    const heading = parentSection.querySelector<HTMLElement>('.org-heading, [data-gemini-org="heading"]');
                    const cookieEl = heading?.querySelector<HTMLElement>(
                        '.org-stats-cookie, [data-gemini-org="stats-cookie"]',
                    );
                    if (cookieEl && total > 0) {
                        if (cookieEl.textContent?.includes("%")) {
                            const pct = Math.round((done / total) * 100);
                            cookieEl.textContent = `[${pct}%]`;
                        } else {
                            cookieEl.textContent = `[${done}/${total}]`;
                        }
                    }
                }
            }
        });
    });
}
