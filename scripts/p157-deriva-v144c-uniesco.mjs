#!/usr/bin/env node
// P157 — REMENDO DA v144b: OS 10 NOMES DE FICHEIRO DE DOWNLOAD COM `-bfr-` COLADO (24/11).
//
// A régua delimitada do p154/p156 (palavras isoladas) não apanha `boletim-bfr-`, `cracha-bfr-`, `qr-bfr-`,
// `secretaria-bfr-`, `relatorio-secretaria-bfr-`, `frequencia-chegada-bfr-` — o hífen fica fora da classe de
// exclusão e o token não é palavra. São 10 nomes de ficheiro descarregados pelo utilizador (boletins, crachás,
// QR, CSV/PDF da secretaria, frequência de chegada) — referências visíveis da marca antiga na experiência.
// Remendo PONTUAL com âncoras exactas e contagens; a régua de download `-(bfr)-` (excluindo `data-` técnico)
// é régua: 10 antes, 0 depois.
//
// Regras: 0 deploy, 0 DDL, 0 escrita no banco, 0 publicacao. Escreve só bfr-candidata-v144c-uniesco/ e evidence/.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Script } from 'node:vm';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const ORIGEM = `${REPO}/bfr-candidata-v144b-uniesco/index.html`;
const PORTOES = JSON.parse(readFileSync(`${REPO}/bfr-candidata-v144b-uniesco/portoes-v144b-candidata.json`, 'utf8'));
const NOVO_DIR = `${REPO}/bfr-candidata-v144c-uniesco`;
const SAIDA = `${NOVO_DIR}/index.html`;
const REGISTO = `${NOVO_DIR}/portoes-v144c-candidata.json`;
const SUF = (process.argv[2] || 'a').trim();
const EV = `${REPO}/evidence/p157-deriva-v144c-24-11-${SUF}.json`;
if ([SAIDA, REGISTO, EV].some((f) => existsSync(f))) throw new Error('ABORTA: ja existe saida da v144c — use outro sufixo, nunca por cima');

const md5 = (b) => createHash('md5').update(Buffer.isBuffer(b) ? b : Buffer.from(String(b))).digest('hex');
const n = (t, x) => t.split(x).length - 1;
const B = (s) => Buffer.byteLength(s);
// régua de download: `-bfr-` com hífen antes e depois, fora de `data-bfr-` (atributo técnico de carga adiada)
// e fora de `--bfr-` (variáveis CSS técnicas)
const RE_DOWNLOAD = /(?<!data)(?<!-)-[Bb][Ff][Rr]-/g;
// régua do p156 (palavras delimitadas): deve continuar 0 depois do remendo
const RE_FRONT = /(?<![A-Za-z0-9_$@#])BFR(?![A-Za-z0-9_$@#])|(?<![A-Za-z0-9_$@#])Bfr(?![A-Za-z0-9_$@#])|(?<![A-Za-z0-9_$@#])Conecta(?![A-Za-z0-9_$@#])|(?<![A-Za-z0-9_$@#])CONECTA(?![A-Za-z0-9_$@#])|(?<![A-Za-z0-9_$@#])conecta(?![A-Za-z0-9_$@#])/g;

const txt0 = readFileSync(ORIGEM, 'utf8');
if (!String(PORTOES.veredito).startsWith('P154_DERIVA_V144B_OK')) throw new Error('ABORTA: a origem nao tem o veredito da v144b: ' + PORTOES.veredito);
if (PORTOES.destino.md5 !== md5(txt0) || PORTOES.destino.bytes !== B(txt0)) throw new Error('ABORTA: a origem foi tocada depois de certificada');

const downloadsAntes = [...txt0.matchAll(RE_DOWNLOAD)].length;
if (downloadsAntes !== 10) throw new Error('ABORTA: a régua de download mede ' + downloadsAntes + ' (esperava 10) — o remendo perdeu a identidade');

// ordem: a âncora composta primeiro, senão a curta consome-a
const PARES = [
  ['boletim', 'boletim-bfr-', 'boletim-uniesco-', 2],
  ['cracha', 'cracha-bfr-', 'cracha-uniesco-', 3],
  ['qr', 'qr-bfr-', 'qr-uniesco-', 1],
  ['relatorio_secretaria', 'relatorio-secretaria-bfr-', 'relatorio-secretaria-uniesco-', 1],
  ['secretaria', 'secretaria-bfr-', 'secretaria-uniesco-', 1],
  ['frequencia_chegada', 'frequencia-chegada-bfr-', 'frequencia-chegada-uniesco-', 2],
];
let txt = txt0;
const subs = [];
for (const [nome, de, para, esperado] of PARES) {
  const vezes = n(txt, de);
  if (vezes !== esperado) throw new Error('ABORTA: ' + nome + ' casa ' + vezes + ' vezes (esperava ' + esperado + ')');
  txt = txt.split(de).join(para);
  subs.push({ nome, vezes: esperado, delta_bytes: (B(para) - B(de)) * esperado });
}

const compila = (corpo) => { try { new Script(corpo); return true; } catch (e) { return false; } };
const corpos = (s) => { const out = []; const re = /<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g; let m; while ((m = re.exec(s))) out.push(m[1]); return out; };
// régua do p156: visível = HTML sem script/style/comentários; scripts com o composto técnico bfr-conecta removido
const visivelDe = (s) => s.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
const scriptsDe = (s) => [...s.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]).join('\n').replace(/bfr-conecta/g, ' ');
const c0 = corpos(txt0), c1 = corpos(txt);
const falhas = [];
const g = (nome, cond, dado) => { if (cond !== true) falhas.push(nome + ' | ' + JSON.stringify(dado).slice(0, 240)); };
g('r1_os_seis_pares_casaram_as_vezes_esperadas', subs.length === 6 && subs.every((s) => s.delta_bytes === 4 * s.vezes), subs);
g('r2_a_regua_de_download_vai_a_zero', [...txt.matchAll(RE_DOWNLOAD)].length === 0, { restantes: [...txt.matchAll(RE_DOWNLOAD)].length });
g('r3_a_regua_de_palavras_do_p156_continua_zero', [...visivelDe(txt).matchAll(RE_FRONT)].length === 0 && [...scriptsDe(txt).matchAll(RE_FRONT)].length === 0, { visivel: [...visivelDe(txt).matchAll(RE_FRONT)].length, scripts: [...scriptsDe(txt).matchAll(RE_FRONT)].length });
g('r4_o_titulo_mantem_se_e_o_uniesco_cresce_10', n(txt, '<title>UNIESCO | Escola Benício Ferreira Reis</title>') === 1 && n(txt, 'UNIESCO') === n(txt0, 'UNIESCO') && n(txt, 'uniesco') === n(txt0, 'uniesco') + 10, { UNIESCO_antes: n(txt0, 'UNIESCO'), UNIESCO_depois: n(txt, 'UNIESCO'), uniesco_antes: n(txt0, 'uniesco'), uniesco_depois: n(txt, 'uniesco') });
g('r5_os_corpos_inline_compilam_igual', c0.length === c1.length && c1.every((c, i) => compila(c) === compila(c0[i])), { corpos: c1.length, diffs: c1.filter((c, i) => compila(c) !== compila(c0[i])).length });
g('r6_o_delta_de_bytes_e_a_soma_das_substituicoes', B(txt) - B(txt0) === subs.reduce((a, s) => a + s.delta_bytes, 0), { delta: B(txt) - B(txt0), soma: subs.reduce((a, s) => a + s.delta_bytes, 0) });
g('r7_identificadores_tecnicos_intocados', n(txt, 'window.BFR_') === n(txt0, 'window.BFR_') && n(txt, 'bfr-app-logo.png') === n(txt0, 'bfr-app-logo.png') && n(txt, 'bfr-paint-hold') === n(txt0, 'bfr-paint-hold') && n(txt, 'bfr-conecta') === n(txt0, 'bfr-conecta') && n(txt, 'data-bfr-') === n(txt0, 'data-bfr-'), { bfr_: n(txt, 'window.BFR_'), logo: n(txt, 'bfr-app-logo.png'), paint: n(txt, 'bfr-paint-hold'), host: n(txt, 'bfr-conecta'), data: n(txt, 'data-bfr-') });
if (falhas.length) {
  const RED = `${REPO}/evidence/p157-deriva-v144c-24-11-${SUF}-VERMELHO.json`;
  if (existsSync(RED)) throw new Error('ABORTA: ' + RED + ' existe — use outro sufixo');
  writeFileSync(RED, JSON.stringify({ veredito: 'P157_V144C_VERMELHO ' + falhas.length, sufixo: SUF, falhas }, null, 2) + '\n');
  for (const f of falhas) console.log('VERMELHO ' + f);
  process.exit(1);
}
mkdirSync(NOVO_DIR, { recursive: true });
writeFileSync(SAIDA, txt);
if (md5(readFileSync(SAIDA, 'utf8')) !== md5(txt)) throw new Error('ABORTA: a re-leitura nao bate com a corrida');
const registo = {
  programa: 'scripts/p157-deriva-v144c-uniesco.mjs', em: new Date().toISOString(),
  pergunta: 'os 10 nomes de ficheiro de download com `-bfr-` colado (2 boletim + 3 cracha + 1 qr + 1 relatorio-secretaria + 1 secretaria + 2 frequencia-chegada) ficam `-uniesco-` sem tocar em mais nada?',
  origem: { pasta: 'bfr-candidata-v144b-uniesco', md5: md5(txt0), bytes: B(txt0), veredito: PORTOES.veredito },
  destino: { pasta: 'bfr-candidata-v144c-uniesco', md5: md5(txt), bytes: B(txt), delta_bytes: B(txt) - B(txt0) },
  downloads_antes: downloadsAntes, downloads_depois: [...txt.matchAll(RE_DOWNLOAD)].length,
  substituicoes: subs, portoes: { total: 7, falhas: 0 }, veredito: '',
};
registo.veredito = 'P157_DERIVA_V144C_OK 7/0';
writeFileSync(REGISTO, JSON.stringify(registo, null, 2) + '\n');
writeFileSync(EV, JSON.stringify(registo, null, 2) + '\n');
console.log(`${registo.veredito} · ${B(txt)} B (delta ${B(txt) - B(txt0)}) · ${md5(txt)} · downloads 10→0`);
