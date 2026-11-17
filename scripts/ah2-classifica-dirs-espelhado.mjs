// Segunda metade da classificação: o `ah2-classifica-dirs-ANTERIOR-casador-por-nome.mjs` dizia
// «byte-idêntico a um versionado» com um casador de NOME (`endsWith('/'+base)`), que aceita um homónimo
// em qualquer árvore do repositório. Esta versão casa pelo CAMINHO ESPELHADO — tira o diretório em
// causa, junta o mesmo resto de caminho a cada irmão versionado, e regista o PAR que bateu. Sem par
// espelhado, o ficheiro é único, mesmo que exista um homónimo noutro sítio.
// Escreve artefacto (só comprimentos e md5, nunca conteúdo): os números do §AI.31 têm de viver num
// ficheiro que se possa re-correr, não em prosa.
// Uso: node scripts/ah2-classifica-dirs-espelhado.mjs [caminho_do_artefacto]
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const OUT = process.argv[2] || 'evidence/ah2-classifica-dirs-espelhado-17-11.json';
const md5b = (b) => createHash('md5').update(b).digest('hex');
const anda = (dir) => { const fora = []; const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = `${d}/${e.name}`; if (e.isDirectory()) walk(p); else fora.push(p); } }; walk(dir); return fora.sort(); };
const index = new Set(execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean));
const md5_index = (c) => { try { return md5b(execFileSync('git', ['show', `:${c}`], { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 })); } catch { return null; } };
const IRMAOS = {
  'bfr-candidata-v126-a11y-secretaria-ANTERIOR-portao-insercao-mal-formulado': ['bfr-candidata-v126-a11y-secretaria'],
  'worker-deploy-v120-404/public': ['worker-deploy-v120-404/public', 'worker-deploy-v120/public']
};
const out = {
  programa: 'scripts/ah2-classifica-dirs-espelhado.mjs',
  rodado_em: new Date().toISOString(),
  head: execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim(),
  metodo: 'para cada ficheiro do diretório, exige o MESMO resto de caminho sob um irmão nomeado e compara md5(disco) com md5(git show :irmao/resto); sem par espelhado o ficheiro conta como UNICO',
  o_que_NAO_prova: 'não prova que o diretório seja inútil como cópia de trabalho (são árvores de deploy, executáveis a partir do disco); não compara contra TODOS os versionados, só contra os irmãos nomeados em `irmaos`; não verifica ficheiros que faltem em relação ao irmão',
  diretorios: {}, soma_bytes: 0
};
let veredito = 'SEM_BYTES_UNICAS';
for (const [dir, irmaos] of Object.entries(IRMAOS)) {
  const r = { irmaos_comparados: irmaos, ficheiros: 0, byte_iguais: 0, diferem: 0, unicos: 0, bytes_totais: 0, bytes_cobertas_por_igual: 0, por_ficheiro: [] };
  for (const f of anda(dir)) {
    const st = statSync(f); r.bytes_totais += st.size; r.ficheiros++;
    const resto = f.slice(dir.length + 1);
    const par = irmaos.map((i) => `${i}/${resto}`).find((c) => index.has(c));
    if (!par) { r.unicos++; r.por_ficheiro.push({ caminho_relativo: resto, bytes: st.size, par: null, igual: false }); veredito = 'HA_FICHEIRO_UNIQUE'; console.log(`  UNICO ${resto} (${st.size} B) — sem par espelhado no índice`); continue; }
    const meu = md5b(readFileSync(f)), do_indice = md5_index(par);
    const igual = meu === do_indice;
    if (igual) { r.byte_iguais++; r.bytes_cobertas_por_igual += st.size; } else { r.diferem++; veredito = 'HA_FICHEIRO_DIFERENTE'; }
    r.por_ficheiro.push({ caminho_relativo: resto, bytes: st.size, par, md5_disco: meu, md5_indice: do_indice, igual });
    console.log(`  ${igual ? 'IGUAL ' : 'DIFERE'} ${resto} (${st.size} B) ${igual ? '==' : '!='} ${par}`);
  }
  out.soma_bytes += r.bytes_totais;
  out.diretorios[dir] = r;
  console.log(`  resumo ${dir}: ${r.byte_iguais} iguais / ${r.diferem} diferem / ${r.unicos} únicos · ${r.bytes_cobertas_por_igual}/${r.bytes_totais} bytes cobertos`);
}
out.veredito = veredito;
out.bytes_que_nenhum_versionado_tem = out.soma_bytes - Object.values(out.diretorios).reduce((a, x) => a + x.bytes_cobertas_por_igual, 0);
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`\nVEREDITO: ${out.veredito} · ficheiros=${Object.values(out.diretorios).reduce((a, x) => a + x.ficheiros, 0)} · soma_bytes=${out.soma_bytes} · bytes_unicas=${out.bytes_que_nenhum_versionado_tem}`);
console.log(`artefacto: ${OUT}`);
