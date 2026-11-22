#!/usr/bin/env node
// P73-PEN48-PREFLIGHT — só leitura, zero escrita. A peça `scripts/p73-pen48-ddl-candidata.sql` revoga o EXECUTE do
// pseudo-papel `anon` num único nome: `public.register_gate_checkin_v2`, o revestimento que a PEN-42 criou em 21/11.
// Porque é uma linha de SQL e parece a peça mais inofensiva da casa, precisa de preflight: um REVOKE pode ser (i) um
// no-op decorativo se o grau do anónimo chegar pela entrada a PUBLIC em vez duma entrada nominal do `anon`, (ii)
// dirigido a uma assinatura que o servidor não reconhece, (iii) aplicado ao objecto errado (a viva, não o
// revestimento), (iv) a peça que fecha o grau que o `front` precisa para chamar a portaria, ou (v) uma porta fechada
// num nome enquanto 19 nomes continuam abertos e a prosa fala «da porta». Nada disso se lê no texto do SQL; mede-se
// no catálogo, neste instante.
//
// De onde vem o número que substitui o `service_role_pode === false` que eu escrevi na régua de saída da PEN-42: o
// censo do catálogo de 21/11 conta 163 de 163 funções de `public` executáveis por `service_role`. Uma cláusula que
// exige `false` a esse papel não tem positivo na casa inteira, logo não prova nada. A forma falsificável da mesma
// promessa é relativa: «esta peça não dá a nenhum papel um grau que a viva não tenha».
// Uso: node scripts/p73-pen48-preflight.mjs            (modo candidata: exige o estado ANTES de aplicar)
//      node scripts/p73-pen48-preflight.mjs --reversao (modo reversao: exige o estado DEPOIS de aplicada)
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HOST, sql } from './c2-lib.mjs';
import { assinaturaCorresponde, tiposDaAssinatura } from './p73-assinatura-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const MODO = process.argv.includes('--reversao') ? 'reversao' : 'candidata';
const SUF = process.env.P73_SUF ? '-' + process.env.P73_SUF : '';
const PREFIXO = 'P73_PEN48_PREFLIGHT';
const OUT = join(REPO, `evidence/p73-pen48-preflight-${MODO}-21-11${SUF}.json`);
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com P73_SUF=novo, não por cima');
const CAM_CAND = 'scripts/p73-pen48-ddl-candidata.sql';
const CAM_REV = 'scripts/p73-pen48-ddl-reversao.sql';
const CAM_APLIC = 'scripts/p73-municipal-aplica-ddl.mjs';
const ALVO = 'register_gate_checkin_v2';
const VIVA = 'register_gate_checkin';
const t0 = Date.now();
const md5 = (b) => createHash('md5').update(Buffer.from(String(b))).digest('hex');
const cru = (c) => readFileSync(join(REPO, c), 'utf8');
const conta = (re, t) => (t.match(re) || []).length;
const soCodigo = (t) => t.split('\n').map((l) => (l.trim().startsWith('--') ? '' : l)).join('\n');
// O ficheiro varre-se a si próprio para contar os sítios de query. As duas agulhas compõem-se em tempo de execução:
// escritas como literal, passariam a contar-se a si mesmas e o verde deixaria de dizer seja o que for.
const MESMO_FICHEIRO = 'scripts/p73-pen48-preflight.mjs';
const AGULHA_Q = 'aw' + 'ait q(';
const AGULHA_SQL = 's' + 'ql(';

const rawCand = cru(CAM_CAND), rawRev = cru(CAM_REV);
const codCand = soCodigo(rawCand), codRev = soCodigo(rawRev);

// ---- o que as duas peças escrevem, lido do código e não da minha memória ---------
const RE_GRAU = (kw) => new RegExp('^\\s*' + kw + '\\s+EXECUTE\\s+ON\\s+FUNCTION\\s+(?:public\\.)?([a-z0-9_]+)\\s*\\(([^)]*)\\)\\s+(?:FROM|TO)\\s+([a-z0-9_,\\s]+);', 'gmi');
const grausDe = (t, kw) => [...t.matchAll(RE_GRAU(kw))].map((m) => ({ nome: m[1], assinatura: m[2].trim(), papeis: m[3].split(',').map((x) => x.trim()).filter(Boolean).sort() }));
const revogados = grausDe(codCand, 'REVOKE');
const devolvidos = grausDe(codRev, 'GRANT');
const nomePeca = [...new Set(revogados.map((x) => x.nome))];
const papeisPeca = [...new Set(revogados.flatMap((x) => x.papeis))].sort();
const tiposPeca = revogados.length === 1 ? tiposDaAssinatura(revogados[0].assinatura) : null;

// ---- o catálogo vivo ------------------------------------------------------------
const formas = [];
const eLeitura = (t) => /^\s*(select|with)\b/i.test(String(t));
const q = async (txt) => { formas.push(eLeitura(txt)); return sql(txt); };
const alvo = (await q(`select p.oid::text as oid, p.xmin::text as xmin, p.provolatile::text as vol, p.prosecdef::text as definer,
    p.proconfig::text as config, coalesce(array_to_string(p.proacl,','),'<null_por_default>') as acl,
    has_function_privilege('anon'::regrole, p.oid, 'EXECUTE') as anon_pode,
    has_function_privilege('authenticated'::regrole, p.oid, 'EXECUTE') as authenticated_pode,
    has_function_privilege('service_role'::regrole, p.oid, 'EXECUTE') as service_role_pode,
    pg_get_function_identity_arguments(p.oid) as ident, pg_get_functiondef(p.oid) as def
  from pg_proc p join pg_namespace nn on nn.oid=p.pronamespace and nn.nspname='public'
  where p.proname='${ALVO}'`))[0] || null;
const viva = (await q(`select p.oid::text as oid, coalesce(array_to_string(p.proacl,','),'<null_por_default>') as acl,
    has_function_privilege('anon'::regrole, p.oid, 'EXECUTE') as anon_pode,
    has_function_privilege('authenticated'::regrole, p.oid, 'EXECUTE') as authenticated_pode,
    has_function_privilege('service_role'::regrole, p.oid, 'EXECUTE') as service_role_pode,
    pg_get_functiondef(p.oid) as def
  from pg_proc p join pg_namespace nn on nn.oid=p.pronamespace and nn.nspname='public'
  where p.proname='${VIVA}'`))[0] || null;
const censo = (await q(`select count(*)::int as total,
    count(*) filter (where has_function_privilege('anon'::regrole, p.oid, 'EXECUTE'))::int as anon_pode,
    count(*) filter (where coalesce(array_to_string(p.proacl,''),'') like '%anon=X%')::int as anon_por_entrada,
    count(*) filter (where p.proacl is null)::int as acl_nula
  from pg_proc p join pg_namespace nn on nn.oid=p.pronamespace and nn.nspname='public'`))[0];
const papeisDe = (acl) => [...new Set(String(acl).split(',').map((x) => x.trim().split('=')[0]).filter((r) => r && r !== '<null_por_default>'))].sort();
const temEntradaAnon = (acl) => String(acl).split(',').some((x) => /^\s*anon=X/.test(x.trim()));
const temPublicX = (acl) => String(acl).split(',').some((x) => /^\s*=/.test(x.trim()));
const alargamento = (alvo === null || viva === null) ? null : papeisDe(alvo.acl).filter((r) => !papeisDe(viva.acl).includes(r));
// O corpo do revestimento lê-se entre os delimitadores do `$fn$`: `pg_get_functiondef` recita o cabeçalho, e uma
// agulha sobre o texto inteiro chamaria `register_gate_checkin_v2(` na própria declaração da função.
const corpoAlvo = (() => { if (alvo === null) return ''; const m = /AS\s*(\$[a-zA-Z0-9_]*\$)([\s\S]*?)\1/.exec(alvo.def); return m ? m[2] : ''; })();

// ---- a cadeia que hoje impede o grau de `anon` de chegar a escrever, elo a elo -------------------------------
// O grau está medido acima; a pergunta que decide se a PEN-48 tapa um buraco ou fecha uma derivação de contrato mora
// em três corpos alheios, e o primeiro deles — o `if not public.is_gatekeeper() … raise` da viva — não se lê em
// nenhum ACL. Se alguém reescrever a viva sem o `coalesce`, a expressão passa a devolver NULL, `if not NULL` deixa de
// tomar o ramo e a porta abre-se sem que uma só linha de graus tenha mudado. Por isso isto é portão, e não nota.
const corpoDef = (t) => { const m = /AS\s*(\$[a-zA-Z0-9_]*\$)([\s\S]*?)\1/.exec(String(t)); return m ? m[2] : ''; };
const defesas = await q(`select n.nspname as esquema, p.proname as nome, p.prosecdef::text as definer,
    coalesce(array_to_string(p.proacl,','),'<null_por_default>') as acl,
    has_function_privilege('anon'::regrole, p.oid, 'EXECUTE') as anon_pode, pg_get_functiondef(p.oid) as def
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where (n.nspname='public' and p.proname in ('is_gatekeeper','current_role')) or (n.nspname='auth' and p.proname='uid')`);
const corpoDe = (nome, esquema) => corpoDef((defesas.find((x) => x.nome === nome && x.esquema === esquema) || { def: '' }).def);
const gGuarda = corpoDe('is_gatekeeper', 'public');
const gPapel = corpoDe('current_role', 'public');
const gUid = corpoDe('uid', 'auth');
const corpoViva = viva === null ? '' : corpoDef(viva.def);
const fraseGuarda = (() => { const m = /if\s+not\s+public\.is_gatekeeper\s*\([^)]*\)[\s\S]{0,160}?end\s+if;/i.exec(corpoViva); return m ? m[0].replace(/\s+/g, ' ').trim() : ''; })();
const ELOS = ['viva_chama_a_guarda', 'guarda_devolve_false_e_nao_null', 'papel_vem_da_sessao', 'sessao_vem_do_jwt'];
const cadeia = (guarda, papel, uid, vivaCorpo) => ({
  viva_chama_a_guarda: conta(/\bif\s+not\s+public\.is_gatekeeper\s*\(\s*\)\s+then\s+raise\b/gi, vivaCorpo) === 1,
  guarda_devolve_false_e_nao_null: conta(/\bcoalesce\s*\(/gi, guarda) >= 1 && conta(/'gatekeeper'\s*,\s*'developer'/gi, guarda) === 1,
  papel_vem_da_sessao: /\bfrom\s+public\.profiles\b/i.test(papel) && conta(/\bauth\.uid\s*\(\s*\)/gi, papel) >= 1,
  sessao_vem_do_jwt: conta(/request\.jwt\.claim/gi, uid) >= 2 && /::uuid/i.test(uid),
});
const elosDe = (c) => ELOS.map((k) => c[k] === true);
const FIX_CADEIA = {
  como_declerado: elosDe(cadeia(gGuarda, gPapel, gUid, corpoViva)),
  guarda_sem_coalesce: elosDe(cadeia("select public.current_role() in ('gatekeeper','developer')", gPapel, gUid, corpoViva)),
  papel_por_constante: elosDe(cadeia(gGuarda, "select cast('developer' as account_role)", gUid, corpoViva)),
  viva_sem_guarda: elosDe(cadeia(gGuarda, gPapel, gUid, 'select 1 from public.gate_checkins limit 1')),
  elo_a_elo_tem_positivo: [cadeia(gGuarda, gPapel, gUid, corpoViva)[ELOS[0]] === true, elosDe(cadeia('', '', '', '')).filter(Boolean).length === 0],
};

// ---- o segundo canal: o que o ar responde a quem não tem sessão ----------------
// O catálogo diz onde o grau está; só o HTTP diz se ele se toca. Os seis argumentos completos são obrigados pela
// aridade do PostgREST — chamar com `{}` devolve `PGRST202 … without parameters` e não prova nada sobre EXECUTE, que
// foi o erro da minha primeira sonda. O `target_badge_token` é um UUID aleatório, que não casa com nenhum
// `gate_badges` activo, e todos os caminhos de escrita da viva vêm depois do raise da guarda: nenhuma ramificação
// deste par de chamadas escreve. A publishable lê-se dos bytes da candidata e não entra no registo — o que fica são
// estado, código e o comprimento do corpo, porque um texto de erro alheio pode citar dados.
const BUNDLE = 'bfr-candidata-v142-painel-na-troca/index.html';
const seis = { target_badge_token: randomUUID(), gate_direction: 'entry', visual_confirmation: false,
  intake_source: 'qr', target_shift: null, exception_reason: null };
const callAnon = async (nome, key) => {
  const r = await fetch(`${HOST}/rest/v1/rpc/${nome}`, { method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'content-type': 'application/json' }, body: JSON.stringify(seis) });
  const t = await r.text();
  let code = null; try { code = String(JSON.parse(t).code ?? null); } catch { code = 'SEM_CODE'; }
  return { nome, status: r.status, code, corpo_bytes: t.length };
};
const chavePublicavel = (() => { const m = /SUPABASE_PUBLISHABLE_KEY\s*=\s*['"]([^'"]+)['"]/.exec(cru(BUNDLE)); return m ? m[1] : null; })();
if (!chavePublicavel) throw new Error('ABORTA: sem chave publishable nos bytes da candidata — a sonda de ar não pode ser feita às cegas');
const ar = { viva: await callAnon(VIVA, chavePublicavel), alvo: await callAnon(ALVO, chavePublicavel) };
const arEsperado = (modo) => (modo === 'candidata' ? '401|42501|400|P0001' : '401|42501|401|42501');
const bateComOModo = (v, a, modo) => [v.status, v.code, a.status, a.code].join('|') === arEsperado(modo);
const FIX_AR = {
  real_bate: bateComOModo(ar.viva, ar.alvo, MODO),
  grau_ja_fechado_no_modo_candidata_chumba: bateComOModo(ar.viva, { status: 401, code: '42501' }, 'candidata'),
  viva_aberta_no_ar_chumba: bateComOModo({ status: 400, code: 'P0001' }, ar.alvo, MODO),
};

// ---- mundos fabricados: a régua tem de chumbar com o falso ----------------------
// Compõem-se sobre um objecto-minuta da peça, nunca sobre o que o banco devolve: se a base fosse a medição, um dia
// em que o mundo estivesse errado o fixture «como declarado» herdaria o erro e os dentes desapareceriam.
const MINUTA = { alvo: { oid: '1', definer: 'true', config: '{search_path=}', acl: 'postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres,anon=X/postgres', anon_pode: true, authenticated_pode: true, service_role_pode: true, ident: 'uuid, text, boolean, text, text, text', vol: 'v' },
  viva: { acl: 'postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres', anon_pode: false },
  revogados: [{ nome: ALVO, assinatura: 'uuid, text, boolean, text, text, text', papeis: ['anon'] }],
  devolvidos: [{ nome: ALVO, assinatura: 'uuid, text, boolean, text, text, text', papeis: ['anon'] }] };
const W_PUBLIC = Object.assign({}, MINUTA.alvo, { acl: 'postgres=X/postgres,anon=X/postgres,=X/postgres' });
const W_NULA = Object.assign({}, MINUTA.alvo, { acl: '<null_por_default>' });
const W_JA_FECHADO = Object.assign({}, MINUTA.alvo, { acl: 'postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres', anon_pode: false });
const FIX_TIPO_TROCADO = assinaturaCorresponde(['text', 'uuid', 'boolean', 'text', 'text', 'text'], 'uuid, text, boolean, text, text, text');
const FIX_NOMES_DE_PARAMETRO = assinaturaCorresponde(['uuid', 'text'], 'target_badge_token uuid, gate_direction text');
const FIX_ESPELHO_OK = seEspelhamTeste(MINUTA.revogados, MINUTA.devolvidos);
const FIX_NOME_TROCADO = seEspelhamTeste(MINUTA.revogados, [{ nome: 'outro_nome', assinatura: 'uuid', papeis: ['anon'] }]);
const FIX_PAPEL_A_MAIS = seEspelhamTeste(MINUTA.revogados, [{ nome: ALVO, assinatura: 'uuid, text, boolean, text, text, text', papeis: ['anon', 'service_role'] }]);
function seEspelhamTeste(a, b) {
  const k = (l) => l.map((x) => x.nome + '|' + x.papeis.join(',')).sort().join(';');
  if (a.length === 0 && b.length === 0) return null;
  return k(a) === k(b);
}
const FIX_SEM_TRANSACCAO = 'REVOKE EXECUTE ON FUNCTION public.x() FROM anon;\n-- BEGIN; e COMMIT; em comentario nao contam\n';
const transDe = (t) => ({ begin: conta(/^BEGIN;/gm, t), commit: conta(/^COMMIT;/gm, t) });
const estruturaDe = (t) => { const s = soCodigo(t); const c = (re) => (s.match(re) || []).length;
  return { begin: c(/^BEGIN;/gm), commit: c(/^COMMIT;/gm), revoke: c(/^\s*REVOKE EXECUTE/gim), grant: c(/^\s*GRANT EXECUTE/gim),
    statement_fora_dos_graus: c(/^\s*(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|COPY)\b/gim) }; };
const FIX_EST_SEM_TX = estruturaDe(FIX_SEM_TRANSACCAO);

// ---- registo da peça no aplicador, lido de onde ela é escrita -------------------
const srcAplic = cru(CAM_APLIC);
const pecasSrc = {};
for (const m of srcAplic.matchAll(/'(PEN-\d+)':\s*\{([^}]*)\}/g)) {
  const f = (k) => { const r = new RegExp(k + ":\\s*'([^']+)'").exec(m[2]); return r ? r[1] : null; };
  pecasSrc[m[1]] = { pref: f('pref'), cand: f('cand'), rev: f('rev'), prefixo: f('prefixo'), frase: f('frase'), fraseRev: f('fraseRev') };
}
const registo = pecasSrc['PEN-48'] || null;

const falhas = [];
const portoes = [];
const gate = (nome, obtido, esperado) => {
  portoes.push(nome);
  const o = JSON.stringify(obtido), e = JSON.stringify(esperado);
  if (o !== e) falhas.push({ portao: nome, obtido: o, esperado: e });
};

gate('o_estado_vivo_bate_com_o_que_o_modo_pressupoe',
  alvo === null ? ['alvo_ausente'] : [alvo.definer === 'true',
    MODO === 'candidata' ? (alvo.anon_pode === true && temEntradaAnon(alvo.acl)) : (alvo.anon_pode === false && !temEntradaAnon(alvo.acl)),
    MODO === 'candidata' ? (viva.anon_pode === false) : (viva.anon_pode === false),
    alvo.authenticated_pode === true],
  [true, true, true, true]);
gate('o_alvo_e_o_revestimento_da_pen42_e_nao_a_viva_nem_outro_objecto',
  alvo === null ? ['alvo_ausente'] : [nomePeca.join(',') === ALVO,
    conta(new RegExp('public\\.' + VIVA + '\\s*\\(', 'g'), corpoAlvo) === 1,
    conta(new RegExp('\\b' + ALVO + '\\s*\\(', 'g'), corpoAlvo), alvo.config.includes('search_path'), alvo.vol === 'v', alvo.definer === 'true'],
  [true, true, 0, true, true, true]);
gate('a_assinatura_do_revoke_casa_com_a_identidade_do_servidor_e_a_regua_tem_dentes',
  [tiposPeca !== null && tiposPeca.length === 6, alvo !== null && assinaturaCorresponde(tiposPeca, alvo.ident),
    FIX_TIPO_TROCADO, FIX_NOMES_DE_PARAMETRO],
  [true, true, false, true]);
gate('o_revoke_por_nome_e_o_grau_efetivo_e_os_dois_mundos_que_o_negam_disparam',
  [alvo !== null && temEntradaAnon(alvo.acl) && !temPublicX(alvo.acl), temEntradaAnon(W_PUBLIC.acl) && !temPublicX(W_PUBLIC.acl),
    temEntradaAnon(W_NULA.acl) && !temPublicX(W_NULA.acl), temEntradaAnon(W_JA_FECHADO.acl)],
  [true, false, false, false]);
gate('a_peca_fecha_somente_o_grau_que_a_viva_nao_tem_e_nao_alarga_a_casa',
  [papeisPeca.join(',') === 'anon',
    MODO === 'candidata' ? (alargamento !== null && alargamento.join(',') === 'anon')
      : (alargamento !== null && alargamento.length === 0),
    viva !== null && viva.authenticated_pode === true, devolvidos.length === 1 && devolvidos[0].papeis.join(',') === 'anon'],
  [true, true, true, true]);
gate('a_reversao_e_o_espelho_da_candidata_e_os_tres_mundos_que_a_negam_disparam',
  [revogados.length === 1 && devolvidos.length === 1, seEspelhamTeste(revogados, devolvidos),
    FIX_NOME_TROCADO, FIX_PAPEL_A_MAIS, FIX_ESPELHO_OK, seEspelhamTeste([], [])],
  [true, true, false, false, true, null]);
gate('cada_ficheiro_e_uma_sola_transacco_de_graus_sem_dados_e_o_mundo_sem_transacco_chumba',
  [(() => { const a = estruturaDe(rawCand), b = estruturaDe(rawRev);
    return a.begin === 1 && a.commit === 1 && a.revoke === 1 && a.grant === 0 && a.statement_fora_dos_graus === 0
      && b.begin === 1 && b.commit === 1 && b.grant === 1 && b.revoke === 0 && b.statement_fora_dos_graus === 0; })(),
    transDe(rawCand).begin, transDe(rawCand).commit, transDe(rawRev).begin, transDe(rawRev).commit,
    FIX_EST_SEM_TX.begin === 0 && FIX_EST_SEM_TX.commit === 0 && FIX_EST_SEM_TX.revoke === 1],
  [true, 1, 1, 1, 1, true]);
gate('o_censo_de_exposicao_anonima_imprime_o_que_a_peca_nao_fecha',
  [nomePeca.length, censo.total >= censo.anon_pode, censo.anon_pode >= censo.anon_por_entrada,
    censo.anon_pode >= 1, nomePeca.length < censo.total],
  [1, true, true, true, true]);
gate('a_defesa_que_hoje_impede_o_grau_de_anon_de_escreve_mora_no_corpo_da_viva_e_os_quatro_elos_chumbam_um_a_um',
  [FIX_CADEIA.como_declerado, FIX_CADEIA.guarda_sem_coalesce, FIX_CADEIA.papel_por_constante,
    FIX_CADEIA.viva_sem_guarda, FIX_CADEIA.elo_a_elo_tem_positivo,
    defesas.length === 3, fraseGuarda.length > 0,
    papeisDe((defesas.find((x) => x.nome === 'is_gatekeeper') || { acl: '' }).acl).includes('anon') === false],
  [[true, true, true, true], [true, false, true, true], [true, true, false, true], [false, true, true, true],
    [true, true], true, true, true]);
gate('no_ar_quem_nao_tem_sessao_e_recusado_pela_acl_na_viva_e_toca_o_corpo_no_revestimento_enquanto_a_peca_nao_entrar',
  [FIX_AR.real_bate, FIX_AR.grau_ja_fechado_no_modo_candidata_chumba, FIX_AR.viva_aberta_no_ar_chumba,
    [ar.viva.status, ar.viva.code, ar.viva.corpo_bytes > 0], [ar.alvo.status, ar.alvo.code, ar.alvo.corpo_bytes > 0],
    ar.viva.nome === VIVA && ar.alvo.nome === ALVO],
  [true, false, false, [401, '42501', true],
    MODO === 'candidata' ? [400, 'P0001', true] : [401, '42501', true], true]);
gate('a_peca_esta_registada_na_tabela_pecas_do_aplicador_com_estes_mesmos_caminhos',
  [registo !== null, registo && registo.cand === CAM_CAND, registo && registo.rev === CAM_REV,
    registo && registo.pref === 'scripts/p73-pen48-preflight.mjs', registo && registo.prefixo === PREFIXO + '_VERDE',
    registo && registo.frase === 'APLICAR PEN-48 NO BANCO', registo && registo.frase !== registo.fraseRev,
    registo && registo.cand !== (pecasSrc['PEN-42'] || {}).cand],
  [true, true, true, true, true, true, true, true]);
gate('a_pegada_certificada_e_a_dos_bytes_crus_dos_dois_ficheiros',
  [Buffer.byteLength(rawCand, 'utf8') > 0, md5(rawCand) !== md5(rawRev),
    md5(soCodigo(rawCand)) !== md5(rawCand), md5(soCodigo(rawRev)) !== md5(rawRev)],
  [true, true, true, true]);
// A contagem literal de queries envelhecia no dia em que este instrumento precisasse de mais um SELECT (e precisou:
// a cadeia de defesa é o quarto). A forma falsificável é a relação: cada chamada de SQL deste ficheiro passa por `q`,
// e o único sítio onde `sql` é tocado directamente é dentro do próprio `q`. Os dois padrões compõem-se em tempo de
// execução para que a agulha não viva escrita no ficheiro que ela varre.
gate('cada_query_passa_por_q_e_so_ha_um_toque_directo_de_sql_e_os_mundos_fora_disso_chumbam',
  [formas.length === (cru(MESMO_FICHEIRO).split(AGULHA_Q).length - 1),
    (cru(MESMO_FICHEIRO).split(AGULHA_SQL).length - 1) === 1,
    formas.length >= 3, formas.every((x) => x === true),
    eLeitura('UPDATE public.t SET a = 1'), eLeitura('with a as (select 1) select * from a'),
    eLeitura('INSERT INTO public.t VALUES (1)')],
  [true, true, true, true, false, true, false]);
gate('nenhum_identificador_pessoal_nem_token_entra_neste_registo', (() => {
  const probe = JSON.stringify({ alvo, viva, censo, revogados, devolvidos, corpoAlvo, ar, gGuarda, gPapel, gUid, fraseGuarda });
  // O fixture compõe-se em tempo de execução: escrito como literal, o instrumento passaria a ser o portador que
  // ele próprio varre, e o verde deixaria de dizer seja o que for sobre o registo.
  const FIX_VARREDURA = 'maria' + '@example.edu ' + 'eyJ' + 'hbGciOiJIUzI1NiJ9' + '.' + 'abcdefghij' + '.' + 'klmnopqrst';
  const reEmail = /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g;
  const reJwt = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+/g;
  return [(probe.match(reEmail) || []).length, (probe.match(reJwt) || []).length,
    (FIX_VARREDURA.match(reEmail) || []).length, (FIX_VARREDURA.match(reJwt) || []).length];
})(), [0, 0, 1, 1]);

const saida = {
  programa: 'scripts/p73-pen48-preflight.mjs', modo: MODO, em: new Date().toISOString(), duracao_ms: Date.now() - t0,
  pergunta: 'que REVOKE por nome fecha hoje o grau de `anon` no revestimento da PEN-42, e o que fica de fora?',
  metodo: 'pg_proc, pg_get_function_identity_arguments, pg_get_functiondef e has_function_privilege pela API de gestão (sem JWT de sessão, logo sem RLS e sem escrita); os nomes, assinaturas e papéis lêem-se do código sem comentários das duas peças; o censo de exposição anónima conta o catálogo inteiro',
  queries: { total: formas.length, todas_leitura: formas.every((x) => x === true) },
  // `ficheiros` é o campo que o aplicador lê (`preJson.ficheiros[candidata|reversao]`) para conferir a pegada antes
  // de enviar: os md5 são dos bytes crus, exactamente a string que ele volta a calcular.
  ficheiros: { candidata: { caminho: CAM_CAND, bytes: Buffer.byteLength(rawCand, 'utf8'), md5: md5(rawCand) },
    reversao: { caminho: CAM_REV, bytes: Buffer.byteLength(rawRev, 'utf8'), md5: md5(rawRev) } },
  peca: { nomes: nomePeca, papeis: papeisPeca, tipos: tiposPeca, revogados, devolvidos,
    estrutura_candidata: estruturaDe(rawCand), estrutura_reversao: estruturaDe(rawRev), transacco_crua: { candidata: transDe(rawCand), reversao: transDe(rawRev) } },
  alvo: alvo === null ? null : { oid: alvo.oid, xmin: alvo.xmin, definer: alvo.definer, config: alvo.config, vol: alvo.vol,
    acl: alvo.acl, papeis: papeisDe(alvo.acl), anon_pode: alvo.anon_pode, authenticated_pode: alvo.authenticated_pode,
    service_role_pode: alvo.service_role_pode, identidade: alvo.ident, corpo_chars: corpoAlvo.length,
    chama_a_viva: conta(new RegExp('public\\.' + VIVA + '\\s*\\(', 'g'), corpoAlvo) },
  viva: viva === null ? null : { oid: viva.oid, acl: viva.acl, papeis: papeisDe(viva.acl), anon_pode: viva.anon_pode, authenticated_pode: viva.authenticated_pode, service_role_pode: viva.service_role_pode },
  alargamento_de_papeis_sobre_a_viva: alargamento,
  censo_de_exposicao_anonima: censo,
  defesa_da_viva: { elos: ELOS, medido: FIX_CADEIA.como_declerado, frase_da_guarda: fraseGuarda,
    corpo_viva_bytes: corpoViva.length, por_nome: defesas.map((x) => ({ nome: x.esquema + '.' + x.nome, definer: x.definer,
      papeis: papeisDe(x.acl), anon_pode: x.anon_pode, corpo_bytes: corpoDef(x.def).length })) },
  sonda_de_ar: { bundle: BUNDLE, argumentos: 'os seis, com `target_badge_token` de um UUID aleatório desta corrida',
    publicacao: 'só a publishable lida dos bytes da candidata; nenhuma chave entra no registo e nenhuma sessão é usada',
    viva: ar.viva, revestimento: ar.alvo, esperado_neste_modo: arEsperado(MODO), fixtures: FIX_AR },
  registo_no_aplicador: registo,
  mundos_fabricados: { tipos_trocados_nao_casam: FIX_TIPO_TROCADO, nomes_de_parametro_casam: FIX_NOMES_DE_PARAMETRO,
    mundo_acl_com_public: { tem_anon: temEntradaAnon(W_PUBLIC.acl), tem_public_x: temPublicX(W_PUBLIC.acl) },
    mundo_acl_nula: { tem_anon: temEntradaAnon(W_NULA.acl) }, mundo_ja_fechado: { tem_anon: temEntradaAnon(W_JA_FECHADO.acl) },
    espelho_nome_trocado: FIX_NOME_TROCADO, espelho_papel_a_mais: FIX_PAPEL_A_MAIS, espelho_ok: FIX_ESPELHO_OK,
    estrutura_sem_transacco: FIX_EST_SEM_TX },
  o_que_este_verde_nao_autoriza: 'nada: é leitura. Aplicar a candidata, reverter, publicar seja o que for, escrever no banco e git push continuam a pedir cada um a sua frase literal.',
  o_que_este_verde_nao_prova: 'que o REVOKE está aplicado — prova que o grau está onde a peça o pode tocar e que a reversão é simétrica. Não fecha os outros nomes anónimo-executáveis do censo (a PEN-43 e a PEN-44 tratam das suas famílias), nem prova que o `front` com sessão continua a chamar a portaria: isso só se mede depois, com JWT e no browser.',
  portoes, falhas,
};
saida.veredito = falhas.length === 0
  ? `${PREFIXO}_VERDE_${MODO.toUpperCase()} ${portoes.length}/0`
  : `${PREFIXO}_VERMELHO_${MODO.toUpperCase()} ${falhas.length} de ${portoes.length} portoes`;
writeFileSync(OUT, JSON.stringify(saida, null, 2) + '\n');
console.log(`MODO ${MODO} · candidata ${saida.ficheiros.candidata.md5} ${saida.ficheiros.candidata.bytes} B · reversao ${saida.ficheiros.reversao.md5} ${saida.ficheiros.reversao.bytes} B`);
console.log(`ALVO ${JSON.stringify(saida.alvo)}`);
console.log(`VIVA papeis=${JSON.stringify(saida.viva && saida.viva.papeis)} anon_pode=${saida.viva && saida.viva.anon_pode}`);
console.log(`ALARGAMENTO ${JSON.stringify(alargamento)} · PECA papeis=${JSON.stringify(papeisPeca)} nomes=${JSON.stringify(nomePeca)} tipos=${JSON.stringify(tiposPeca)}`);
console.log(`CENSO ${JSON.stringify(censo)}`);
console.log(`REGISTO_APPLICADOR ${JSON.stringify(registo)}`);
for (const f of falhas) console.log(`  FALHA ${f.portao} obtido=${f.obtido} esperado=${f.esperado}`);
console.log(`${saida.veredito} · ${portoes.length} portoes · registo ${OUT}`);
process.exit(falhas.length === 0 ? 0 : 1);
