/**
 * State Manager for Auzy-Keyword-Marker
 * Manages in-memory state:
 * - Active document URIs
 * - Tags per document
 * - Armed tag for Input-Output variable wiring
 */

class StateManager {
  constructor() {
    /** @type {Set<string>} Set of active document URI strings */
    this.activeFileUris = new Set();

    /** @type {Map<string, Array<object>>} Map<uriString, VisualizerTag[]> */
    this.fileTagsMap = new Map();

    /** @type {{ fileUri: string, tag: object } | null} Currently armed input tag for wiring */
    this.armedTagState = null;
  }

  // --- File Activation ---

  isFileActive(uriString) {
    return this.activeFileUris.has(uriString);
  }

  setFileActive(uriString, isActive) {
    if (isActive) {
      this.activeFileUris.add(uriString);
    } else {
      this.activeFileUris.delete(uriString);
      // Clear armed tag if it belonged to this file
      if (this.armedTagState && this.armedTagState.fileUri === uriString) {
        this.clearArmedTag();
      }
    }
  }

  toggleFileActive(uriString) {
    const newState = !this.isFileActive(uriString);
    this.setFileActive(uriString, newState);
    return newState;
  }

  // --- Tag Management ---

  getTags(uriString) {
    return this.fileTagsMap.get(uriString) || [];
  }

  setTags(uriString, tags) {
    this.fileTagsMap.set(uriString, tags);
  }

  addTag(uriString, tag) {
    const tags = this.getTags(uriString);
    tags.push(tag);
    this.fileTagsMap.set(uriString, tags);
  }

  removeTag(uriString, tagId) {
    const tags = this.getTags(uriString);
    const filtered = tags.filter(t => t.id !== tagId);
    this.fileTagsMap.set(uriString, filtered);
    if (this.armedTagState && this.armedTagState.tag.id === tagId) {
      this.clearArmedTag();
    }
    return filtered;
  }

  static rangesOverlap(r1, r2) {
    const isStrictlyBefore = (l1, c1, l2, c2) => l1 < l2 || (l1 === l2 && c1 < c2);
    return (
      isStrictlyBefore(r1.startLine, r1.startCharacter, r2.endLine, r2.endCharacter) &&
      isStrictlyBefore(r2.startLine, r2.startCharacter, r1.endLine, r1.endCharacter)
    );
  }

  /**
   * Removes any tags that overlap with the specified range.
   * @param {string} uriString 
   * @param {{ startLine: number, startCharacter: number, endLine: number, endCharacter: number }} range 
   * @returns {Array<object>} The removed tags
   */
  removeTagsInRange(uriString, range) {
    const tags = this.getTags(uriString);
    const removed = [];
    const remaining = [];

    for (const tag of tags) {
      if (StateManager.rangesOverlap(tag.range, range)) {
        removed.push(tag);
        if (this.armedTagState && this.armedTagState.tag.id === tag.id) {
          this.clearArmedTag();
        }
      } else {
        remaining.push(tag);
      }
    }

    this.fileTagsMap.set(uriString, remaining);
    return removed;
  }

  findTagAtPosition(uriString, line, character) {
    const tags = this.getTags(uriString);
    return tags.find(tag => {
      const { startLine, startCharacter, endLine, endCharacter } = tag.range;
      if (line < startLine || line > endLine) return false;
      if (line === startLine && character < startCharacter) return false;
      if (line === endLine && character > endCharacter) return false;
      return true;
    });
  }

  // --- Variable Wiring State Machine ---

  getArmedTag() {
    return this.armedTagState;
  }

  setArmedTag(fileUri, tag) {
    this.armedTagState = { fileUri, tag };
  }

  clearArmedTag() {
    this.armedTagState = null;
  }

  // Reset all state (useful for tests and teardown)
  reset() {
    this.activeFileUris.clear();
    this.fileTagsMap.clear();
    this.armedTagState = null;
  }
}

module.exports = {
  StateManager,
  stateManager: new StateManager()
};

