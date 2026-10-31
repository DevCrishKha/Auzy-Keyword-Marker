const test = require('node:test');
const assert = require('node:assert/strict');
const { RangeEngine } = require('../src/rangeEngine');

test('RangeEngine: Typing at or after trailing boundary does not expand tag (Boundary Invariance)', () => {
  const tags = [
    {
      id: 'tag_1',
      word: 'totalScore',
      range: { startLine: 0, startCharacter: 6, endLine: 0, endCharacter: 16 }
    }
  ];

  // User hits space immediately after 'totalScore' (at character 16)
  const changes = [
    {
      range: {
        start: { line: 0, character: 16 },
        end: { line: 0, character: 16 }
      },
      text: ' '
    }
  ];

  const { updatedTags } = RangeEngine.applyContentChanges(tags, changes);
  assert.equal(updatedTags.length, 1);
  assert.equal(updatedTags[0].range.startCharacter, 6);
  assert.equal(updatedTags[0].range.endCharacter, 16, 'Tag end must NOT expand when space is typed at boundary');
});

test('RangeEngine: Typing text before tag shifts its character offsets', () => {
  const tags = [
    {
      id: 'tag_1',
      word: 'score',
      range: { startLine: 2, startCharacter: 10, endLine: 2, endCharacter: 15 }
    }
  ];

  // User types 'let ' (4 chars) at character 0
  const changes = [
    {
      range: {
        start: { line: 2, character: 0 },
        end: { line: 2, character: 0 }
      },
      text: 'let '
    }
  ];

  const { updatedTags } = RangeEngine.applyContentChanges(tags, changes);
  assert.equal(updatedTags[0].range.startCharacter, 14);
  assert.equal(updatedTags[0].range.endCharacter, 19);
});

test('RangeEngine: Tag at line 0, char 0 - editing first character preserves tag', () => {
  const tags = [
    {
      id: 'tag_start',
      word: 'myVar',
      range: { startLine: 0, startCharacter: 0, endLine: 0, endCharacter: 5 }
    }
  ];

  // Replace 'm' with 'M' (char 0 to 1)
  const changes = [
    {
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 1 }
      },
      text: 'M'
    }
  ];

  const { updatedTags, removedTagIds } = RangeEngine.applyContentChanges(tags, changes);
  assert.equal(removedTagIds.length, 0);
  assert.equal(updatedTags.length, 1);
  assert.equal(updatedTags[0].range.startCharacter, 0);
  assert.equal(updatedTags[0].range.endCharacter, 5);
});

test('RangeEngine: Replacing tag with output text keeps tag alive with new width', () => {
  const tags = [
    {
      id: 'tag_input',
      word: 'input',
      range: { startLine: 1, startCharacter: 0, endLine: 1, endCharacter: 5 }
    }
  ];

  // Replacing 'input' (5 chars) with 'longOutputVariable' (18 chars)
  const changes = [
    {
      range: {
        start: { line: 1, character: 0 },
        end: { line: 1, character: 5 }
      },
      text: 'longOutputVariable'
    }
  ];

  const { updatedTags, removedTagIds } = RangeEngine.applyContentChanges(tags, changes);
  assert.equal(removedTagIds.length, 0);
  assert.equal(updatedTags.length, 1);
  assert.equal(updatedTags[0].range.startCharacter, 0);
  assert.equal(updatedTags[0].range.endCharacter, 18);
});

test('RangeEngine: Inserting newlines before tag increments line numbers', () => {
  const tags = [
    {
      id: 'tag_1',
      word: 'calculate',
      range: { startLine: 5, startCharacter: 4, endLine: 5, endCharacter: 13 }
    }
  ];

  // User inserts two newlines on line 1
  const changes = [
    {
      range: {
        start: { line: 1, character: 0 },
        end: { line: 1, character: 0 }
      },
      text: '\n\n'
    }
  ];

  const { updatedTags } = RangeEngine.applyContentChanges(tags, changes);
  assert.equal(updatedTags[0].range.startLine, 7);
  assert.equal(updatedTags[0].range.endLine, 7);
  assert.equal(updatedTags[0].range.startCharacter, 4);
});

test('RangeEngine: Deleting the word removes the tag completely', () => {
  const tags = [
    {
      id: 'tag_1',
      word: 'myVar',
      range: { startLine: 3, startCharacter: 4, endLine: 3, endCharacter: 9 }
    }
  ];

  // User selects 'myVar' and deletes it
  const changes = [
    {
      range: {
        start: { line: 3, character: 4 },
        end: { line: 3, character: 9 }
      },
      text: ''
    }
  ];

  const { updatedTags, removedTagIds } = RangeEngine.applyContentChanges(tags, changes);
  assert.equal(updatedTags.length, 0);
  assert.deepEqual(removedTagIds, ['tag_1']);
});

test('RangeEngine: Typing inside tag expands its range', () => {
  const tags = [
    {
      id: 'tag_1',
      word: 'score',
      range: { startLine: 1, startCharacter: 5, endLine: 1, endCharacter: 10 }
    }
  ];

  // User inserts 'Total' inside 'score' -> character 7
  const changes = [
    {
      range: {
        start: { line: 1, character: 7 },
        end: { line: 1, character: 7 }
      },
      text: 'Total'
    }
  ];

  const { updatedTags } = RangeEngine.applyContentChanges(tags, changes);
  assert.equal(updatedTags[0].range.startCharacter, 5);
  assert.equal(updatedTags[0].range.endCharacter, 15);
});
