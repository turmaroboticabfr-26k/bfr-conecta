#!/usr/bin/env node
// P119 — os agregados municipais da PEN-39 sao realmente chamados no byte servido?
// Porque existe: a primeira versao desta regua procurava `.rpc('nome_literal')`. O codigo publicado nao
// e assim: declara `const NOME_TOTAIS = 'bfr_…'`, chama um helper passando o identificador, e e dentro
// do helper que se faz `c.rpc(nome, params)`. Uma agulha de literal sobre essa forma so pode dar zero,
// pelo que o «0 chamadas» que deu nao afirmava nada sobre o ar — era a sonda partida, nao o produto.
// A regua passou a resolver a cadeia por posicao: literal -> constante -> indice do parametro que o
// helper entrega ao `.rpc(` -> call site com a constante nesse mesmo indice. Le dois fixtures montados
// em tempo de execucao (um que fecha, um em que a constante nunca e passada) para ter positivo dos dois
// lados, porque um `true` sem caso falso e so a minha expectativa escrita em outro sitio.
// So leitura: fetch anonimo, dois ficheiros do repo, zero rede autenticada, zero DDL, zero escrita no banco.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = process.env.P119_SUF ? '-' + process.env.P119_SUF : '';
const OUT = join(REPO, `evidence/p119-agregados-no-ar-21-11${SUF}.json`);
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com P119_SUF=novo');
const t0 = Date.now();
const md5 = (b) => createHash('md5').update(b).digest('hex');
const url = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const txt = await (await fetch(url, { headers: { 'cache-control': 'no-cache' } })).text();
const cert = JSON.parse(readFileSync(join(REPO, 'worker-deploy-v142-painel-na-troca/esperado-v142.json'), 'utf8'));

const ddl = readFileSync(join(REPO, 'scripts/p73-pen39-ddl-candidata.sql'), 'utf8');
const nomes = [...new Set([...ddl.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+public\.([a-z_]+)/gi)].map((m) => m[1]))];
if (nomes.length !== 2) throw new Error('ABORTA: esperava 2 CREATE FUNCTION no DDL da PEN-39 e li ' + nomes.length + ' — a régua deixou de saber o que procura');

// Corpo de uma definicao por contagem de chavetas a partir do `{` que fecha o cabeçalho, porque cortar
// uma janela fixa apanharia o `.rpc(` da funcao seguinte e daria um encadeamento emprestado.
const corpo_de = (src, idxChaves) => {
  let prof = 0, i = idxChaves;
  for (; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') prof++;
    else if (ch === '}') { prof--; if (prof === 0) return src.slice(idxChaves, i + 1); }
  }
  return src.slice(idxChaves);
};
const args_de = (dentro) => {
  const out = []; let cur = '', prof = 0, quote = '';
  for (const ch of dentro) {
    if (quote) { cur += ch; if (ch === quote) quote = ''; continue; }
    if (ch === '"' || ch === "'") { quote = ch; cur += ch; continue; }
    if (ch === '(' || ch === '[' || ch === '{') prof++;
    if (ch === ')' || ch === ']' || ch === '}') prof--;
    if (ch === ',' && prof === 0) { out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
};

const resolve = (corpo, nome) => {
  const esc = nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const lit = (corpo.match(new RegExp(esc, 'g')) || []).length;
  const decl = new RegExp('const\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*[\'"]' + esc + '[\'"]').exec(corpo);
  if (!decl) return { passo: '1_declaration_da_constante', fechado: false, ocorrencias_do_literal: lit };
  const id = decl[1];
  // Definicoes com cabecalho `(...)` seguido de bloco `{`: `function H(a,b){…}` e `const H = async (a,b) => {…}`.
  const defs = [...corpo.matchAll(/(?:function\s+|const\s+)([A-Za-z_$][\w$]*)\s*(?:=\s*(?:async\s*)?(?:function\s*)?)?\(([^)]{0,200})\)\s*(?:=>\s*)?\{/g)];
  const candidates = [];
  for (const d of defs) {
    const helper = d[1];
    const params = args_de(d[2] || '');
    const abre = corpo.indexOf('{', d.index + d[0].length - 1);
    const miolo = corpo_de(corpo, abre);
    const mRpc = /\.\s*rpc\s*\(\s*([A-Za-z_$][\w$]*)/.exec(miolo);
    if (!mRpc) continue;
    const idx = params.indexOf(mRpc[1]);
    if (idx < 0) { candidates.push({ helper, rpc_arg: mRpc[1], indice_do_parametro: -1, nota: 'o .rpc usa nome fixo, nao um parametro' }); continue; }
    const calls = [...corpo.matchAll(new RegExp('\\b' + helper + '\\s*\\(', 'g'))]
      .map((c) => { const abre2 = c.index + c[0].length - 1; const ate = corpo.indexOf(')', abre2); return ate < 0 ? null : args_de(corpo.slice(abre2 + 1, ate)); })
      .filter(Boolean);
    const bate = calls.filter((a) => a[idx] === id);
    candidates.push({ helper, rpc_arg: mRpc[1], indice_do_parametro: idx, callsites: calls.length, callsites_com_a_constante_naquela_posicao: bate.length });
    if (bate.length > 0) return { passo: 'fechado', fechado: true, constante: id, ocorrencias_do_literal: lit, cadeia: candidates };
  }
  return { passo: candidates.length ? '3_callsite_da_constante_no_indice_do_rpc' : '2_helper_que_entregue_o_nome_ao_rpc', fechado: false, constante: id, ocorrencias_do_literal: lit, cadeia: candidates };
};

const por_nome = nomes.map((n) => ({ nome: n, cadeia: resolve(txt, n) }));

const N = nomes[0];
const FIX_OK = [
  "const C_TESTE = '" + N + "';",
  'async function lerX(chave, nome, params) { const cli = client(); const r = await cli.rpc(nome, params); return r; }',
  "const a = await lerX('k1', C_TESTE, {});",
].join('\n');
const FIX_SEM_CALL = ["const C_TESTE = '" + N + "';", 'async function lerX(chave, nome, params) { const r = await cli.rpc(nome, params); return r; }', 'const a = 1;'].join('\n');
const FIX_INDICE_TROCADO = ["const C_TESTE = '" + N + "';", 'async function lerX(chave, nome, params) { const r = await cli.rpc(nome, params); return r; }', "const a = await lerX(C_TESTE, 'k1', {});"].join('\n');
const fix_positivo_fecha = resolve(FIX_OK, N).fechado === true;
const fix_negativo_sem_callsite_chumba = resolve(FIX_SEM_CALL, N).fechado === false;
const fix_negativo_indice_trocado_chumba = resolve(FIX_INDICE_TROCADO, N).fechado === false;

const out = {
  programa: 'scripts/p119-agregados-no-ar.mjs',
  em: new Date().toISOString(), duracao_ms: Date.now() - t0,
  metodo: 'Fetch anónimo do shell; os nomes leem-se dos CREATE FUNCTION do DDL da PEN-39 (nunca dactilografados); para cada nome encadeia-se literal→constante→parâmetro entregue ao `.rpc(`→callsite com essa constante no mesmo índice, com o corpo de cada helper delimitado por contagem de chavetas; três fixtures montados em tempo de execução (fecha, sem callsite, índice trocado) provam os dois sentidos da régua.',
  ar: { url, bytes: Buffer.byteLength(txt), md5: md5(Buffer.from(txt)), bate_com_certificado_v142: md5(Buffer.from(txt)) === cert.htmlMd5 },
  nomes_lidos_do_ddl: nomes, por_nome,
  fixtures: { positivo_fecha: fix_positivo_fecha, sem_callsite_chumba: fix_negativo_sem_callsite_chumba, indice_trocado_chumba: fix_negativo_indice_trocado_chumba },
  o_que_nao_ve: 'Não vê se o loader que chama o agregado está ligado a um botão do painel (isso é o censo de chamadas `scripts/sm24-censo-de-chamadas-do-modulo.mjs`), nem se o RPC devolve linhas com sessão (preflight da PEN-39). Vê que o byte invoca o nome, e por qual cadeia.',
};
const todos = por_nome.filter((p) => p.cadeia.fechado === true).length;
out.veredito = (out.ar.bate_com_certificado_v142 && fix_positivo_fecha && fix_negativo_sem_callsite_chumba && fix_negativo_indice_trocado_chumba && todos === nomes.length)
  ? `P119_AGREGADOS_PEN39_SAO_CHAMADOS_NO_AR ${todos}/${nomes.length}`
  : `P119_AGREGADOS_NO_AR_VERMELHO chamam=${todos}/${nomes.length} byte_cert=${out.ar.bate_com_certificado_v142} fixtures=${fix_positivo_fecha}/${fix_negativo_sem_callsite_chumba}/${fix_negativo_indice_trocado_chumba}`;
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`byte=${out.ar.md5}/${out.ar.bytes}B bate_certificado_v142=${out.ar.bate_com_certificado_v142}`);
for (const p of por_nome) console.log(`  ${p.nome}: fechado=${p.cadeia.fechado} passo=${p.cadeia.passo} lit=${p.cadeia.ocorrencias_do_literal} cadeia=${JSON.stringify(p.cadeia.cadeia || [])}`);
console.log(`FIXTURES fecha=${fix_positivo_fecha} sem_callsite_chumba=${fix_negativo_sem_callsite_chumba} indice_trocado_chumba=${fix_negativo_indice_trocado_chumba}`);
console.log(`${out.veredito} · ${out.duracao_ms} ms · registo ${OUT}`);
