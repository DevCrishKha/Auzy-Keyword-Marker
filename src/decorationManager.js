/**
 * Decoration Manager for Auzy-Keyword-Marker
 * 
 * Configures and renders all text decorations.
 * Crucially applies `rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed`
 * so typing spaces or characters at the boundary never expands the tag.
 */

const vscode = require('vscode');

class DecorationManager {
  constructor() {
    const rangeBehavior = vscode.DecorationRangeBehavior.ClosedClosed;

    this.decorationTypes = {
      // Variable Sub-types
      'variable:Input': vscode.window.createTextEditorDecorationType({
        backgroundColor: 'rgba(180, 190, 205, 0.12)',
        border: '1px dashed rgba(160, 175, 195, 0.55)',
        borderRadius: '3px',
        rangeBehavior,
        overviewRulerColor: '#7f8c8d',
        overviewRulerLane: vscode.OverviewRulerLane.Right
      }),
      'variable:Output': vscode.window.createTextEditorDecorationType({
        backgroundColor: 'rgba(46, 204, 113, 0.35)',
        border: '1px solid rgba(46, 204, 113, 0.85)',
        borderRadius: '3px',
        rangeBehavior,
        overviewRulerColor: '#2ecc71',
        overviewRulerLane: vscode.OverviewRulerLane.Right
      }),
      'variable:Default': vscode.window.createTextEditorDecorationType({
        backgroundColor: 'rgba(243, 156, 18, 0.38)',
        border: '1px solid rgba(230, 126, 34, 0.9)',
        borderRadius: '3px',
        rangeBehavior,
        overviewRulerColor: '#f39c12',
        overviewRulerLane: vscode.OverviewRulerLane.Right
      }),
      'variable:Pin Value': vscode.window.createTextEditorDecorationType({
        backgroundColor: 'rgba(241, 196, 15, 0.35)',
        border: '1px solid rgba(241, 196, 15, 0.85)',
        borderRadius: '3px',
        rangeBehavior,
        overviewRulerColor: '#f1c40f',
        overviewRulerLane: vscode.OverviewRulerLane.Right
      }),
      // Armed Input State (Waiting to be replaced by Output tag)
      'armed': vscode.window.createTextEditorDecorationType({
        backgroundColor: 'rgba(231, 76, 60, 0.3)',
        border: '2px dashed #e74c3c',
        borderRadius: '3px',
        rangeBehavior,
        overviewRulerColor: '#e74c3c',
        overviewRulerLane: vscode.OverviewRulerLane.Right
      }),
      // Function
      'function': vscode.window.createTextEditorDecorationType({
        backgroundColor: 'rgba(155, 89, 182, 0.35)',
        border: '1px solid rgba(155, 89, 182, 0.85)',
        borderRadius: '3px',
        rangeBehavior,
        overviewRulerColor: '#9b59b6',
        overviewRulerLane: vscode.OverviewRulerLane.Right
      }),
      // Tut-Tag (Tutorial Tag)
      'tut-tag': vscode.window.createTextEditorDecorationType({
        backgroundColor: 'rgba(233, 30, 99, 0.35)',
        border: '1px solid rgba(233, 30, 99, 0.85)',
        borderRadius: '3px',
        rangeBehavior,
        overviewRulerColor: '#e91e63',
        overviewRulerLane: vscode.OverviewRulerLane.Right
      }),
      // Keyword
      'keyword': vscode.window.createTextEditorDecorationType({
        backgroundColor: 'rgba(230, 126, 34, 0.35)',
        border: '1px solid rgba(230, 126, 34, 0.85)',
        borderRadius: '3px',
        rangeBehavior,
        overviewRulerColor: '#e67e22',
        overviewRulerLane: vscode.OverviewRulerLane.Right
      })
    };
  }

  /**
   * Applies all tags to the target text editor.
   * If an input tag is armed, renders the armed dashed border over it.
   * 
   * @param {vscode.TextEditor} editor 
   * @param {Array<object>} tags 
   * @param {{ fileUri: string, tag: object } | null} armedState 
   */
  applyDecorations(editor, tags, armedState) {
    if (!editor) return;

    // Buckets for each decoration type
    const buckets = {};
    for (const key of Object.keys(this.decorationTypes)) {
      buckets[key] = [];
    }

    const currentDocUri = editor.document.uri.toString();

    for (const tag of tags) {
      const range = new vscode.Range(
        tag.range.startLine,
        tag.range.startCharacter,
        tag.range.endLine,
        tag.range.endCharacter
      );

      const hover = new vscode.MarkdownString();
      if (tag.category === 'variable') {
        hover.appendMarkdown(`**[VARIABLE: ${tag.variableSubType || 'Standard'}]** \`${tag.word}\`\n\n`);
        if (tag.variableSubType === 'Input') {
          hover.appendMarkdown(`*(Click to arm and wire with an Output variable)*\n\n`);
        } else if (tag.variableSubType === 'Output') {
          hover.appendMarkdown(`*(Click after arming an Input variable to replace it)*\n\n`);
        } else if (tag.variableSubType === 'Default') {
          hover.appendMarkdown(`*(Click to open default values dropdown)*\n\n`);
        }
        if (tag.defaultValues && tag.defaultValues.length > 0) {
          hover.appendMarkdown(`**Default Values:** ${tag.defaultValues.join(', ')}\n\n`);
        }
      } else if (tag.category === 'tut-tag') {
        hover.appendMarkdown(`**[TUTORIAL TAG]** \`${tag.word}\`\n\n*(Left-click to open interactive tutorial)*\n\n`);
      } else if (tag.category === 'function') {
        hover.appendMarkdown(`**[FUNCTION]** \`${tag.word}\`\n\n`);
      } else {
        hover.appendMarkdown(`**[KEYWORD]** \`${tag.word}\`\n\n`);
      }

      if (tag.description) {
        hover.appendMarkdown(tag.description);
      }

      const decorationOption = { range, hoverMessage: hover };

      // Determine bucket key
      let typeKey = tag.category;
      if (tag.category === 'variable' && tag.variableSubType) {
        typeKey = `variable:${tag.variableSubType}`;
      }

      // Check if this tag is currently armed for wiring
      const isArmed =
        armedState &&
        armedState.fileUri === currentDocUri &&
        armedState.tag.id === tag.id;

      if (isArmed) {
        // Exclusively apply armed styling to avoid border collision
        buckets['armed'].push({
          range,
          hoverMessage: new vscode.MarkdownString(`⚡ **ARMED FOR WIRING**\n\nClick an Output variable to replace this tag. Click anywhere else to cancel.`)
        });
      } else if (buckets[typeKey]) {
        buckets[typeKey].push(decorationOption);
      }
    }

    // Set decorations on the editor
    for (const [key, decType] of Object.entries(this.decorationTypes)) {
      editor.setDecorations(decType, buckets[key] || []);
    }
  }

  /**
   * Clears all decorations from the editor.
   * @param {vscode.TextEditor} editor 
   */
  clearDecorations(editor) {
    if (!editor) return;
    for (const decType of Object.values(this.decorationTypes)) {
      editor.setDecorations(decType, []);
    }
  }

  dispose() {
    for (const decType of Object.values(this.decorationTypes)) {
      decType.dispose();
    }
  }
}

module.exports = {
  DecorationManager
};

