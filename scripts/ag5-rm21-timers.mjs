// AG-5 (peça 2) — os setInterval do shell publicado, extraídos por parênteses equilibrados em vez de
// regex gulosa, e classificados pelo que o callback escreve. Escopo declarado: o RM-2.1 é o MENU
// mobile (item 77), não todo o app; os 103 `async function load*` que a peça 1 contou são do app todo,
// por isso a cifra de 19 carregadores do roadmap continua por confrontar — fica como limite honesto.
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO, md5 } from './ag-lib.mjs';

const OUT = join(REPO, 'evidence/ag5-rm21-timers-17-11.json');
if (existsSync(OUT)) throw new Error(`já existe ${OUT} — renomeie com md5 dos dois lados`);
const src = readFileSync(join(REPO, 'worker-deploy-v123-pdfs/worker.mjs'), 'utf8');

// extrai o argumento de `setInterval(` até ao `)` que fecha A CHAMADA, contando profundidade
const chama = (i) => {
  let d = 0, k = i;
  for (; k < src.length && k < i + 3000; k++) {
    const c = src[k];
    if (c === '(') d++;
    else if (c === ')') { d--; if (d === 0) break; }
  }
  return src.slice(i, k + 1);
};
const sites = [];
for (let i = src.indexOf('setInterval('); i >= 0; i = src.indexOf('setInterval(', i + 1)) {
  const t = chama(i);
  const ms = (t.match(/,\s*(\d{2,6})\s*\)\s*\.unref\(\)?$/) || t.match(/,\s*(\d{2,6})\s*\)/) || [])[1];
  sites.push({
    offset: i,
    ms: ms === undefined ? null : Number(ms),
    corpo: t.replace(/\s+/g, ' ').slice(0, 260),
    escreve_dom: /(innerHTML|textContent|classList|appendChild|style\.|insertAdjacent)/.test(t),
    escreve_estado: /(state\.\w+\s*=|localStorage|sessionStorage)/.test(t),
    consulta: /(\.from\(|fetch\(|\.rpc\()/.test(t),
    menu: /nav|menu|drawer|hamb|badge|unread|chip/i.test(t),
  });
}
const o = {
  em: new Date().toISOString(), alvo: 'worker-deploy-v123-pdfs/worker.mjs', md5: md5(src),
  metodo: 'extração por profundidade de parênteses (a peça 1 usou regex não-gulosa até ao primeiro ) e por isso deitou fora o que interessava)',
  total: sites.length,
  com_ms: sites.filter((s) => s.ms !== null).length,
  sem_ms_reconhecido: sites.filter((s) => s.ms === null).map((s) => ({ offset: s.offset, corpo: s.corpo.slice(0, 90) })),
  escrevem_dom: sites.filter((s) => s.escreve_dom).length,
  consultam: sites.filter((s) => s.consulta).length,
  do_menu: sites.filter((s) => s.menu).length,
  por_ms: sites.reduce((a, s) => ({ ...a, [String(s.ms)]: (a[String(s.ms)] || 0) + 1 }), {}),
  periodos_ao_menu_com_escrita_dom: sites.filter((s) => s.menu && s.escreve_dom).map((s) => ({ offset: s.offset, ms: s.ms, corpo: s.corpo })),
  periodos_ao_menu_sem_escrita: sites.filter((s) => s.menu && !s.escreve_dom && !s.consulta).map((s) => ({ offset: s.offset, ms: s.ms, corpo: s.corpo })),
  sites,
};
writeFileSync(OUT, JSON.stringify(o, null, 2) + '\n');
console.log(`setInterval total=${o.total} com ms=${o.com_ms} · escrevem DOM=${o.escrevem_dom} · consultam=${o.consultam} · marcados como menu=${o.do_menu}`);
console.log(`distribuição por período (ms): ${JSON.stringify(o.por_ms)}`);
console.log(`MENU com escrita DOM: ${o.periodos_ao_menu_com_escrita_dom.length} · MENU sem escrita nem consulta: ${o.periodos_ao_menu_sem_escrita.length}`);
for (const x of o.periodos_ao_menu_com_escrita_dom.slice(0, 6)) console.log(`  @${x.offset} ${x.ms}ms  ${x.corpo.slice(0, 120)}`);
for (const x of o.periodos_ao_menu_sem_escrita.slice(0, 6)) console.log(`  (só relançamento) @${x.offset} ${x.ms}ms  ${x.corpo.slice(0, 100)}`);
console.log('AG5_TIMERS_FEITO evidence/ag5-rm21-timers-17-11.json');
