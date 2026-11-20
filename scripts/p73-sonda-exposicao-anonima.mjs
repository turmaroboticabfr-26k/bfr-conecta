#!/usr/bin/env node
// P73-SONDA-EXPOSICAO-ANONIMA — 0 escrita. Depois de PEN-38 e PEN-39 entrarem no banco, quatro nomes novos
// passaram a existir; este programa classifica cada um por duas vias independentes — a volatilidade que o
// catalogo declara e o que o corpo SQL realmente escreve — e só chama ao anonimo os que as duas accordam em
// ser de leitura. Medido 20/11: `pg_proc.prodataaccess` nao existe nesta build (PG 17.6), por isso a
// classificacao nao pode assumir essa coluna. Motivo da peca: as candidatas fazem
// `REVOKE ALL ON FUNCTION … FROM PUBLIC`, mas o ACL vivo devolve `anon=X` — o REVOKE tira o pseudo-papel
// PUBLIC, nao os graus concedidos por privilegio default do esquema, por isso a superficie executavel de
// quem nao tem sessao nao e o que a prosa do SQL promete. Nada aqui toca `bfr_school_set_municipality`:
// escreve trilha, e um ensaio de escrita nao e prova de leitura.
// Uso: node scripts/p73-sonda-exposicao-anonima.mjs        (P73_SUF=<rotulo> para nao por cima do anterior)
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HOST, sql } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = process.env.P73_SUF ? '-' + process.env.P73_SUF : '';
const OUT = join(REPO, `evidence/p73-sonda-exposicao-anonima-20-11${SUF}.json`);
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com P73_SUF=novo, nao por cima');
const t0 = Date.now();

const FICHEIROS_DAS_DUAS = ['scripts/p73-pen38-ddl-candidata.sql', 'scripts/p73-pen39-ddl-candidata.sql'];
const SQL_POR_FICHEIRO = Object.fromEntries(FICHEIROS_DAS_DUAS.map((f) => [f, readFileSync(join(REPO, f), 'utf8')]));
const NOMES_E_FICHEIRO = [];
for (const [f, t] of Object.entries(SQL_POR_FICHEIRO)) {
  for (const m of t.matchAll(/CREATE\s+FUNCTION\s+(?:public\.)?([a-z0-9_]+)/gi)) NOMES_E_FICHEIRO.push([m[1], f]);
}
const NOMES_DAS_DUAS = [...new Set(NOMES_E_FICHEIRO.map(([n]) => n))];
if (NOMES_DAS_DUAS.length < 4) throw new Error('ABORTA: as duas candidatas deveriam declarar pelo menos quatro nomes e leram ' + NOMES_DAS_DUAS.length);

const cat = await sql(`
  select p.proname as nome,
         p.provolatile::text as volatilidade,
         p.proacl::text as acl,
         pg_get_userbyid(p.proowner)::text as dono,
         p.prosecdef::text as definer
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
   where p.proname in (${NOMES_DAS_DUAS.map((x) => `'${x}'`).join(',')})
   order by 1`);
const porNome = Object.fromEntries(cat.map((r) => [r.nome, r]));
const ausentes = NOMES_DAS_DUAS.filter((n) => !porNome[n]);

// O corpo SQL de cada nome le-se dos mesmos dois ficheiros de que venho os nomes, e um corpo que faça
// INSERT/UPDATE/DELETE escreve — `SELECT … INTO variavel` nao conta. Esta e a segunda classificacao, independente
// da volatilidade que o catalogo declara; as duas tem de bater, senao o portao chumba.
const corpoDe = (texto, nome) => {
  const ini = texto.search(new RegExp('CREATE\\s+FUNCTION\\s+(?:public\\.)?' + nome + '\\s*\\(', 'i'));
  if (ini < 0) return '';
  const abre = texto.indexOf('$fn$', ini);
  if (abre < 0) return texto.slice(ini, ini + 2000);
  const fecha = texto.indexOf('$fn$', abre + 4);
  return texto.slice(ini, fecha < 0 ? abre + 4000 : fecha);
};
const escreveNoCorpo = (corpo) => /\b(INSERT\s+INTO|UPDATE\s+[a-z_]|DELETE\s+FROM)\b/i.test(corpo);
const corpos = Object.fromEntries(NOMES_E_FICHEIRO.map(([n, f]) => [n, corpoDe(SQL_POR_FICHEIRO[f], n)]));
for (const [n, corpo] of Object.entries(corpos)) if (corpo === '') throw new Error('ABORTA: ' + n + ' nao tem corpo legivel na candidata — a classificacao de escrita nao pode ser suposicao.');
const escrevemSql = Object.keys(corpos).filter((n) => escreveNoCorpo(corpos[n]));
const deLeitura = cat.filter((r) => 'si'.includes(r.volatilidade) && !escrevemSql.includes(r.nome)).map((r) => r.nome);
const queEscrevem = cat.filter((r) => escrevemSql.includes(r.nome)).map((r) => r.nome);
const classificacoesBatem = cat.every((r) => (('si'.includes(r.volatilidade)) !== escrevemSql.includes(r.nome)));
const anonTemX = Object.fromEntries(cat.map((r) => [r.nome, /(^|[{,])anon=X/.test(String(r.acl ?? ''))]));

const shellTxt = readFileSync(join(REPO, 'bfr-candidata-v136-secretaria-de-educacao/index.html'), 'utf8');
const anonKey = (/SUPABASE_PUBLISHABLE_KEY\s*=\s*['"]([^'"]+)['"]/.exec(shellTxt) || [])[1];
if (!anonKey) throw new Error('ABORTA: sem chave publishable nos bytes da candidata');

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const contem_identificador = (corpo) => {
  const txt = JSON.stringify(corpo);
  return { uuid: UUID_RE.test(txt), coluna_id: /"(?:[a-z_]*_id|id|school_id|escola)"\s*:/.test(txt) };
};
const chamadas = [];
for (const nome of deLeitura) {
  let r, corpo = null, erro = null;
  try {
    r = await fetch(`${HOST}/rest/v1/rpc/${nome}`, {
      method: 'POST',
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    const texto = await r.text();
    try { corpo = JSON.parse(texto); } catch { corpo = texto.slice(0, 200); }
  } catch (e) { erro = String(e.message || e).slice(0, 160); }
  const linhas = Array.isArray(corpo) ? corpo.length : null;
  const idents = erro ? { uuid: false, coluna_id: false } : contem_identificador(corpo);
  chamadas.push({ nome, status: r ? r.status : null, linhas, tem_uuid: idents.uuid, tem_coluna_id: idents.coluna_id, amostra: erro ? { erro } : (linhas === null ? String(corpo).slice(0, 200) : corpo[0] ?? null) });
}

const fixture_dispara = (() => {
  const mal = [{ school_id: '3f2a1b04-7c11-4a52-9f3a-1c0d2e6b8a91', alunos: 3 }];
  const bem = [{ escolas_sem_municipio_na_rede: 6, concessoes_ativas_na_rede: 4 }];
  const a = contem_identificador(mal), b = contem_identificador(bem);
  return { mal_tem_uuid: a.uuid, mal_tem_coluna_id: a.coluna_id, bem_tem_uuid: b.uuid, bem_tem_coluna_id: b.coluna_id };
})();

const falhas = [];
const g = (nome, cond, detalhe) => { if (!cond) falhas.push(nome); return { nome, verde: !!cond, detalhe }; };
const portoes = [
  g('os_nomes_sao_lidos_das_candidatas_e_nao_da_minha_lista', NOMES_DAS_DUAS.length >= 4 && ausentes.length === 0, { lidos_das_candidatas: NOMES_DAS_DUAS, ausentes_no_catalogo: ausentes }),
  g('o_catalogo_e_o_corpo_separam_o_que_le_do_que_escreve', deLeitura.length >= 3 && queEscrevem.length >= 1 && classificacoesBatem, { volatilidade: cat.map((r) => `${r.nome}=${r.volatilidade}`), que_escrevem_por_corpo: queEscrevem, de_leitura_chamaveis: deLeitura }),
  g('nenhuma_funcao_que_escreve_foi_chamada', chamadas.every((c) => !queEscrevem.includes(c.nome)), { chamadas: chamadas.map((c) => c.nome) }),
  g('a_anon_nao_recebe_identificador_de_escola', chamadas.every((c) => c.status === null || c.status >= 400 || (!c.tem_uuid && !c.tem_coluna_id)), chamadas.map((c) => ({ nome: c.nome, status: c.status, linhas: c.linhas, tem_uuid: c.tem_uuid, tem_coluna_id: c.tem_coluna_id }))),
  g('a_regua_de_identificador_dispara_no_fixture', fixture_dispara.mal_tem_uuid === true && fixture_dispara.mal_tem_coluna_id === true && fixture_dispara.bem_tem_uuid === false && fixture_dispara.bem_tem_coluna_id === false, fixture_dispara),
  g('o_grau_de_anon_no_acl_e_lido_e_reportado', Object.keys(anonTemX).length === cat.length && cat.every((r) => typeof r.acl === 'string'), { acl_anon_tem_executar: anonTemX, lido: cat.map((r) => ({ nome: r.nome, volatilidade: r.volatilidade, definer: r.definer, dono: r.dono })) }),
];

const out = {
  programa: 'scripts/p73-sonda-exposicao-anonima.mjs', em: new Date().toISOString(), duracao_ms: Date.now() - t0,
  host: HOST,
  nomes_das_duas_candidatas: NOMES_DAS_DUAS,
  catalogo: cat,
  escrita_por_corpo_sql: Object.fromEntries(Object.entries(corpos).map(([n, c]) => [n, escreveNoCorpo(c)])),
  chamadas_anonimas: chamadas,
  acl_anon_tem_executar: anonTemX,
  o_que_esta_peca_prova: 'o que uma pessoa sem sessao recebe ao chamar, pelo HTTP do ar, cada funcao nova que o catalogo declara de leitura, e o grau de execucao vivo de cada uma.',
  o_que_nao_prova: 'que `bfr_school_set_municipality` recusa o anonimo — nao foi chamada, porque o corpo dela escreve trilha e um ensaio de escrita nao e prova de leitura; e nada sobre utilizadores autenticados.',
  portoes, falhas,
};
out.veredito = falhas.length === 0
  ? `P73_EXPOSICAO_ANONIMA_VERDE ${portoes.length}/0 · ${chamadas.length} chamadas · ${Object.values(anonTemX).filter(Boolean).length} de ${cat.length} com anon=X`
  : `P73_EXPOSICAO_ANONIMA_VERMELHO_${falhas.length}`;
if (falhas.length) {
  const p = OUT.replace(/\.json$/, '-VERMELHO.json');
  writeFileSync(p, JSON.stringify(out, null, 2) + '\n');
  for (const f of falhas) console.log('  FALTA ' + f);
  console.log(`P73_EXPOSICAO_ANONIMA_VERMELHO · registo ${p}`);
  process.exit(1);
}
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`nomes ${NOMES_DAS_DUAS.join(', ')}`);
console.log(`de leitura ${deLeitura.join(', ')} · que escrevem ${queEscrevem.join(', ')}`);
for (const c of chamadas) console.log(`  anon ${c.nome}: HTTP ${c.status} linhas=${c.linhas ?? 'n/a'} uuid=${c.tem_uuid} coluna_id=${c.tem_coluna_id}`);
console.log(`anon=X em ${Object.entries(anonTemX).map(([k, v]) => `${k}:${v}`).join(' ')}`);
for (const p of portoes) console.log(`  portao ${p.nome}: ${p.verde ? 'VERDE' : 'VERMELHO'}`);
console.log(`${out.veredito} · ${out.duracao_ms} ms · registo ${OUT}`);
