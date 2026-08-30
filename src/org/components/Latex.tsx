/**
 * KaTeX LaTeX Math Component
 */

import { h } from "preact";
import { renderLatexToString } from "../parser/latex.ts";

interface LatexProps {
    math: string;
    display?: boolean;
}

export function Latex({ math, display = false }: LatexProps) {
    const html = renderLatexToString(math, display);
    return (
        <span
            className={display ? "org-latex-display" : "org-latex-inline"}
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}
