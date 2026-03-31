const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf-8');

// Replace `#` hrefs with `/terminal` for footer links and CTA links
html = html.replace(/href="#"/g, 'href="/terminal"');

// Wait, nav links should use href="#" or we break JS?
// If we replace them with `/terminal`, the `preventDefault` in JS will still work if they add it. Let's check how the JS is bound.
