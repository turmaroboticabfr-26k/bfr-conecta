#!/usr/bin/env node
// P144 aplicador da semente RM-5.2 — existe porque o runbook §5(1) dizia «Escrita de conteúdo, sem
// instrumento»: agora há. Escreve no banco SÓ quando (a) o --ok é exactamente a frase literal deste modo
// (aplicar: «aplique a semente RM-5.2 no banco»; reverter: «reverta a semente RM-5.2 no banco»), (b) o
// preflight fresco da própria peça deu verde contra o estado vivo neste instante (candidata antes da
// escrita, reversão depois), e (c) os ficheiros em disco são byte a byte os que o preflight certificou.
// Um «ok» solto, ou a frase do outro modo, não autoriza nada. A candidata só insere; a reversão só apaga
// linhas com WHERE school_year = 2026 — cada lado tem a sua régua de statements proibidos, e nenhuma delas
// é amaciada: é esta a diferença entre conteúdo (DML) e o DDL das peças PEN do p73.
// Uso:
//   node scripts/p144-rm52-conteudo-aplica.mjs --selfteste
//   node scripts/p144-rm52-conteudo-aplica.mjs --ok "aplique a semente RM-5.2 no banco"
//   node scripts/p144-rm52-conteudo-aplica.mjs --reverter --ok "reverta a semente RM-5.2 no banco"
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { sql } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const PREF = 'scripts/p144-rm52-conteudo-preflight.mjs';
const CAM_CAND = 'scripts/p144-rm52-conteudo-ddl-candidata.sql';
const CAM_REV = 'scripts/p144-rm52-conteudo-ddl-reversao.sql';
const REG_GERADOR = 'evidence/p144-rm52-conteudo-registo-do-gerador-23-11v2.json';
// As duas frases são portões distintos: a de aplicar e a de reverter. Nenhuma delas foi «ok» solto, e uma
// não arrasta a outra. A frase de reversão continua SEM autorização nesta campanha.
const FRASE = 'aplique a semente RM-5.2 no banco';
const FRASE_REV = 'reverta a semente RM-5.2 no banco';
const frasePara = (modo) => (modo === 'reversao' ? FRASE_REV : FRASE);
const MESAS_DE_BASELINE = ['schools', 'students', 'classes', 'profiles', 'staff_schools'];
const md5 = (s) => createHash('md5').update(s, 'utf8').digest('hex');
const argv = process.argv.slice(2);
const flag = (nome) => { const i = argv.indexOf('--' + nome); return i === -1 ? null : argv[i + 1]; };
const tem = (nome) => argv.includes('--' + nome);
const caminhoReal = (p) => (isAbsolute(p) ? p : join(REPO, p));

// O texto que vai ao banco não pode conter o que a peça nunca deveria conter. A varredura é sobre o que o
// Postgres executa: comentários saem e corpos de função são substituídos (não há funções nesta peça, mas a
// régua é a mesma família do p73). As classes DELETE/INSERT são o trabalho de um dos lados e o proibido do
// outro: candidata só insere, reversão só apaga, e o apagar tem de estar guardado por school_year = 2026 —
// uma reversão sem guarda apagaria linhas de anos futuros.
const so_codigo = (t) => t.split('\n').map((l) => (l.trim().startsWith('--') ? '' : l)).join('\n')
  .replace(/\$[a-z0-9_]*\$[\s\S]*?\$[a-z0-9_]*\$/g, ' CORPO_DE_FUNCAO ');
const RE_DEL_GUARDADO = /^\s*DELETE\s+FROM\s+public\.(bfr_school_calendar_days|bfr_school_calendar_month_targets|bfr_school_shift_settings)\s+WHERE\s+school_year\s*=\s*2026\s*;?\s*$/i;
const perigos = (t) => {
  const fora = so_codigo(t);
  const c = (re) => (fora.match(re) || []).length;
  const deletes = fora.match(/^\s*DELETE\s+FROM[\s\S]*?(?:;|$)/gim) || [];
  return { drop_table: c(/^\s*DROP\s+TABLE/gim), truncate: c(/^\s*TRUNCATE/gim),
    update_fora_de_funcao: c(/^\s*UPDATE\s+/gim), insert_into: c(/^\s*INSERT\s+INTO/gim),
    delete_from: c(/^\s*DELETE\s+FROM/gim),
    delete_sem_guarda_de_ano: deletes.filter((l) => !RE_DEL_GUARDADO.test(l.trim())).length,
    drop_schema_ou_database: c(/^\s*DROP\s+(DATABASE|SCHEMA)/gim),
    credencial: c(/eyJ[\w-]{10,}|postgres:[^'"\s]{6,}|service_role/gi) };
};
// Cada lado tem a sua lista de zero obrigatório. A classe do trabalho do outro lado não entra em nenhuma
// lista: INSERT fica visível no registo da reversão como violação (insert_into) e DELETE na candidata
// (delete_from), sem precisar de régua extra.
const ZERO_CANDIDATA = ['drop_table', 'truncate', 'update_fora_de_funcao', 'delete_from', 'delete_sem_guarda_de_ano', 'drop_schema_ou_database', 'credencial'];
const ZERO_REVERSAO = ['drop_table', 'truncate', 'update_fora_de_funcao', 'insert_into', 'delete_sem_guarda_de_ano', 'drop_schema_ou_database', 'credencial'];
const zeroDoLado = (lado) => (lado === 'reversao' ? ZERO_REVERSAO : ZERO_CANDIDATA);
const bloqueadoresDe = (pj, zero) => Object.entries(pj).filter(([k, v]) => zero.includes(k) && v > 0).map(([k, v]) => k + '=' + v);

// O preflight afirma o estado vivo por modo. O verde vale por duas vias: a linha de veredicto impressa e os
// campos do registo JSON que a sustentam (declarações derivadas e censo vivo). Um verde velho deste dia não
// serve — é por isso que o aplicador corre o preflight ele próprio, antes e depois da escrita.
const esperaDoModo = (modo) => (modo === 'candidata'
  ? { dias: 365, metas: 12, turno: 1, censo: { dias: 0, metas: 0, turnos: 0 } }
  : { dias: 365, metas: 12, turno: 1, censo: { dias: 365, metas: 12, turnos: 1 } });
const preflightVerde = (j, modo) => {
  const e = esperaDoModo(modo);
  const v = String(j && j.veredito || '');
  const re = new RegExp('^P144_RM52_PREFLIGHT_VERDE_' + modo.toUpperCase() + ' \\d+/0\\b');
  return re.test(v) && !!j && !!j.declaracoes && j.declaracoes.dias === e.dias
    && Array.isArray(j.declaracoes.metas) && j.declaracoes.metas.length === e.metas
    && !!j.declaracoes.turno && !!j.catalogo_vivo && !!j.catalogo_vivo.censo
    && j.catalogo_vivo.censo.dias === e.censo.dias && j.catalogo_vivo.censo.metas === e.censo.metas
    && j.catalogo_vivo.censo.turnos === e.censo.turnos;
};
const conferePegada = (par, texto) => !!par && String(par.md5) === md5(texto) && Number(par.bytes) === Buffer.byteLength(texto, 'utf8');
const fichaPegada = (par, caminhoRel, texto) => ({ certificado: par, medido_agora: { caminho: caminhoRel, bytes: Buffer.byteLength(texto, 'utf8'), md5: md5(texto) } });

const MODO = tem('reverter') ? 'reversao' : 'aplicacao';
const recusa = (motivos, extra) => {
  const corpo = { programa: 'scripts/p144-rm52-conteudo-aplica.mjs', modo: MODO, em: new Date().toISOString(),
    escrito_no_banco: false, aplicado: false, motivos_de_recusa: motivos, ...(extra || {}) };
  if (tem('regista-recusa')) {
    const p = join(REPO, `evidence/p144-rm52-conteudo-${MODO}-recusa-${String(Date.now())}.json`);
    writeFileSync(p, JSON.stringify(corpo, null, 2) + '\n');
    corpo.registo = p;
  }
  console.log(`RECUSADO · ${MODO} · ` + JSON.stringify(motivos));
  if (corpo.registo) console.log('registo ' + corpo.registo);
  process.exit(2);
};

const correPreflight = (modo, sufixo) => {
  // O modo é argumento de linha de comando do preflight (`--reversao`), não variável de ambiente: correr
  // o modo candidata duas vezes faria a conferência de saída ser a conferência de entrada. O sufixo sim é
  // ambiente (P144PF_SUF), porque serve só para o registo não ser escrito por cima; o registo do gerador
  // vai também por ambiente (P144PF_REG), e é exactamente o mesmo em ambos os modos.
  const args = [join(REPO, PREF), ...(modo === 'reversao' ? ['--reversao'] : [])];
  const r = spawnSync(process.execPath, args, {
    cwd: REPO, encoding: 'utf8', timeout: 300000,
    env: { ...process.env, P144PF_SUF: sufixo + (modo === 'reversao' ? 'r' : 'c'), P144PF_REG: REG_GERADOR },
  });
  const saida = String(r.stdout || '') + String(r.stderr || '');
  const registo = (/guardado em (\S+\.json)\s*$/m.exec(saida.trim()) || [])[1] || null;
  return { codigo: r.status, tempo_esgotado: r.error && /ETIMEDOUT|timed out/i.test(String(r.error.code || r.error.message)), saida_ultima_linha: saida.trim().split('\n').filter(Boolean).pop() || '', registo, comando: args.join(' ') };
};

// ── selfteste (offline: lê ficheiros, não toca no banco nem na rede) ──────────────────────────────
if (tem('selfteste')) {
  const casos = [];
  const c = (nome, verde, detalhe) => { casos.push({ nome, verde, detalhe }); };
  c('frases_sao_disjuntas_e_nenhuma_e_solta', FRASE !== FRASE_REV && FRASE !== 'ok' && FRASE_REV !== 'ok');
  c('o_modo_escolhe_a_frase_e_nao_a_conveniencia', frasePara('aplicacao') === FRASE && frasePara('reversao') === FRASE_REV && frasePara('aplicacao') !== FRASE_REV);
  c('perigos_candidata_so_aceita_inserts', bloqueadoresDe(perigos('INSERT INTO public.bfr_school_calendar_days (school_year) VALUES (2026);'), ZERO_CANDIDATA).length === 0
    && bloqueadoresDe(perigos('DELETE FROM public.bfr_school_calendar_days WHERE school_year = 2026;'), ZERO_CANDIDATA).some((b) => b.startsWith('delete_from')));
  c('perigos_reversao_so_aceita_deletes_guardados', bloqueadoresDe(perigos('DELETE FROM public.bfr_school_shift_settings WHERE school_year = 2026;'), ZERO_REVERSAO).length === 0
    && bloqueadoresDe(perigos('INSERT INTO public.t VALUES (1);'), ZERO_REVERSAO).some((b) => b.startsWith('insert_into'))
    && bloqueadoresDe(perigos('DELETE FROM public.bfr_school_calendar_days;'), ZERO_REVERSAO).some((b) => b.startsWith('delete_sem_guarda_de_ano')));
  c('guarda_de_ano_e_exacta_por_mesa_e_ano', RE_DEL_GUARDADO.test('DELETE FROM public.bfr_school_shift_settings WHERE school_year = 2026;')
    && !RE_DEL_GUARDADO.test('DELETE FROM public.bfr_school_calendar_days WHERE school_year = 2027;')
    && !RE_DEL_GUARDADO.test('DELETE FROM public.bfr_school_calendar_days;')
    && !RE_DEL_GUARDADO.test('DELETE FROM public.bfr_escola_errada WHERE school_year = 2026;'));
  c('prosa_de_comentario_nao_conta', perigos('-- vamos DELETE FROM public.t e citar service_role\nINSERT INTO public.t VALUES (1);').delete_from === 0
    && perigos('-- vamos DELETE FROM public.t e citar service_role\nINSERT INTO public.t VALUES (1);').credencial === 0);
  c('palavra_credencial_fora_de_comentario_conta', perigos("select 'service_role'").credencial === 1);
  c('os_dois_ficheiros_da_peca_estao_em_disco', [PREF, CAM_CAND, CAM_REV, REG_GERADOR].every((f) => existsSync(join(REPO, f))));
  const txtCand = existsSync(join(REPO, CAM_CAND)) ? readFileSync(join(REPO, CAM_CAND), 'utf8') : '';
  const txtRev = existsSync(join(REPO, CAM_REV)) ? readFileSync(join(REPO, CAM_REV), 'utf8') : '';
  c('cada_lado_e_uma_unica_transaccao_sem_statement_proibido', /^BEGIN;/m.test(txtCand) && /^COMMIT;/m.test(txtCand) && /^BEGIN;/m.test(txtRev) && /^COMMIT;/m.test(txtRev)
    && bloqueadoresDe(perigos(txtCand), ZERO_CANDIDATA).length === 0 && bloqueadoresDe(perigos(txtRev), ZERO_REVERSAO).length === 0);
  const pCand = perigos(txtCand), pRev = perigos(txtRev);
  c('a_candidata_semeia_378_linhas_e_a_reversao_apaga_3_guardadas', pCand.insert_into === 378 && pCand.delete_from === 0
    && pRev.delete_from === 3 && pRev.delete_sem_guarda_de_ano === 0 && pRev.insert_into === 0);
  c('pegada_confere_por_bytes_e_md5', conferePegada({ bytes: Buffer.byteLength(txtCand, 'utf8'), md5: md5(txtCand) }, txtCand)
    && !conferePegada({ bytes: Buffer.byteLength(txtCand, 'utf8'), md5: '0'.repeat(32) }, txtCand)
    && !conferePegada({ bytes: Buffer.byteLength(txtCand, 'utf8') + 1, md5: md5(txtCand) }, txtCand));
  const mundoVerdeCand = { veredito: 'P144_RM52_PREFLIGHT_VERDE_CANDIDATA 26/0 · dias 365 · metas 12 · turnos 1 · censo 0/0/0 · conflitos 0 · 1 ms', declaracoes: { dias: 365, metas: Array.from({ length: 12 }, (_, i) => i), turno: { id: 'x' } }, catalogo_vivo: { censo: { dias: 0, metas: 0, turnos: 0 } } };
  c('o_verde_do_preflight_vale_por_veredicto_e_por_campos', preflightVerde(mundoVerdeCand, 'candidata')
    && !preflightVerde({ ...mundoVerdeCand, veredito: 'P144_RM52_PREFLIGHT_VERDE_CANDIDATA 25/1 · dias 365' }, 'candidata')
    && !preflightVerde({ ...mundoVerdeCand, catalogo_vivo: { censo: { dias: 1, metas: 0, turnos: 0 } } }, 'candidata')
    && !preflightVerde(mundoVerdeCand, 'reversao'));
  const medidos = [{ lado: 'candidata', caminho: CAM_CAND, bytes: Buffer.byteLength(txtCand, 'utf8'), md5: md5(txtCand), varredura: pCand },
    { lado: 'reversao', caminho: CAM_REV, bytes: Buffer.byteLength(txtRev, 'utf8'), md5: md5(txtRev), varredura: pRev }];
  const boas = casos.filter((x) => x.verde).length;
  const out = { programa: 'scripts/p144-rm52-conteudo-aplica.mjs', selfteste: true, em: new Date().toISOString(), aplicado: false, escrito_no_banco: false, casos, sql_medidos: medidos, veredito: boas === casos.length ? `P144_RM52_APLICA_SELFTESTE_OK ${casos.length}/0` : `P144_RM52_APLICA_SELFTESTE_VERMELHO ${casos.length - boas}` };
  console.log(JSON.stringify(out, null, 1));
  process.exit(boas === casos.length ? 0 : 1);
}

// ── portões antes de abrir a escrita ───────────────────────────────────────────────────────────────
const FRASE_DO_MODO = frasePara(MODO);
const FRASE_OUTRO = frasePara(MODO === 'reversao' ? 'aplicacao' : 'reversao');
const ok = flag('ok');
if (ok === null) recusa([`falta --ok com a frase literal deste modo («${FRASE_DO_MODO}»); sem frase, nada é escrito`]);
if (ok !== FRASE_DO_MODO) recusa([
  `--ok nao e a frase certificada deste modo; esperado exatamente «${FRASE_DO_MODO}»`,
  ...(ok === FRASE_OUTRO ? [`a frase «${ok}» pertence ao modo ${MODO === 'reversao' ? 'aplicacao' : 'reversao'} desta peca: aplicar e reverter sao OKs distintos, um nao arrasta o outro`] : []),
], { aviso: MODO === 'reversao' ? 'um «ok» solto, ou o OK de aplicação, nao autoriza apagar a semente' : 'um «ok» solto nao autoriza escrita no banco' });

const faltam = [PREF, CAM_CAND, CAM_REV, REG_GERADOR].filter((f) => !existsSync(join(REPO, f)));
if (faltam.length) recusa(['ficheiro da peca nao existe em disco: ' + faltam.join(', ')]);
const txtCand = readFileSync(join(REPO, CAM_CAND), 'utf8');
const txtRev = readFileSync(join(REPO, CAM_REV), 'utf8');
const NOME_ALVO = MODO === 'reversao' ? 'reversao' : 'candidata';
const NOME_CONTRA = MODO === 'reversao' ? 'candidata' : 'reversao';
const txtAlvo = MODO === 'reversao' ? txtRev : txtCand;
const txtContra = MODO === 'reversao' ? txtCand : txtRev;
const perigoAlvo = perigos(txtAlvo), perigoContra = perigos(txtContra);
const bloqueadoresAlvo = bloqueadoresDe(perigoAlvo, zeroDoLado(NOME_ALVO));
const bloqueadoresContra = bloqueadoresDe(perigoContra, zeroDoLado(NOME_CONTRA));
if (bloqueadoresAlvo.length) recusa([`o SQL que este modo enviaria tem statement que a régua deste lado recusa: ${bloqueadoresAlvo.join(', ')}`, perigoAlvo]);
if (bloqueadoresContra.length) recusa([`o SQL do caminho de volta (${NOME_CONTRA}) viola a régua do seu lado: sem ele a saída desta execucao nao esta garantida`, perigoContra]);
if (!/^BEGIN;/m.test(txtAlvo) || !/^COMMIT;/m.test(txtAlvo)) recusa(['o SQL deste modo nao e uma unica transacco (BEGIN/COMMIT)']);
if (!/^BEGIN;/m.test(txtContra) || !/^COMMIT;/m.test(txtContra)) recusa([`o SQL do caminho de volta (${NOME_CONTRA}) nao e uma unica transacco`]);

const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
const OUT = join(REPO, `evidence/p144-rm52-conteudo-${MODO === 'reversao' ? 'reversao' : 'aplicacao'}-${stamp}.json`);
if (existsSync(OUT)) recusa(['o artefacto desta execucao ja existe: ' + OUT]);

// Dois preflights, sempre, e o que cada um afirma inverte-se com o modo. Antes de escrever: o modo que
// descreve o estado que se vai destruir (na aplicação, a candidata ainda por aplicar; na reversão, a
// semente já aplicada). Depois de escrever: o modo que descreve o estado de saída.
const MODO_ANTES = MODO === 'reversao' ? 'reversao' : 'candidata';
const MODO_DEPOIS = MODO === 'reversao' ? 'candidata' : 'reversao';
const SUF = (MODO === 'reversao' ? 'rev' : 'apl') + stamp;
const pre = correPreflight(MODO_ANTES, SUF);
if (pre.tempo_esgotado) recusa([`preflight (${MODO_ANTES}) esgotou o tempo de 300 s — estado desconhecido, nada foi escrito`]);
if (!pre.registo || !existsSync(caminhoReal(pre.registo))) recusa([`preflight (${MODO_ANTES}) nao devolveu caminho de registo legivel: ` + pre.saida_ultima_linha]);
const preJson = JSON.parse(readFileSync(caminhoReal(pre.registo), 'utf8'));
if (pre.codigo !== 0 || !preflightVerde(preJson, MODO_ANTES)) recusa([
  `preflight em modo ${MODO_ANTES} nao deu verde: ${preJson.veredito}`, `registo ${pre.registo}`,
  ...(MODO === 'reversao' ? ['o modo reversao so pode correr sobre a semente aplicada: e o preflight em modo reversao que afirma isso contra o estado vivo, e ele nao afirmou'] : []),
]);
const fichaAlvo = preJson.identidade_do_medido && preJson.identidade_do_medido.ficheiros ? preJson.identidade_do_medido.ficheiros[NOME_ALVO] : null;
const fichaContra = preJson.identidade_do_medido && preJson.identidade_do_medido.ficheiros ? preJson.identidade_do_medido.ficheiros[NOME_CONTRA] : null;
if (!conferePegada(fichaAlvo, txtAlvo)) recusa([`o md5/bytes do SQL (${NOME_ALVO}) que este modo enviaria nao bate com o certificado pelo preflight`, fichaPegada(fichaAlvo, MODO === 'reversao' ? CAM_REV : CAM_CAND, txtAlvo)]);
if (!conferePegada(fichaContra, txtContra)) recusa([`o SQL (${NOME_CONTRA}) em disco nao e o que o preflight certificou: sem ele o caminho de volta desta execucao nao esta garantido`, fichaPegada(fichaContra, MODO === 'reversao' ? CAM_CAND : CAM_REV, txtContra)]);

const conta = async () => { const r = await sql(`select ${MESAS_DE_BASELINE.map((m) => `(select count(*)::int from public.${m}) as ${m}`).join(', ')}`); return r[0]; };
const antes = await conta();

const em = new Date().toISOString();
let erroDeEscrita = null;
try { await sql(txtAlvo); } catch (e) { erroDeEscrita = String(e.message || e).slice(0, 600); }
const depois = await conta();
const pos = erroDeEscrita ? { codigo: 'ABORTADO', nota: 'o Postgres aborta a transaccao inteira; nada ficou aplicado nem desfeito' } : correPreflight(MODO_DEPOIS, SUF);
let posJson = null;
if (!erroDeEscrita && pos.registo && existsSync(caminhoReal(pos.registo))) posJson = JSON.parse(readFileSync(caminhoReal(pos.registo), 'utf8'));
const fichaPreflight = (modo) => {
  const [r, j] = modo === MODO_ANTES ? [pre, preJson] : [pos, posJson];
  return { modo, registo: r.registo || null, veredito: j ? j.veredito : null, codigo: r.codigo === undefined ? null : r.codigo };
};
const ANTES_F = fichaPreflight(MODO_ANTES), DEPOIS_F = fichaPreflight(MODO_DEPOIS);

const conferenciasVerdes = !erroDeEscrita && JSON.stringify(antes) === JSON.stringify(depois) && preflightVerde(posJson, MODO_DEPOIS);
const PALAVRA = MODO === 'reversao' ? 'REVERTIDA' : 'APLICADA';
const out = {
  programa: 'scripts/p144-rm52-conteudo-aplica.mjs', peca: 'RM-5.2 (semente do calendario letivo 2026)', modo: MODO, em, duracao_ms: Date.now() - new Date(em).getTime(),
  aplicado: erroDeEscrita === null, escrito_no_banco: erroDeEscrita === null,
  ok_literal_usado: ok, frase_certificada: FRASE_DO_MODO, frase_do_outro_modo_nao_autoriza: FRASE_OUTRO,
  sql_enviado: { nome: NOME_ALVO, caminho: MODO === 'reversao' ? CAM_REV : CAM_CAND, bytes: Buffer.byteLength(txtAlvo, 'utf8'), md5: md5(txtAlvo) },
  candidata: { caminho: CAM_CAND, bytes: Buffer.byteLength(txtCand, 'utf8'), md5: md5(txtCand) },
  reversao: { caminho: CAM_REV, bytes: Buffer.byteLength(txtRev, 'utf8'), md5: md5(txtRev) },
  preflight_candidata: MODO_ANTES === 'candidata' ? ANTES_F : DEPOIS_F,
  preflight_reversao: MODO_ANTES === 'reversao' ? ANTES_F : DEPOIS_F,
  sequencia: [
    { ordem: 1, papel: MODO === 'reversao' ? 'precondicao: a semente tem de estar aplicada' : 'precondicao: as tres mesas tem de estar vazias', ...ANTES_F },
    { ordem: 2, papel: MODO === 'reversao' ? 'conferencia de saida: o estado limpo de antes da semente esta de volta' : 'conferencia de saida: o conteudo semeado e o conteudo certificado', ...DEPOIS_F },
  ],
  varredura_do_sql: { alvo: perigoAlvo, contra: perigoContra },
  baselines: { antes, depois, inalteradas: JSON.stringify(antes) === JSON.stringify(depois) },
  erro_de_escrita: erroDeEscrita,
  o_que_este_registo_nao_cobre: 'a publicacao de qualquer versao do ar, o A1 (bfr_confirm_school_calendar), o REVOKE dos 15+4, a etiquetagem escola-municipio, o mint/rotacao de contas e o git push: cada um pede a sua frase literal propria.',
};
out.veredito = erroDeEscrita ? `P144_RM52_SEMENTE_${MODO === 'reversao' ? 'REVERSAO' : 'APLICACAO'}_ABORTADA`
  : (conferenciasVerdes ? `P144_RM52_SEMENTE_${PALAVRA}_E_CONFERIDA` : `P144_RM52_SEMENTE_${PALAVRA}_COM_CONFERENCIA_VERMELHA`);
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`PECA RM-5.2 · modo ${MODO} · escrito ${out.escrito_no_banco} · SQL ${out.sql_enviado.nome} ${out.sql_enviado.md5} · preflight antes ${out.sequencia[0].veredito}`);
console.log(`BASELINES ${JSON.stringify({ antes, depois })}`);
console.log(`PREFLIGHT_DEPOIS(${MODO_DEPOIS}) ${JSON.stringify(out.sequencia[1])}`);
console.log(`${out.veredito} · registo ${OUT}`);
process.exit(erroDeEscrita === null && conferenciasVerdes ? 0 : 1);
