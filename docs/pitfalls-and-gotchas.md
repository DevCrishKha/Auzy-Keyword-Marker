# Pitfalls & Gotchas

A guide to tricky behaviors, known edge cases, and environment quirks when building this extension.

---

## 1. Extension Host Debugger Window Closes After ~2 Seconds

### Problem
When pressing `F5` to debug, a new VS Code window opens and immediately closes after 1-2 seconds.

### Root Cause
Without specifying `"runtimeExecutable": "${execPath}"` in `.vscode/launch.json`, VS Code tries to launch whatever `code` binary is located in Windows system `PATH`. If you are running a different installation (User vs System install), VS Code Insiders, or an editor fork, the debugger fails to connect to the process and kills it.

### Solution
Always ensure `.vscode/launch.json` explicitly targets `${execPath}`:
```json
{
  "runtimeExecutable": "${execPath}",
  "args": ["--extensionDevelopmentPath=${workspaceFolder}"]
}
```

---

## 2. Losing Focus / Target Range When Webview Opens

### Problem
Opening a Webview panel shifts user focus away from the editor to the Webview. If your code queries `vscode.window.activeTextEditor` *after* the Webview opens or upon submitting, it will return `undefined`.

### Solution
Always snapshot the target editor's document URI and selection **before** creating the Webview panel:
```javascript
const targetUri = editor.document.uri;
const targetRange = new vscode.Range(selection.start, selection.end);
```
Pass these captured values into the submit handler.

---

## 3. Disappearing Decorations on Tab Switch

### Problem
In VS Code, decorations applied via `editor.setDecorations()` are tied to the active view of an editor. When a user switches tabs, closes and reopens a file, or opens a side-by-side editor, decorations disappear if they are only applied once.

### Solution
Listen to `vscode.window.onDidChangeVisibleTextEditors` and reapply active decorations for all visible editors corresponding to the modified document URI.

---

## 4. Text Shifts When Editing & Trailing Space Expansion

### Problem
1. When text is edited anywhere in the file, static line/character coordinates drift, causing decorations to fall behind the actual tokens.
2. If a user places their cursor immediately after a marked keyword and types a space, default VS Code decorations bleed and expand across the space.

### Solution
1. **Dynamic Offset Tracking**: `RangeEngine` listens to `vscode.workspace.onDidChangeTextDocument` and dynamically shifts tag boundaries based on the delta offsets of preceding edits. If text is deleted completely, the tag is garbage-collected.
2. **Boundary Invariance**: All `createTextEditorDecorationType` instances are configured with:
   ```javascript
   rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
   ```
   Combined with `RangeEngine` boundary checks, insertions at `tag.range.endCharacter` strictly belong outside the tag.

---

## 5. Left-Click vs. Keyboard Navigation
### Problem
Listening to `vscode.window.onDidChangeTextEditorSelection` catches every cursor move, including when a developer navigates code using the keyboard arrow keys. This mistakenly triggered tag arming or tutorial opening during regular typing and browsing.

### Solution
Inspect `event.kind` and strictly filter for mouse interactions:
```javascript
if (event.kind !== vscode.TextEditorSelectionChangeKind.Mouse) return;
```

---

## 6. Live Text Synchronization on Edit
### Problem
While `RangeEngine` shifted tag start/end offsets when users edited text inside a tag, `tag.word` was still storing the initial static string from when it was first marked. Wiring an edited Output tag would insert its stale original word rather than the live edited token.

### Solution
On every `onDidChangeTextDocument` event, sync `tag.word = document.getText(liveRange)` for all surviving tags. Additionally, during wiring replacement, query `editor.document.getText(outputRange)` directly to guarantee 100% freshness.

---

## 7. Column 0 Boundary Glitches & Border Collision
### Problem
1. When double-clicking or selecting words at line starts, leading whitespace or indentation can expand the selection range, causing replacement to overwrite adjacent code or symbols.
2. Applying both `variable:Input` (solid blue border) and `armed` (dashed red border) simultaneously to the exact same range caused border collision and failed to render the red border at column 0.

### Solution
1. Explicitly trim selections upon marking so `newRange` is anchored solely to the word token.
2. When a tag is in the armed state, exclusively render the `armed` decoration style, omitting the default blue border until disarmed.

---

## 8. Webview Script Security & Content Security Policy (CSP)

### Problem: `window.prompt()`, `alert()`, and `confirm()` Fail Silently
Inside VS Code Webviews (which run inside restricted Chromium sandboxed iframes), browser modal APIs like `window.prompt()`, `window.alert()`, and `window.confirm()` are **strictly blocked by Chromium**. Attempting to call them causes silent failures or throws:
```text
[Blocked] The alert/confirm/prompt function is not allowed in a sandboxed iframe without allow-modals.
```

### Solution
Never use browser-native `prompt()` or `alert()`. Instead, implement in-canvas HTML/CSS modal dialog overlays (or pass messages to the extension host via `acquireVsCodeApi().postMessage()` to display native `vscode.window.showInputBox`).


### Gotcha
Webviews run in a restricted sandbox. Inline scripts and styles can be blocked by VS Code's Content Security Policy if not configured with `enableScripts: true`. Also, avoid inline `onclick="..."` attributes if strict CSP headers are introduced later; use standard `addEventListener` in `<script>`.

