/**
 * Status Bar Controller for Auzy-Keyword-Marker
 *
 * Controls the visibility toggle for visual decorations
 * while background range tracking remains continuously active.
 */

const vscode = require("vscode");

class StatusBarController {
  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      1000,
    );
    this.statusBarItem.command = "auzyVisualizer.toggleActive";
  }

  /**
   * Updates the status bar icon and text based on visibility state.
   * @param {vscode.TextEditor | undefined} editor
   * @param {boolean} isVisible
   * @param {number} tagCount
   */
  update(editor, isVisible, tagCount = 0) {
    if (!editor || !editor.document || editor.document.uri.scheme !== "file") {
      this.statusBarItem.hide();
      return;
    }

    if (isVisible) {
      this.statusBarItem.text = `$(eye) Auzy: Visible (${tagCount})`;
      this.statusBarItem.tooltip = `Auzy tags are VISIBLE on screen.\nClick to hide visual decorations (live tracking stays active).`;
    } else {
      this.statusBarItem.text = `$(eye-closed) Auzy: Hidden (${tagCount})`;
      this.statusBarItem.tooltip = `Auzy tags are HIDDEN (clean editor view).\nClick to show visual decorations.\nLive range tracking is always active in the background.`;
    }

    this.statusBarItem.show();
  }

  dispose() {
    this.statusBarItem.dispose();
  }
}

module.exports = {
  StatusBarController,
};
