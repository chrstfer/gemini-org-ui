/**
 * Collapsible Org-Mode Outline Section Component
 */

import { h } from "preact";
import { useEffect, useState } from "preact/hooks";
import { OrgContentNode, OrgSectionNode } from "../types/ast.ts";
import { Drawer } from "./Drawer.tsx";
import { InlineText } from "./InlineText.tsx";
import { Latex } from "./Latex.tsx";
import { List } from "./List.tsx";
import { SrcBlock } from "./SrcBlock.tsx";
import { Table } from "./Table.tsx";

interface SectionProps {
    section: OrgSectionNode;
    forceFoldState?: boolean;
}

function renderContentNode(node: OrgContentNode, index: number) {
    switch (node.type) {
        case "paragraph":
            if (!node.text.trim()) return null;
            return (
                <p key={index} className="org-paragraph" data-gemini-org="paragraph">
                    <InlineText text={node.text} />
                </p>
            );

        case "blank_line":
            return <div key={index} className="org-blank-line" data-gemini-org="blank-line" />;

        case "horizontal_rule":
            return <hr key={index} className="org-hr" data-gemini-org="hr" />;

        case "src_block":
            return <SrcBlock key={index} node={node} />;

        case "latex_block":
            return (
                <div key={index} className="org-latex-block" data-gemini-org="latex-block">
                    <Latex math={node.content} display />
                </div>
            );

        case "drawer":
            return <Drawer key={index} node={node} />;

        case "table":
            return <Table key={index} node={node} />;

        case "list":
            return <List key={index} node={node} />;

        default:
            return null;
    }
}

export function Section({ section, forceFoldState }: SectionProps) {
    const [isFolded, setIsFolded] = useState(false);
    const { heading, body, children } = section;
    const level = heading.level;

    useEffect(() => {
        if (typeof forceFoldState === "boolean") {
            setIsFolded(forceFoldState);
        }
    }, [forceFoldState]);

    const toggleFold = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest("a, button, input, .org-checkbox, .org-src-copy-btn")) {
            if (!target.closest(".org-fold-btn")) return;
        }
        setIsFolded(!isFolded);
    };

    return (
        <div
            className={`org-section org-sec-${level} ${isFolded ? "org-folded" : ""}`}
            data-gemini-org="section"
            data-level={level}
        >
            <div
                className={`org-heading org-h${level}`}
                data-gemini-org="heading"
                data-level={level}
                onClick={toggleFold}
            >
                <button
                    type="button"
                    className="org-fold-btn"
                    data-gemini-org="fold-btn"
                    aria-label="Toggle section"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsFolded(!isFolded);
                    }}
                >
                    <span className="org-fold-icon">{isFolded ? "▶" : "▼"}</span>
                </button>

                <span className="org-heading-title" data-gemini-org="heading-title">
                    {heading.status && (
                        <span className={`org-status org-status-${heading.status}`} data-gemini-org="status">
                            {heading.status}
                        </span>
                    )}
                    {heading.priority && (
                        <span className={`org-priority org-priority-${heading.priority}`} data-gemini-org="priority">
                            [#{heading.priority}]
                        </span>
                    )}
                    {heading.statsCookie && (
                        <span className="org-stats-cookie" data-gemini-org="stats-cookie">
                            {heading.statsCookie}
                        </span>
                    )}
                    <InlineText text={heading.title} />
                </span>

                {heading.tags.length > 0 && (
                    <span className="org-tags" data-gemini-org="tags">
                        {heading.tags.map((t, idx) => (
                            <span key={idx} className="org-tag" data-gemini-org="tag">
                                :{t}:
                            </span>
                        ))}
                    </span>
                )}
            </div>

            {!isFolded && (
                <div
                    className="org-section-content"
                    data-gemini-org="section-content"
                    data-level={level}
                >
                    {body.map((n, idx) => renderContentNode(n, idx))}
                    {children.map((c, idx) => (
                        <Section
                            key={idx}
                            section={c}
                            forceFoldState={forceFoldState}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
