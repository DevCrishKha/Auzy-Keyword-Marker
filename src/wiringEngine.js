/**
 * Wiring Engine for Auzy-Keyword-Marker
 *
 * Manages the state transitions for left-clicking on tags:
 * 1. Click Input variable tag -> ARM it.
 * 2. Click Output or Default variable tag while armed -> REPLACE input tag with output/default tag.
 * 3. Click anywhere else or neutral space -> CANCEL armed state.
 * 4. Click Default tag while unarmed -> SHOW default values dropdown.
 * 5. Click Tut-Tag -> OPEN tutorial.
 */

class WiringEngine {
  /**
   * Evaluates an editor click event and returns the next action.
   *
   * @param {object} params
   * @param {string} params.fileUri - URI of the active file
   * @param {number} params.line - Clicked line
   * @param {number} params.character - Clicked character offset
   * @param {Array<object>} params.tags - All tags in this file
   * @param {{ fileUri: string, tag: object } | null} params.armedState - Current armed tag state
   * @returns {{ action: 'NONE' | 'ARM_INPUT' | 'REPLACE_INPUT_WITH_OUTPUT' | 'REPLACE_INPUT_WITH_DEFAULT' | 'CANCEL_ARM' | 'OPEN_TUTORIAL' | 'SHOW_DEFAULT_DROPDOWN', tag?: object, inputTag?: object, outputTag?: object, defaultTag?: object }}
   */
  static processClick({ fileUri, line, character, tags, armedState }) {
    const clickedTag = tags.find((tag) => {
      const { startLine, startCharacter, endLine, endCharacter } = tag.range;
      if (line < startLine || line > endLine) return false;
      if (line === startLine && character < startCharacter) return false;
      if (line === endLine && character > endCharacter) return false;
      return true;
    });

    // Case 1: Clicked on neutral space (no tag)
    if (!clickedTag) {
      if (armedState) {
        return { action: "CANCEL_ARM" };
      }
      return { action: "NONE" };
    }

    // Case 2: Clicked on a Tutorial Tag (Tut-Tag)
    if (clickedTag.category === "tut-tag") {
      return { action: "OPEN_TUTORIAL", tag: clickedTag };
    }

    // Case 3: Clicked on a Variable Tag
    if (clickedTag.category === "variable") {
      // 3a. Clicked an Input Variable Tag -> Arm it
      if (clickedTag.variableSubType === "Input") {
        // If clicking the same already armed tag, leave it or re-arm
        return { action: "ARM_INPUT", tag: clickedTag };
      }

      // 3b. Clicked an Output Variable Tag -> Replace armed Input tag if one exists
      if (clickedTag.variableSubType === "Output") {
        if (
          armedState &&
          armedState.fileUri === fileUri &&
          armedState.tag.category === "variable" &&
          armedState.tag.variableSubType === "Input"
        ) {
          return {
            action: "REPLACE_INPUT_WITH_OUTPUT",
            inputTag: armedState.tag,
            outputTag: clickedTag,
          };
        }
        return { action: "NONE" };
      }

      // 3c. Clicked a Default Variable Tag
      if (clickedTag.variableSubType === "Default") {
        // If an Input tag is armed, replace it with this Default tag
        if (
          armedState &&
          armedState.fileUri === fileUri &&
          armedState.tag.category === "variable" &&
          armedState.tag.variableSubType === "Input"
        ) {
          return {
            action: "REPLACE_INPUT_WITH_DEFAULT",
            inputTag: armedState.tag,
            defaultTag: clickedTag,
          };
        }
        // Otherwise show the default values dropdown
        return { action: "SHOW_DEFAULT_DROPDOWN", tag: clickedTag };
      }
    }

    // Case 4: Clicked any other tag while an input was armed -> cancel arming
    if (armedState) {
      return { action: "CANCEL_ARM" };
    }

    return { action: "NONE" };
  }
}

module.exports = {
  WiringEngine,
};
