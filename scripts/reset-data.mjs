import { rmSync } from 'node:fs';
rmSync(new URL('../.data/state.json', import.meta.url), { force: true });
console.log('Local demo data reset. It will be re-seeded on next page load.');
