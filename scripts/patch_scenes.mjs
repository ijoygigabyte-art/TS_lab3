import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCENES_DIR = path.join(__dirname, '../js/scenes');

for (let sceneIdx = 0; sceneIdx <= 5; sceneIdx++) {
  const file = path.join(SCENES_DIR, `scene${sceneIdx}.js`);
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Simple regex to inject audioId right after narration if it has one and doesn't already have audioId
    let beatIdx = 0;
    content = content.replace(/narration:\s*"([^"]+)"(,\s*action:|,\n)/g, (match, text, trailing) => {
      // Look for the correct id. We skip beats that have narration: null (they won't match the regex)
      const replacement = `narration: "${text}",\n      audioId: 's${sceneIdx}_b${beatIdx}',${trailing.startsWith(',') ? trailing.substring(1) : trailing}`;
      beatIdx++;
      return replacement;
    });

    fs.writeFileSync(file, content);
    console.log(`Patched scene${sceneIdx}.js`);
  }
}
