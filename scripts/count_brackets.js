const fs = require('fs');
const path = 'js/provider-selector.js';
const s = fs.readFileSync(path, 'utf8');
function count(re) { return (s.match(re) || []).length; }
console.log('{', count(/\{/g), '}', count(/\}/g));
console.log('(', count(/\(/g), ')', count(/\)/g));
console.log('[', count(/\[/g), ']', count(/\]/g));
console.log('`', count(/`/g));
console.log('EOF length', s.length);