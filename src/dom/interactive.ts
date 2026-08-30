/**
 * DOM Event Handlers and Interactive Delegations
 */

export function setupInteractiveListeners(renderedContainer: HTMLElement): void {
    if (!renderedContainer || typeof renderedContainer.querySelectorAll !== "function") return;

    // 1. Headline folding (Subtree toggle)
    renderedContainer.querySelectorAll<HTMLElement>(".org-heading").forEach((h) => {
        h.addEventListener("click", (e) => {
            // Prevent click if clicking an anchor link inside headline
            if ((e.target as HTMLElement).closest("a")) return;
            const section = h.closest(".org-section");
            if (section) {
                section.classList.toggle("org-folded");
            }
        });
    });

    // 2. Source block individual copy buttons
    renderedContainer.querySelectorAll<HTMLButtonElement>(".org-src-copy-btn").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
            e.stopPropagation();
            const codePre = btn.closest(".org-src-block")?.querySelector("code");
            if (codePre) {
                const textToCopy = codePre.innerText || codePre.textContent || "";
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
                    console.error("[GeminiOrgMod] Failed to copy src snippet:", err);
                }
            }
        });
    });

    // 3. Interactive Checkbox toggling and parent cookie recalculation
    renderedContainer.querySelectorAll<HTMLInputElement>(".org-checkbox").forEach((cb) => {
        cb.addEventListener("change", () => {
            const isChecked = cb.checked;
            const label = cb.parentElement?.querySelector(".org-checkbox-label");
            if (label) {
                label.classList.toggle("org-checked", isChecked);
            }

            // Recalculate any progress statistics cookies within the same section
            const parentSection = cb.closest(".org-section");
            if (parentSection) {
                const allCbs = parentSection.querySelectorAll(".org-checkbox");
                const checkedCbs = parentSection.querySelectorAll(".org-checkbox:checked");
                const statCookie = parentSection.querySelector(".org-heading .org-stats-cookie");
                if (statCookie) {
                    const countStr = `[${checkedCbs.length}/${allCbs.length}]`;
                    statCookie.textContent = countStr;
                }
            }
        });
    });
}
