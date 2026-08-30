/**
 * Unified OrgParser Facade
 */

import { parseOrgDocument } from "./block-parser.ts";
import { isOrgContent } from "./detector.ts";
import { escapeAttr, escapeHtml, parseInline } from "./inline-lexer.ts";
import { renderDocument } from "./renderer.ts";

export class OrgParser {
    static isOrgContent(text: string): boolean {
        return isOrgContent(text);
    }

    static escapeHtml(str: string): string {
        return escapeHtml(str);
    }

    static escapeAttr(str: string): string {
        return escapeAttr(str);
    }

    static parseInline(text: string): string {
        return parseInline(text);
    }

    static parseAst(rawOrg: string) {
        return parseOrgDocument(rawOrg);
    }

    static render(rawOrg: string): string {
        const doc = parseOrgDocument(rawOrg);
        return renderDocument(doc);
    }
}

export { escapeAttr, escapeHtml, isOrgContent, parseInline, parseOrgDocument, renderDocument };
