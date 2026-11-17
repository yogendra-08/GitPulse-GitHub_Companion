// Zips dist/ into release/GitPulse-extension-<version>.zip (the file the Chrome Web Store expects).
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';

const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
if (!existsSync('dist/manifest.json')) throw new Error('dist/ is missing. Run `npm run build` first.');
mkdirSync('release', { recursive: true });
const out = `release/GitPulse-extension-${version}.zip`;
execFileSync('zip', ['-r', '-q', `../${out}`, '.'], { cwd: 'dist' });
console.log(`Created ${out}`);
