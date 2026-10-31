const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { PersistenceManager } = require('../src/persistenceManager');

test('PersistenceManager: Validates tag schema accurately', () => {
  const validTag = {
    id: 'tag_123',
    word: 'total',
    range: { startLine: 0, startCharacter: 0, endLine: 0, endCharacter: 5 },
    category: 'variable',
    variableSubType: 'Input'
  };

  assert.equal(PersistenceManager.validateTag(validTag), true);

  // Missing id
  assert.equal(PersistenceManager.validateTag({ ...validTag, id: undefined }), false);

  // Invalid category
  assert.equal(PersistenceManager.validateTag({ ...validTag, category: 'unknown_category' }), false);

  // Invalid variableSubType
  assert.equal(PersistenceManager.validateTag({ ...validTag, variableSubType: 'NotReal' }), false);

  // Invalid title type
  assert.equal(PersistenceManager.validateTag({ ...validTag, title: 12345 }), false);
});

test('PersistenceManager: Writes and reads JSON to external-vscode-extension/Visualizer', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'auzy-test-'));
  const filePath = path.join(tempDir, 'demo.js');
  const fileUri = 'file:///' + filePath.replace(/\\/g, '/');

  const sampleTags = [
    {
      id: 'tag_1',
      word: 'inputPort',
      title: 'Primary Port',
      range: { startLine: 1, startCharacter: 2, endLine: 1, endCharacter: 11 },
      category: 'variable',
      variableSubType: 'Input',
      description: 'Main port input'
    }
  ];

  // Save
  const saved = PersistenceManager.saveFileTags(tempDir, filePath, fileUri, sampleTags);
  assert.equal(saved, true);

  // Verify target file path
  const expectedJsonPath = path.join(tempDir, 'external-vscode-extension', 'Visualizer', 'demo.js.json');
  assert.equal(fs.existsSync(expectedJsonPath), true);

  // Load
  const loaded = PersistenceManager.loadFileTags(tempDir, filePath);
  assert.equal(Array.isArray(loaded), true);
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].word, 'inputPort');
  assert.equal(loaded[0].title, 'Primary Port');
  assert.equal(loaded[0].variableSubType, 'Input');

  // Cleanup
  fs.rmSync(tempDir, { recursive: true, force: true });
});

