// Classifica os dois diretórios em suspenso por CONTEÚDO, não por lista lembrada: para cada ficheiro em
// disco, procura um homónimo no índice (`git ls-files`) e compara md5. A pergunta que interessa não é
// «isto é grande?», é «isto acrescenta medida que já não esteja versionada noutro sítio?» — foi o diff de
// conjuntos que decidiu o `-v1` do Home (§AI.29 ponto 6), e é o mesmo teste aqui.
// 0 escrita: lê e imprime contagens, caminhos e comprimentos. Nunca um valor de credencial.
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';

const ROOT = process.cwd();
const ALVOS = [
  'bfr-candidata-v126-a11y-secretaria-ANTERIOR-portao-insercao-mal-formulado',
  'worker-deploy-v120-404/public',
];
const md5 = (b) => createHash('md5').update(b).digest('hex');
const anda = (dir) => {
  const fora = [];
  const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = `${d}/${e.name}`; if (e.isDirectory()) walk(p); else fora.push(p); } };
  try { walk(dir); } catch { return null; }
  return fora;
};
const index = new Set(execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean));
const md5_index = (caminho) => { try { return md5(execFileSync('git', ['show', `:${caminho}`], { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 })); } catch { return null; } };

for (const alvo of ALVOS) {
  const fichs = anda(alvo);
  if (!fichs) { console.log(`\n${alvo}: NÃO EXISTE em disco`); continue; }
  let iguais = 0, diferentes = 0, sem_homologo = 0, bytes = 0, bytes_unicas = 0, em_indice = 0;
  const unicas = [];
  for (const f of fichs) {
    const st = statSync(f); bytes += st.size;
    const base = f.replace(alvo + '/', '');
    em_indice += index.has(f) ? 1 : 0;
    // homologão: qualquer caminho versionado que termine pelo mesmo nome, na árvore da candidata viva
    const candidatos = [...index].filter((x) => x === base || x.endsWith('/' + base) || x === ('bfr-candidata-v126-a11y-secretaria/' + base) || x === ('worker-deploy-v120-404/' + base));
    if (!candidatos.length) { sem_homologo++; unicas.push({ f, bytes: st.size, porque: 'sem homónimo no índice' }); bytes_unicas += st.size; continue; }
    const meu = md5(readFileSync(f));
    const bate = candidatos.some((c) => md5_index(c) === meu);
    if (bate) iguais++;
    else { diferentes++; unicas.push({ f, bytes: st.size, porque: `homónimo existe mas difere (${candidatos.length} candidatos)` }); bytes_unicas += st.size; }
  }
  console.log(`\n${alvo}`);
  console.log(`  ficheiros=${fichs.length}  já_no_índice=${em_indice}  bytes=${bytes}`);
  console.log(`  byte-idênticos a um versionado=${iguais}  diferentes=${diferentes}  sem_homónimo=${sem_homologo}`);
  console.log(`  bytes_que_nenhum_ficheiro_versionado_tem=${bytes_unicas}`);
  for (const u of unicas) console.log(`    UNICO ${u.f} (${u.bytes} B) — ${u.porque}`);
}
const irmaos = [...index].filter((x) => x.startsWith('worker-deploy-v120'));
console.log(`\nworker-deploy-v120* no índice: ${irmaos.length} ficheiros`);
for (const p of [...new Set(irmaos.map((x) => x.split('/')[0]))]) console.log('  ' + p);
