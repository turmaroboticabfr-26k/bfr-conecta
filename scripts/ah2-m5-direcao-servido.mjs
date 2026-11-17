// Porque este programa existe: o mecanismo de `direcao@developer` foi LIDO em `app/index.html:13163-13176`
// (o `setupDirectionNav` des-via o clique para `administracao` quando o papel não é `director`, e o
// `ensureDirectionPanel` injecta o painel dentro de `#adminView`). Mas §AI.8 provou que a árvore local não é
// os bytes publicados, por isso assinar «é o produto que faz isto» exige ver as três strings no shell SERVIDO.
// Este programa faz só isso: procura, nos bytes servidos, (a) o gate `['developer','director'].includes(role())`
// colado ao `[data-direction-nav]`, (b) o re-encaminhamento para `[data-section="administracao"]`, (c) o alvo
// `#adminView` da injecção. Regex tolerante a espaços porque o servido pode não ter a mesma formatação local.
// Só-leitura: 0 browser, 0 escrita em base, 1 fetch.
// Uso: node scripts/ah2-m5-direcao-servido.mjs
import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const OUT = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta/evidence/ah2-m5-direcao-servido-v1.json';
const txt = await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' } })).text();
const md5 = createHash('md5').update(txt).digest('hex');

const busca = (nome, re) => {
  const m = re.exec(txt);
  return { nome, encontrado: !!m, offset: m ? m.index : null, trecho: m ? txt.slice(m.index, m.index + m[0].length).replace(/\s+/g, ' ') : null };
};
const provas = [
  busca('gate developer/director colado ao data-direction-nav', /querySelector\(['"]\[data-direction-nav\]['"]\)[^]{0,260}?\[['"]developer['"],\s*['"]director['"]\]\.includes\(role\(\)\)/),
  busca('re-encaminhamento para administracao', /document\.querySelector\(['"]\[data-section="administracao"\]['"]\)\s*\?\.\s*click\(\)/),
  busca('alvo da injecção é adminView para não-director', /role\(\)\s*===\s*['"]director['"]\s*\?\s*document\.getElementById\(['"]directorView['"]\)\s*:\s*document\.getElementById\(['"]adminView['"]\)/),
  busca('anchor .teacher-welcome da injecção', /view\.querySelector\(['"]\.teacher-welcome['"]\)/),
];
const saida = { ciclo: 'AH-M5-DIRECAO-SERVIDO', em: new Date().toISOString(), md5_shell: md5, bytes: txt.length, provas, todas_no_servido: provas.every((p) => p.encontrado) };
writeFileSync(OUT, JSON.stringify(saida, null, 2) + '\n');
console.log(`md5=${md5.slice(0, 12)} · todas_no_servido=${saida.todas_no_servido}`);
for (const p of provas) console.log(`  ${p.encontrado ? 'SIM' : 'NÃO'}  @${String(p.offset).padEnd(9)} ${p.nome}\n        ${(p.trecho || '').slice(0, 220)}`);
console.log('\nESCRITO: ' + OUT.split('/').pop());
