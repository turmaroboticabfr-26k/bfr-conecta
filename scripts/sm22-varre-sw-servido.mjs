#!/usr/bin/env node
// SM-22 (peca 11, SOMENTE LEITURA): fecha o unico buraco que a peca 10 abriu ao medir os ouvintes
// do service worker no corpo ERRADO. A peca 10 procurou `addEventListener('push'` no SHELL e deu
// zero — mas o SW nao e o shell: e um asset aparte, servido em /sw-v4.js. A peca 9 contara os cinco
// ouvintes na string que o worker embute e provara, por igualdade de md5, que o ficheiro servido e
// o esperado da v134; aqui mede-se o veredito directamente nos bytes servidos, sem transitividade,
// e acrescenta-se o controlo negativo que faltava: a mesma regua aplicada a um SW sintetico sem
// `push` nem `notificationclick` tem de dar zero. Sem esse par, «5 ouvintes = true» nao distingue
// um SW funcional de uma regex que casa em qualquer coisa.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const OUT = join(REPO, 'evidence/sm22-varre-sw-servido-18-11.json');
if (existsSync(OUT)) throw new Error(`ABORTA: ${OUT} existe — correr com outro nome, nao por cima`);
const md5 = (b) => createHash('md5').update(b).digest('hex');

const vivo = JSON.parse(readFileSync(join(REPO, 'evidence/sm22-varre-vivo-pen-18-11b.json'), 'utf8'));
const esperado = JSON.parse(readFileSync(join(REPO, 'worker-deploy-v134-sidebar/esperado-v134.json'), 'utf8'));
const alvo = (/https:\/\/[a-z0-9.-]+\.workers\.dev/i.exec(readFileSync(join(REPO, 'audit-publicacao-v134.json'), 'utf8')) || [])[0];
if (!alvo) throw new Error('ABORTA: sem URL de publicacao');
// o caminho do SW tira-se dos proprios bytes do shell, nunca dactilografado: e o que a peca 1
// chamou `caminhos_sw_no_shell`, e um nome gralha daria 404 lido como «nao ha SW».
// CUIDADO QUE ESTA LINHA PAGOU (ver o artefacto ANTERIOR): no bundle o registo e escrito como
// template literal — `serviceWorker.register(\`${location.origin}/sw-v4.js?v=45\`)` — por que o
// trecho extraido traz o placeholder VIVO. Pedir esse texto tal-e-como faz pedido a
// `…/%24%7Blocation.origin%7D/sw-v4.js`, que da 404 e uma resposta de 9 bytes, e o 404 foi lido as
// pressas como «o SW nao e servido». Aqui o placeholder desdoa-se para o que o browser poe: o
// origem e a propria URL medida, e o que fica e o caminho com a query de versao.
const shellTxt = await (await fetch(alvo + '/', { headers: { 'cache-control': 'no-cache' } })).text();
const brutos = [...new Set([...shellTxt.matchAll(/serviceWorker\.register\(\s*[`'"]([^`'"]*sw[^`'"]*\.js[^`'"]*)/g)].map((m) => m[1]))];
if (!brutos.length) throw new Error('ABORTA: nenhum caminho de SW extraido do shell — a sonda nao pode adivinha-lo');
const resolvidos = [...new Set(brutos.map((b) => b.replace(/\$\{[^}]*\}/g, '')))];

const NOMES = ['install', 'activate', 'fetch', 'push', 'notificationclick'];
const regua = (t) => Object.fromEntries(NOMES.map((n) => [n, new RegExp("addEventListener\\(\\s*['\"`]" + n + "['\"`]").test(t)]));
// CONTROLO NEGATIVO: o mesmo texto com os dois ouvintes municipales/empurrados removidos tem de dar
// false nos dois e true nos outros tres — prova que a regua e por nome, nao por `addEventListener` a granel.
const sintetico = `self.addEventListener('install',e=>{});self.addEventListener('activate',e=>{});self.addEventListener('fetch',e=>{});`;

// Sonda-se com e sem a query de versao: o shell registra `\`?v=45\``, mas a peca 1 pediu o caminho
// limpo. Se as duas pegadas diferirem, a «igualdade de md5» da peca 9 referia-se a outro recurso.
const todos = [...new Set([...resolvidos, ...resolvidos.map((c) => c.split('?')[0])])];
const medidos = [];
for (const c of todos) {
  const url = new URL(c, alvo).toString();
  const r = await fetch(url, { headers: { 'cache-control': 'no-cache' } });
  const buf = Buffer.from(await r.arrayBuffer());
  const txt = buf.toString('utf8');
  medidos.push({ caminho: c, url_medida: url, status: r.status, bytes: buf.length,
    md5: md5(buf), ouvintes: regua(txt), addEventListener_contados: (txt.match(/addEventListener/g) || []).length });
}

const out = {
  em: new Date().toISOString(),
  metodo: 'GET do shell e de cada caminho de SW que o proprio shell anuncia, com e sem query; nenhuma escrita; nenhum segredo lido',
  brutos_no_shell: brutos,
  resolvidos: todos,
  controlo_negativo: { corpo: 'mesma regua sobre um SW sintetico sem push nem notificationclick', ouvintes: regua(sintetico),
    empurra_dois_para_false: regua(sintetico).push === false && regua(sintetico).notificationclick === false },
  sw_servidos: medidos,
  confrontacao: medidos.map((m) => ({
    caminho: m.caminho,
    vs_peca1_md5: { servido: m.md5, peca1: vivo.pen26_sw.md5, iguais: m.md5 === vivo.pen26_sw.md5 },
    vs_peca1_bytes: { servido: m.bytes, peca1: vivo.pen26_sw.bytes, iguais: m.bytes === vivo.pen26_sw.bytes },
    vs_esperado_v134_md5: { servido: m.md5, esperado: esperado.swMd5, iguais: m.md5 === esperado.swMd5 },
  })),
  veredito_sw: medidos.some((m) => m.ouvintes.push && m.ouvintes.notificationclick)
    ? 'PELO MENOS UM SW SERVIDO TEM push E notificationclick — medido nos bytes, nao por transitividade de md5'
    : 'NENHUM SW SERVIDO TEM OS DOIS OUVINTES',
};
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`brutos no shell: [${brutos.join(' | ')}]`);
console.log(`controlo negativo empurra para false: ${out.controlo_negativo.empurra_dois_para_false}`);
for (const m of medidos) console.log(`  ${m.caminho}: status=${m.status} bytes=${m.bytes} md5=${m.md5} addEventListener=${m.addEventListener_contados} ouvintes=${JSON.stringify(m.ouvintes)}`);
for (const c of out.confrontacao) console.log(`  confronto ${c.caminho}: vs_peca1_md5=${c.vs_peca1_md5.iguais} vs_peca1_bytes=${c.vs_peca1_bytes.iguais} vs_esperado_v134=${c.vs_esperado_v134_md5.iguais}`);
console.log(out.veredito_sw);
console.log(`\nSM22_SW_SERVIDO_OK · registo evidence/sm22-varre-sw-servido-18-11.json`);
