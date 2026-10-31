const test = require('node:test');
const assert = require('node:assert/strict');
const { WiringEngine } = require('../src/wiringEngine');

test('WiringEngine: Clicking neutral whitespace with no armed tag returns NONE', () => {
  const result = WiringEngine.processClick({
    fileUri: 'file:///app.js',
    line: 0,
    character: 0,
    tags: [],
    armedState: null
  });

  assert.equal(decisionAction(result), 'NONE');
});

test('WiringEngine: Clicking an Input variable tag transitions to ARM_INPUT', () => {
  const inputTag = {
    id: 'tag_in',
    word: 'userData',
    category: 'variable',
    variableSubType: 'Input',
    range: { startLine: 2, startCharacter: 5, endLine: 2, endCharacter: 13 }
  };

  const result = WiringEngine.processClick({
    fileUri: 'file:///app.js',
    line: 2,
    character: 8, // inside userData
    tags: [inputTag],
    armedState: null
  });

  assert.equal(result.action, 'ARM_INPUT');
  assert.equal(result.tag.id, 'tag_in');
});

test('WiringEngine: Clicking an Output tag when an Input tag is armed triggers REPLACE_INPUT_WITH_OUTPUT', () => {
  const inputTag = {
    id: 'tag_in',
    word: 'userData',
    category: 'variable',
    variableSubType: 'Input',
    range: { startLine: 2, startCharacter: 5, endLine: 2, endCharacter: 13 }
  };

  const outputTag = {
    id: 'tag_out',
    word: 'fetchUserResponse',
    category: 'variable',
    variableSubType: 'Output',
    range: { startLine: 5, startCharacter: 10, endLine: 5, endCharacter: 27 }
  };

  const armedState = {
    fileUri: 'file:///app.js',
    tag: inputTag
  };

  const result = WiringEngine.processClick({
    fileUri: 'file:///app.js',
    line: 5,
    character: 15, // inside fetchUserResponse
    tags: [inputTag, outputTag],
    armedState
  });

  assert.equal(result.action, 'REPLACE_INPUT_WITH_OUTPUT');
  assert.equal(result.inputTag.id, 'tag_in');
  assert.equal(result.outputTag.id, 'tag_out');
});

test('WiringEngine: Clicking neutral space while an Input tag is armed cancels arming', () => {
  const inputTag = {
    id: 'tag_in',
    word: 'userData',
    category: 'variable',
    variableSubType: 'Input',
    range: { startLine: 2, startCharacter: 5, endLine: 2, endCharacter: 13 }
  };

  const armedState = {
    fileUri: 'file:///app.js',
    tag: inputTag
  };

  const result = WiringEngine.processClick({
    fileUri: 'file:///app.js',
    line: 10, // line with no tags
    character: 0,
    tags: [inputTag],
    armedState
  });

  assert.equal(result.action, 'CANCEL_ARM');
});

test('WiringEngine: Clicking a Tut-Tag launches OPEN_TUTORIAL', () => {
  const tutTag = {
    id: 'tag_tut',
    word: 'authMiddleware',
    category: 'tut-tag',
    range: { startLine: 1, startCharacter: 0, endLine: 1, endCharacter: 14 }
  };

  const result = WiringEngine.processClick({
    fileUri: 'file:///app.js',
    line: 1,
    character: 5,
    tags: [tutTag],
    armedState: null
  });

  assert.equal(result.action, 'OPEN_TUTORIAL');
  assert.equal(result.tag.id, 'tag_tut');
});

test('WiringEngine: Clicking a Default variable tag launches SHOW_DEFAULT_DROPDOWN', () => {
  const defaultTag = {
    id: 'tag_def',
    word: 'retryCount',
    category: 'variable',
    variableSubType: 'Default',
    defaultValues: ['3', '5', '10'],
    range: { startLine: 3, startCharacter: 4, endLine: 3, endCharacter: 14 }
  };

  const result = WiringEngine.processClick({
    fileUri: 'file:///app.js',
    line: 3,
    character: 6,
    tags: [defaultTag],
    armedState: null
  });

  assert.equal(result.action, 'SHOW_DEFAULT_DROPDOWN');
  assert.equal(result.tag.id, 'tag_def');
});

test('WiringEngine: Clicking a Default variable tag when an Input tag is armed triggers REPLACE_INPUT_WITH_DEFAULT', () => {
  const inputTag = {
    id: 'tag_in',
    word: 'limit',
    category: 'variable',
    variableSubType: 'Input',
    range: { startLine: 1, startCharacter: 2, endLine: 1, endCharacter: 7 }
  };

  const defaultTag = {
    id: 'tag_def',
    word: 'retryCount',
    category: 'variable',
    variableSubType: 'Default',
    defaultValues: ['3', '5', '10'],
    range: { startLine: 3, startCharacter: 4, endLine: 3, endCharacter: 14 }
  };

  const armedState = {
    fileUri: 'file:///app.js',
    tag: inputTag
  };

  const result = WiringEngine.processClick({
    fileUri: 'file:///app.js',
    line: 3,
    character: 6,
    tags: [inputTag, defaultTag],
    armedState
  });

  assert.equal(result.action, 'REPLACE_INPUT_WITH_DEFAULT');
  assert.equal(result.inputTag.id, 'tag_in');
  assert.equal(result.defaultTag.id, 'tag_def');
});

function decisionAction(res) {
  return res.action;
}

