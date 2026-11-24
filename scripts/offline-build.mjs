import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';

const files = (await readdir('.next/static', { recursive: true, withFileTypes: true }))
  .filter((entry) => entry.isFile() && !entry.name.endsWith('.map'))
  .map((entry) => `/${`${entry.parentPath}/${entry.name}`.replaceAll('\\', '/').replace(/^\.next\//, '_next/')}`)
  .sort();
const template = await readFile('scripts/offline-worker.js', 'utf8');
const runtime = 'public/inference-runtime';
const libraries = ['transformers.min.js', 'ort-wasm-simd-threaded.jsep.mjs', 'ort-wasm-simd-threaded.jsep.wasm'];
await mkdir(runtime, { recursive: true });
await Promise.all(libraries.map((name) => copyFile(`node_modules/@huggingface/transformers/dist/${name}`, `${runtime}/${name}`)));
const assets = ['/', '/inference-worker.mjs', ...libraries.map((name) => `/inference-runtime/${name}`), ...files];
const version = createHash('sha256').update(template).update(JSON.stringify(assets)).update(await readFile('.next/BUILD_ID')).digest('hex').slice(0, 20);
await writeFile('public/offline-worker.js', `const version = ${JSON.stringify(version)};\nconst assets = ${JSON.stringify(assets)};\n${template}`);
