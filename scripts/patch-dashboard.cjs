const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/(main)/dashboard/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Insert closing fragment + ternary close after last KPI card
const oldStr = `            </div>\r\n          </div>\r\n\r\n          <div className="grid grid-cols-12 gap-8">`;
const newStr = `            </div>\r\n            </>\r\n            )}\r\n          </div>\r\n\r\n          <div className="grid grid-cols-12 gap-8">`;

if (content.includes(oldStr)) {
  content = content.replace(oldStr, newStr);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ KPI ternary close patch applied successfully');
} else {
  // Try LF-only variant
  const oldLF = `            </div>\n          </div>\n\n          <div className="grid grid-cols-12 gap-8">`;
  const newLF = `            </div>\n            </>\n            )}\n          </div>\n\n          <div className="grid grid-cols-12 gap-8">`;
  if (content.includes(oldLF)) {
    content = content.replace(oldLF, newLF);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ KPI ternary close patch applied (LF variant)');
  } else {
    console.error('❌ Target string not found. Dumping context around "AI Confidence High":');
    const idx = content.indexOf('AI Confidence High');
    if (idx !== -1) {
      console.log(JSON.stringify(content.slice(idx, idx + 400)));
    }
  }
}
