# Requirements & Architecture Specification

**Project:** `Auzy-Keyword-Marker`  
**Target Environment:** Visual Studio Code Extension Engine (Node.js Extension Host & Webview Renderer)

---

## 1. Executive Summary & Vision

`Auzy-Keyword-Marker` is an interactive in-editor code visualization, variable-wiring, and tutorial authoring extension for VS Code. Unlike passive syntax highlighters, it treats marked keywords as **interactive "Tags"** that:
1. Maintain strict real-time positioning even as documents are edited.
2. Provide interactive left-click behaviors (such as wiring an Output variable into an Input variable, or launching rich freeform tutorials).
3. Operate strictly on a per-file opt-in basis via a status bar toggle.
4. Persist data to project-local JSON on file save (`Ctrl+S`).

---

## 2. High-Level System Architecture

VS Code isolates extensions in a Node.js process (**Extension Host**), keeping them separate from the Chromium-based **Renderer** displaying the Monaco Editor canvas and Webviews.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             VS Code Renderer                                │
│                                                                             │
│  ┌──────────────────────────────┐        ┌───────────────────────────────┐  │
│  │     Monaco Editor Canvas     │        │     Webview Panel (Modal)     │  │
│  │  - Rendered Text & Cursor    │        │  - Tag Creation Form          │  │
│  │  - Visual Decorations (Tags) │        │  - Dynamic Sub-types & Canvas │  │
│  │  - Selection / Click Events  │        │  - Read-Only Tutorial Viewer  │  │
│  └──────────────▲───────────────┘        └───────────────▲───────────────┘  │
└─────────────────┼────────────────────────────────────────┼──────────────────┘
                  │ RPC Bridge                             │ postMessage / RPC
┌─────────────────▼────────────────────────────────────────▼──────────────────┐
│                          Node.js Extension Host                             │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                 Auzy-Keyword-Marker Core Engine                     │   │
│   │                                                                     │   │
│   │  [1. Activation Controller]  ──> Per-file active file registry      │   │
│   │  [2. Dynamic Tracking Engine]──> Live range offset calculation      │   │
│   │  [3. Interactive Click Hub]  ──> Left-click dispatcher & wiring FSM │   │
│   │  [4. Webview Modal Host]     ──> Dynamic HTML/JS Forms & Canvas     │   │
│   │  [5. Persistence Manager]    ──> Ctrl+S JSON sync to Visualizer dir │   │
│   │                                                                     │   │
│   │  In-Memory Storage: activeFileTagsMap (Map<UriString, FileData>)     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Subsystem Breakdown

### 3.1 Background Engine Tracking & Visual Visibility Toggle
- **Continuous Background Engine**:
  - Whenever an annotated file is opened, its tags are loaded into memory.
  - As code is typed, deleted, or edited, `RangeEngine` continuously recalculates boundaries and syncs `tag.word` in real-time, regardless of whether decorations are shown or hidden.
  - Hitting `Ctrl+S` always persists the updated tag ranges to disk.
- **Visual Visibility Subsystem**:
  - **UI Anchor**: An item situated in the bottom horizontal **Status Bar** (`vscode.window.createStatusBarItem`).
  - **Function**: Toggles visual decorations between `Visible` and `Hidden` for the active document.
  - **State Registry**: An in-memory `Set<string>` of visible document URI strings (`visibleFileUris`).
  - **Behavior**:
    - When `Visible`: Colored background highlights, borders, and mouse click wiring interactions are active.
    - When `Hidden`: Editor remains visually clean and normal, but underlying tag tracking continues uninterrupted.

---

### 3.2 Tag Marking Subsystem (Floating Dialogue Box on Top of Editor)
When text is selected and the user right-clicks **"Mark the keyword"**, a **dialogue box appears on top of the editor** (unlike a side panel taking up editor screen space).

- **UI Experience**:
  - A focused, floating modal dialogue box opens directly over the top of the editor.
  - Dropdown options: `Variable`, `Function`, `Tut-Tag`, `Keyword`.
  - **Re-marking / Replacement**: If the selected range overlaps an existing tag, the older tag is automatically purged from memory and its visual styling replaced seamlessly with the newly chosen tag.
- **Dynamic Field Expansion based on selection**:
  - **`Variable`**:
    - Sub-type selection: `Input`, `Output`, `Default`, `Pin Value`.
    - Description textarea.
    - If `Default` is selected: dynamic `+` button to append default values.
  - **`Function`**:
    - Description textarea.
  - **`Tut-Tag` (Tutorial Tag)**:
    - Freeform interactive canvas where authors can place text notes, embed images, add hyperlinks, and write code snippets.
    - **Click & Drag Resizing**: Text, images, links, and code snippets can be dynamically resized by clicking and dragging their bottom-right resize corner (`⇲`).
    - **Code Snippet Widget**: Integrated IDE code-editor styled cards with colored window dots (🔴 🟡 🟢), language badges, and syntax highlighting.
    - Stored as structured tutorial state with position coordinates (`x`, `y`) and dimensions (`width`, `height`).
  - **`Keyword`**:
    - Standard keyword classification.

---

### 3.3 Dynamic Range Engine & Boundary Invariance
Maintaining accurate decorations in a live-edited document requires explicit handling:

1. **Boundary Invariance (Trailing Space Protection)**:
   - To ensure typing a space at the end of a tag does **not** cause the decoration to expand:
   - VS Code decoration types are instantiated with:
     ```javascript
     rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
     ```
   - This ensures both start and end endpoints remain closed to text insertions.

2. **Real-Time Offset Re-calculation**:
   - Listens to `vscode.workspace.onDidChangeTextDocument`.
   - Compares edit ranges and text delta lengths against existing tag ranges.
   - Updates tag start/end offsets so the styling stays anchored precisely to the original tokens.

3. **Auto-Garbage Collection on Text Deletion**:
   - If an edit replaces or deletes the text encompassed by a tag, the tag range collapses (`range.isEmpty`).
   - Collapsed tags are immediately removed from the file's tag registry and their visual decorations are disposed.

4. **Unmark Capability**:
   - Right-clicking on an existing tag surfaces an **"Unmark"** action in the context menu to cleanly remove the tag.

---

### 3.4 Interactive Left-Click & Variable Wiring Engine

In VS Code extensions, user clicks within the editor are detected via `vscode.window.onDidChangeTextEditorSelection`:

```
User clicks on Editor
         │
         ▼
[onDidChangeTextEditorSelection]
         │
         ├── Is the current document active in Auzy Visualizer?
         │    └── No: Ignore
         │    └── Yes: Continue
         │
         ▼
Find Tag at Cursor Position (range.contains(cursorPosition))
         │
         ├── None found?
         │    └── If an Input Tag was ARMED:
         │         └── CANCEL ARMED STATE (reset highlight)
         │
         ├── Tut-Tag found?
         │    └── OPEN TUTORIAL VIEWER (Webview in read-only mode)
         │
         ├── Default Variable Tag found?
         │    ├── Is an Input Tag currently ARMED?
         │    │    ├── YES:
         │    │    │    1. Replace Input Tag's text with Default Tag's live text (editor.edit)
         │    │    │    2. Replace Input Tag's sub-type with 'Default' and style with Orange styling
         │    │    │    3. Copy metadata (title, description, defaultValues, tutData)
         │    │    │    4. Reset armed state & re-render decorations
         │    │    │
         │    │    └── NO: SHOW DEFAULT VALUES DROPDOWN (QuickPick to inspect/apply default value)
         │
         ├── Input Variable Tag found?
         │    └── ARM INPUT TAG (Set visual armed/selected border, store as armedTag)
         │
         └── Output Variable Tag found?
              ├── Is an Input Tag currently ARMED?
              │    ├── YES:
              │    │    1. Replace Input Tag's text with Output Tag's live text (editor.edit)
              │    │    2. Replace Input Tag's sub-type with 'Output' and style with Green styling
              │    │    3. Copy metadata (title, description, defaultValues, tutData)
              │    │    4. Reset armed state & re-render decorations
              │    │
              │    └── NO: Ignore or show info
```

---

### 3.5 Persistence Layer

- **Trigger**: `vscode.workspace.onDidSaveTextDocument` (listening for `Ctrl+S`).
- **Target Location**:
  ```text
  <WorkspaceRoot>/external-vscode-extension/Visualizer/<filename>.json
  ```
- **Lifecycle Guarantees**:
  - Closing an editor without saving **does not write to disk**.
  - On opening an activated file, the extension reads the corresponding `.json` from `external-vscode-extension/Visualizer/` if it exists.

---

## 4. In-Memory Data Schema & JSON Storage

### In-Memory Tag Object
```typescript
interface VisualizerTag {
  id: string;                      // Unique UUID
  word: string;                    // Current text value
  title?: string;                  // Optional user-assigned title
  range: {                         // Editor location
    startLine: number;
    startCharacter: number;
    endLine: number;
    endCharacter: number;
  };
  category: 'variable' | 'function' | 'tut-tag' | 'keyword';
  variableSubType?: 'Input' | 'Output' | 'Default' | 'Pin Value';
  defaultValues?: string[];        // If variableSubType === 'Default'
  description?: string;            // Text note
  tutData?: {                      // If category === 'tut-tag'
    canvasElements: Array<{
      type: 'text' | 'image' | 'link';
      x: number;
      y: number;
      content: string;
    }>;
  };
}

interface FileVisualizerState {
  fileUri: string;
  isActive: boolean;
  tags: VisualizerTag[];
}
```

---

## 5. Technical Challenges & Proven Solutions

| Challenge | Monaco (Web) Approach | VS Code Extension Solution |
| :--- | :--- | :--- |
| **No Editor DOM Access** | Direct CSS class injection & `document.querySelector` | `vscode.window.createTextEditorDecorationType` with `editor.setDecorations`. |
| **Trailing Space Expanding Tag** | CSS boundary tweaks | Set `rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed` on decoration types. |
| **Left-Click on Text Tokens** | `editor.onMouseDown` | `vscode.window.onDidChangeTextEditorSelection` + range intersection check. |
| **Floating Dialogue Box Form** | In-app modal components | Floating modal dialogue box on top of the editor (avoiding split panel disruption). |
| **Tut-Tag Freeform Canvas** | HTML5 `<canvas>` in application | Interactive HTML5 Canvas / SVG rendered inside an isolated Webview panel. |
| **Per-File Toggle** | App UI toggle switch | `vscode.window.createStatusBarItem` with stateful icon and text. |
| **Selective Persistence** | Browser LocalStorage | `vscode.workspace.onDidSaveTextDocument` writing to `<workspace>/external-vscode-extension/Visualizer/`. |

---

## 6. Testing & Reliability Architecture

Because `Auzy-Keyword-Marker` runs alongside developers in real-time editing environments, failure or desynchronization could lead to corrupted files or broken workflows. The testing strategy is divided into three tiers:

### 6.1 Unit Testing: Range Engine & Boundary Invariance
- **Test File**: `test/rangeEngine.test.js`
- **Scope**:
  - Shifts caused by preceding line insertions and deletions.
  - Multi-line edit compensation.
  - Boundary behavior: typing a space or character at `tag.range.end` preserves strict range closure (`ClosedClosed`).
  - Auto-deletion garbage collection when range collapses to 0-length.

### 6.2 Unit Testing: Variable Wiring State Machine
- **Test File**: `test/wiringEngine.test.js`
- **Scope**:
  - Transitions: `IDLE` $\rightarrow$ `ARMED(inputTag)` $\rightarrow$ `REPLACED` $\rightarrow$ `IDLE`.
  - Disarm on click-away: `ARMED` $\rightarrow$ click neutral offset $\rightarrow$ `IDLE`.
  - Multiple rapid click debouncing and invalid target handling.

### 6.3 State & Persistence Schema Testing
- **Test File**: `test/persistenceManager.test.js`
- **Scope**:
  - Validation of JSON payload structure written to `external-vscode-extension/Visualizer/<file>.json`.
  - Deserialization and rehydration of tags when reopening an annotated file.

