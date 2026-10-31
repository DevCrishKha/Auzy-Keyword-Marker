/**
 * Auzy-Keyword-Marker
 * Main Extension Controller
 * 
 * Architecture:
 * - Engine & Range Tracking: Active in background for all annotated files.
 * - Wiring Replacement: Full tag replacement (text, category, sub-type, color styling, metadata).
 * - Status Bar Icon: Visual toggle controlling whether tags are Visible or Hidden on screen.
 * - Master Switch: Can be completely disabled per-workspace or globally via command or settings.
 * - Ctrl+S Persistence: Always saves updated tags to disk when active.
 */

const vscode = require('vscode');
const { stateManager } = require('./src/stateManager');
const { RangeEngine } = require('./src/rangeEngine');
const { WiringEngine } = require('./src/wiringEngine');
const { DecorationManager } = require('./src/decorationManager');
const { StatusBarController } = require('./src/statusBar');
const { PersistenceManager } = require('./src/persistenceManager');
const { DialogManager } = require('./src/dialogManager');

let decorationManager;
let statusBarController;

/** Set of file URIs where decorations are visually displayed on screen */
const visibleFileUris = new Set();

function activate(context) {
  decorationManager = new DecorationManager();
  statusBarController = new StatusBarController();

  // Helper: check if extension is enabled for this workspace in settings
  function isExtensionEnabled() {
    return vscode.workspace.getConfiguration('auzyVisualizer').get('enabled', true);
  }

  // Helper to get workspace root
  function getWorkspaceRoot() {
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
      return vscode.workspace.workspaceFolders[0].uri.fsPath;
    }
    return null;
  }

  // Ensure tags for a file are loaded from disk into memory
  function ensureFileTagsLoaded(document) {
    if (!isExtensionEnabled()) return;
    if (!document || document.uri.scheme !== 'file') return;
    const uri = document.uri.toString();

    // If not loaded yet, attempt to load from disk
    if (stateManager.getTags(uri).length === 0) {
      const root = getWorkspaceRoot();
      if (root) {
        const saved = PersistenceManager.loadFileTags(root, document.fileName);
        if (saved && saved.length > 0) {
          stateManager.setTags(uri, saved);
          visibleFileUris.add(uri);
        }
      }
    }
  }

  // Refresh visual display for an editor
  function refreshEditor(editor) {
    if (!editor || !editor.document || editor.document.uri.scheme !== 'file' || !isExtensionEnabled()) {
      statusBarController.update(undefined, false, 0);
      if (editor) decorationManager.clearDecorations(editor);
      return;
    }

    const uri = editor.document.uri.toString();
    const tags = stateManager.getTags(uri);
    const isVisible = visibleFileUris.has(uri);

    statusBarController.update(editor, isVisible, tags.length);

    if (isVisible && tags.length > 0) {
      const armed = stateManager.getArmedTag();
      decorationManager.applyDecorations(editor, tags, armed);
    } else {
      decorationManager.clearDecorations(editor);
    }
  }

  // 1. COMMAND: Master Workspace Toggle (Completely turn on/off for this project)
  const toggleWorkspaceCmd = vscode.commands.registerCommand('auzyVisualizer.toggleWorkspace', async () => {
    const config = vscode.workspace.getConfiguration('auzyVisualizer');
    const current = config.get('enabled', true);
    const targetState = !current;

    await config.update('enabled', targetState, vscode.ConfigurationTarget.Workspace);

    if (!targetState) {
      // Disabling: clear all visible decorations, hide status bar, clear armed states
      for (const editor of vscode.window.visibleTextEditors) {
        decorationManager.clearDecorations(editor);
      }
      statusBarController.update(undefined, false, 0);
      stateManager.clearArmedTag();
      vscode.window.showInformationMessage('Auzy-Keyword-Marker is now completely DISABLED for this workspace.');
    } else {
      // Enabling: load tags and restore view
      if (vscode.window.activeTextEditor) {
        ensureFileTagsLoaded(vscode.window.activeTextEditor.document);
        refreshEditor(vscode.window.activeTextEditor);
      }
      vscode.window.showInformationMessage('Auzy-Keyword-Marker is now ENABLED for this workspace.');
    }
  });

  // 2. COMMAND: Toggle Visibility per file via Status Bar
  const toggleVisibilityCmd = vscode.commands.registerCommand('auzyVisualizer.toggleActive', () => {
    if (!isExtensionEnabled()) {
      vscode.window.showInformationMessage('Auzy Keyword Marker is disabled in workspace settings. Run "Auzy: Enable/Disable Visualizer for this Workspace" to turn it back on.');
      return;
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor || !editor.document || editor.document.uri.scheme !== 'file') {
      vscode.window.showInformationMessage('Please open a code file to use Auzy Keyword Marker.');
      return;
    }

    const uri = editor.document.uri.toString();
    ensureFileTagsLoaded(editor.document);

    const isCurrentlyVisible = visibleFileUris.has(uri);
    if (isCurrentlyVisible) {
      visibleFileUris.delete(uri);
      vscode.window.setStatusBarMessage('$(eye-closed) Auzy: Decorations hidden (tracking active in background)', 2500);
    } else {
      visibleFileUris.add(uri);
      vscode.window.setStatusBarMessage('$(eye) Auzy: Decorations visible', 2500);
    }

    refreshEditor(editor);
  });

  // 3. COMMAND: Mark Keyword (Context Menu Right-Click)
  const markKeywordCmd = vscode.commands.registerCommand('auzyVisualizer.markKeyword', async () => {
    if (!isExtensionEnabled()) {
      vscode.window.showWarningMessage('Auzy-Keyword-Marker is currently disabled for this workspace.');
      return;
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor || !editor.document) {
      vscode.window.showInformationMessage('No active editor.');
      return;
    }

    const uri = editor.document.uri.toString();
    ensureFileTagsLoaded(editor.document);

    const selection = editor.selection;
    const rawText = editor.document.getText(selection);
    const selectedText = rawText.trim();

    if (!selectedText) {
      vscode.window.showWarningMessage('Please select a keyword first.');
      return;
    }

    // Prompt user via unified dialogue box (Category, Sub-type, Title, Description together)
    const tagData = await DialogManager.promptMarkKeyword(selectedText);
    if (!tagData) return; // User canceled

    // Precise trimming: align range strictly with the trimmed keyword (prevents consuming adjacent whitespace/symbols)
    const leadingSpaces = rawText.indexOf(selectedText);
    const actualStartChar = selection.start.character + (leadingSpaces > 0 ? leadingSpaces : 0);
    const actualEndChar = actualStartChar + selectedText.length;

    const newRange = {
      startLine: selection.start.line,
      startCharacter: actualStartChar,
      endLine: selection.start.line,
      endCharacter: actualEndChar
    };

    // Replace: Remove any existing mark(s) overlapping with this range
    const replaced = stateManager.removeTagsInRange(uri, newRange);

    const newTag = {
      id: 'tag_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      word: selectedText,
      title: tagData.title || '',
      range: newRange,
      category: tagData.category,
      variableSubType: tagData.variableSubType,
      defaultValues: tagData.defaultValues,
      description: tagData.description,
      tutData: tagData.tutData
    };

    stateManager.addTag(uri, newTag);

    // Automatically make tags visible when a new one is marked
    visibleFileUris.add(uri);
    refreshEditor(editor);

    if (replaced && replaced.length > 0) {
      vscode.window.showInformationMessage(`Updated mark for "${selectedText}" to ${tagData.category}.`);
    } else {
      vscode.window.showInformationMessage(`Marked "${selectedText}" as ${tagData.category}.`);
    }
  });

  // 4. COMMAND: Unmark Keyword (Context Menu Right-Click)
  const unmarkKeywordCmd = vscode.commands.registerCommand('auzyVisualizer.unmarkKeyword', () => {
    if (!isExtensionEnabled()) return;
    const editor = vscode.window.activeTextEditor;
    if (!editor || !editor.document) return;

    const uri = editor.document.uri.toString();
    const pos = editor.selection.active;
    const tag = stateManager.findTagAtPosition(uri, pos.line, pos.character);

    if (tag) {
      stateManager.removeTag(uri, tag.id);
      refreshEditor(editor);
      vscode.window.showInformationMessage(`Unmarked "${tag.word}".`);
    } else {
      vscode.window.showInformationMessage('No marked tag at cursor position.');
    }
  });

  // 5. EVENT: Active Editor Changed
  const onActiveEditorChanged = vscode.window.onDidChangeActiveTextEditor(editor => {
    if (editor && editor.document && isExtensionEnabled()) {
      ensureFileTagsLoaded(editor.document);
      refreshEditor(editor);
    }
  });

  // 6. EVENT: Real-Time Typing & Edits (Range Engine Tracking ALWAYS RUNS)
  const onDocumentChanged = vscode.workspace.onDidChangeTextDocument(event => {
    if (!isExtensionEnabled()) return;
    const uri = event.document.uri.toString();
    const existingTags = stateManager.getTags(uri);
    if (existingTags.length === 0) return;

    // RangeEngine continuously updates tag positions regardless of visibility
    const { updatedTags } = RangeEngine.applyContentChanges(existingTags, event.contentChanges);

    // Synchronize tag.word with live document text on every edit
    for (const tag of updatedTags) {
      const liveRange = new vscode.Range(
        tag.range.startLine,
        tag.range.startCharacter,
        tag.range.endLine,
        tag.range.endCharacter
      );
      tag.word = event.document.getText(liveRange);
    }

    stateManager.setTags(uri, updatedTags);

    // Reapply decorations if currently visible
    for (const visibleEditor of vscode.window.visibleTextEditors) {
      if (visibleEditor.document.uri.toString() === uri) {
        refreshEditor(visibleEditor);
      }
    }
  });

  // 7. EVENT: Interactive Left-Click Handler (Wiring & Tut-Tag launch)
  const onSelectionChanged = vscode.window.onDidChangeTextEditorSelection(async event => {
    if (!isExtensionEnabled()) return;

    // Only respond to actual mouse clicks, ignore keyboard arrow navigation!
    if (event.kind !== vscode.TextEditorSelectionChangeKind.Mouse) {
      return;
    }

    const editor = event.textEditor;
    const uri = editor.document.uri.toString();

    // Only respond if tags are currently visible
    if (!visibleFileUris.has(uri)) return;
    if (event.selections.length === 0) return;

    const selection = event.selections[0];
    if (!selection.isEmpty) return;

    const pos = selection.active;
    const tags = stateManager.getTags(uri);
    const armedState = stateManager.getArmedTag();

    const decision = WiringEngine.processClick({
      fileUri: uri,
      line: pos.line,
      character: pos.character,
      tags,
      armedState
    });

    if (decision.action === 'ARM_INPUT') {
      stateManager.setArmedTag(uri, decision.tag);
      refreshEditor(editor);
      vscode.window.showInformationMessage(
        `⚡ Input tag "${decision.tag.word}" ARMED. Click an Output or Default tag to replace it, or click elsewhere to cancel.`
      );
    } else if (decision.action === 'CANCEL_ARM') {
      stateManager.clearArmedTag();
      refreshEditor(editor);
    } else if (decision.action === 'REPLACE_INPUT_WITH_OUTPUT' || decision.action === 'REPLACE_INPUT_WITH_DEFAULT') {
      const isDefault = decision.action === 'REPLACE_INPUT_WITH_DEFAULT';
      const inputTag = decision.inputTag;
      const sourceTag = isDefault ? decision.defaultTag : decision.outputTag;
      const sourceTypeName = isDefault ? 'Default' : 'Output';

      // Read current live text of sourceTag from document
      const sourceRange = new vscode.Range(
        sourceTag.range.startLine,
        sourceTag.range.startCharacter,
        sourceTag.range.endLine,
        sourceTag.range.endCharacter
      );
      const liveSourceText = editor.document.getText(sourceRange) || sourceTag.word;

      const targetRange = new vscode.Range(
        inputTag.range.startLine,
        inputTag.range.startCharacter,
        inputTag.range.endLine,
        inputTag.range.endCharacter
      );

      // Perform the editor replacement
      const success = await editor.edit(editBuilder => {
        editBuilder.replace(targetRange, liveSourceText);
      });

      if (success) {
        // Find the tag in stateManager by ID to mutate the exact stored instance (avoiding stale clone references)
        const allTags = stateManager.getTags(uri);
        const tagToUpdate = allTags.find(t => t.id === inputTag.id) || inputTag;

        // COMPLETE REPLACEMENT: Replace text, category, sub-type, styling, description & metadata
        tagToUpdate.word = liveSourceText;
        tagToUpdate.title = sourceTag.title || '';
        tagToUpdate.category = sourceTag.category;
        tagToUpdate.variableSubType = sourceTag.variableSubType; // Converts to 'Output' (Green) or 'Default' (Orange)
        tagToUpdate.description = sourceTag.description;
        tagToUpdate.defaultValues = sourceTag.defaultValues ? [...sourceTag.defaultValues] : undefined;
        tagToUpdate.tutData = sourceTag.tutData ? JSON.parse(JSON.stringify(sourceTag.tutData)) : undefined;
        tagToUpdate.range.startLine = inputTag.range.startLine;
        tagToUpdate.range.startCharacter = inputTag.range.startCharacter;
        tagToUpdate.range.endLine = inputTag.range.startLine;
        tagToUpdate.range.endCharacter = inputTag.range.startCharacter + liveSourceText.length;

        stateManager.setTags(uri, allTags);
        stateManager.clearArmedTag();
        refreshEditor(editor);
        vscode.window.showInformationMessage(`Wired: Replaced with ${sourceTypeName} "${liveSourceText}". Tag converted to ${sourceTypeName} variable.`);
      }
    } else if (decision.action === 'OPEN_TUTORIAL') {
      DialogManager.openTutorialViewer(decision.tag);
    } else if (decision.action === 'SHOW_DEFAULT_DROPDOWN') {
      const defaultTag = decision.tag;
      const defaultValues = defaultTag.defaultValues || [];

      if (defaultValues.length === 0) {
        vscode.window.showInformationMessage(`No default values defined for "${defaultTag.word}".`);
        return;
      }

      const items = defaultValues.map(val => ({
        label: `$(gear) ${val}`,
        description: `Apply default value to ${defaultTag.word}`,
        value: val
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: `Select default value for "${defaultTag.word}"`,
        title: `Default Values: ${defaultTag.word}`
      });

      if (selected) {
        const targetRange = new vscode.Range(
          defaultTag.range.startLine,
          defaultTag.range.startCharacter,
          defaultTag.range.endLine,
          defaultTag.range.endCharacter
        );

        const success = await editor.edit(editBuilder => {
          editBuilder.replace(targetRange, selected.value);
        });

        if (success) {
          const allTags = stateManager.getTags(uri);
          const tagToUpdate = allTags.find(t => t.id === defaultTag.id) || defaultTag;
          tagToUpdate.word = selected.value;
          tagToUpdate.range.endCharacter = defaultTag.range.startCharacter + selected.value.length;
          stateManager.setTags(uri, allTags);
          refreshEditor(editor);
          vscode.window.showInformationMessage(`Updated "${defaultTag.word}" to default value: ${selected.value}`);
        }
      }
    }
  });

  // 8. EVENT: File Save (Ctrl+S) -> Save JSON to external-vscode-extension/Visualizer
  const onDocumentSaved = vscode.workspace.onDidSaveTextDocument(document => {
    if (!isExtensionEnabled()) return;
    const uri = document.uri.toString();
    const tags = stateManager.getTags(uri);
    if (tags.length === 0) return;

    const root = getWorkspaceRoot();
    if (!root) return;

    const saved = PersistenceManager.saveFileTags(root, document.fileName, uri, tags);
    if (saved) {
      vscode.window.setStatusBarMessage(`$(check) Auzy Visualizer: Saved ${tags.length} tags to Visualizer/`, 3000);
    }
  });

  // Register all disposables
  context.subscriptions.push(
    toggleWorkspaceCmd,
    toggleVisibilityCmd,
    markKeywordCmd,
    unmarkKeywordCmd,
    onActiveEditorChanged,
    onDocumentChanged,
    onSelectionChanged,
    onDocumentSaved,
    statusBarController,
    decorationManager
  );

  // Initialize with currently open editor if present
  if (vscode.window.activeTextEditor && isExtensionEnabled()) {
    ensureFileTagsLoaded(vscode.window.activeTextEditor.document);
    refreshEditor(vscode.window.activeTextEditor);
  }
}

function deactivate() {
  if (decorationManager) decorationManager.dispose();
  if (statusBarController) statusBarController.dispose();
  visibleFileUris.clear();
  stateManager.reset();
}

module.exports = {
  activate,
  deactivate
};
