const test = require('node:test');
const assert = require('node:assert/strict');
const { StateManager } = require('../src/stateManager');

test('StateManager: File activation toggle works per-file independently', () => {
  const sm = new StateManager();
  const fileA = 'file:///workspace/a.js';
  const fileB = 'file:///workspace/b.js';

  assert.equal(sm.isFileActive(fileA), false);
  assert.equal(sm.isFileActive(fileB), false);

  sm.toggleFileActive(fileA);
  assert.equal(sm.isFileActive(fileA), true);
  assert.equal(sm.isFileActive(fileB), false);

  sm.toggleFileActive(fileA);
  assert.equal(sm.isFileActive(fileA), false);
});

test('StateManager: Add, retrieve, and remove tags', () => {
  const sm = new StateManager();
  const file = 'file:///workspace/main.js';
  const tag1 = {
    id: 't1',
    word: 'calc',
    category: 'function',
    range: { startLine: 1, startCharacter: 0, endLine: 1, endCharacter: 4 }
  };

  sm.addTag(file, tag1);
  assert.equal(sm.getTags(file).length, 1);
  assert.equal(sm.getTags(file)[0].word, 'calc');

  // Find at position
  const found = sm.findTagAtPosition(file, 1, 2);
  assert.ok(found);
  assert.equal(found.id, 't1');

  // Position outside
  const notFound = sm.findTagAtPosition(file, 2, 2);
  assert.equal(notFound, undefined);

  // Remove
  sm.removeTag(file, 't1');
  assert.equal(sm.getTags(file).length, 0);
});

test('StateManager: Armed tag state lifecycle', () => {
  const sm = new StateManager();
  const file = 'file:///workspace/main.js';
  const tag = { id: 't1', word: 'inputVal' };

  sm.setArmedTag(file, tag);
  assert.deepEqual(sm.getArmedTag(), { fileUri: file, tag });

  sm.clearArmedTag();
  assert.equal(sm.getArmedTag(), null);
});

test('StateManager: removeTagsInRange replaces overlapping tags', () => {
  const sm = new StateManager();
  const file = 'file:///workspace/main.js';

  // Existing tag: characters 5 to 15 on line 3
  sm.addTag(file, {
    id: 'old_tag',
    word: 'calculateTotal',
    category: 'function',
    range: { startLine: 3, startCharacter: 5, endLine: 3, endCharacter: 19 }
  });

  // Re-selecting and marking the same range (or overlapping)
  const newRange = { startLine: 3, startCharacter: 5, endLine: 3, endCharacter: 19 };
  const removed = sm.removeTagsInRange(file, newRange);

  assert.equal(removed.length, 1);
  assert.equal(removed[0].id, 'old_tag');
  assert.equal(sm.getTags(file).length, 0);

  // Add the updated new tag
  sm.addTag(file, {
    id: 'new_tag',
    word: 'calculateTotal',
    category: 'variable',
    variableSubType: 'Output',
    range: newRange
  });

  assert.equal(sm.getTags(file).length, 1);
  assert.equal(sm.getTags(file)[0].id, 'new_tag');
  assert.equal(sm.getTags(file)[0].category, 'variable');
});


