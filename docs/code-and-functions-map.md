# Code & Functions Map

**Project:** `Auzy-Keyword-Marker`  
This document maps every module, entry point, exported class, and test suite in the repository.

---

## 1. Directory Structure

```text
VSCode_Extension/
├── .vscode/
│   └── launch.json                # VS Code debugging launcher
├── docs/                          # Architectural and engineering specifications
│   ├── Requirements.md
│   ├── README.md
│   ├── requirements-and-architecture.md
│   ├── code-and-functions-map.md
│   ├── pitfalls-and-gotchas.md
│   └── DEVELOPMENT-RULES.md
├── src/                           # Modular core engine
│   ├── stateManager.js            # In-memory document tag and armed state registry
│   ├── rangeEngine.js             # Real-time offset calculator & boundary invariance
│   ├── wiringEngine.js            # Input-Output variable wiring state machine
│   ├── decorationManager.js       # ClosedClosed decoration types and rendering
│   ├── statusBar.js               # Status bar item for per-file activation
│   ├── dialogManager.js           # Floating dialogue box & Tut-Tag canvas
│   └── persistenceManager.js      # Ctrl+S JSON sync to Visualizer directory
├── test/                          # Automated unit and integration test suites
│   ├── rangeEngine.test.js        # Boundary invariance & delta offset tests
│   ├── wiringEngine.test.js       # Arming, replacement, and cancel state tests
│   ├── stateManager.test.js       # Tag lifecycle and activation tests
│   └── persistenceManager.test.js # Schema validation & disk serialization tests
├── extension.js                   # Extension activator, event bindings, and glue
├── jsconfig.json                  # IDE JavaScript IntelliSense config
└── package.json                   # Extension manifest, commands, menus, test script
```

---

## 2. Module Specifications

### 2.1 `src/stateManager.js`
- **Class `StateManager`**:
  - `activeFileUris` (`Set<string>`): Tracks files currently activated for visualization.
  - `fileTagsMap` (`Map<string, VisualizerTag[]>`): In-memory store of tags per document URI.
  - `armedTagState` (`{ fileUri, tag } | null`): Holds the currently armed Input tag.
- **Methods**:
  - `isFileActive(uri)` / `setFileActive(uri, bool)` / `toggleFileActive(uri)`
  - `getTags(uri)` / `setTags(uri, tags)` / `addTag(uri, tag)` / `removeTag(uri, tagId)`
  - `findTagAtPosition(uri, line, char)`: Binary or linear search matching cursor position.
  - `getArmedTag()` / `setArmedTag(uri, tag)` / `clearArmedTag()`

---

### 2.2 `src/rangeEngine.js`
- **Class `RangeEngine`**:
  - `applyContentChanges(tags, contentChanges)`: Pure function updating all tag ranges in response to document text changes.
  - Enforces **Boundary Invariance**: Changes occurring at or after `tag.range.endCharacter` (such as typing space at the end) do not expand the tag range.
  - Automatically collapses and removes tags if their text is deleted.

---

### 2.3 `src/wiringEngine.js`
- **Class `WiringEngine`**:
  - `processClick({ fileUri, line, character, tags, armedState })`: Pure state machine evaluating left-click events.
  - Returns action descriptors:
    - `'ARM_INPUT'`: When user clicks an Input variable tag.
    - `'REPLACE_INPUT_WITH_OUTPUT'`: When user clicks an Output tag while an Input tag is armed.
    - `'REPLACE_INPUT_WITH_DEFAULT'`: When user clicks a Default tag while an Input tag is armed.
    - `'CANCEL_ARM'`: When user clicks neutral whitespace while armed.
    - `'OPEN_TUTORIAL'`: When user clicks a Tut-Tag.
    - `'SHOW_DEFAULT_DROPDOWN'`: When user clicks a Default tag while no Input tag is armed.
    - `'NONE'`: No operation.

---

### 2.4 `src/decorationManager.js`
- **Class `DecorationManager`**:
  - Instantiates `TextEditorDecorationType` for:
    - `variable:Input` (Faded empty-slot)
    - `variable:Output` (Green)
    - `variable:Default` (Teal)
    - `variable:Pin Value` (Gold)
    - `armed` (Red dashed pulse for armed Input tag)
    - `function` (Purple)
    - `tut-tag` (Pink/Magenta)
    - `keyword` (Orange)
  - All configured with `rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed`.
  - `applyDecorations(editor, tags, armedState)`: Renders decorations with rich hover tooltips.
  - `clearDecorations(editor)`: Clears decorations when deactivating.

---

### 2.5 `src/statusBar.js`
- **Class `StatusBarController`**:
  - Maintains `vscode.StatusBarItem` on the bottom horizontal bar.
  - Binds to command `auzyVisualizer.toggleActive`.
  - Displays `$(eye) Auzy: Active` or `$(eye-closed) Auzy: Inactive`.

---

### 2.6 `src/dialogManager.js`
- **Class `DialogManager`**:
  - `promptMarkKeyword(word)`: Floating modal dialogue box on top of the editor. Prompts for Category, Sub-type, Default values, and Description.
  - `openTutorialAuthoringCanvas(word)`: Opens freeform canvas where author clicks anywhere to place notes, images, and links.
  - `openTutorialViewer(tag)`: Read-only Webview viewer rendering authored tutorial cards on left-click.

---

### 2.7 `src/persistenceManager.js`
- **Class `PersistenceManager`**:
  - `validateTag(tag)`: Validates tag schema integrity.
  - `saveFileTags(workspaceRoot, filePath, fileUri, tags)`: Writes JSON to `external-vscode-extension/Visualizer/<filename>.json`.
  - `loadFileTags(workspaceRoot, filePath)`: Reads and parses stored JSON on activation.

---

## 3. Test Suites (`npm test`)

| Test File | Target Module | Test Coverage |
| :--- | :--- | :--- |
| `test/rangeEngine.test.js` | `RangeEngine` | Trailing space boundary invariance, line insertions, offset shifting, tag deletion collapse, internal expansions. |
| `test/wiringEngine.test.js` | `WiringEngine` | Click state transitions (`ARM_INPUT`, `REPLACE_INPUT_WITH_OUTPUT`, `REPLACE_INPUT_WITH_DEFAULT`, `CANCEL_ARM`, `OPEN_TUTORIAL`, `SHOW_DEFAULT_DROPDOWN`). |
| `test/stateManager.test.js` | `StateManager` | Per-file activation toggling, tag CRUD operations, armed tag lifecycle. |
| `test/persistenceManager.test.js` | `PersistenceManager` | Tag schema validation, JSON writing and reading from disk. |
