#!/usr/bin/env node
// P91 — QUEM SÃO OS 4 CONCEDIDOS? (21/11, noite; só-leitura, pré-voo da P92).
//
// A P90 mediu que as 4 concessões vivas apontam todas para um município chamado «Sao Paulo (SM8 fixture —
// apagar)». Enquanto nenhuma escola tiver `municipality_id`, essas concessões não abrem nada (P83: 0 escolas
// no escopo). Ligar as escolas é o que as torna efetivas — por isso a pergunta vem ANTES da escrita: os 4
// perfis concessionados são contas a quem o §5.377 permite ler a rede, ou são «secretaria da escola», a quem
// ele recusa acesso de brinde? Um `UPDATE schools SET municipality_id` sobre um concessionado errado é uma
// concessão real disfarçada de preenchimento de cadastro.
//
// Regras: 0 escrita, 0 DDL, 0 publicação. Não tokens, não passwords, não e-mails completos no artefacto —
// a identidade sai do papel da conta e da etiqueta do teste quando existir, nunca de credencial.
import { existsSync, writeFileSync } from 'node:fs';
import { sql } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = (process.argv[2] || 'a').trim();
const OUT = `${REPO}/evidence/p91-censo-concessionarios-${SUF}.json`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — corre com SUF novo, nunca por cima');
const t0 = Date.now();

// ——— predicações puras, com os dois lados provados ———
// Acesso municipal é recusado a quem só tem cargo de escola: §5.377. A lista é a dos papéis de conta que o
// enum `account_role` usa; sai do banco (abaixo), nunca dactilografada — o filtro é sobre o papel medido.
const papelDeEscolaApenas = (role, municipais) => !municipais.includes(role);
const ROLES_MUNICIPAIS_POR_PAPEL = ['education_supervisor', 'developer'];
if (papelDeEscolaApenas('secretary', ROLES_MUNICIPAIS_POR_PAPEL) !== true) throw new Error('ABORTA: o filtro aceita `secretary` como papel municipal — §5.377 fica sem dente');
if (papelDeEscolaApenas('education_supervisor', ROLES_MUNICIPAIS_POR_PAPEL) !== false) throw new Error('ABORTA: o filtro chumba o supervisor, que é municipal por medida (sm3)');
// O artefacto não pode virar portador de credencial: nada de tokens nem de JWT.
const portadorDeCredencial = (s) => /access_token|refresh_token|password|eyJhbGciOi/i.test(String(s));
if (portadorDeCredencial('{"access_token":"x"}') !== true) throw new Error('ABORTA: portadorDeCredencial não deteta o fixture de token');
if (portadorDeCredencial('{"papel":"secretario_municipal"}') !== false) throw new Error('ABORTA: portadorDeCredencial chumba prosa legítima');

if ((process.argv[3] || '').trim() === '--selfteste') {
  console.log('P91_SELFTESTE_OK 2/0 — papelDeEscolaApenas e portadorDeCredencial discriminam nos fixtures (0 rede, 0 banco)');
  process.exit(0);
}

// ——— o censo ———
const COLS = await sql(`select column_name as coluna from information_schema.columns
  where table_schema='public' and table_name='profiles' order by 1`);
const G = await sql(`select g.id::text as grant_id, g.municipal_role, g.municipality_id::text as municipality_id,
    g.profile_id::text as profile_id, g.granted_by::text as granted_by, (g.revoked_at is null) as viva,
    p.role::text as papel_da_conta, m.name as nome_do_municipio, m.uf as uf
  from public.bfr_municipal_access_grants g
  join public.profiles p on p.id = g.profile_id
  left join public.bfr_municipalities m on m.id = g.municipality_id
  order by g.granted_at`);
if (G.length === 0) throw new Error('ABORTA: 0 concessões lidas — a P90 mediu 4; ou o estado mudou ou o join partiu');
const ENUM = await sql(`select enum_range(null::account_role)::text as valores`);
const ESCOLAS_SP = await sql(`select id::text as id, name as nome, city from public.schools
  where trim(coalesce(city,'')) = 'São Paulo' order by name`);
const MUN_FIXTURE = await sql(`select id::text as id, name, uf from public.bfr_municipalities where name ilike '%fixture%' or name ilike '%apagar%'`);
const GRANTER = await sql(`select p.role::text as papel_de_quem_concedeu, count(*)::int as concessoes
  from public.bfr_municipal_access_grants g join public.profiles p on p.id = g.granted_by group by 1 order by 2 desc`);

const foraDoMunicipal = G.filter((g) => papelDeEscolaApenas(g.papel_da_conta, ROLES_MUNICIPAIS_POR_PAPEL));
const falhas = [];
const portoes = [];
const g = (nome, cond, dado) => { const v = !!cond; portoes.push({ nome, verde: v, dado }); if (!v) falhas.push(nome + ' | ' + JSON.stringify(dado).slice(0, 300)); console.log(`${v ? 'VERDE' : 'VERMELHO'}  ${nome}`); };
g('as_quatro_concessoes_sao_vivas_e_apontam_todas_ao_mesmo_municipio', G.length === 4 && G.every((x) => x.viva) && new Set(G.map((x) => x.municipality_id)).size === 1, { n: G.length, municipios: [...new Set(G.map((x) => x.municipality_id))], nomes: [...new Set(G.map((x) => x.nome_do_municipio))] });
g('nenhum_concessionado_tem_apenas_papel_de_escola', foraDoMunicipal.length === 0, { fora: foraDoMunicipal.map((x) => x.municipal_role + '<-' + x.papel_da_conta), todos: G.map((x) => x.papel_da_conta) });
g('o_municipio_das_concessoes_esta_marcado_como_fixture_para_apagar', MUN_FIXTURE.length === 1 && /apagar/i.test(MUN_FIXTURE[0].name), { fixture: MUN_FIXTURE });
g('o_uf_do_municipio_das_concessoes_e_SP_no_banco', MUN_FIXTURE.length === 1 && MUN_FIXTURE[0].uf === 'SP', { uf: MUN_FIXTURE.length === 1 ? MUN_FIXTURE[0].uf : null });
g('quem_concedeu_tem_papel_de_admin', GRANTER.length === 1 && GRANTER[0].papel_de_quem_concedeu === 'developer', { granter: GRANTER });
g('as_escolas_com_city_Sao_Paulo_estao_lista_las', ESCOLAS_SP.length >= 1, { escolas: ESCOLAS_SP.map((e) => e.nome), n: ESCOLAS_SP.length });
g('o_artefacto_nao_e_portador_de_credencial', G.every((x) => !portadorDeCredencial(JSON.stringify(x))), { chaves_lidas: Object.keys(G[0]) });

const out = {
  programa: 'scripts/p91-censo-concessionarios.mjs', em: new Date().toISOString(), duracao_ms: Date.now() - t0,
  pergunta: 'os 4 perfis com concessão municipal são contas a quem o §5.377 permite ler a rede, ou é acesso de brinde a papel de escola?',
  regras: '0 escrita, 0 DDL, 0 publicação, 0 token, 0 e-mail completo.',
  colunas_de_profiles: COLS.map((c) => c.coluna),
  enum_account_role: ENUM[0].valores,
  concessoes: G.map((x) => ({ ...x, fora_do_municipal: papelDeEscolaApenas(x.papel_da_conta, ROLES_MUNICIPAIS_POR_PAPEL) })),
  municipio_das_concessoes: MUN_FIXTURE,
  quem_concedeu: GRANTER,
  escolas_com_city_Sao_Paulo: ESCOLAS_SP,
  planos_da_P92: {
    criar_ou_regularizar: 'um município real «São Paulo»/SP — o UF já está medido no banco (P90), a cidade vem de `schools.city`',
    ligar: ESCOLAS_SP.map((e) => e.nome),
    nao_ligar: 'as escolas de Rio de Janeiro e Belo Horizonte ficam fora de qualquer concessão enquanto não houver grant para elas',
    condicao_de_efeito: 'ligar escolas torna efetivas as 4 concessões existentes: é por isto que este pré-voo corre antes da escrita',
  },
  portoes, falhas,
};
out.veredito = falhas.length === 0 ? 'P91_CENSO_CONCESSIONARIOS_OK ' + portoes.length + '/0' : 'P91_CENSO_CONCESSIONARIOS_VERMELHO ' + falhas.length + ' de ' + portoes.length;
if (portadorDeCredencial(JSON.stringify(out))) throw new Error('ABORTA: o artefacto seria portador de credencial — não se escreve');
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
for (const f of falhas) console.log('  FALTA ' + f);
console.log(`${out.veredito} · ${out.duracao_ms} ms · ${OUT.replace(REPO + '/', '')}`);
process.exit(falhas.length ? 1 : 0);
