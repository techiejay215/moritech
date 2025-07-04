const fs = require('fs');

const filePath = './script.js';
let code = fs.readFileSync(filePath, 'utf8');

// Match fetch calls and inject credentials if not present
code = code.replace(/fetch\(([^)]+)\{([^}]+)\}\)/g, (match, url, options) => {
  if (/credentials\s*:\s*['"]include['"]/.test(options)) {
    return match; // Already includes credentials
  }

  // Inject credentials
  return `fetch(${url}{${options.trim()}, credentials: 'include'})`;
});

// Also fix fetch calls without any options
code = code.replace(/fetch\(([^),]+)\)/g, (match, url) => {
  return `fetch(${url}, { credentials: 'include' })`;
});

// Write back the updated file
fs.writeFileSync(filePath, code, 'utf8');

console.log('✅ Credentials injected where missing.');
