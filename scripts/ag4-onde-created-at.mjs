// Leitura: todos os `.from('announcements')` com o select que os SEGUE (padrão do código: from().select()),
// e a mesma busca no código-fonte do app e no ar servido. Sem escrita.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const w = readFileSync(join(REPO, 'worker-deploy-v123-pdfs/worker.mjs'), 'utf8');

const scan = (label, txt, unwrap) => {
  const s = unwrap ? unwrap(txt) : txt;
  const hits = [];
  const re = /from\(\s*['"`]{1,4}announcements['"`]{1,4}\s*\)/g;
  let m;
  while ((m = re.exec(s))) {
    const depois = s.slice(m.index + m[0].length, m.index + m[0].length + 400);
    const sel = depois.match(/\.\s*select\(\s*['"`]{1,4}([^'"`]{0,400})/);
    const selTxt = sel ? sel[1] : null;
    hits.push({
      offset: m.index,
      select: selTxt,
      created_at: !!selTxt && /(^|[, (])created_at([,.):]|$)/.test(selTxt.replace(/\s+/g, '')),
      ordem: depois.match(/\.\s*order\(\s*['"`]{1,4}([^'"`]{1,40})/)?.[1] || null,
    });
  }
  const maus = hits.filter((h) => h.created_at);
  console.log(`\n=== ${label}: ${hits.length} from('announcements') · ${maus.length} com created_at`);
  for (const h of hits) console.log(`  ${h.created_at ? 'VERMELHO' : '  verde '} @${h.offset} select=${h.select === null ? '(nenhum a seguir)' : h.select.slice(0, 160)} order=${h.ordem}`);
  return hits;
};

scan('worker v123 cru', w);
scan('worker v123 com as contra-barras removidas (o HTML é uma string dentro do bundle)', w, (t) => t.replace(/\\\\(['"`\\])/g, '$1'));

const dirs = readdirSync(REPO).filter((d) => statSync(join(REPO, d)).isDirectory() && /^(src|app|web|public|dist)$/.test(d));
console.log('\ndirs de fonte reconhecidos:', dirs.join(', ') || '(nenhum)');
for (const d of dirs) {
  const walk = (p, depth) => {
    if (depth > 4) return;
    for (const f of readdirSync(p)) {
      const fp = join(p, f);
      if (statSync(fp).isDirectory()) walk(fp, depth + 1);
      else if (/\.(html|js|mjs|ts|jsx|tsx)$/i.test(f)) {
        const t = readFileSync(fp, 'utf8');
        if (/from\(\s*['"`]announcements['"`]\s*\)/.test(t)) scan(`fonte ${fp.replace(REPO, '.')}`, t);
      }
    }
  };
  walk(join(REPO, d), 0);
}
