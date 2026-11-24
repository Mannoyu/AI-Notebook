import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';

const files = (await readdir('.next/static', { recursive: true, withFileTypes: true }))
  .filter((entry) => entry.isFile() && !entry.name.endsWith('.map'))
  .map((entry) => `/${`${entry.parentPath}/${entry.name}`.replaceAll('\\', '/').replace(/^\.next\//, '_next/')}`)
  .sort();
const template = await readFile('scripts/offline-worker.js', 'utf8');
const version = createHash('sha256').update(template).update(JSON.stringify(files)).update(await readFile('.next/BUILD_ID')).digest('hex').slice(0, 20);
await mkdir('public', { recursive: true });
await writeFile('public/offline-worker.js', `const version = ${JSON.stringify(version)};\nconst assets = ${JSON.stringify(['/', ...files])};\n${template}`);
