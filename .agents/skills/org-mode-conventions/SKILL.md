---
name: org-mode-conventions
description: "Configure repo for Org-mode engineering workflows (issue tracker, domain docs, buffer/drawer standards, AGENTS.md), or enforce Org-mode formatting rules when generating specs, ADRs, and tickets."
---

# Org-Mode Conventions & Setup Authority

This skill establishes the global invariant that all persistent documents, specifications, research reports, ADRs, domain context files, issue tickets, and wayfinding maps generated across engineering skills MUST be formatted in native **Emacs Org-mode syntax (`.org`)**.

It serves a dual role:
1. **Interactive Setup Wizard**: Replaces `/setup-matt-pocock-skills` to scaffold repository issue tracking, domain docs, triage labels, and `AGENTS.md` guidelines in Org-mode format.
2. **Runtime Formatting & Parsing Authority**: Defines Org syntax primitives, Org Babel, Org Export, and LaTeX Greek standards for all downstream skills (`to-spec`, `improve-codebase-architecture`, `grill-with-docs`, `research`, `prototype`, `wait-what`).

---

## Interactive Setup Process

When invoked to set up or reconfigure a repository, execute this 5-step flow:

### 1. Explore
Inspect the current repository state without making assumptions:
- `git remote -v` and `.git/config`: Check if connected to GitHub, GitLab, or local-only.
- `AGENTS.md` and `CLAUDE.md` at repo root: Check existence and existing `## Agent skills` sections.
- `CONTEXT.org` (or `CONTEXT.md`) and `docs/adr/`: Check domain doc status.
- `docs/agents/`: Check prior agent configuration files (`issue-tracker.org`, `domain.org`).
- `.scratch/`: Check if local issue tracking is already in use.
- Is the `triage` skill installed in the available skills list? (Decides whether Section B runs).
- Monorepo signals: Check for `workspaces` in package manifests or multi-package directories. Absence indicates single-context.

### 2. Present Findings and Ask
Summarize findings and guide the user through configuration:

**Section A: Issue Tracker**
Propose the matching tracker:
- **Local Org-mode** (recommended default for local/solo repos): Issues live under `.scratch/<feature>/issues/<NN>-<slug>.org` with specs at `.scratch/<feature>/spec.org`.
- **GitHub**: Issues live in GitHub Issues (via `gh` CLI).
- **GitLab**: Issues live in GitLab Issues (via `glab` CLI).
- **Other**: Record freeform workflow in `docs/agents/issue-tracker.org`.

Record the choice in `docs/agents/issue-tracker.org`.

**Section B: Triage Label Vocabulary**
Skip entirely if `triage` is not installed. If installed, confirm default labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`).

**Section C: Domain Docs**
Default to **single-context** (`CONTEXT.org` + `docs/adr/` at repo root). Offer multi-context only if monorepo signals are detected.

### 3. Confirm and Edit
Show the user a draft of:
- The `AGENTS.md` / `CLAUDE.md` blocks to add or update.
- The contents of `docs/agents/issue-tracker.org` and `docs/agents/domain.org`.

### 4. Write
- If `CLAUDE.md` exists, edit it. Else if `AGENTS.md` exists, edit it. If neither exists, create `AGENTS.md`.
- Ensure the guidelines file contains the convention preference and agent skills blocks:
  ```markdown
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
  ```
- Copy and hydrate seed templates from `templates/docs/agents/` to `docs/agents/issue-tracker.org` and `docs/agents/domain.org`.

### 5. Done
Confirm configuration is complete. All engineering skills will now read and produce `.org` documents.

---

## Core Org-Mode Syntax Reference

### 1. Headlines & Structure
Headlines establish section hierarchy and outline folding. Never skip levels:
```org
* Top-Level Headline (H1)
** Sub-Section Headline (H2)
*** Nested Section Headline (H3)
```

### 2. Property Drawers
Store machine-readable key–value pairs directly below headlines:
```org
:PROPERTIES:
:TYPE: task
:STATUS: ready-for-agent
:BLOCKED_BY: 01, 02
:ASSIGNEE: agent-1
:END:
```

### 3. Source Code Blocks
Wrap code in `#+BEGIN_SRC <language>` blocks:
```org
#+BEGIN_SRC rust
pub fn execute_task(id: &str) -> Result<(), TaskError> {
    Ok(())
}
#+END_SRC
```

### 4. Links
Format intra-repo and external links using bracket syntax:
- External/Web link: `[[https://example.com][Label]]`
- Relative file link: `[[file:docs/adr/0001-init.org][ADR 0001]]`
- Heading link: `[[*Subsystem Topology][Subsystems]]`

### 5. Tables
Format tables with vertical pipes and standard header separator lines:
```org
| Module     | Status | Seam Boundary |
|------------+--------+---------------|
| task_queue | active | traits::Queue |
| storage    | active | traits::Store |
```

### 6. Checklists
Use Org-mode square-bracket items for task frontiers and user stories:
- `- [ ] Open / unclaimed task`
- `- [X] Completed task`

---

## Org Babel & Org Export

### Org Babel (Literate Execution & Tangling)
Org Babel enables active code execution and literate programming directly within Org documents:
- **Execution (`C-c C-c`)**: Code blocks can be run interactively. Output is captured into `#+RESULTS:` blocks.
- **Header Arguments**:
  - `:results output` / `:results value`: Controls execution output capture.
  - `:exports both` / `:exports code` / `:exports results`: Controls rendering during export.
  - `:tangle path/to/file.rs`: Extracts code blocks into deployable source files.

### Org Export (`ox` Compilation Engine)
Org documents can be compiled into multiple distribution formats via `C-c C-e`:
- **HTML (`ox-html`)**: Formatted web documentation and reports.
- **LaTeX / PDF (`ox-latex`)**: Publication-grade typesetting and printable documents.
- **Markdown (`ox-md`)**: Export to GitHub/GitLab READMEs or wikis.
- **Document Controls**:
  - `#+TITLE:`, `#+AUTHOR:`, `#+DATE:`: Top-matter metadata.
  - `#+OPTIONS: toc:2 num:nil`: Controls Table of Contents depth and section numbering.

---

## Math & LaTeX Greek Standards

- **Inline Variables & Equations**: In plain prose, write variables and expressions naturally without artificial `$ ... $` or `\( ... \)` wrappers (e.g. `d(u, v) = 1 - (u \cdot v)`, `\tau >= 0.72`).
- **Display Equations**: Use standard LaTeX equation environments for centered, standalone equations:
  #+BEGIN_SRC org
  \begin{equation}
  D_{\text{kNN}}(x) = \frac{1}{\bar{d}_k(x) + \epsilon}
  \end{equation}
  #+END_SRC
- **LaTeX Greek Symbols**: Always use ASCII LaTeX syntax instead of unicode glyphs:
  - Lowercase: `\alpha`, `\beta`, `\gamma`, `\delta`, `\epsilon`, `\lambda`, `\mu`, `\pi`, `\sigma`, `\tau`, `\omega`.
  - Uppercase: `\Gamma`, `\Delta`, `\Lambda`, `\Pi`, `\Sigma`, `\Omega`.
  - Capitalization rule: The first letter controls case (`\lambda` = lowercase, `\Lambda` = uppercase).

---

## Universal Reader & Consumer Rules

When executing any engineering skill:
1. **Discovery Order**: Scan for `.org` files first (`CONTEXT.org`, `docs/adr/*.org`, `spec.org`, `map.org`). Fall back to `.md` only if no `.org` file exists.
2. **File Substitution**: When any skill prompt mentions a `.md` path (`CONTEXT.md`, `spec.md`, `map.md`), substitute the corresponding `.org` file.
3. **Property Extraction**: Parse `:PROPERTIES: ... :END:` drawers for metadata (`:STATUS:`, `:TYPE:`, `:BLOCKED_BY:`).
4. **Template Catalog**: Consult [`TEMPLATES.org`](TEMPLATES.org) for reference schemas across all engineering workflows.
