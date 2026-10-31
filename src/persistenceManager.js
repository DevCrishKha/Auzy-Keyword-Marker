/**
 * Persistence Manager for Auzy-Keyword-Marker
 * 
 * Handles saving and loading tags on Ctrl+S into:
 * `<workspaceRoot>/external-vscode-extension/Visualizer/<filename>.json`
 */

const fs = require('fs');
const path = require('path');

class PersistenceManager {
  /**
   * Validates that a tag object matches the expected schema.
   * @param {object} tag 
   * @returns {boolean}
   */
  static validateTag(tag) {
    if (!tag || typeof tag !== 'object') return false;
    if (typeof tag.id !== 'string' || !tag.id) return false;
    if (typeof tag.word !== 'string') return false;
    if (!tag.range || typeof tag.range !== 'object') return false;

    const { startLine, startCharacter, endLine, endCharacter } = tag.range;
    if (
      typeof startLine !== 'number' ||
      typeof startCharacter !== 'number' ||
      typeof endLine !== 'number' ||
      typeof endCharacter !== 'number'
    ) {
      return false;
    }

    const validCategories = ['variable', 'function', 'tut-tag', 'keyword'];
    if (!validCategories.includes(tag.category)) return false;

    if (tag.title !== undefined && typeof tag.title !== 'string') return false;

    if (tag.category === 'variable') {
      const validSubTypes = ['Input', 'Output', 'Default', 'Pin Value'];
      if (!validSubTypes.includes(tag.variableSubType)) return false;
    }

    return true;
  }

  /**
   * Resolves the storage directory path inside the workspace.
   * @param {string} workspaceRoot 
   * @returns {string}
   */
  static getStorageDirectory(workspaceRoot) {
    return path.join(workspaceRoot, 'external-vscode-extension', 'Visualizer');
  }

  /**
   * Resolves the target JSON file path for a given source file.
   * @param {string} workspaceRoot 
   * @param {string} filePath 
   * @returns {string}
   */
  static getStorageFilePath(workspaceRoot, filePath) {
    const dir = this.getStorageDirectory(workspaceRoot);
    const fileName = path.basename(filePath);
    return path.join(dir, `${fileName}.json`);
  }

  /**
   * Saves tags for a file to disk on Ctrl+S.
   * @param {string} workspaceRoot 
   * @param {string} filePath 
   * @param {string} fileUri 
   * @param {Array<object>} tags 
   * @returns {boolean} success
   */
  static saveFileTags(workspaceRoot, filePath, fileUri, tags) {
    try {
      const validTags = tags.filter(t => this.validateTag(t));
      const targetDir = this.getStorageDirectory(workspaceRoot);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const targetPath = this.getStorageFilePath(workspaceRoot, filePath);
      const payload = {
        name: 'Auzy-Keyword-Marker',
        fileUri: fileUri,
        fileName: path.basename(filePath),
        savedAt: new Date().toISOString(),
        tags: validTags
      };

      fs.writeFileSync(targetPath, JSON.stringify(payload, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error('Failed to save Visualizer JSON:', err);
      return false;
    }
  }

  /**
   * Loads saved tags for a file from disk if they exist.
   * @param {string} workspaceRoot 
   * @param {string} filePath 
   * @returns {Array<object> | null}
   */
  static loadFileTags(workspaceRoot, filePath) {
    try {
      const targetPath = this.getStorageFilePath(workspaceRoot, filePath);
      if (!fs.existsSync(targetPath)) {
        return null;
      }

      const raw = fs.readFileSync(targetPath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.tags)) {
        return parsed.tags.filter(t => this.validateTag(t));
      }
      return [];
    } catch (err) {
      console.error('Failed to load Visualizer JSON:', err);
      return null;
    }
  }
}

module.exports = {
  PersistenceManager
};

