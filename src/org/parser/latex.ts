/**
 * KaTeX LaTeX Math Renderer
 * Pure synchronous HTML generation, zero eval, zero external network requests.
 */

import katex from "katex";

export function renderLatexToString(latex: string, displayMode = false): string {
    try {
        return katex.renderToString(latex.trim(), {
            displayMode,
            throwOnError: false,
            output: "htmlAndMathml",
            strict: false,
        });
    } catch (e) {
        console.warn("[GeminiOrgMod] KaTeX render error:", e);
        return `<code class="org-latex-error">${latex}</code>`;
    }
}
