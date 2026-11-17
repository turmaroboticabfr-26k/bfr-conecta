// Segunda metade da classificação: o `ah2-classifica-dirs-ANTERIOR-casador-por-nome.mjs` dizia «byte-idêntico a um
// versionado» com um casador de NOME (`endsWith('/'+base)`), que aceita um homónimo em qualquer árvore do
// repositório. Esta versão casa pelo CAMINHO ESPELHADO — tira o diretório em causa, junta o mesmo resto
// de caminho a cada irmão versionado, e imprime o par que bateu. Sem par espelhado, o ficheiro é único,
// mesmo que exista um homónimo noutro sítio.
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
const md5b = (b) => createHash('md5').update(b).digest('hex');
const anda = (dir) => { const fora = []; const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = `${d}/${e.name}`; if (e.isDirectory()) walk(p); else fora.push(p); } }; walk(dir); return fora; };
const index = new Set(execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean));
const md5_index = (c) => { try { return md5b(execFileSync('git', ['show', `:${c}`], { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 })); } catch { return null; } };
const IRMAOS = { 'bfr-candidata-v126-a11y-secretaria-ANTERIOR-portao-insercao-mal-formulado': ['bfr-candidata-v126-a11y-secretaria'], 'worker-deploy-v120-404/public': ['worker-deploy-v120-404/public', 'worker-deploy-v120/public'] };
for (const [dir, irmaos] of Object.entries(IRMAOS)) {
  let iguais = 0, dif = 0, unicos = 0, bytes = 0, bytes_iguais = 0;
  console.log(`\n${dir}  (irmãos comparados: ${irmaos.join(', ')})`);
  for (const f of anda(dir)) {
    const st = statSync(f); bytes += st.size;
    const resto = f.slice(dir.length + 1);
    const par = irmaos.map((i) => `${i}/${resto}`).find((c) => index.has(c));
    if (!par) { unicos++; console.log(`  UNICO ${resto} (${st.size} B) — sem par espelhado no índice`); continue; }
    const meu = md5b(readFileSync(f)), do_indice = md5_index(par);
    if (meu === do_indice) { iguais++; bytes_iguais += st.size; console.log(`  IGUAL ${resto} (${st.size} B) == ${par}`); }
    else { dif++; console.log(`  DIFERE ${resto} (${st.size} B) vs ${par} (índice ${String(do_indice).slice(0, 8)}… disco ${meu.slice(0, 8)}…)`); }
  }
  console.log(`  resumo: ${iguais} byte-iguais / ${dif} diferem / ${unicos} únicos · ${bytes_iguais}/${bytes} bytes cobertos`);
}
