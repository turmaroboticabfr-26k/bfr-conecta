#!/usr/bin/env node
// p138 (SO LEITURA, sem credenciais dactilografadas): re-corre o censo que a PEN-13 cita de 18/11 — o estado
// `pending` em `public.profiles` — e a regulacao que o sustenta (a soma das linhas por papel tem de bater com
// o total, senao um `pending` a zero nao valeria nada). As tres predicas SQL sao copiadas da peca de 18/11 e
// ha um portao que confere que continuam a aparecer nela, normalizada a whitespace: se o produtor mudar, esta
// copia deixa de bater e o portao da o aviso, em vez de a frase do diario passar a descrever outra cousa.
//
// Saida: contagens, papeis e mascaras de colunas. Nenhum valor literal de chave, nenhum token, nenhuma senha.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sql } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const PECA = 'scripts/p138-censo-de-perfis-por-papel.mjs';
const PRODUTOR = 'scripts/sm22-varre-formas-pen.mjs';
const ANTERIOR = 'evidence/sm22-varre-formas-pen-18-11.json';
const SUF = process.env.P138_SUF ? '-' + process.env.P138_SUF : '-22-11';
const OUT = join(REPO, 'evidence/p138-censo-de-perfis-por-papel' + SUF + '.json');
if (existsSync(OUT)) throw new Error(`ABORTA: ${OUT} existe — correr com P138_SUF=novo, nao por cima`);

// As tres frases, tal como estao na peca de 18/11. A quarta (o default das colunas) e a do proprio catalogo.
const SQL_COLOSSO = `select table_name as tabela, column_name as coluna, data_type as tipo, is_nullable as nulavel, column_default as default
  from information_schema.columns where table_schema = 'public' and column_name in ('role','status') and table_name in ('profiles','access_requests') order by 1, 2`;
const SQL_POR_PAPEL = `select coalesce(role::text,'(nulo)') as papel, count(*)::int as linhas from public.profiles group by 1 order by 2 desc, 1`;
const SQL_TOTAL = `select count(*)::int as linhas from public.profiles`;

const fonteProdutor = readFileSync(join(REPO, PRODUTOR), 'utf8');
const norm = (s) => s.replace(/\s+/g, ' ').trim();
const as_predicas_sao_do_produtor = [SQL_COLOSSO, SQL_POR_PAPEL, SQL_TOTAL]
  .map((q) => ({ trecho: norm(q).slice(0, 46) + '…', aparece_no_produtor: norm(fonteProdutor).includes(norm(q)) }));

const colunasPapel = await sql(SQL_COLOSSO);
const porPapel = await sql(SQL_POR_PAPEL);
const totalPerfis = await sql(SQL_TOTAL);
const somaPapel = porPapel.reduce((s, x) => s + x.linhas, 0);
const total = totalPerfis[0].linhas;

// A regulacao, como funcao com as duas direcoes provadas: o corpus tem de bater e um fixture em que falta um
// papel nao pode bater. Sem o fixture, o portao e um ramo que so sabe dizer sim.
const regula = (dist, total2) => dist.reduce((s, x) => s + x.linhas, 0) === total2;
const FIX_SEM_PAPEL = [{ papel: 'secretary', linhas: 4 }, { papel: 'developer', linhas: 3 }];
const FIX_IGUAL = [{ papel: 'secretary', linhas: 4 }, { papel: 'developer', linhas: 3 }];
const fixtures = {
  sem_um_papel: { linhas: FIX_SEM_PAPEL, total: 28, regula: regula(FIX_SEM_PAPEL, 28) },
  todas_as_linhas_contadas: { linhas: FIX_IGUAL, total: 7, regula: regula(FIX_IGUAL, 7) },
};

const pendente = porPapel.find((x) => x.papel === 'pending');
const defaultProfiles = colunasPapel.find((x) => x.tabela === 'profiles' && x.coluna === 'role') || null;

// O numero com que esta corrida se compara nao e lembrado por mim: le-se do artefacto de 18/11 em disco.
if (!existsSync(join(REPO, ANTERIOR))) throw new Error(`ABORTA: ${ANTERIOR} nao esta em disco — nao ha com que comparar`);
const velho = JSON.parse(readFileSync(join(REPO, ANTERIOR), 'utf8')).pen13;

const PORTOES = [
  ['as_tres_predicas_de_hoje_aparecem_na_peca_de_18_11', as_predicas_sao_do_produtor.filter((x) => x.aparece_no_produtor).length, 3],
  ['a_regulacao_bate_no_corpus_e_o_fixture_partido_nao_bate', [regula(porPapel, total), fixtures.sem_um_papel.regula, fixtures.todas_as_linhas_contadas.regula], [true, false, true]],
  ['o_default_da_coluna_e_lido_do_catalogo_e_menciona_o_estado_por_o_qual_a_pendencia_existe', defaultProfiles && /pending/.test(defaultProfiles.default || ''), true],
  ['nenhuma_linha_fica_fora_dos_papeis_do_censo', total - somaPapel, 0],
];
const lista = PORTOES.map(([nome, obtido, esperado]) => ({ nome, obtido, esperado, ok: JSON.stringify(obtido) === JSON.stringify(esperado) }));
const falhas = lista.filter((p) => !p.ok).length;

const emissor = readFileSync(join(REPO, PECA));
const out = {
  peca: PECA, em: new Date().toISOString(), emissor_bytes: emissor.length,
  emissor_md5: createHash('md5').update(emissor).digest('hex'),
  estado: falhas > 0 ? 'PORTAO_VERMELHO — veredito nao emitido' : 'MEDIDO',
  pergunta: 'o censo que a PEN-13 cita de 18/11 (28 perfis, 2 em pending, default \'pending\'::account_role) ainda e o estado vivo do banco?',
  predicas_lidas_do_produtor: as_predicas_sao_do_produtor,
  colunas_de_papel: colunasPapel,
  distribuicao_profiles: porPapel,
  total_profiles: total,
  soma_por_papel: somaPapel,
  regulacao_bate: regula(porPapel, total),
  linhas_em_pending: pendente ? pendente.linhas : 0,
  pending_no_censo: !!pendente,
  contraste_com_18_11: {
    artifacto: ANTERIOR,
    total: { '18_11': velho.total_profiles, hoje: total, delta: total - velho.total_profiles },
    pending: { '18_11': velho.linhas_em_pending, hoje: pendente ? pendente.linhas : 0, delta: (pendente ? pendente.linhas : 0) - velho.linhas_em_pending },
    papeis_no_censo: { '18_11': velho.distribuicao_profiles.length, hoje: porPapel.length, delta: porPapel.length - velho.distribuicao_profiles.length },
  },
  fixtures_de_regulacao: fixtures,
  portoes: { total: lista.length, falhas, lista },
  o_que_prova: [
    'quantas linhas ha hoje em public.profiles, como se distribuem por papel e se a soma bate com o total',
    'quantas linhas estao no estado pending hoje, e se esse estado aparece no censo',
    'qual e o default lido do catalogo para a coluna profiles.role, com a nulabilidade',
    'que as tres frases SQL desta corrida sao as mesmas que a peca de 18/11 usa (comparacao normalizada, publicada)',
    'que a regulacao tem positivo: o fixture com um papel a menos devolve falso',
  ],
  o_que_NAO_prova: [
    'que o estado pending seja escrito por fluxo humano: o censo conta linhas, nao a origem delas',
    'que a aprovacao administrativa (pending -> papel) funcione: isso e uma escrita, e precisa de OK proprio',
    'nada sobre as colunas de access_requests alem do default que o catalogo devolve',
  ],
};
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log('total_profiles=' + total + ' soma_por_papel=' + somaPapel + ' regulacao=' + out.regulacao_bate + ' papeis=' + porPapel.length);
console.log('pending: hoje=' + out.linhas_em_pending + ' (18/11: ' + velho.linhas_em_pending + ') delta=' + out.contraste_com_18_11.pending.delta);
console.log('total: hoje=' + total + ' (18/11: ' + velho.total_profiles + ') delta=' + out.contraste_com_18_11.total.delta);
console.log('default profiles.role = ' + (defaultProfiles ? defaultProfiles.default : 'NAO LIDO') + ' nulavel=' + (defaultProfiles ? defaultProfiles.nulavel : '-'));
console.log('predicas do produtor encontradas: ' + as_predicas_sao_do_produtor.filter((x) => x.aparece_no_produtor).length + '/' + as_predicas_sao_do_produtor.length);
console.log('portoes: ' + (lista.length - falhas) + '/' + falhas + ' · estado=' + out.estado);
console.log('escrito em ' + OUT);
if (falhas > 0) process.exit(1);
