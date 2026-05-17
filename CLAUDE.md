# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A pure-frontend, no-build browser app for batch file renaming (批量文件重命名). Files are processed entirely client-side — nothing is uploaded to a server. The UI is in Chinese.

## Running the App

Open `index.html` directly in a browser — there is no build step, no package manager, and no dev server. Changes to any file take effect on next page reload.

There are no tests, no linter, and no CI configuration.

## Architecture

The app has three JavaScript files loaded in this order by `index.html`:

1. **`rename.js`** — Pure rename logic. `applyRules(originalName, index, rules)` transforms a single filename; `renameAll(files, rules)` maps it over an array. No DOM access.

2. **`validator.js`** — Pure validation. `checkIllegalChars(name)` returns any forbidden characters found; `checkConflicts(names)` returns a Set of duplicate names. No DOM access.

3. **`app.js`** — All DOM manipulation, event wiring, and app state. The only mutable state is the module-level `files` array (`{ id, file }` objects) and `sortable` (a SortableJS instance). Every user action calls `renderFileList()` and/or `renderPreview()` to keep the UI in sync.

Two CDN libraries (loaded in `index.html` before the app scripts):
- **SortableJS** — drag-to-reorder the file list
- **JSZip** — generate the downloadable `.zip`

## Rule Pipeline

Rules are applied to the filename stem (without extension) in a fixed order inside `applyRules`:

```
delete → replace → case → prefix → suffix → number → ext
```

The `ext` rule replaces the file extension last. The `number` rule can be placed as prefix or suffix relative to the (already-transformed) stem, and optionally drops the original stem entirely.

## Key Conventions

- All rule state is read live from the DOM via `getRules()` in `app.js`; there is no separate state object for rules.
- A rule's controls are shown/hidden by toggling `data-active` on the parent `.rule-block` element (CSS-driven via `[data-active] .rule-inputs { display: flex }`).
- HTML output is built with template literals; always run user-visible strings through `esc()` to prevent XSS.
- `crypto.randomUUID()` is used as the stable identity key for each file entry so drag-reorder can reconcile order without index arithmetic.
