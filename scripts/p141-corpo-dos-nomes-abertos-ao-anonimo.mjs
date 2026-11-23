#!/usr/bin/env node
// P141 — o que o corpo faz depois de o ACL ter deixado entrar. SO LEITURA: SELECTs de catalogo e, no maximo, uma
// chamada anonima a uma funcao que tres provas independentes declaram de leitura, com um identificador fabricado
// por `gen_random_uuid()` — aleatorio, portanto nao escolhido do conteudo do banco. Zero DDL, zero DML, zero GRANT.
//
// O p139 mediu os graus vivos e deixou dois nomes com EXECUTE a anon: `bfr_get_student_photo_path` (fora do alvo de
// qualquer peca de graus) e `bfr_school_set_municipality` (criado pela PEN-38, volatil, escreve). Um ACL aberto nao
// diz o que uma pessoa sem sessao recebe — isso decide-se no corpo e, no limite, na resposta do ar.
//
// Proveniencia: `corpoDef` e as colunas de graus leem-se do preflight da PEN-48, `escreveNoCorpo`, `UUID_RE` e
// `contem_identificador` leem-se da sonda de exposicao anonima, todos compilados em contexto isolado; se nao ler
// alguma, aborta antes de tocar no banco. Nenhuma chave escrita no registo.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { HOST, sql } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = process.env.P141_SUF ? '-' + process.env.P141_SUF : '-22-11-a';
const OUT = join(REPO, 'evidence/p141-corpo-dos-nomes-abertos-ao-anonimo' + SUF + '.json');
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com P141_SUF=novo, nao por cima');
const t0 = Date.now();
const md5 = (b) => createHash('md5').update(b).digest('hex');
const normal = (t) => String(t).replace(/\s+/g, ' ').trim();

// ---- 1) predicas copiadas por texto e compiladas, nao re-dactilografadas ---------------------------------
const lePredica = (txt, ficheiro, nome, prefixoExtra = '') => {
  const formas = ['^const ' + nome + ' = (.*);\\s*$', '^const ' + nome + ' = (\\([\\s\\S]*?\\n\\};)\\s*$', '^const ' + nome + ' = (\\([\\s\\S]*?\\n\\);)\\s*$'];
  let fonte = null;
  for (const re of formas) { const m = new RegExp(re, 'm').exec(txt); if (m) { fonte = m[1].replace(/;\s*$/, ''); break; } }
  if (fonte === null) throw new Error('ABORTA: nao li `' + nome + '` em ' + ficheiro + ' — a classificacao nao pode ser suposicao');
  const codigo = prefixoExtra + '(' + fonte + ')';
  try { return { fn: vm.runInNewContext(codigo), fonte: normal(fonte), multiline: fonte.includes('\n') }; }
  catch (e) { throw new Error('ABORTA: `' + nome + '` de ' + ficheiro + ' nao compila: ' + String(e.message).slice(0, 90)); }
};
const F_PREFLIGHT = 'scripts/p73-pen48-preflight.mjs';
const txtPreflight = readFileSync(join(REPO, F_PREFLIGHT), 'utf8');
const F_SONDA = 'scripts/p73-sonda-exposicao-anonima.mjs';
const txtSonda = readFileSync(join(REPO, F_SONDA), 'utf8');
const pCorpoDef = lePredica(txtPreflight, F_PREFLIGHT, 'corpoDef');
const pEscreve = lePredica(txtSonda, F_SONDA, 'escreveNoCorpo');
const pLeitura = lePredica(txtPreflight, F_PREFLIGHT, 'eLeitura');
const pUuid = lePredica(txtSonda, F_SONDA, 'UUID_RE');
const pIdentificador = lePredica(txtSonda, F_SONDA, 'contem_identificador', 'const UUID_RE = ' + pUuid.fonte + ';\n');
const corpoDef = pCorpoDef.fn, escreveNoCorpo = pEscreve.fn, eLeitura = pLeitura.fn, contem_identificador = pIdentificador.fn;
const RE_COLS = /const alvo = \(await q\(`select (p\.oid[\s\S]*?) from pg_proc/;
const COLS_GRAUS = (RE_COLS.exec(txtPreflight) || [])[1];
if (!COLS_GRAUS) throw new Error('ABORTA: nao li a lista de colunas de graus em ' + F_PREFLIGHT);
// As tres predicas de texto de ACL vem do preflight por leitura, nao re-dactilografadas: a de papeis e cega a
// PUBLIC por construcao (o token antes do `=` e vazio e o `.filter((x) => x)` descarta-o), por isso a de PUBLIC
// ler-se-ja ao lado e nunca em `papeis_no_acl`.
const pEntradaAnon = lePredica(txtPreflight, F_PREFLIGHT, 'temEntradaAnon');
const pPapeisDe = lePredica(txtPreflight, F_PREFLIGHT, 'papeisDe');
const pPublico = lePredica(txtPreflight, F_PREFLIGHT, 'temPublicX');
const temEntradaAnon = pEntradaAnon.fn, papeisDe = pPapeisDe.fn, temPublicX = pPublico.fn;
const FIX_ACL_PUBLICO = 'postgres=X/postgres,=X/postgres,anon=X/postgres';
const fix_acl = [temEntradaAnon(FIX_ACL_PUBLICO), temPublicX(FIX_ACL_PUBLICO), papeisDe(FIX_ACL_PUBLICO).join(','), temPublicX('postgres=X/postgres,anon=X/postgres'), papeisDe('<null_por_default>').length];
if (JSON.stringify(fix_acl) !== JSON.stringify([true, true, 'anon,postgres', false, 0])) throw new Error('ABORTA: as predicas de ACL lidas do preflight nao disparam nos dois lados — ' + JSON.stringify(fix_acl));
const q = async (txt) => { if (!eLeitura(txt)) throw new Error('ABORTA: esta peca e so-leitura e alguem lhe passou ' + String(txt).slice(0, 40)); return sql(txt); };

// Os tres predicados tem de dar o que o produtor declara, nos dois sentidos: escrita sim/nao, leitura nao, e o
// recorte de corpo com e sem marcador. Sem este fixture, «o corpo nao escreve» seria uma opiniao minha.
const FIX_ESCRITA = 'BEGIN; INSERT INTO public.tabela (a) VALUES (1); RETURN 1; END;';
const FIX_LEITURA = 'BEGIN; SELECT count(*) FROM public.tabela INTO v; RETURN v; END;';
const fix_escrita = [escreveNoCorpo(FIX_ESCRITA), escreveNoCorpo(FIX_LEITURA), eLeitura('REVOKE EXECUTE ON FUNCTION public.x() FROM anon'), eLeitura('select 1')];
const fix_corpo_def = [corpoDef('CREATE OR REPLACE FUNCTION public.x() RETURNS void LANGUAGE plpgsql AS $fn$ select 1 $fn$;').trim(), corpoDef('sem marcador de corpo')];
if (JSON.stringify(fix_escrita) !== JSON.stringify([true, false, false, true])) throw new Error('ABORTA: os predicados copiados nao disparam como o produtor declara — ' + JSON.stringify(fix_escrita));
if (JSON.stringify(fix_corpo_def) !== JSON.stringify(['select 1', ''])) throw new Error('ABORTA: `corpoDef` nao recorta como o produtor declara — ' + JSON.stringify(fix_corpo_def));

// ---- 2) os nomes abertos ao anonimo, lidos do artefacto do p139 -----------------------------------------
const F_P139 = 'evidence/p139-acls-dos-nomes-do-ar-contra-o-alvo-sm37g.json';
const p139 = JSON.parse(readFileSync(join(REPO, F_P139), 'utf8'));
const NOMES_DO_ARTEFACTO = p139.por_nome.filter((r) => r.anon_pode === true).map((r) => r.nome).sort();
if (!NOMES_DO_ARTEFACTO.length) throw new Error('ABORTA: o p139 nao lista nenhum nome com anon_pode=true — nao ha o que medir');
const NOMES = [...NOMES_DO_ARTEFACTO];

// Cruzamento com as duas pecas de superficie: o p140 mede os nomes que o ar chama nas duas formas em que a casa os
// escreve; o p139 tem o campo `chamado_pelo_ar` construido so pela forma literal. Ninguem dos dois numero e
// re-dactilografado aqui — leem-se dos artefactos e as duas listas confrontam-se.
const F_P140 = 'evidence/p140-superficie-rpc-das-duas-formas-sm37g.json';
const p140 = JSON.parse(readFileSync(join(REPO, F_P140), 'utf8'));
const CHAMADOS_P140 = p140.nomes && p140.nomes.chamados_uniao;
if (!Array.isArray(CHAMADOS_P140) || !CHAMADOS_P140.length) throw new Error('ABORTA: nao li `nomes.chamados_uniao` no artefacto do p140 — a superficie nao pode ser suposicao');
const REVELADOS_P140 = p140.revelados_fora_do_censo_anterior;
if (!Array.isArray(REVELADOS_P140)) throw new Error('ABORTA: nao li `revelados_fora_do_censo_anterior` no artefacto do p140');
const CHAMADOS_P139 = p139.universos.nomes_do_ar;
const ref139 = Object.fromEntries(p139.por_nome.map((r) => [r.nome, r]));
// A preposicao vem da linha do texto, nao da minha memoria: uma linha REVOKE diz FROM, uma GRANT diz TO,
// e o grau (EXECUTE ou ALL) tambem se le do artefacto — a linha que fecha o PUBLIC neste nome e de grau ALL.
const linhasDeGrafos = Object.fromEntries(NOMES.map((n) => [n, (p139.universos.alvo_linhas || []).filter((l) => l.nome === n).map((l) => l.ficheiro + ' ' + l.verbo + ' ' + l.grau + ' ' + l.nome + ' ' + l.preposicao + ' ' + l.papel)]));

// ---- 3) catalogo vivo: graus, assinatura e corpo ----------------------------------------------------------
const lista = NOMES.map((n) => "'" + n.replace(/'/g, "''") + "'").join(',');
const linhas = await q(`select p.proname as nome, ${COLS_GRAUS}, pg_get_function_arguments(p.oid) as args,
    pg_get_function_result(p.oid) as resultado, pg_get_functiondef(p.oid) as def
  from pg_proc p join pg_namespace nn on nn.oid=p.pronamespace and nn.nspname='public'
  where p.proname in (${lista}) order by 1, 2`);
const medidos = linhas.map((r) => {
  const corpo = corpoDef(r.def);
  return {
    nome: r.nome, oid: r.oid, assinatura: r.ident || r.args, resultado: r.resultado, definer: r.definer, vol: r.vol,
    anon_pode: r.anon_pode, authenticated_pode: r.authenticated_pode, entrada_anon_no_acl: temEntradaAnon(r.acl),
    corpo_bytes: corpo.length, def_bytes: (r.def || '').length, escreve_no_corpo: escreveNoCorpo(corpo),
    papeis_no_acl: papeisDe(r.acl), publico_na_acl: temPublicX(r.acl),
    no_alvo_de_peca_de_graus: ref139[r.nome] ? ref139[r.nome].no_alvo_de_peca_de_graus : null,
    municipal_de_ddl: ref139[r.nome] ? ref139[r.nome].municipal_de_ddl : null,
    chamado_pelo_ar_no_p139: ref139[r.nome] ? ref139[r.nome].chamado_pelo_ar : null,
    chamado_pelo_ar_no_p140: CHAMADOS_P140.includes(r.nome),
    p139_def_bytes_como_registado: ref139[r.nome] ? ref139[r.nome].def_bytes : null,
    linhas_de_graus_no_texto: linhasDeGrafos[r.nome] || [],
  };
});
const corpoPorNome = Object.fromEntries(linhas.map((r) => [r.nome, corpoDef(r.def)]));

// O cheque de sessao e uma familia de formas, nao uma agulha: conto por padrao e imprimo tudo, inclusive os zeros.
const PADROES_DE_SESSAO = [
  ['auth_uid', /\bauth\s*\.\s*uid\s*\(\s*\)/gi],
  ['auth_jwt', /\bauth\s*\.\s*jwt\s*\(/gi],
  ['current_setting_jwt', /current_setting\s*\(\s*'request\.jwt/gi],
  ['predicado_de_sessao_publico', /\bpublic\s*\.\s*(bfr_rls_session_role|is_gatekeeper|bfr_is_platform_admin|bfr_is_municipal_authority)\s*\(/gi],
  ['current_role', /\bcurrent_role\s*\(/gi],
  ['session_user', /\bsession_user\b/gi],
];
const PADROES_DE_RECUSA = [['raise_exception', /\braise\s+exception\b/gi], ['return_null', /\breturn\s+null\b/gi], ['return_false', /\breturn\s+(?:false|0\s*::\s*boolean)\b/gi], ['role_does_not_exist', /\brole\s+does\s+not\s+exist\b/gi]];
const conta = (re, t) => (String(t).match(re) || []).length;
const corpos = NOMES.map((n) => {
  const corpo = corpoPorNome[n] || '';
  const cheque = Object.fromEntries(PADROES_DE_SESSAO.map(([k, re]) => [k, conta(re, corpo)]));
  const recusa = Object.fromEntries(PADROES_DE_RECUSA.map(([k, re]) => [k, conta(re, corpo)]));
  let primeiro = null;
  for (const [k, re] of PADROES_DE_SESSAO) { const m = re.exec(corpo); if (m) { primeiro = { padrao: k, em: m.index, trecho: normal(corpo.slice(Math.max(0, m.index - 90), m.index + 140)) }; break; } }
  return { nome: n, corpo_bytes: corpo.length, cheque_de_sessao: cheque, total_cheques: Object.values(cheque).reduce((a, x) => a + x, 0), recusa, total_recusas: Object.values(recusa).reduce((a, x) => a + x, 0), primeiro_cheque: primeiro };
});
const totalCheques = (texto) => PADROES_DE_SESSAO.reduce((a, [, re]) => a + conta(re, texto), 0);
const fix_cheques = [totalCheques('begin if auth.uid() is null then raise exception x; end if; select 1; end;'), totalCheques(FIX_LEITURA)];

// ---- 4) a regua de chamada, a forma da resposta e a unica chamada anonima que ela permite -------------------
// `contem_identificador` percorre chaves dum objeto ou duma lista. Um corpo que chegue como escalar — `null` sao
// quatro bytes — nao tem chaves: isso e uma terceira classe, nem «limpo» nem «suspeito». O vermelho do sm37a foi
// exatamente exigir `false` onde a medida legitima e «nao aplicavel»; a saida nao e amaciar o portao, e dar-lhe a
// classe, com o fixture nos cinco lados para a régua poder dar vermelho doutro lado que nao o do corpo escalar.
const CLASSIFICADOR_DE_FORMA = (texto) => {
  const t = String(texto);
  let corpo;
  try { corpo = JSON.parse(t); } catch { corpo = undefined; }
  const tipo = corpo === undefined ? 'nao_json' : (corpo === null ? 'nulo' : (Array.isArray(corpo) ? 'array' : (typeof corpo === 'object' ? 'objeto' : typeof corpo)));
  const dado = tipo === 'array' || tipo === 'objeto';
  const code = dado && tipo === 'objeto' && corpo.code ? String(corpo.code) : null;
  const ident = dado ? contem_identificador(corpo) : { uuid: null, coluna_id: null };
  return { forma: tipo === 'objeto' && code ? 'objeto_erro' : tipo, tipo, dado, uuid: ident.uuid, coluna_id: ident.coluna_id, code,
    bytes: t.length, texto_md5: md5(Buffer.from(t)), linhas: Array.isArray(corpo) ? corpo.length : null };
};
const fix_forma = [
  CLASSIFICADOR_DE_FORMA('[{"school_id":"3f2a1b04-7c11-4a52-9f3a-1c0d2e6b8a91","alunos":3}]'),
  CLASSIFICADOR_DE_FORMA('[{"escolas_sem_municipio_na_rede":6,"concessoes_ativas_na_rede":4}]'),
  CLASSIFICADOR_DE_FORMA('null'),
  CLASSIFICADOR_DE_FORMA(''),
  CLASSIFICADOR_DE_FORMA('{"code":"42501","message":"permissao negada"}'),
];
const podeChamar = (m) => 'si'.includes(m.vol) && m.escreve_no_corpo === false && /uuid/i.test(String(m.assinatura));
const fix_pode_chamar = [podeChamar({ vol: 's', escreve_no_corpo: false, assinatura: 'p_id uuid' }), podeChamar({ vol: 'v', escreve_no_corpo: true, assinatura: 'p_id uuid' }), podeChamar({ vol: 'i', escreve_no_corpo: false, assinatura: 'p_id text' })];
const chamaveis = medidos.filter(podeChamar);
const nao_chamados = medidos.filter((m) => !chamaveis.includes(m)).map((m) => `${m.nome}(vol=${m.vol},escreve_no_corpo=${m.escreve_no_corpo},args=${m.assinatura})`);
const chaveAnon = (() => { const m = /SUPABASE_PUBLISHABLE_KEY\s*=\s*'([^']+)'/.exec(readFileSync(join(REPO, 'bfr-candidata-v142-painel-na-troca/index.html'), 'utf8')); if (!m) throw new Error('ABORTA: nao li a chave publishable dos bytes do ar'); return m[1]; })();
const sondadas = [];
for (const m of chamaveis) {
  const nomesArgs = String(m.assinatura).split(',').map((x) => x.trim()).filter(Boolean).map((x) => x.split(/\s+/)[0]);
  const tipos = String(m.assinatura).split(',').map((x) => x.trim()).filter(Boolean);
  const u = (await q(`select gen_random_uuid()::text as u`))[0].u;
  const args = {}; let semForma = null;
  tipos.forEach((t, i) => {
    const nome = nomesArgs[i];
    if (/uuid/i.test(t)) args[nome] = u;
    else if (/text|varchar/i.test(t)) args[nome] = 'sonda-inexistente';
    else if (/boolean/i.test(t)) args[nome] = false;
    else if (/int|numeric|bigint/i.test(t)) args[nome] = 0;
    else semForma = t;
  });
  if (semForma) { sondadas.push({ nome: m.nome, tentada: false, skipped: 'argumento de tipo nao fabricavel por esta regua', tipo: semForma }); continue; }
  const r = await fetch(`${HOST}/rest/v1/rpc/${m.nome}`, { method: 'POST', headers: { apikey: chaveAnon, Authorization: `Bearer ${chaveAnon}`, 'content-type': 'application/json' }, body: JSON.stringify(args) });
  const texto = await r.text();
  const c = CLASSIFICADOR_DE_FORMA(texto);
  sondadas.push({ nome: m.nome, tentada: true, id_fabricado_md5: md5(Buffer.from(u)), status: r.status, forma: c.forma, code: c.code,
    dado_na_resposta: c.dado, bytes_resposta: c.bytes, texto_resposta_md5: c.texto_md5, linhas: c.linhas,
    resposta_tem_uuid: c.uuid, resposta_tem_coluna_id: c.coluna_id });
}

// ---- 5) portoes ---------------------------------------------------------------------------------------------
const falhas = [];
const gate = (nome, obtido, esperado, detalhe) => {
  const verde = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!verde) falhas.push(nome);
  return { nome, verde, obtido, esperado, detalhe };
};
const letivas = sondadas.filter((s) => s.tentada).map((s) => { const m = medidos.find((x) => x.nome === s.nome); return ['si'.includes(m.vol), m.escreve_no_corpo === false]; });
const tentadas = sondadas.filter((s) => s.tentada);
const comDado = tentadas.filter((s) => s.dado_na_resposta === true).map((s) => s.nome).sort();
const semDado = tentadas.filter((s) => s.dado_na_resposta === false).map((s) => s.nome).sort();
// O detector de identificador e o fixture dele vem da sonda de exposicao anonima: um corpo com uuid e coluna
// `school_id` tem de dar verdadeiro, e um agregado de contagens tem de dar falso — senao o verde do portao
// seguinte e o verde duma sonda cega.
const fix_identificador = (() => {
  const mal = [{ school_id: '3f2a1b04-7c11-4a52-9f3a-1c0d2e6b8a91', alunos: 3 }];
  const bem = [{ escolas_sem_municipio_na_rede: 6, concessoes_ativas_na_rede: 4 }];
  const a = contem_identificador(mal), b = contem_identificador(bem);
  return [a.uuid, a.coluna_id, b.uuid, b.coluna_id];
})();
const portoes = [
  gate('as_predicas_copiadas_disparam_nos_dois_lados_do_fixture', [fix_escrita, fix_corpo_def, fix_acl], [[true, false, false, true], ['select 1', ''], [true, true, 'anon,postgres', false, 0]], { ficheiros: [F_PREFLIGHT, F_SONDA], lidas: { corpoDef: pCorpoDef.fonte, escreveNoCorpo: pEscreve.fonte, eLeitura: pLeitura.fonte, contem_identificador: pIdentificador.fonte.slice(0, 120), temEntradaAnon: pEntradaAnon.fonte, papeisDe: pPapeisDe.fonte, temPublicX: pPublico.fonte }, nota: 'o terceiro vector e a rota de texto da ACL: PUBLIC da verdadeiro em temPublicX e nao aparece em papeisDe' }),
  gate('os_nomes_medidos_sao_os_abertos_ao_anonimo_no_p139', [NOMES, medidos.length], [NOMES_DO_ARTEFACTO, NOMES.length], { do_artefacto: NOMES_DO_ARTEFACTO, no_catalogo: medidos.map((m) => m.nome) }),
  gate('cada_nome_medido_tem_corpo_lido_do_catalogo', medidos.every((m) => m.corpo_bytes > 0), true, medidos.map((m) => ({ nome: m.nome, corpo_bytes: m.corpo_bytes, definer: m.definer, vol: m.vol }))),
  gate('a_familia_de_cheques_de_sessao_tem_os_dois_lados_no_fixture', fix_cheques, [1, 0], { padroes: PADROES_DE_SESSAO.map(([k]) => k), com_cheque: fix_cheques[0], sem_cheque: fix_cheques[1] }),
  gate('a_regua_de_chamada_tem_os_tres_negativos_e_o_positivo_em_fixture', fix_pode_chamar, [true, false, false], { positiva: 'vol=s sem escrita com uuid', negativas: ['vol=v e escreve', 'sem uuid na assinatura'] }),
  gate('as_classes_de_chamada_imprimem_se_mesmo_quando_vazias', [chamaveis.length + nao_chamados.length, medidos.length], [medidos.length, medidos.length], { chamaveis: chamaveis.map((m) => m.nome), nao_chamados }),
  gate('toda_chamada_tentada_passa_as_tres_provas_de_leitura', letivas, Array.from({ length: letivas.length }, () => [true, true]), { tentadas: sondadas.map((s) => ({ nome: s.nome, tentada: s.tentada, skipped: s.skipped || null })) }),
  gate('o_detector_de_identificador_tem_positivo_e_negativo_em_fixture', fix_identificador, [true, true, false, false], { com_uuid_e_coluna_id: 'mal', agregado_sem: 'bem' }),
  gate('o_classificador_de_forma_tem_as_cinco_classes_em_fixture', fix_forma.map((c) => [c.forma, c.dado, c.uuid, c.coluna_id]), [['array', true, true, true], ['array', true, false, false], ['nulo', false, null, null], ['nao_json', false, null, null], ['objeto_erro', true, false, false]], { nota: 'o detector so tem palavra a dizer em array ou objeto; nulo e nao_json dao null/null porque nao ha chaves a percorrer, e nao e o mesmo que um verde de «sem identificador»' }),
  gate('nenhum_corpo_de_dado_devolve_identificador', tentadas.filter((s) => s.dado === true && s.status < 400).filter((s) => s.resposta_tem_uuid === true || s.resposta_tem_coluna_id === true).map((s) => [s.nome, s.status, s.resposta_tem_uuid, s.resposta_tem_coluna_id]), [], { nota: 'lista vazia e o verde legitimo, mas tem de poder crescer: o fixture acima prova que um corpo com uuid e coluna `school_id` enche esta lista' }),
  gate('as_duas_classes_de_resposta_imprimem_se_mesmo_quando_vazias', [[...comDado, ...semDado].sort(), tentadas.map((s) => s.nome).sort(), comDado.length + semDado.length], [tentadas.map((s) => s.nome).sort(), tentadas.map((s) => s.nome).sort(), tentadas.length], { com_dado: comDado, sem_dado: semDado }),
  gate('a_guarda_de_leitura_aborta_antes_de_chegar_ao_banco', await (async () => { let abortou = false, chegou = false; try { await q('REVOKE EXECUTE ON FUNCTION public.x() FROM anon'); chegou = true; } catch (e) { abortou = /so-leitura/.test(String(e && e.message)); } return [abortou, chegou]; })(), [true, false], { mensagem: 'REVOKE passado a q() na corrida' }),
  gate('o_numero_do_p139_labelado_como_corpo_e_a_definicao_inteira_e_o_corpo_recortado_fica_abaixo', medidos.map((m) => [m.def_bytes === m.p139_def_bytes_como_registado, m.corpo_bytes < m.def_bytes]), medidos.map(() => [true, true]), { nota: 'ate ao sm37a o p139 chamava `corpo_bytes` a este numero; passou a `def_bytes` e a corrida nova e a fonte', medido_aqui: medidos.map((m) => ({ nome: m.nome, def_bytes: m.def_bytes, corpo_bytes: m.corpo_bytes, delta_cabecalho: m.def_bytes - m.corpo_bytes, p139_def_bytes: m.p139_def_bytes_como_registado })) }),
  gate('a_superficie_dos_dois_instrumentos_divide_so_pelos_revelados', [CHAMADOS_P140.filter((n) => !CHAMADOS_P139.includes(n)).sort(), CHAMADOS_P139.filter((n) => !CHAMADOS_P140.includes(n)).sort()], [REVELADOS_P140.slice().sort(), []], { p140_uniao: CHAMADOS_P140.length, p139_nomes_do_ar: CHAMADOS_P139.length, revelados_declarados_por_p140: REVELADOS_P140 }),
  gate('para_os_nomes_medidos_a_superficie_e_a_mesma_nas_duas_pecas', medidos.map((m) => m.chamado_pelo_ar_no_p139 === m.chamado_pelo_ar_no_p140), medidos.map(() => true), medidos.map((m) => ({ nome: m.nome, p139: m.chamado_pelo_ar_no_p139, p140: m.chamado_pelo_ar_no_p140 }))),
  gate('a_rota_de_texto_da_acl_bate_nome_a_nome_com_o_artefacto_do_p139', medidos.map((m) => [m.nome, m.entrada_anon_no_acl, m.publico_na_acl]), NOMES.map((n) => [n, ref139[n].entrada_anon_no_acl, ref139[n].publico_na_acl]), { p139: F_P139, p139_emissor_md5: p139.emissor_md5, por_nome: medidos.map((m) => [m.nome, m.entrada_anon_no_acl, m.publico_na_acl, ref139[m.nome].entrada_anon_no_acl, ref139[m.nome].publico_na_acl]), nota: 'os dois lados sem coacao: um undefined no lado do p139 vale registo anterior a `publico_na_acl` e isto tem de ir vermelho' }),
  gate('as_linhas_de_graus_de_cada_nome_sao_as_do_artefacto_do_p139', medidos.map((m) => m.linhas_de_graus_no_texto.length), NOMES.map((n) => (p139.universos.alvo_linhas || []).filter((l) => l.nome === n).length), medidos.map((m) => ({ nome: m.nome, anon_pode: m.anon_pode, entrada_anon_no_acl: m.entrada_anon_no_acl, linhas: m.linhas_de_graus_no_texto, anon_nomeado_nas_linhas: m.linhas_de_graus_no_texto.some((l) => /anon/.test(l)) }))),
];

const euBruto = readFileSync(join(REPO, 'scripts/p141-corpo-dos-nomes-abertos-ao-anonimo.mjs'));
const saida = {
  peca: 'scripts/p141-corpo-dos-nomes-abertos-ao-anonimo.mjs', em: new Date().toISOString(), duracao_ms: Date.now() - t0,
  emissor_bytes: euBruto.length, emissor_md5: md5(euBruto),
  pergunta: 'para cada nome que o p139 mediu com EXECUTE a anon, o corpo da propria funcao contem um cheque de sessao e uma recusa, e que resposta HTTP da o ar a quem nao tem sessao quando o corpo e de leitura e o identificador e fabricado?',
  metodo: 'SELECTs de catalogo com as colunas de graus do preflight da PEN-48 e o corpo recortado pela `corpoDef` dele; a escrita no corpo mede-se pela `escreveNoCorpo` da sonda de exposicao anonima; as duas predicados e o detector de identificador sao copiados por texto e compilados em contexto isolado; a forma da resposta tem classificador proprio com as cinco classes em fixture, e o detector so tem palavra a dizer em objeto ou array; a chamada anonima so acontece nos nomes que a regua das tres provas aceita, com uuid de `gen_random_uuid()`; os campos de superficie e de bytes de definicao leem-se dos artefactos do p139 e do p140 e confrontam-se, nunca se re-dactilografam; a chave publishable e lida dos bytes do ar e nunca escrita no registo.',
  fonte_dos_nomes: { ficheiro: F_P139, abertos_ao_anonimo: NOMES },
  graus_e_corpo: medidos,
  corpos_cheques: corpos,
  familia_de_padroes: { sessao: PADROES_DE_SESSAO.map(([k]) => k), recusa: PADROES_DE_RECUSA.map(([k]) => k) },
  chamada_anonima: { permitidas_para: chamaveis.map((m) => m.nome), recusadas_por_a_regua: nao_chamados, resultados: sondadas, classes_de_forma: { com_dado: comDado, sem_dado: semDado }, regua: 'POST /rpc so com provolatile em (i,s), corpo sem escrita medida e uuid na assinatura; nenhuma funcao que escreve foi tocada' },
  cruzamento_com_o_p139_e_o_p140: {
    ficheiro_p140: F_P140, p140_uniao: CHAMADOS_P140.length, p139_nomes_do_ar: CHAMADOS_P139.length,
    so_no_p140: CHAMADOS_P140.filter((n) => !CHAMADOS_P139.includes(n)).sort(), so_no_p139: CHAMADOS_P139.filter((n) => !CHAMADOS_P140.includes(n)).sort(),
    revelados_declarados_por_p140: REVELADOS_P140,
    por_nome: medidos.map((m) => ({ nome: m.nome, p139_def_bytes: m.p139_def_bytes_como_registado, aqui_def_bytes: m.def_bytes, aqui_corpo_bytes: m.corpo_bytes, chamado_p139: m.chamado_pelo_ar_no_p139, chamado_p140: m.chamado_pelo_ar_no_p140, no_alvo_de_peca_de_graus: m.no_alvo_de_peca_de_graus, municipal_de_ddl: m.municipal_de_ddl })),
    contraste_acl_vs_texto: medidos.map((m) => ({ nome: m.nome, anon_pode: m.anon_pode, entrada_anon_no_acl: m.entrada_anon_no_acl, linhas_de_graus: m.linhas_de_graus_no_texto, anon_nomeado_nas_linhas: m.linhas_de_graus_no_texto.some((l) => /anon/.test(l)) })),
  },
  portao_do_sm37a_substituido: 'o portao `nenhuma_resposta_anonima_devolve_identificador` medido em sm37a ficou vermelho porque exigia `false` a um corpo que chegou como `null` (4 bytes, sem chaves a percorrer); foi substituido por `o_classificador_de_forma_tem_as_cinco_classes_em_fixture` + `nenhum_corpo_de_dado_devolve_identificador` + `as_duas_classes_de_resposta_imprimem_se_mesmo_quando_vazias`, e o registo vermelho do sm37a fica preservado com o defeito no nome.',
  fixtures: { escrita_e_leitura: fix_escrita, corpo_def: fix_corpo_def, acl_texto: fix_acl, cheques: { com: fix_cheques[0], sem: fix_cheques[1] }, regua_de_chamada: fix_pode_chamar, detector_de_identificador: fix_identificador, forma_da_resposta: fix_forma.map((c) => [c.forma, c.dado, c.uuid, c.coluna_id]) },
  o_que_prova: 'se o corpo de cada nome aberto ao anonimo contem cheques de sessao e recusas, por familia de padroes com os dois lados em fixture, e — nos nomes que a regua das tres provas aceita — que status, forma e presenca de identificadores chegaram a quem nao tem sessao com um uuid fabricado.',
  o_que_NAO_prova: 'o que um identificador existente devolveria: um 200 com zero linhas dum id fabricado e compativel com um corpo que nao checa sessao, por isso a ausencia de dados nesta corrida nao e prova de fechamento. Um `null` de quatro bytes tambem nao e: diz que nao veio dado, nao que a funcao recusou — pelo nome com `total_recusas` = 0 o que fecha a porta e o predicado do join com `auth.uid()` a resolver para nulo, e essa diferenca so se ve noutro dia com um id verdadeiro. Nao prova nada sobre nomes que o p139 nao classificou como abertos ao anonimo, nem autoriza REVOKE, GRANT, DDL ou publicacao: cada um desses pede a sua frase literal. E `papeis_no_acl` nao e a lista de quem pode executar: a entrada de PUBLIC comeca por `=` sem nome e o `papeisDe` lido do preflight descarta token vazio; para PUBLIC leia `publico_na_acl`.',
  portoes: { total: portoes.length, falhas: falhas.length, lista: portoes },
};
saida.veredito = falhas.length === 0
  ? 'P141_CORPOS_MEDIDOS ' + portoes.length + '/0 · nomes ' + NOMES.length + ' · com_cheque ' + corpos.filter((c) => c.total_cheques > 0).length + '/' + corpos.length + ' · chamadas_anonimas ' + sondadas.filter((s) => s.tentada).length + '/' + sondadas.length
  : 'P141_VERMELHO_' + falhas.length;
if (falhas.length) {
  const p = OUT.replace(/\.json$/, '-VERMELHO.json');
  writeFileSync(p, JSON.stringify(saida, null, 2) + '\n');
  for (const f of falhas) console.log('  FALTA ' + f);
  console.log('P141_VERMELHO ' + falhas.length + '/' + portoes.length + ' · guarda dos dois nomes: ' + OUT + ' (nao escrito) e ' + p);
  process.exit(1);
}
writeFileSync(OUT, JSON.stringify(saida, null, 2) + '\n');
for (const m of medidos) console.log('  ' + m.nome + ': oid=' + m.oid + ' definer=' + m.definer + ' vol=' + m.vol + ' anon=' + m.anon_pode + ' entrada_anon=' + m.entrada_anon_no_acl + ' publico_na_acl=' + m.publico_na_acl + ' escreve_no_corpo=' + m.escreve_no_corpo + ' corpo=' + m.corpo_bytes + 'B papeis=[' + m.papeis_no_acl.join(',') + '] ass=(' + m.assinatura + ')');
for (const c of corpos) {
  console.log('  cheque ' + c.nome + ': total=' + c.total_cheques + ' ' + JSON.stringify(c.cheque_de_sessao) + ' · recusa total=' + c.total_recusas + ' ' + JSON.stringify(c.recusa));
  if (c.primeiro_cheque) console.log('    ' + c.primeiro_cheque.padrao + '@' + c.primeiro_cheque.em + ' :: ' + c.primeiro_cheque.trecho.slice(0, 200));
}
console.log('recusadas pela regua: ' + (nao_chamados.join(' ') || '(nenhuma)'));
for (const s of sondadas) console.log('  anon ' + s.nome + ': ' + (s.tentada ? 'HTTP ' + s.status + ' forma=' + s.forma + ' dado=' + s.dado_na_resposta + ' code=' + (s.code || '-') + ' bytes=' + s.bytes_resposta + ' md5=' + s.texto_resposta_md5.slice(0, 10) + ' uuid=' + s.resposta_tem_uuid + ' coluna_id=' + s.resposta_tem_coluna_id + ' id_fabricado_md5=' + s.id_fabricado_md5.slice(0, 10) : 'SKIP ' + s.skipped));
console.log('classes_de_forma: com_dado=' + JSON.stringify(comDado) + ' sem_dado=' + JSON.stringify(semDado));
console.log('fixture_forma=' + JSON.stringify(fix_forma.map((c) => [c.forma, c.dado, c.uuid, c.coluna_id])));
console.log('superficie: p139=' + CHAMADOS_P139.length + ' nomes_do_ar p140=' + CHAMADOS_P140.length + ' uniao · so_no_p140=' + JSON.stringify(CHAMADOS_P140.filter((n) => !CHAMADOS_P139.includes(n)).sort()) + ' so_no_p139=' + JSON.stringify(CHAMADOS_P139.filter((n) => !CHAMADOS_P140.includes(n)).sort()));
for (const m of medidos) console.log('  bytes ' + m.nome + ': def=' + m.def_bytes + ' corpo=' + m.corpo_bytes + ' p139_def_bytes=' + m.p139_def_bytes_como_registado + ' chamado_p139=' + m.chamado_pelo_ar_no_p139 + ' chamado_p140=' + m.chamado_pelo_ar_no_p140 + ' no_alvo=' + m.no_alvo_de_peca_de_graus + ' linhas_de_graus=' + JSON.stringify(m.linhas_de_graus_no_texto));
console.log('fixtures cheques=' + JSON.stringify(fix_cheques) + ' regua=' + JSON.stringify(fix_pode_chamar) + ' detector=' + JSON.stringify(fix_identificador));
for (const p of portoes) console.log('  portao ' + p.nome + ': ' + (p.verde ? 'VERDE' : 'VERMELHO'));
console.log(saida.veredito + ' · ' + saida.duracao_ms + ' ms · registo ' + OUT);
