import { mkdir, copyFile, readdir } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const allowed = ['index.html', 'styles.css', 'app.js'];
await mkdir(new URL('dist/', root), { recursive: true });
for (const name of await readdir(new URL('dist/', root))) {
  if (!allowed.includes(name)) throw new Error(`Unexpected deploy asset: ${name}`);
}
for (const name of allowed) {
  await copyFile(new URL(`prototype-v2/${name}`, root), new URL(`dist/${name}`, root));
}
console.log('Prepared only index.html, styles.css and app.js.');
