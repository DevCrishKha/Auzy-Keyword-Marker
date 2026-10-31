# Development Rules & Standards

This document establishes development guidelines, coding conventions, and architectural rules for this extension.

---

## 1. Extension Sandbox Rules

1. **No Direct DOM Access**: Never attempt to access the host editor's DOM directly. All UI modifications inside the editor must go through the official VS Code API (`vscode.window.createTextEditorDecorationType`, `editor.setDecorations`).
2. **Webview Theme Neutrality**:
   - Webview forms must ALWAYS use VS Code CSS variables (e.g., `var(--vscode-editor-background)`, `var(--vscode-foreground)`, `var(--vscode-button-background)`).
   - Never hardcode dark or light background colors inside Webviews so they adapt automatically to whatever theme the user has installed.
3. **Graceful Disposals**:
   - All subscriptions, commands, status bars, and decoration types must be added to `context.subscriptions` or explicitly disposed of in `deactivate()` to avoid memory leaks.

---

## 2. Coding Conventions

- **Module Format**: CommonJS (`require(...)` / `module.exports`).
- **Language Level**: Modern JavaScript (ES2020+).
- **Naming Conventions**:
  - Commands: `extensionName.actionName` (e.g. `markKeyword.mark`).
  - IDs: CamelCase or kebab-case matching standard VS Code practices.
  - Functions: descriptive verbs (`applyKeywordDecoration`, `refreshDecorations`).
- **State Segregation**: Keep UI presentation (Webview HTML) cleanly separated from state logic and VS Code API calls.

---

## 3. Contribution Point Rules

- Whenever adding a new user-facing action:
  1. Add entry to `package.json` under `contributes.commands`.
  2. Declare the appropriate menu placement in `contributes.menus` with specific `when` clauses.
  3. Register the implementation in `activate()` using `vscode.commands.registerCommand`.

---

## 4. Documentation Protocol

- When adding new features or making architectural changes, update:
  - `docs/Requirements.md` for new specifications.
  - `docs/code-and-functions-map.md` for new functions or data structures.
  - `docs/pitfalls-and-gotchas.md` for any bugs discovered and their fixes.

---

## 5. Testing & Verification Rules

1. **Test-First Reliability**: Pure logic modules (`rangeEngine`, `wiringEngine`, `stateManager`, `persistenceManager`) MUST have dedicated automated unit tests running with Node's native test runner (`node --test`).
2. **Deterministic Range Tests**: Any change affecting how edits, insertions, or deletions transform tag offsets must pass the regression test suite covering:
   - Line additions/deletions before a tag.
   - Text insertions inside a tag.
   - Insertions immediately following the trailing character (boundary invariance check).
   - Partial and full deletions.
3. **Safe State Transitions**: The Variable Wiring state machine must have test assertions verifying that invalid click sequences never corrupt editor text or leave the system in an orphaned armed state.
4. **No Unhandled Promises / Crashes**: All file I/O operations in `persistenceManager` must be wrapped in error handlers to prevent extension host termination.

