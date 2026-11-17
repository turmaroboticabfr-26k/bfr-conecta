// AG-5 (peça 3) — resolve o CALOR dos timers do menu: a peça 2 só olhava dentro do argumento do
// setInterval, por isso `setInterval(syncNav, 1200)` contava como "sem escrita". Aqui cada callback
// nomeado é procurado no próprio bundle (`function syncNav(...) { … }`) e o corpo é classificado.
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO } from './ag-lib.mjs';

const OUT = join(REPO, 'evidence/ag5-rm21-quals-17-11.json');
if (existsSync(OUT)) throw new Error(`já existe ${OUT} — renomeie com md5 dos dois lados`);
const src = readFileSync(join(REPO, 'worker-deploy-v123-pdfs/worker.mjs'), 'utf8');

const corpoFn = (nome) => {
  const i = src.search(new RegExp('(?:async )?function ' + nome + '\\s*\\([^)]*\\)\\s*\\{'));
  if (i < 0) return null;
  const abre = src.indexOf('{', i);
  let d = 0, k = abre;
  for (; k < src.length; k++) {
    if (src[k] === '{') d++;
    else if (src[k] === '}') { d--; if (d === 0) break; }
  }
  return src.slice(abre, Math.min(k + 1, abre + 12000));
};
const escreve = (c) => c ? /(innerHTML|textContent|classList\.(add|remove|toggle)|appendChild|setAttribute|insertAdjacent)/.test(c) : false;
const escreve_redesenha = (c) => c ? /(innerHTML|outerHTML|insertAdjacentHTML)/.test(c) : false;

const candidatos = ['syncNav', 'syncPlatformNavigation', 'syncNavigationA11y', 'setupSupervisorNav', 'injectStyles', 'setupDirectionNav', 'appReady'];
const o = { em: new Date().toISOString(), tarefa: 'AG-5 peça 3 — o que os callbacks periódicos do menu realmente escrevem', metodo: 'resolução do corpo por contagem de chaves no mesmo bundle', alvos: {} };
for (const n of candidatos) {
  const c = corpoFn(n);
  o.alvos[n] = { encontrada: c !== null, chars: c ? c.length : 0, escreve_dom: escreve(c), redesenha: escreve_redesenha(c), consultas: c ? (c.match(/\.from\(|\.rpc\(|fetch\(/g) || []).length : 0, amostra: c ? c.replace(/\s+/g, ' ').slice(0, 200) : null };
}
// os três timers do menu medidos na peça 2, com o corpo resolvido
o.timers = [
  { offset: 2425499, ms: 1200, callback: 'syncNav' },
  { offset: 1950803, ms: 500, callback: 'syncPlatformNavigation' },
  { offset: 3299322, ms: 900, callback: 'syncNavigationA11y' },
].map((t) => ({ ...t, escreve_dom: escreve(o.alvos[t.callback]?.encontrada ? corpoFn(t.callback) : null), redesenha: escreve_redesenha(o.alvos[t.callback]?.encontrada ? corpoFn(t.callback) : null) }));
o.veredito_rma21 = o.timers.filter((t) => t.escreve_dom).length > 0
  ? `PERIODICO_COM_ESCRITA: ${o.timers.filter((t) => t.escreve_dom).length} dos ${o.timers.length} timers do menu escrevem no DOM — a aceitação «0 escritas periódicas residuais» NÃO se verifica nos bytes publicados`
  : 'NENHUM_TIMER_DO_MENU_ESCREVE: a aceitação verifica-se estaticamente';
writeFileSync(OUT, JSON.stringify(o, null, 2) + '\n');
console.log(o.veredito_rma21);
for (const t of o.timers) console.log(`  ${t.callback} @${t.ms}ms → escreve_dom=${t.escreve_dom} redesenha=${t.redesenha}`);
for (const [n, v] of Object.entries(o.alvos)) console.log(`  ${n.padEnd(24)} encontrada=${v.encontrada} chars=${String(v.chars).padEnd(6)} escreve=${v.escreve_dom} redesenha=${v.redesenha} consultas=${v.consultas}`);
console.log('AG5_QUALS_FEITO evidence/ag5-rm21-quals-17-11.json');
