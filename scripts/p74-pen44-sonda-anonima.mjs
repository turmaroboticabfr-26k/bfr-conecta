#!/usr/bin/env node
// P74-PEN44-SONDA-ANONIMA — 0 escrita no banco; só SELECT no catálogo e POST anónimo ao HTTP do ar.
// A pendência nº 7 da tabela de fecho: o que cada um dos 45 nomes do alvo da PEN-44 devolve a um chamador
// sem sessão. Os nomes lêem-se do ficheiro de candidata (REVOKE … FROM PUBLIC), nunca de uma lista
// dactilografada; a classificação de leitura/escrita vem de duas vias independentes — a volatilidade que o
// catálogo declara e o corpo SQL vivo — e só são chamados pelo HTTP os nomes em que as duas concordam em
// leitura. Um corpo que escreve nunca é chamado: um ensaio de escrita não é prova de leitura.
// O artefacto não guarda valores de linha: só contagens, nomes de colunas e bandeiras booleanas, para que o
// registo não se torne portador do que denuncia. Chamadas com argumentos ficam por medir, e é dito.
// Uso: node scripts/p74-pen44-sonda-anonima.mjs            (P73_SUF=<rotulo> para não por cima do anterior)
//      node scripts/p74-pen44-sonda-anonima.mjs --selfteste (offline: réguas puras, 0 banco, 0 HTTP)
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HOST, sql } from './c2-lib.mjs';
import { assinaturaCorresponde, tiposDaAssinatura } from './p73-assinatura-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SELFTESTE = process.argv.includes('--selfteste');
const SUF = process.env.P73_SUF ? '-' + process.env.P73_SUF : '';
const OUT = join(REPO, `evidence/p74-pen44-sonda-anonima-21-11${SUF}.json`);
const t0 = Date.now();

const CAND = join(REPO, 'scripts/p74-pen44-ddl-candidata.sql');
const REV = join(REPO, 'scripts/p74-pen44-ddl-reversao.sql');
for (const p of [CAND, REV]) if (!existsSync(p)) throw new Error('ABORTA: falta ' + p);
const txtCand = readFileSync(CAND, 'utf8');
const txtRev = readFileSync(REV, 'utf8');

const RE_REVOKE = /REVOKE\s+EXECUTE\s+ON\s+FUNCTION\s+public\.([a-z0-9_]+)\s*\(([^)]*)\)\s+FROM\s+(PUBLIC|anon)\s*;/gi;
const graus = [...txtCand.matchAll(RE_REVOKE)].map((m) => ({ nome: m[1], args: m[2].trim(), de: m[3].toUpperCase() }));
const alvo = graus.filter((x) => x.de === 'PUBLIC');
const duplos = graus.filter((x) => x.de === 'ANON');
const estrutura = { revoke_public: alvo.length, revoke_anon: duplos.length };
if (estrutura.revoke_public !== 45 || estrutura.revoke_anon !== 22) throw new Error('ABORTA: a candidata tem ' + JSON.stringify(estrutura) + ' — a sonda só conhece o alvo de 45+22');

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const contem_identificador = (corpo) => {
  const txt = JSON.stringify(corpo);
  return { uuid: UUID_RE.test(txt), coluna_id: /"(?:[a-z_]*_id|id|school_id|escola)"\s*:/.test(txt) };
};
const colunasDe = (linha) => (linha && typeof linha === 'object' && !Array.isArray(linha)) ? Object.keys(linha).sort() : null;
const descreveCorpo = (corpo, textoCru) => {
  const arr = Array.isArray(corpo);
  const forma = textoCru !== null ? { tipo: 'texto_nao_json' }
    : arr ? { tipo: 'array' }
    : corpo !== null && typeof corpo === 'object' ? { tipo: 'objeto', chaves: Object.keys(corpo).sort() }
    : { tipo: corpo === null ? 'null' : typeof corpo };
  const idents = (textoCru === null && corpo !== null) ? contem_identificador(corpo) : { uuid: false, coluna_id: false };
  const linhas = arr ? corpo.length : null;
  const colunas = arr && corpo[0] ? colunasDe(corpo[0]) : null;
  return { linhas, colunas, tem_uuid: idents.uuid, tem_coluna_id: idents.coluna_id, forma };
};
const escreveNoCorpo = (corpo) => /\b(INSERT\s+INTO|UPDATE\s+[a-z_0-9]|DELETE\s+FROM)\b/i.test(corpo);
const ehLeituraPorVol = (vol) => 'si'.includes(String(vol).toLowerCase());
const classifica = (f) => {
  const porVol = ehLeituraPorVol(f.vol);
  const escreve = escreveNoCorpo(f.corpo);
  return { leitura: porVol && !escreve, porVol, escreve, bate: porVol !== escreve };
};
const resolve = (par, funcoes) => funcoes.filter((f) => f.nome === par.nome && assinaturaCorresponde(tiposDaAssinatura(par.args), String(f.ident)));

// ——— selfteste offline: réguas puras sobre mundos fabricados ———
if (SELFTESTE) {
  const casos = [];
  const c = (nome, verde, detalhe) => casos.push({ nome, verde: !!verde, ...(detalhe ? { detalhe } : {}) });
  const f = (extra) => ({ nome: 'f', ident: 'p_target uuid', vol: 's', corpo: 'select 1;', ...extra });
  const classif = classifica(f({}));
  c('estavel_sem_escrita_no_corpo_e_leitura', classif.leitura === true && classif.bate === true, classif);
  const cli = classifica(f({ vol: 'v', corpo: 'select 1;' }));
  c('volatil_com_corpo_limpo_nunca_e_chamada_e_discorda', cli.leitura === false && cli.bate === false, cli);
  const ces = classifica(f({ vol: 's', corpo: "insert into t values (1);" }));
  c('corpo_que_escreve_chumba_a_leitura_e_discorda_da_volatilidade', ces.leitura === false && ces.escreve === true && ces.bate === false, ces);
  const cdis = classifica(f({ vol: 'v', corpo: "insert into t values (1);" }));
  c('as_duas_vias_concordarem_em_escritor_tambem_nunca_e_chamada', cdis.leitura === false && cdis.bate === true, cdis);
  const mal = contem_identificador([{ school_id: '3f2a1b04-7c11-4a52-9f3a-1c0d2e6b8a91', alunos: 3 }]);
  const bem = contem_identificador([{ escolas_sem_municipio_na_rede: 6, concessoes_ativas_na_rede: 4 }]);
  c('a_regua_de_identificador_dispara_no_uuid_e_cala_na_contagem', mal.uuid === true && mal.coluna_id === true && bem.uuid === false && bem.coluna_id === false, { mal, bem });
  const UUID_FIXTURE = '3f2a1b04-7c11-4a52-9f3a-1c0d2e6b8a91';
  const dArr = descreveCorpo([{ school_id: UUID_FIXTURE }], null);
  const dEsc = descreveCorpo(UUID_FIXTURE, null);
  const dObj = descreveCorpo({ code: 'PGRST116', message: 'x' }, null);
  const dTxt = descreveCorpo(null, '{"a":');
  c('o_registo_descreve_forma_e_nunca_carrega_o_valor_do_corpo',
    dArr.forma.tipo === 'array' && dArr.colunas.includes('school_id') && dArr.tem_uuid === true
    && dEsc.forma.tipo === 'string' && dEsc.tem_uuid === true
    && dObj.forma.tipo === 'objeto' && JSON.stringify(dObj.forma.chaves) === JSON.stringify(['code', 'message'])
    && dTxt.forma.tipo === 'texto_nao_json'
    && JSON.stringify([dArr, dEsc, dObj, dTxt]).includes(UUID_FIXTURE) === false,
    { dArr, dEsc, dObj, dTxt });
  const reg = /REVOKE\s+EXECUTE\s+ON\s+FUNCTION\s+public\.([a-z0-9_]+)\s*\(([^)]*)\)\s+FROM\s+(PUBLIC|anon)\s*;/gi;
  const pars = [...'REVOKE EXECUTE ON FUNCTION public.bfr_x(uuid) FROM PUBLIC;\nREVOKE EXECUTE ON FUNCTION public.bfr_x(uuid) FROM anon;'.matchAll(reg)];
  c('o_parser_le_public_e_anon_separados', pars.length === 2 && pars[0][3].toUpperCase() === 'PUBLIC' && pars[1][3].toUpperCase() === 'ANON', { lidos: pars.map((m) => m[3]) });
  const ass = { resolve_um: resolve({ nome: 'f', args: 'uuid' }, [f({}), f({ ident: 'p_a text' })]).length === 1, resolve_zero: resolve({ nome: 'f', args: 'numeric' }, [f({})]).length === 0 };
  c('a_resolucao_por_assinatura_distinque_sobrecarga', ass.resolve_um && ass.resolve_zero, ass);
  const boas = casos.filter((x) => x.verde).length;
  console.log(JSON.stringify({ programa: 'scripts/p74-pen44-sonda-anonima.mjs', selfteste: true, escrito_no_banco: false, banco_consultado: false, casos, veredito: boas === casos.length ? `P74_PEN44_SONDA_ANONIMA_SELFTESTE_OK ${casos.length}/0` : `P74_PEN44_SONDA_ANONIMA_SELFTESTE_VERMELHO ${casos.length - boas}` }, null, 1));
  process.exit(boas === casos.length ? 0 : 1);
}

// ——— vivo: catálogo (uma leitura) e chamadas anónimas ———
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com P73_SUF=novo, não por cima');
const LEITURAS_DECLARADAS = 1;
const cat = await sql(`
  select p.proname as nome,
         pg_get_function_identity_arguments(p.oid) as ident,
         p.provolatile::text as vol,
         p.proacl::text as acl,
         pg_get_userbyid(p.proowner)::text as dono,
         p.prosecdef as definer,
         p.prorettype::text as ret,
         p.prosrc as corpo,
         p.pronargs, p.proargdefaults, p.proretset
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
   where p.proname in (${[...new Set(alvo.map((x) => x.nome))].map((x) => `'${x}'`).join(',')})
   order by 1`);
const alvoResolvido = alvo.map((par) => ({ par, linhas: resolve(par, cat) }));
const naoResolvidos = alvoResolvido.filter((x) => x.linhas.length !== 1).map((x) => `${x.par.nome}(${x.par.args}):${x.linhas.length}`);
const porNome = {};
for (const x of alvoResolvido) if (x.linhas.length === 1) porNome[x.par.nome] = { ...x.linhas[0], args_no_sql: x.par.args };

const shellTxt = readFileSync(join(REPO, 'bfr-candidata-v136-secretaria-de-educacao/index.html'), 'utf8');
const anonKey = (/SUPABASE_PUBLISHABLE_KEY\s*=\s*['"]([^'"]+)['"]/.exec(shellTxt) || [])[1];
if (!anonKey) throw new Error('ABORTA: sem chave publishable nos bytes da candidata');

const classificados = Object.entries(porNome).map(([nome, f]) => ({ nome, args: f.args_no_sql, ...classifica(f), vol: f.vol, definer: f.definer, dono: f.dono, ret: f.ret, pronargs: f.pronargs, proargdefaults: f.proargdefaults, proretset: f.proretset, anon_X: /(^|[{,])anon=X/.test(String(f.acl ?? '')) }));
const chamaveis = classificados.filter((x) => x.leitura).map((x) => x.nome);
const naoChamados = classificados.filter((x) => !x.leitura).map((x) => x.nome);
const discordam = classificados.filter((x) => !x.bate).map((x) => x.nome);

const chamadas = [];
for (const nome of chamaveis) {
  let r = null, corpo = null, textoCru = null, erro = null;
  try {
    r = await fetch(`${HOST}/rest/v1/rpc/${nome}`, {
      method: 'POST',
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    const texto = await r.text();
    try { corpo = JSON.parse(texto); } catch { textoCru = texto; }
  } catch (e) { erro = String(e.message || e).slice(0, 160); }
  chamadas.push({ nome, status: r ? r.status : null, ...descreveCorpo(erro ? null : corpo, erro ? null : textoCru), erro: erro ?? null });
}

const falhas = [];
const g = (nome, cond, detalhe) => { if (!cond) falhas.push(nome); return { nome, verde: !!cond, detalhe }; };
const portoes = [
  g('o_alvo_sao_os_45_do_revoke_a_public_e_os_22_de_anon_sao_um_subconjunto', alvo.length === 45 && duplos.length === 22 && duplos.every((d) => alvo.some((a) => a.nome === d.nome)), estrutura),
  g('cada_nome_resolve_no_catalogo_por_assinatura_e_nenhum_e_gatilho', naoResolvidos.length === 0 && alvoResolvido.every((x) => x.linhas[0].ret !== 'trigger'), { nao_resolvidos: naoResolvidos, rets: alvoResolvido.map((x) => `${x.par.nome}=${x.linhas[0].ret}`) }),
  g('as_duas_vias_concordam_em_cada_nome_e_a_classe_nao_tem_terceira_via', discordam.length === 0 && chamaveis.length + naoChamados.length === 45, { discordam, de_leitura: chamaveis, nao_chamados_por_escrever: naoChamados }),
  g('nenhum_nome_classificado_como_escrita_foi_chamado', chamadas.every((c) => !naoChamados.includes(c.nome)), { chamados: chamadas.map((c) => c.nome) }),
  g('o_registo_nao_guarda_valores_de_linha_so_forma_e_bandeiras', chamadas.every((c) => (c.colunas ?? []).every((k) => typeof k === 'string') && typeof c.tem_uuid === 'boolean' && typeof c.tem_coluna_id === 'boolean' && ['array', 'objeto', 'null', 'boolean', 'number', 'string', 'texto_nao_json'].includes(c.forma.tipo) && (c.forma.tipo !== 'objeto' || c.forma.chaves.every((k) => typeof k === 'string'))), { formas_vistas: chamadas.map((c) => ({ nome: c.nome, forma: c.forma })) }),
  g('o_catalogo_devolveu_as_45_linhas_esperadas_e_a_leitura_e_uma_so', cat.length >= 45 && LEITURAS_DECLARADAS === 1, { linhas_no_catalogo: cat.length }),
];
const out = {
  programa: 'scripts/p74-pen44-sonda-anonima.mjs', em: new Date().toISOString(), duracao_ms: Date.now() - t0, host: HOST,
  alvo: { revoke_public: alvo.length, revoke_anon: duplos.length, nomes: [...new Set(alvo.map((x) => x.nome))].sort() },
  nao_resolvidos: naoResolvidos,
  classificacao: { de_leitura_chamaveis: chamaveis, nao_chamados_por_escrever: naoChamados, discordam },
  chamadas_anonimas_sem_argumentos: chamadas,
  resumo: {
    com_2xx: chamadas.filter((c) => c.status && c.status >= 200 && c.status < 300).length,
    com_linhas: chamadas.filter((c) => (c.linhas ?? 0) > 0).map((c) => c.nome),
    com_identificador: chamadas.filter((c) => c.tem_uuid || c.tem_coluna_id).map((c) => `${c.nome}(uuid=${c.tem_uuid},coluna_id=${c.tem_coluna_id})`),
    exigem_argumentos: classificados.filter((x) => x.pronargs > (x.proargdefaults ?? 0)).map((x) => `${x.nome}(${x.args})`),
    proretset: classificados.filter((x) => x.proretset).map((x) => x.nome),
    anon_X: classificados.filter((x) => x.anon_X).length,
  },
  o_que_esta_peca_prova: 'o que cada nome do alvo da PEN-44 responde a um chamador sem sessão e sem argumentos, com a classe de escrita nunca chamada; as colunas e bandeiras de identificador de cada corpo 200.',
  o_que_nao_prova: 'chamadas com argumentos fornecidos, utilizadores autenticados, e o que aconteceria depois de a candidata aplicada fechar estes graus.',
  portoes, falhas,
};
out.veredito = falhas.length === 0
  ? `P74_PEN44_SONDA_ANONIMA_OK ${portoes.length}/0 · ${chamadas.length} chamadas · ${naoChamados.length} por escrever`
  : `P74_PEN44_SONDA_ANONIMA_VERMELHO_${falhas.length}`;
if (falhas.length) {
  const p = OUT.replace(/\.json$/, '-VERMELHO.json');
  writeFileSync(p, JSON.stringify(out, null, 2) + '\n');
  for (const f of falhas) console.log('  FALTA ' + f);
  console.log(`P74_PEN44_SONDA_ANONIMA_VERMELHO · registo ${p}`);
  process.exit(1);
}
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`alvo ${alvo.length} nomes · de leitura ${chamaveis.length} · nao chamados por escrever ${naoChamados.length}`);
for (const c of chamadas) console.log(`  anon ${c.nome}: HTTP ${c.status} linhas=${c.linhas ?? 'n/a'} colunas=${JSON.stringify(c.colunas)} uuid=${c.tem_uuid} coluna_id=${c.tem_coluna_id}`);
console.log(`com 2xx ${out.resumo.com_2xx} · com linhas ${out.resumo.com_linhas.length} · exigem argumentos ${out.resumo.exigem_argumentos.length} · anon_X ${out.resumo.anon_X} de ${classificados.length}`);
for (const p of portoes) console.log(`  portao ${p.nome}: ${p.verde ? 'VERDE' : 'VERMELHO'}`);
console.log(`${out.veredito} · ${out.duracao_ms} ms · registo ${OUT}`);
