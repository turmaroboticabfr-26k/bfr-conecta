#!/usr/bin/env node
// P90 — O DADO QUE FALTA É DERIVÁVEL OU É INVENÇÃO? (21/11, noite; só-leitura).
//
// O buraco medido por P83: 0 de 6 escolas têm `schools.municipality_id`, logo 0 escolas caem no escopo das
// 4 concessões ativas e o painel de um concessionado real é vazio. A pendência estava na lista «preciso da tua
// lista real escola↔município». Esta peça testifica essa frase antes de escrever seja o que for: se o banco já
// contém uma coluna geográfica por escola, associar é DERIVAÇÃO (o §11.5 proíbe números fictícios, não proíbe
// ler o que lá está); se não contém, nenhuma autorização enche o buraco — falta o dado, e eu digo isso.
//
// O outro lado do `bfr_municipalities` é a coluna `uf char(2) NOT NULL`: nasce do DDL aplicado, e se não existir
// fonte de UF em lado nenhum, criar o município obriga ou a inventar UF ou a ALTER na tabela certificada (isso
// é mudar a candidata, não preencher dado). Ambos os caminhos ficam nomeados no `beco`, não escolhidos por mim.
//
// Regras: 0 escrita, 0 DDL, 0 publicação. Só SELECT e contagens agregadas. Nada de PII: perfis por id e papel.
import { existsSync, writeFileSync, readdirSync } from 'node:fs';
import { sql } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = (process.argv[2] || 'a').trim();
const OUT = `${REPO}/evidence/p90-censo-dados-municipais-${SUF}.json`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — corre com SUF novo, nunca por cima');
const t0 = Date.now();

// ——— predicações puras, com os dois lados provados ———
// «UF derivável» só é verdade se a coluna for de verdade um estado: char(2), ou uma string que acaba em ' - XX'.
const ufPareceColunaDeEstado = (c) => /(^|[^a-z])uf($|[^a-z])/.test(c.column_name) || /^(state|estado|uf_id)$/.test(c.column_name);
const ufComValorReal = (c, v) => v !== null && String(v).trim() !== '' && /^[A-Za-z]{2}$/.test(String(v).trim().toUpperCase().replace(/[^A-Za-z]/g, ''));
const cidadeEmTxtOuUf = (v) => { const s = String(v || '').trim(); if (s === '') return { cidade: null, uf: null }; const m = /^(.*?)[-–]\s*([A-Za-z]{2})$/.exec(s); return m ? { cidade: m[1].trim(), uf: m[2].toUpperCase() } : { cidade: s, uf: null }; };
if (ufPareceColunaDeEstado({ column_name: 'uf' }) !== true) throw new Error('ABORTA: ufPareceColunaDeEstado chumba `uf`');
if (ufPareceColunaDeEstado({ column_name: 'sufixo' }) !== false) throw new Error('ABORTA: ufPareceColunaDeEstado conta `sufixo` como estado — a régua apanharia lixo');
if (ufPareceColunaDeEstado({ column_name: 'state' }) !== true) throw new Error('ABORTA: ufPareceColunaDeEstado chumba `state`');
if (ufPareceColunaDeEstado({ column_name: 'class' }) !== false) throw new Error('ABORTA: ufPareceColunaDeEstado conta `class` como estado');
if (cidadeEmTxtOuUf('Campinas - SP').uf !== 'SP') throw new Error('ABORTA: cidadeEmTxtOuUf não extrai o UF do par cidade-UF');
if (cidadeEmTxtOuUf('Campinas').uf !== null) throw new Error('ABORTA: cidadeEmTxtOuUf inventa UF onde só há cidade');
if (cidadeEmTxtOuUf('   ').cidade !== null) throw new Error('ABORTA: cidadeEmTxtOuUf produz cidade a partir de espaço');

// ——— o censo ———
const COLS = await sql(`select table_name as tabela, column_name as coluna, data_type as tipo, is_nullable as anulavel
  from information_schema.columns where table_schema='public'
    and (column_name in ('city','uf','state','estado','municipality','municipality_id','municipio','municipio_id','ibge','code_ibge')
         or column_name like '%municip%' or column_name like '%_uf' or column_name='uf')
  order by 1, 2`);
const ESCOLAS = await sql(`select id::text as id, name as nome, city, zone, operating_status, municipality_id::text as municipality_id
  from public.schools order by name`);
const DESPORTO = await sql(`select id::text as id, name as nome, city from public.sports_schools order by name`);
const MUN = await sql(`select id::text as id, name, uf, code_ibge from public.bfr_municipalities order by name`);
const MAPA = await sql(`select matched_by, count(*)::int as pares, count(*) filter (where confirmed_by is not null)::int confirmados
  from public.bfr_school_key_map group by matched_by order by matched_by`);
const CONCESSOES = await sql(`select id::text as id, municipality_id::text as municipality_id, municipal_role,
    (revoked_at is null) as viva, granted_by::text as granted_by
  from public.bfr_municipal_access_grants order by granted_at`);
const PAPEIS = await sql(`select role as papel, count(*)::int as perfis from public.profiles group by role order by 2 desc`);

if (ESCOLAS.length === 0) throw new Error('ABORTA: 0 escolas — o universo declarado por P83 (6) não se confirma, o censo ficaria vacuo');
if (MUN.length > 0 && CONCESSOES.length === 0) throw new Error('ABORTA: há municípios e 0 concessões — a P82 mediu 4 vivas; algo mudou ou a query partiu');

// ——— derivação: o que dá para afirmar sem inventar ———
const cidades = ESCOLAS.map((e) => ({ id: e.id, nome: e.nome, city: e.city, ...cidadeEmTxtOuUf(e.city) }));
const ufNasColunas = COLS.filter(ufPareceColunaDeEstado);
// Uma coluna de estado só serve se tiver valor real em alguma linha: nome sem dados é tão inútil como ausência.
let ufComDados = [];
for (const c of ufNasColunas) {
  const r = await sql(`select count(*)::int as linhas, count("${c.coluna}")::int as nao_nulos from public."${c.tabela}"`);
  ufComDados.push({ tabela: c.tabela, coluna: c.coluna, tipo: c.tipo, linhas: r[0].linhas, nao_nulos: r[0].nao_nulos, tem_dado: Number(r[0].nao_nulos) > 0 });
}
const ufDerivavel = ufComDados.filter((x) => x.tem_dado);
const cidadesComUf = cidades.filter((c) => c.uf !== null);
const cidadeUnica = new Set(cidades.map((c) => c.cidade).filter(Boolean));
// 0 cidades não é aborto: é a resposta à pergunta, e a resposta tem de sair no artefacto.
const becos = [];
if (cidadeUnica.size === 0) becos.push('nenhuma escola tem `city` populada: não há fonte geográfica no banco, logo `municipality_id` só se escreve com dado que o usuário fornece.');
if (cidadeUnica.size > 0 && ufDerivavel.length === 0 && cidadesComUf.length === 0) becos.push('o município é derivável da `city`, mas `bfr_municipalities.uf` é NOT NULL e não há UF em lado nenhum: ou o UF vem do usuário, ou se altera a tabela certificada (mudar a candidata, não preencher dado) — o §11.5 proíbe inventá-lo.');

const out = {
  programa: 'scripts/p90-censo-dados-municipais.mjs', em: new Date().toISOString(), duracao_ms: Date.now() - t0,
  pergunta: 'associar as escolas a município é derivar do que já está no banco, ou é inventar dado?',
  regras: '0 escrita, 0 DDL, 0 publicação, só SELECT e contagens agregadas; perfis por id e papel, sem PII.',
  colunas_geograficas: COLS,
  escolas: ESCOLAS,
  sports_schools: DESPORTO,
  municipios_no_banco: MUN,
  ponte_chaves: MAPA,
  concessoes: CONCESSOES,
  papeis_de_perfil: PAPEIS,
  uf: { colunas_que_parecem_estado: ufNasColunas.map((c) => c.tabela + '.' + c.coluna), medicao_por_coluna: ufComDados, colunas_com_dado_real: ufDerivavel.map((x) => x.tabela + '.' + x.coluna) },
  cidades_das_escolas: cidades,
  conclusao: {
    escolas: ESCOLAS.length,
    escolas_com_municipality_id: ESCOLAS.filter((e) => e.municipality_id !== null).length,
    municipios_no_banco: MUN.length,
    cidades_distintas: [...cidadeUnica],
    uf_derivavel_de_coluna_real: ufDerivavel.length > 0,
    uf_na_string_de_cidade: cidadesComUf.map((c) => c.nome + '=' + c.uf),
    associar_e_derivacao: cidadeUnica.size > 0,
    associar_e_derivacao_sem_invencion_de_uf: cidadeUnica.size > 0 && (ufDerivavel.length > 0 || cidadesComUf.length > 0),
    beco: becos,
  },
};
out.veredito = 'P90_CENSO_DADOS_MUNICIPAIS_MEDIDO';
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`escolas=${out.conclusao.escolas} com_municipality=${out.conclusao.escolas_com_municipality_id} municipios=${out.conclusao.municipios_no_banco}`);
console.log(`cidades_distintas=${JSON.stringify(out.conclusao.cidades_distintas)}`);
console.log(`uf por coluna real: ${out.uf.colunas_com_dado_real.join(', ') || 'NENHUMA'}`);
console.log(`uf dentro da string de cidade: ${out.conclusao.uf_na_string_de_cidade.join(', ') || 'NENHUMA'}`);
console.log(`papeis=${PAPEIS.map((p) => p.papel + ':' + p.perfis).join(' ')}`);
console.log(`concessoes=${CONCESSOES.length} vivas=${CONCESSOES.filter((c) => c.viva).length} ponte=${JSON.stringify(MAPA)}`);
for (const b of out.conclusao.beco) console.log('BECO: ' + b);
console.log(`${out.veredito} · ${out.duracao_ms} ms · ${OUT.replace(REPO + '/', '')}`);
