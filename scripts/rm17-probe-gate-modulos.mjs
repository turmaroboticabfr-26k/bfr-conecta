import fs from 'node:fs';
const p = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta/bfr-candidata-v120-setrole-supervisor/index.html';
const s = fs.readFileSync(p, 'utf8');
const lineOf = i => s.slice(0, i).split('\n').length;
for (const k of ['BFR_AUTH_MODULES_READY', '__BFR_DEFERRED_LOADER_ACTIVE', 'id="publicScheduleBtn"', 'id="googleLogin"', 'script[src*="supabase-js"]', 'supabase-js-2', '<script src="https://']) {
  const occ = s.split(k).length - 1;
  console.log(`\n########## ${k} :: ${occ}x`);
  let i = -1, n = 0;
  while ((i = s.indexOf(k, i + 1)) >= 0 && n < 4) {
    console.log(`  linha ${lineOf(i)}: ${s.slice(Math.max(0, i - 220), i + 260).replace(/\s+/g, ' ').slice(0, 470)}`);
    n++;
  }
}
