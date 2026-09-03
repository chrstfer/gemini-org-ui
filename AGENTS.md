# Agent Guidelines

## Convention Preferences
Upon conversation initialization, execute skill /org-mode-conventions. All persistent documents, specifications, research reports, ADRs, and issue tickets MUST be native Org-mode (.org) files. When any skill refers to a .md document (e.g. `CONTEXT.md`, `spec.md`, `map.md`), substitute the .org equivalent (`CONTEXT.org`, `spec.org`, `map.org`).

## Math & LaTeX Formatting
Format mathematical notation using vanilla Org-mode syntax:
- General equations and variables do not require `$...$` or `\(...\)` delimiters unless creating centered display equations via `\begin{equation}...\end{equation}`.
- Use LaTeX Greek symbols in ASCII syntax (`\lambda` for lowercase, `\Lambda` for uppercase; `\sigma`, `\Sigma`, `\tau`, `\mu`, `\alpha`, `\beta`, `\Delta`, `\Omega`, `\epsilon`) rather than literal unicode glyphs for maximum portability and human readability.

## Agent skills

### Issue tracker
Local Org-mode files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.org`.

### Domain docs
Single-context (`CONTEXT.org` at repo root, `docs/adr/` for ADRs). See `docs/agents/domain.org`.
