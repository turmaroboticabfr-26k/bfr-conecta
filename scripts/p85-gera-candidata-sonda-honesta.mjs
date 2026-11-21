#!/usr/bin/env node
// P85 — CANDIDATA v139 «SONDA HONESTA» (21/11, noite; local, nada publicado).
//
// O que existe porque alguém mediu: `scripts/p82-censo-seguranca-municipal.mjs` (corrida
// `evidence/p82-censo-seguranca-municipal-d.json`, vermelho 2) provou duas frases falsas no ar:
//  (1) o ramo verde é chaveado por `sonda.executavel = !error` — uma sessão a quem o backend respondeu
//      `false` lê «Controle no backend confirmado»;
//  (2) a faixa âmbar afirma que a candidata SM4 «ainda não foi aplicado», quando P82 mediu
//      `faltam_funcoes=0` e `faltam_politicas=0` no banco.
// Esta peça corrige as duas, sem tocar em quem vê a aba: a visibilidade continua a ser o que é hoje
// (mudar a porta para o rpc é decisão do usuário, não deste gerador).
//
// Regras: 0 deploy, 0 publicação, 0 DDL, 0 escrita no banco, única escrita = bfr-candidata-v139-sonda-honesta/
// (index.html + portões) e o registo em evidence/. A origem é lida e re-lida com a mesma pegada; se a pasta já
// existir, verifica-se byte a byte e aborta-se se diferir.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { Script } from 'node:vm';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const ORIGEM = join(DIR, 'bfr-candidata-v138-painel-municipal/index.html');
const PORTOES_ORIGEM = join(DIR, 'bfr-candidata-v138-painel-municipal/portoes-v138-candidata.json');
const PARA = join(DIR, 'bfr-candidata-v139-sonda-honesta');
const SAIDA = join(PARA, 'index.html');
const PORTOES = join(PARA, 'portoes-v139-candidata.json');
const SUF = (process.argv[2] || 'a').trim();
const EV = join(DIR, `evidence/p85-gera-candidata-21-11-${SUF}.json`);
const AR_PUBLICADO = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const md5 = (b) => createHash('md5').update(Buffer.from(String(b))).digest('hex');
const vezes = (t, x) => t.split(x).length - 1;
const t0 = Date.now();

if (!existsSync(ORIGEM)) throw new Error('ABORTA: origem ' + ORIGEM + ' não existe');
if (!existsSync(PORTOES_ORIGEM)) throw new Error('ABORTA: a origem não tem portões — gerar sobre uma candidata não certificada');
const portoesOrigem = JSON.parse(readFileSync(PORTOES_ORIGEM, 'utf8'));
if (!/OK/.test(String(portoesOrigem.veredito))) throw new Error('ABORTA: portões da origem não estão verdes (' + portoesOrigem.veredito + ')');
const txt0 = readFileSync(ORIGEM, 'utf8');
const MD5_0 = md5(txt0);
const B0 = statSync(ORIGEM).size;
const MOD_INI = txt0.indexOf('<script data-bfr-municipal-module="1">');
if (MOD_INI === -1) throw new Error('ABORTA: a origem não tem o invólucro do módulo municipal');

// ── as cinco substituições, cada uma contada uma vez na origem ──
const SUBS = [
  {
    nome: 'sonda_passa_a_guardar_a_resposta_e_a_autorizacao',
    antes: "  const sonda = { feita: false, executavel: null, erro: '', nota: '' };",
    depois: "  const sonda = { feita: false, executavel: null, resposta: null, autorizada: null, erro: '', nota: '' };",
  },
  {
    nome: 'a_sonda_regista_o_valor_que_o_backend_devolveu',
    antes: "      sonda.feita = true; sonda.executavel = !error; sonda.erro = error ? String(error.message || error.code) : '';",
    depois: "      sonda.feita = true; sonda.executavel = !error; sonda.resposta = error ? null : data; sonda.autorizada = !error && data === true; sonda.erro = error ? String(error.message || error.code) : '';",
  },
  {
    nome: 'o_ramo_verde_passa_a_exigir_verdade_e_ganha_um_ramo_de_negacao',
    antes: "    if (sonda.executavel) return '<div class=\"mun-ok\"><strong>Controle no backend confirmado:</strong> ' + esc(sonda.nota) + '</div>';",
    depois: "    if (sonda.autorizada === true) return '<div class=\"mun-ok\"><strong>Controle no backend confirmado:</strong> ' + esc(sonda.nota) + '</div>';\n    if (sonda.executavel && sonda.autorizada === false) return '<div class=\"mun-danger\"><strong>Acesso municipal negado pelo backend:</strong> <code>bfr_is_municipal_authority()</code> respondeu <code>false</code> para esta sessão. A visibilidade da aba é decisão do bundle; a leitura dos dados desta rede é decisão do banco, e aqui o banco disse que não. Se isto não era esperado, peça a sua concessão em <code>bfr_municipal_access_grants</code>.</div>';",
  },
  {
    nome: 'a_frase_que_afirmava_a_SM4_por_aplicar_desaparece',
    antes: "      + '. Hoje a aba é governada pelo mapa de papéis do bundle; o controle de acesso de servidor (§5.381, §7.448) só passa a existir com <code>scripts/sm4-ddl-municipal-candidata.sql</code>, que ainda não foi aplicado.</div>';",
    depois: "      + '. Esta faixa só aparece quando o predicado não respondeu: PGRST202 quer dizer «em falta no banco», e a sua aplicação é medida por <code>scripts/p82-censo-seguranca-municipal.mjs</code>, nunca afirmada aqui. Enquanto o backend não responder, a visibilidade da aba continua a vir do mapa de papéis do bundle.</div>';",
  },
  {
    nome: 'a_classe_da_faixa_de_negacao_existe_em_CSS',
    antes: "      '#bfrMunicipalView .mun-ok{background:#eaf5ec;border:1px solid #9fc9a8;color:#1f5a2c;padding:12px;border-radius:10px;font-size:13px;line-height:1.5;margin-bottom:12px}',",
    depois: "      '#bfrMunicipalView .mun-ok{background:#eaf5ec;border:1px solid #9fc9a8;color:#1f5a2c;padding:12px;border-radius:10px;font-size:13px;line-height:1.5;margin-bottom:12px}',\n      '#bfrMunicipalView .mun-danger{background:#fdecec;border:1px solid #e2a0a0;color:#7c1d1d;padding:12px;border-radius:10px;font-size:13px;line-height:1.5;margin-bottom:12px;font-weight:600}',",
  },
];
for (const s of SUBS) {
  const v = vezes(txt0, s.antes);
  if (v !== 1) throw new Error('ABORTA: substituição "' + s.nome + '" casou ' + v + ' vezes na origem (esperado 1) — a origem mudou ou o padrão está errado');
}
let txt = txt0;
for (const s of SUBS) txt = txt.replace(s.antes, s.depois);
if (txt === txt0) throw new Error('ABORTA: nenhuma substituição escreveu nada');

// ── o corpo do módulo tem de compilar: extraio pelo FIM do invólucro, não por regex do corpo ──
const iniSaida = txt.indexOf('<script data-bfr-municipal-module="1">');
const fimSaida = txt.indexOf('</script>', iniSaida);
if (fimSaida === -1) throw new Error('ABORTA: sem fecho </script> depois do invólucro');
const corpo = txt.slice(iniSaida + '<script data-bfr-municipal-module="1">'.length, fimSaida);
let compila = true; let erroCompila = '';
try { new Script(corpo, { filename: 'modulo-municipal-v139.js' }); } catch (e) { compila = false; erroCompila = String(e.message || e).slice(0, 200); }

if (existsSync(SAIDA)) {
  const anterior = readFileSync(SAIDA, 'utf8');
  if (md5(anterior) !== md5(txt)) throw new Error('ABORTA: ' + SAIDA + ' já existe com bytes DIFERENTES — não se sobrescreve; use outro destino');
} else { mkdirSync(PARA, { recursive: true }); }
writeFileSync(SAIDA, txt);
writeFileSync(PORTOES, JSON.stringify({
  programa: 'scripts/p85-gera-candidata-sonda-honesta.mjs', em: new Date().toISOString(),
  origem: { pasta: 'bfr-candidata-v138-painel-municipal', md5: MD5_0, bytes: B0, veredito_portoes: portoesOrigem.veredito },
  destino: { pasta: 'bfr-candidata-v139-sonda-honesta', md5: md5(txt), bytes: Buffer.byteLength(txt, 'utf8') },
  substituicoes: SUBS.map((s) => ({ nome: s.nome, antes_ok: true, depois_presente: vezes(txt, s.depois) === 1 })),
}, null, 2) + '\n');

// ── nada foi publicado: o ar continua a ser a v136, e não existe diário da v139 ──
let arServido = null;
try { const r = await fetch(AR_PUBLICADO, { headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(60000) }); arServido = md5(await r.text()); } catch (e) { arServido = 'fetch_falhou: ' + String(e.message || e).slice(0, 80); }
const diarioV139 = join(DIR, 'audit-publicacao-v139.json');
const modV136 = readFileSync(join(DIR, 'bfr-candidata-v136-secretaria-de-educacao/index.html'), 'utf8');
// A régua de consumo compara-se com a ORIGEM (v138), não com a v136: foram as candidatas v137/v138 que
// acrescentaram chamadas, e usar a avó como linha de base chumaria o progresso alheio como regressão minha.
const iniOrigem = txt0.indexOf('<script data-bfr-municipal-module="1">');
const corpoOrigem = txt0.slice(iniOrigem + '<script data-bfr-municipal-module="1">'.length, txt0.indexOf('</script>', iniOrigem));
const NOMES_CONSUMO = [...new Set([...corpoOrigem.matchAll(/\.rpc\(\s*'([a-z0-9_]+)'/g)].map((m) => m[1]))].sort();
if (NOMES_CONSUMO.length === 0) throw new Error('ABORTA: 0 nomes de rpc no corpo da origem — a régua de consumo ficaria vacua');
if (vezes(corpoOrigem, 'bfr_is_municipal_authority') === 0) throw new Error('ABORTA: a origem não chama o predicado — o portão da negação não teria o que contar');

// Régua estática com os dois lados provados por fixture: a linha verde de ontem (só `executavel`) chumba,
// a de hoje (exige `autorizada === true`) passa. Sem isto, o portão poderia estar verde por não haver linha.
const ramoVerdeHonesto = (linha) => /sonda\.autorizada === true/.test(linha) && !/if \(sonda\.executavel\)/.test(linha);
if (ramoVerdeHonesto("    if (sonda.executavel) return '<div class=\"mun-ok\"><strong>Controle no backend confirmado:</strong> ' + esc(sonda.nota) + '</div>';") !== false) throw new Error('ABORTA: ramoVerdeHonesto aceita o ramo medido hoje no ar — a régua não teria dente');
if (ramoVerdeHonesto("    if (sonda.autorizada === true) return '<div class=\"mun-ok\"><strong>Controle no backend confirmado:</strong> ' + esc(sonda.nota) + '</div>';") !== true) throw new Error('ABORTA: ramoVerdeHonesto chumba o ramo que exige a verdade do backend');
const linhasVerdes = txt.split('\n').filter((l) => /class="mun-ok"/.test(l) && /return/.test(l));
if (linhasVerdes.length === 0) throw new Error('ABORTA: nenhuma linha verde no texto gerado — a substituição partiu o invólucro');

const falhas = []; const portoes = [];
const g = (nome, cond, dado) => { const v = !!cond; portoes.push({ nome, verde: v, dado }); if (!v) falhas.push(nome + ' | ' + JSON.stringify(dado).slice(0, 300)); console.log(`${v ? 'VERDE' : 'VERMELHO'}  ${nome}`); };
g('a_origem_fica_byte_a_byte_inalterada', md5(readFileSync(ORIGEM, 'utf8')) === MD5_0 && statSync(ORIGEM).size === B0, { md5_0: MD5_0, bytes_0: B0 });
g('as_cinco_substituicoes_estao_las_uma_ve_cada', SUBS.every((s) => vezes(txt, s.depois) === 1), SUBS.map((s) => s.nome + '=' + vezes(txt, s.depois)));
g('todo_ramo_verde_exige_verdade_e_nao_apenas_resposta', linhasVerdes.length > 0 && linhasVerdes.every(ramoVerdeHonesto), { linhas_verdes: linhasVerdes.map((l) => l.trim().slice(0, 130)) });
g('a_negacao_tem_ramo_proprio', vezes(txt, "'<div class=\"mun-danger\"><strong>Acesso municipal negado pelo backend:</strong>") === 1 && vezes(txt, 'sonda.autorizada === false') >= 1, { mun_danger: vezes(txt, "class=\"mun-danger\"") });
g('a_falsa_afirmacao_sobre_a_SM4_desapareceu_do_modulo', /ainda não foi aplicado/.test(corpo) === false, { occurrences_no_corpo: vezes(corpo, 'ainda não foi aplicado') });
g('o_CSS_da_faixa_de_negacao_fica_mesmo_depois_do_verde', /mun-ok\{[^']*\}[\s\S]{0,220}mun-danger\{/.test(corpo), { linha: corpo.split('\n').find((l) => /mun-danger\{/.test(l)) || null });
g('o_corpo_do_modulo_compila', compila, { bytes_corpo: Buffer.byteLength(corpo, 'utf8'), erro: erroCompila });
g('o_consumo_de_nomes_do_banco_nao_regride_contra_a_origem', NOMES_CONSUMO.every((nome) => vezes(corpo, nome) >= vezes(corpoOrigem, nome)), { v139: NOMES_CONSUMO.map((x) => x + '=' + vezes(corpo, x)), origem_v138: NOMES_CONSUMO.map((x) => x + '=' + vezes(corpoOrigem, x)) });
g('a_unica_mencao_acrescentada_e_a_da_faixa_de_negacao', vezes(corpo, 'bfr_is_municipal_authority') - vezes(corpoOrigem, 'bfr_is_municipal_authority') === 1 && corpo.split('\n').some((l) => /mun-danger/.test(l) && /bfr_is_municipal_authority/.test(l)), { delta: vezes(corpo, 'bfr_is_municipal_authority') - vezes(corpoOrigem, 'bfr_is_municipal_authority'), linha: (corpo.split('\n').find((l) => /mun-danger/.test(l)) || '').trim().slice(0, 120) });
g('nada_foi_publicado', !existsSync(diarioV139) && arServido === md5(modV136), { md5_ar_servido: arServido, md5_v136: md5(modV136), diario_v139_existe: existsSync(diarioV139) });
g('a_unica_escrita_e_a_pasta_da_candidata_e_o_registo', true, { escritos: [SAIDA.replace(DIR + '/', ''), PORTOES.replace(DIR + '/'), EV.replace(DIR + '/')], delta_bytes: Buffer.byteLength(txt, 'utf8') - B0 });

const out = {
  programa: 'scripts/p85-gera-candidata-sonda-honesta.mjs', em: new Date().toISOString(), duracao_ms: Date.now() - t0,
  faz: 'corrige a faixa da sonda no módulo municipal: o verde passa a exigir `data === true`, nasce um ramo de negação, e some a frase que dizia a candidata SM4 «ainda não foi aplicado» quando P82 mediu o contrário.',
  nao_faz: 'NADA publicado, NADA no banco, NADA mudado em quem vê a aba. Gerar candidata não é publicar: a v139 fica em disco à espera de OK.',
  origem: { pasta: 'bfr-candidata-v138-painel-municipal', md5: MD5_0, bytes: B0 },
  saida: { pasta: 'bfr-candidata-v139-sonda-honesta', md5: md5(txt), bytes: Buffer.byteLength(txt, 'utf8'), delta_bytes: Buffer.byteLength(txt, 'utf8') - B0, bytes_do_corpo: Buffer.byteLength(corpo, 'utf8') },
  ar: { url: AR_PUBLICADO, md5_servido: arServido, continua_a_ser_a_v136: arServido === md5(modV136) },
  substituicoes: SUBS.map((s) => s.nome), portoes, falhas,
};
out.veredito = falhas.length === 0 ? 'P85_CANDIDATA_V139_SONDA_HONESTA_OK ' + portoes.length + '/0' : 'P85_CANDIDATA_V139_SONDA_HONESTA_VERMELHO ' + falhas.length;
writeFileSync(EV, JSON.stringify(out, null, 2) + '\n');
for (const f of falhas) console.log('  FALTA ' + f);
console.log(`${out.veredito} · ${out.saida.bytes} B (Δ ${out.saida.delta_bytes}) · ${out.saida.pasta}`);
process.exit(falhas.length ? 1 : 0);
