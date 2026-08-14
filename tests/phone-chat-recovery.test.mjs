import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');

function readFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'" || char === '`') quote = char;
    else if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`Could not parse ${name}`);
}

function createParser() {
  const context = { state: { idol: '花海咲季' } };
  vm.runInNewContext([
    'const idolAliases = {};',
    readFunction('stripAiThinkingBlocks'),
    readFunction('canonicalIdolName'),
    readFunction('extractPhoneChatReply'),
    'this.extract = extractPhoneChatReply;'
  ].join('\n'), context);
  return context.extract;
}

test('repairs a terminal phone-chat closing tag missing its final angle bracket', () => {
  const extract = createParser();
  const reply = `<content>
<初星私聊 from="花海咲季">
日程我确认过了。
第一天是你的准备时间。
</初星私聊
</content>`;

  const parsed = extract(reply);
  assert.equal(parsed.complete, true);
  assert.equal(parsed.from, '花海咲季');
  assert.equal(parsed.lines.length, 2);
  assert.equal(parsed.lines[0], '日程我确认过了。');
  assert.equal(parsed.lines[1], '第一天是你的准备时间。');
});

test('invalid final phone replies become retryable immediately instead of starting silent retries', () => {
  const handler = readFunction('handlePhoneChatAiReply');

  assert.doesNotMatch(handler, /aiReplyRetryCount < 2/);
  assert.match(handler, /state\.phoneChat\.retryAvailable = true/);
  assert.match(handler, /markNiaScheduleShareFailed/);
});
