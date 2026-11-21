import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const theme = process.argv[2];
if (!['original', 'gta'].includes(theme)) {
  console.error('Usage: pnpm theme:original | pnpm theme:gta');
  process.exit(1);
}

const file = resolve('client/src/homeTheme.ts');
const source = await readFile(file, 'utf8');
const updated = source.replace(/export const HOMEPAGE_THEME: HomeTheme = '(original|gta)';/, `export const HOMEPAGE_THEME: HomeTheme = '${theme}';`);
if (updated === source) {
  console.error('Could not update HOMEPAGE_THEME. The file format may have changed.');
  process.exit(1);
}
await writeFile(file, updated, 'utf8');
console.log(`Homepage theme set to ${theme}.`);
