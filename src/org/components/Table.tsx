/**
 * Org-Mode Table Component
 */

import { OrgTableNode } from "../types/ast.ts";
import { InlineText } from "./InlineText.tsx";

interface TableProps {
    node: OrgTableNode;
}

export function Table({ node }: TableProps) {
    let isFirstRow = true;

    return (
        <div className="org-table-wrapper" data-gemini-org="table-wrapper">
            <table className="org-table" data-gemini-org="table">
                <tbody>
                    {node.rows.map((row, rIdx) => {
                        if (row.isDivider) return null;

                        const isHeader = isFirstRow || (node.hasHeader && rIdx === 0);
                        isFirstRow = false;
                        const Tag = isHeader ? "th" : "td";

                        return (
                            <tr key={rIdx} className={isHeader ? "org-table-header-row" : ""}>
                                {row.cells.map((cell, cIdx) => {
                                    const isNum = /^-?\d+(?:\.\d+)?%?$|^\$?\d+(?:,\d{3})*(?:\.\d+)?$/.test(cell);
                                    return (
                                        <Tag
                                            key={cIdx}
                                            className={isNum ? "org-table-num" : ""}
                                        >
                                            <InlineText text={cell} />
                                        </Tag>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
