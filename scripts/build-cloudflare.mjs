import { mkdir, copyFile, readdir } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const allowed = ['index.html', 'styles.css', 'app.js', 'login.html', 'account.html', 'auth.css', 'auth.js', 'review.html', 'studio.html', 'studio.css', 'studio.js', 'shared-shell.css', 'shared-shell.js', 'canvas-agent.css', 'canvas-agent.js', 'workflow.html', 'workflow.css', 'workflow.js'];
const images = ['01-insight.png', '02-creative-lab.png', '03-remix.png', '04-video-studio.png'];
await mkdir(new URL('dist/', root), { recursive: true });
for (const name of await readdir(new URL('dist/', root))) {
  if (!allowed.includes(name) && name !== 'mockups') throw new Error(`Unexpected deploy asset: ${name}`);
}
for (const name of allowed) {
  await copyFile(new URL(`prototype-v2/${name}`, root), new URL(`dist/${name}`, root));
}
await mkdir(new URL('dist/mockups/', root), { recursive: true });
for (const name of await readdir(new URL('dist/mockups/', root))) {
  if (!images.includes(name)) throw new Error(`Unexpected deploy image: ${name}`);
}
for (const name of images) {
  await copyFile(new URL(`mockups/v2/${name}`, root), new URL(`dist/mockups/${name}`, root));
}
console.log(`Prepared ${allowed.length} UI files and ${images.length} design concepts; no source docs or secrets.`);
