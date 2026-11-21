#!/usr/bin/env node
// P83 — QUEM LÊ QUANTO, EIXO POR EIXO (21/11, noite). A P82 provou que o controlo do backend existe e está
// aplicado: as 8 funções e as 20 políticas da candidata SM4 estão no banco, a mesa de concessões tem linhas.
// Faltava a pergunta que o usuário pôs — «somente pessoas autorizadas possam ver os dados» — respondida por
// tabela: para cada uma das 11 mesas que o painel servido lê, (a) existe política própria para municipal,
// (b) o predicado filtra pelo município/escola/utilizador ou não filtra nada, (c) uma sessão authenticated
// sem concessão consegue ler linhas? Só SELECT e contagens agregadas: 0 PII, 0 DDL, 0 escrita de produto.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { sql } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const EV = `${REPO}/evidence`;
const SUF = (process.argv[2] || 'a').trim();
const OUT = `${EV}/p83-escopo-leitura-municipal-${SUF}.json`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — corre com SUF novo, nunca por cima');
const md5 = (b) => createHash('md5').update(Buffer.from(String(b))).digest('hex');
const t0 = Date.now();

// ——— predicações puras + fixture que prova que discriminam ———
// «sem filtro» no sentido literal: USING verdadeiro/ausente para `authenticated`. Predicados escondidos
// dentro de funções (is_monitor(), bfr_can_manage_...) ficam para a régua de baixo, que é a decisiva.
const semFiltroLiteral = (p) => p.cmd === 'SELECT' && /authenticated/.test(p.papeis) && (p.qual.trim() === '' || /^\s*(true|null)\s*$/i.test(p.qual));
// Uma política municipal só limita a vista se o predicado nomear uma COLUNA da própria linha — inclusive `id`,
// que é como a política viva de `schools` filtra (a régua anterior só conhecia `*_id` e chumbou-a).
const filtraPorColunaDaLinha = (p) => /\(\s*(?:[a-z_]+\.)?(?:[a-z_]+_id|id)\b/i.test(p.qual) || /\bmunicipality_id\b/i.test(p.qual);
const nomeiaMunicipal = (p) => /municipal/i.test(p.nome);
if (semFiltroLiteral({ cmd: 'SELECT', papeis: 'authenticated', qual: 'true' }) !== true) throw new Error('ABORTA: semFiltroLiteral chumba o fixture USING(true)');
if (semFiltroLiteral({ cmd: 'SELECT', papeis: 'authenticated', qual: 'public.is_monitor()' }) !== false) throw new Error('ABORTA: semFiltroLiteral conta um predicado de função como aberto');
if (semFiltroLiteral({ cmd: 'INSERT', papeis: 'authenticated', qual: 'true' }) !== false) throw new Error('ABORTA: semFiltroLiteral conta escrita como leitura');
if (filtraPorColunaDaLinha({ qual: 'public.bfr_school_in_municipal_scope(school_id)' }) !== true) throw new Error('ABORTA: filtraPorColunaDaLinha chumba o predicado que nomeia school_id');
if (filtraPorColunaDaLinha({ qual: 'public.bfr_is_municipal_authority()' }) !== false) throw new Error('ABORTA: filtraPorColunaDaLinha aceita um predicado sem coluna da linha — a régua ficaria cega para schools_municipal_read');
if (nomeiaMunicipal({ nome: 'schools_municipal_read' }) !== true || nomeiaMunicipal({ nome: 'school_staff_select' }) !== false) throw new Error('ABORTA: nomeiaMunicipal não discrimina os dois nomes');
if (filtraPorColunaDaLinha({ qual: 'public.bfr_school_in_municipal_scope(id)' }) !== true) throw new Error('ABORTA: filtraPorColunaDaLinha chumba o predicado que filtra pela chave `id` — foi o vermelho da corrida c');
if (filtraPorColunaDaLinha({ qual: '(municipality_id = ANY (SELECT ...))' }) !== true) throw new Error('ABORTA: filtraPorColunaDaLinha chumba municipality_id directo');

if ((process.argv[3] || '').trim() === '--selfteste') {
  console.log('P83_SELFTESTE_OK 3/0 — semFiltroLiteral, filtraPorColunaDaLinha e nomeiaMunicipal discriminam nos fixtures (0 rede, 0 banco)');
  process.exit(0);
}

// ——— as 11 mesas lidas, extraídas do ar publicado (nunca dactilografadas) ———
const porVersao = (re) => readdirSync(REPO).filter((f) => re.test(f)).sort((a, b) => parseInt(/(\d+)/.exec(a)[1], 10) - parseInt(/(\d+)/.exec(b)[1], 10));
const DIARIO = porVersao(/^audit-publicacao-v\d+\.json$/).slice(-1)[0];
const V = /v(\d+)/.exec(DIARIO)[1];
const PASTA_CAND = porVersao(new RegExp('^bfr-candidata-v' + V + '(?!\\d)')).slice(-1)[0];
if (!PASTA_CAND) throw new Error('ABORTA: nenhum bfr-candidata-v' + V + ' para censar');
const AR_TXT = readFileSync(`${REPO}/${PASTA_CAND}/index.html`, 'utf8');
const iniMod = AR_TXT.indexOf('<script data-bfr-municipal-module="1">');
if (iniMod === -1) throw new Error('ABORTA: ' + PASTA_CAND + '/index.html não traz o invólucro municipal');
const MOD = AR_TXT.slice(iniMod, AR_TXT.indexOf('</script>', iniMod));
const TABELAS = [...new Set([...MOD.matchAll(/from\(\s*'([a-z_]+)'\)/g)].map((m) => m[1]))].sort();
if (TABELAS.length === 0) throw new Error('ABORTA: 0 mesas lidas do módulo — a regex partiu, os portões ficariam vacuos');
const lista = TABELAS.map((t) => `'${t}'`).join(',');

const politicas = await sql(`select tablename as tabela, policyname as nome, cmd, permissive, array_to_string(roles, ',') as papeis, coalesce(qual,'') as qual
  from pg_policies where schemaname='public' and tablename in (${lista}) order by 1, 2, 3`);
const rls = await sql(`select c.relname as tabela, c.relrowsecurity::text as rls from pg_class c
  join pg_namespace n on n.oid=c.relnamespace and n.nspname='public' where c.relkind='r' and c.relname in (${lista}) order by 1`);
const contagens = await sql(`select 'schools' as tabela, count(*)::text as linhas from public.schools
  union all select 'municipalities', count(*)::text from public.bfr_municipalities
  union all select 'concessoes_ativas', count(*)::text from public.bfr_municipal_access_grants where revoked_at is null
  union all select 'concessoes_total', count(*)::text from public.bfr_municipal_access_grants
  union all select 'papeis_de_concessao_distintos', count(distinct municipal_role)::text from public.bfr_municipal_access_grants
  union all select 'escolas_com_municipio', count(*)::text from public.schools where municipality_id is not null
  union all select 'escolas_no_escopo_das_concessoes', count(*)::text from public.schools s
    where s.municipality_id in (select municipality_id from public.bfr_municipal_access_grants where revoked_at is null)
  union all select 'perfis', count(*)::text from public.profiles`);
// Sem literais de enum: o censo dos cargos lê os valores reais do próprio tipo, porque `admin` (o nome do
// mapa do bundle) não é valor de `account_role` e adivinhar outro nome repetiria o aborto.
const cargos = await sql(`select role::text as papel, count(*)::text as perfis from public.profiles group by 1 order by 2 desc`);
const papeisConcessao = await sql(`select municipal_role as papel, count(*)::text as linhas, count(*) filter (where revoked_at is null)::text as vivas
  from public.bfr_municipal_access_grants group by 1 order by 1`);
// A lista de cargos possíveis lê-se do CHECK declarado no DDL versionado, nunca de memória: foi assim que
// a régua anterior chumbou quatro valores legítimos.
const DDL_TXT = readFileSync(`${REPO}/scripts/sm4-ddl-municipal-candidata.sql`, 'utf8');
const blocoConcessoes = (/CREATE TABLE public\.bfr_municipal_access_grants[\s\S]*?\n\);/.exec(DDL_TXT) || [''])[0];
const PAPEIS_DECLARADOS = [...new Set([...blocoConcessoes.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]))];
if (PAPEIS_DECLARADOS.length === 0) throw new Error('ABORTA: 0 cargos lidos do CHECK de municipal_role — o portão ficaria vacuo');
const agregado = (nome) => String((contagens.find((c) => c.tabela === nome) || {}).linhas ?? '');
const escolas = Number(agregado('schools'));
const escolasComMunicipio = Number(agregado('escolas_com_municipio'));
if (!Number.isFinite(escolas) || !Number.isFinite(escolasComMunicipio)) throw new Error('ABORTA: agregados de escolas não vieram como número — regex das contagens partiu');
const papeisDosConcessionarios = await sql(`select p.role::text as papel, count(*)::text as concessoes
  from public.bfr_municipal_access_grants g join public.profiles p on p.id = g.profile_id
  where g.revoked_at is null group by 1 order by 2 desc`);
const corposFalta = await sql(`select p.proname as nome, pg_get_functiondef(p.oid) as corpo from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace and n.nspname='public'
  where p.proname in ('bfr_has_municipal_grant','bfr_is_education_supervisor') order by 1`);

const porTabela = TABELAS.map((t) => {
  const ps = politicas.filter((p) => p.tabela === t);
  const municipais = ps.filter(nomeiaMunicipal);
  const leitura = ps.filter((p) => p.cmd === 'SELECT');
  return {
    tabela: t, rls: (rls.find((r) => r.tabela === t) || {}).rls || 'AUSENTE',
    politicas_total: ps.length, politicas_de_leitura: leitura.length,
    municipais: municipais.map((p) => p.nome + ':' + p.cmd + ':permissivo=' + p.permissive + ':papeis=' + p.papeis),
    municipal_filtra_por_coluna: municipais.filter((p) => p.cmd === 'SELECT').every(filtraPorColunaDaLinha),
    leitura_literalmente_aberta: ps.filter(semFiltroLiteral).map((p) => p.nome + ' | USING=' + JSON.stringify(p.qual.slice(0, 90))),
    quals_municipais: municipais.filter((p) => p.cmd === 'SELECT').map((p) => p.nome + ' -> ' + p.qual.slice(0, 140)),
  };
});

const semMunicipal = porTabela.filter((x) => x.municipais.length === 0).map((x) => x.tabela);
const abertas = porTabela.filter((x) => x.leitura_literalmente_aberta.length > 0).map((x) => x.tabela);
const municipaisSemColuna = porTabela.filter((x) => x.municipais.length > 0 && x.municipal_filtra_por_coluna === false).map((x) => x.tabela + '/' + x.municipais.filter((m) => /SELECT/.test(m)).map((m) => m.split(':')[0]).join(','));
const semRls = porTabela.filter((x) => x.rls !== 'true').map((x) => x.tabela);

const falhas = []; const portoes = [];
const g = (nome, cond, detalhe) => { const v = !!cond; portoes.push({ nome, verde: v, detalhe }); if (!v) falhas.push(`${nome} | ${JSON.stringify(detalhe).slice(0, 320)}`); console.log(`${v ? 'VERDE' : 'VERMELHO'}  ${nome}`); };
g('todas_as_mesas_lidas_tem_rls_ligado', semRls.length === 0, semRls);
g('nenhuma_politica_de_leitura_e_USING_true_para_authenticated', abertas.length === 0, { mesas: abertas, detalhes: porTabela.filter((x) => x.leitura_literalmente_aberta.length).map((x) => x.tabela + ': ' + x.leitura_literalmente_aberta.join(' || ')).slice(0, 8) });
g('toda_politica_municipal_de_leitura_filtra_por_coluna_da_linha', municipaisSemColuna.length === 0, { mesas: municipaisSemColuna, quals: porTabela.filter((x) => x.quals_municipais.length).map((x) => x.tabela + ': ' + x.quals_municipais.join(' || ')).slice(0, 8) });
g('as_concessoes_ativas_estao_contadas_e_por_papel', papeisConcessao.length > 0 && String((contagens.find((c) => c.tabela === 'concessoes_total') || {}).linhas) !== '0', { papeis_de_concessao: papeisConcessao, agregados: contagens });
g('nenhuma_concessao_usa_municipal_role_fora_do_check_declarado_no_ddl', papeisConcessao.every((p) => PAPEIS_DECLARADOS.includes(p.papel)), { declarados_no_ddl: PAPEIS_DECLARADOS, vivos_na_mesa: papeisConcessao.map((p) => p.papel + '=' + p.vivas + 'vivas/' + p.linhas) });
g('alguma_escola_cai_dentro_do_escopo_de_uma_concessao_ativa', Number(agregado('escolas_no_escopo_das_concessoes')) > 0, { escolas_no_escopo: agregado('escolas_no_escopo_das_concessoes'), escolas, escolas_com_municipio: escolasComMunicipio, nota: 'esta é a contagem que decide se o painel municipal de um concessionado tem de onde tirar linhas' });
g('toda_escola_tem_municipio_associado', escolasComMunicipio === escolas, { escolas, escolas_com_municipio: escolasComMunicipio, nota: 'sem associação escola↔município o predicado bfr_school_in_municipal_scope() é sempre falso: os separadores municipais de alunos e turmas não têm de onde tirar linhas' });

const out = {
  programa: 'scripts/p83-escopo-leitura-municipal.mjs', em: new Date().toISOString(), duracao_ms: Date.now() - t0,
  pergunta: 'tirando a visibilidade do botão, o banco deixa mesmo ver só os dados da própria pessoa autorizada?',
  metodo: 'SELECT-only sobre pg_policies/pg_class/agregados; as 11 mesas vêm dos bytes do ar publicado (' + PASTA_CAND + '/index.html, md5 ' + md5(AR_TXT).slice(0, 12) + '), nunca dactilografadas. Zero PII: só contagens e predicados de código. 0 DDL, 0 escrita, 0 publicação.',
  ar: { diario: DIARIO, versao: V, pasta_censada: PASTA_CAND, md5_ar: md5(AR_TXT), bytes_modulo: MOD.length },
  mesas_lidas: TABELAS, por_tabela: porTabela,
  mesas_sem_politica_municipal: semMunicipal,
  agregados: contagens, cargos_dos_perfis: cargos, papeis_de_concessao: papeisConcessao,
  cargos_declarados_no_ddl: PAPEIS_DECLARADOS, papeis_locais_dos_concessionarios: papeisDosConcessionarios,
  corpos: corposFalta.map((c) => ({ nome: c.nome, corpo: String(c.corpo).slice(0, 900) })),
  o_que_este_verde_nao_autoriza: 'Nada. Esta peça mede; não aplica DDL, não revoga, não publica, não concede. Mudar políticas ou o banner do bundle continua a pedir OK literal.',
  portoes, falhas,
};
out.veredito = falhas.length === 0 ? 'P83_ESCOPO_LEITURA_MUNICIPAL_OK' : `P83_ESCOPO_LEITURA_MUNICIPAL_VERMELHO ${falhas.length}`;
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
for (const f of falhas) console.log('  FALTA ' + f);
console.log(`mesas=${TABELAS.length} sem_politica_municipal=${semMunicipal.length} [${semMunicipal.join(',')}]`);
console.log(`leitura_USING_true=${abertas.length} [${abertas.join(',')}] · municipal_sem_coluna_da_linha=${municipaisSemColuna.length} [${municipaisSemColuna.join(' | ')}] · escolas_sem_municipio=${escolas - escolasComMunicipio}/${escolas}`);
console.log(`${out.veredito} · ${out.duracao_ms} ms · ${OUT.split('/').pop()}`);
process.exit(falhas.length ? 1 : 0);
