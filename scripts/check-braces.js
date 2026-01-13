const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '..', 'player.html');
const text = fs.readFileSync(file, 'utf8');

// Find the specific script block starting at our IIFE line
const startMarker = "(function () {";
const startIdx = text.lastIndexOf(startMarker);
if (startIdx === -1) {
  console.error('Start marker not found');
  process.exit(1);
}

// Find the end of that script tag
const scriptStartIdx = text.lastIndexOf('<script', startIdx);
const scriptEndIdx = text.indexOf('</script>', startIdx);
if (scriptEndIdx === -1) {
  console.error('Script end not found');
  process.exit(1);
}

const block = text.slice(startIdx, scriptEndIdx);

// Simple brace/paren/bracket balance checker ignoring strings and comments
let stack = [];
let line = 1;
let inSingle = false, inDouble = false, inTemplate = false;
let singleStart = 0, doubleStart = 0, templateStart = 0;
let inLineComment = false, inBlockComment = false;

for (let i = 0; i < block.length; i++) {
  const ch = block[i];
  const prev = block[i - 1];
  const next = block[i + 1];

  if (ch === '\n') {
    line++;
    inLineComment = false;
    continue;
  }

  // Handle comment starts/ends
  if (!inSingle && !inDouble && !inTemplate) {
    if (!inBlockComment && ch === '/' && next === '*') { inBlockComment = true; i++; continue; }
    if (inBlockComment && prev === '*' && ch === '/') { inBlockComment = false; continue; }
    if (!inBlockComment && ch === '/' && next === '/') { inLineComment = true; i++; continue; }
  }
  if (inBlockComment || inLineComment) continue;

  // Handle string toggles
  if (!inDouble && !inTemplate && ch === '\'' && prev !== '\\') { 
    inSingle = !inSingle; 
    if (inSingle) singleStart = line; 
    continue; 
  }
  if (!inSingle && !inTemplate && ch === '"' && prev !== '\\') { 
    inDouble = !inDouble; 
    if (inDouble) doubleStart = line; 
    continue; 
  }
  if (!inSingle && !inDouble && ch === '`' && prev !== '\\') { 
    inTemplate = !inTemplate; 
    if (inTemplate) templateStart = line; 
    continue; 
  }
  if (inSingle || inDouble || inTemplate) continue;

  if (ch === '{' || ch === '(' || ch === '[') {
    stack.push({ ch, line });
  } else if (ch === '}' || ch === ')' || ch === ']') {
    const last = stack.pop();
    if (!last) {
      console.log(`Extra closing ${ch} at line ${line}`);
      process.exitCode = 1;
    } else {
      const pairs = { '{': '}', '(': ')', '[': ']' };
      if (pairs[last.ch] !== ch) {
        console.log(`Mismatched ${last.ch} at line ${last.line} closed by ${ch} at line ${line}`);
        process.exitCode = 1;
      }
    }
  }
}

if (stack.length || inSingle || inDouble || inTemplate) {
  console.log('Unclosed tokens:', stack);
  if (inSingle) console.log('Unclosed single quote starting at line', singleStart);
  if (inDouble) console.log('Unclosed double quote starting at line', doubleStart);
  if (inTemplate) console.log('Unclosed template literal starting at line', templateStart);
  process.exitCode = 1;
} else {
  console.log('Braces/paren/brackets balanced within IIFE block.');
}
