#!/usr/bin/env node
// p137 (SOMENTE LEITURA, sem credenciais): a pergunta que o agrupamento por OK nao podia responder sozinha —
// ha alguma candidata pronta a publicar, ou o grupo «OK de publicacao» esta bloqueado sobre trabalho que ainda
// nao existe? Varre os directorios `bfr-candidata-vNNN-*` e os diarios `audit-publicacao-vNNN.json` do mesmo
// disco e compara as duas listas por numero de versao LIDO DO NOME, nunca lembrado. Fecha com a pegada: o
// shell da candidata mais nova e o mesmo byte a byte do que o diario mais novo registou como ar.
//
// Saida: versoes, contagens e mascaras de hash. Nenhum valor literal de chave, nenhum token, nenhuma senha.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const PECA = 'scripts/p137-candidatas-contra-diarios-de-publicacao.mjs';
const SUF = process.env.P137_SUF ? '-' + process.env.P137_SUF : '-22-11';
const OUT = join(REPO, 'evidence/p137-candidatas-contra-diarios-de-publicacao' + SUF + '.json');
if (existsSync(OUT)) throw new Error(`ABORTA: ${OUT} existe — correr com P137_SUF=novo, nao por cima`);

// 1) so directorios: um ficheiro com o mesmo prefixo (`bfr-candidata-v116-mobile-buttons.js`) nao e candidata.
const entradas = readdirSync(REPO, { withFileTypes: true });
const candidatas = entradas.filter((e) => e.isDirectory() && /^bfr-candidata-v\d+/.test(e.name))
  .map((e) => ({ nome: e.name, v: Number(/^bfr-candidata-v(\d+)/.exec(e.name)[1]) }))
  .sort((a, b) => a.v - b.v || a.nome.localeCompare(b.nome));
const diarios = readdirSync(REPO).filter((f) => /^audit-publicacao-v\d+\.json$/.test(f))
  .map((f) => ({ nome: f, v: Number(/^audit-publicacao-v(\d+)\.json$/.exec(f)[1]) }))
  .sort((a, b) => a.v - b.v);
if (!candidatas.length || !diarios.length) throw new Error('ABORTA: falta uma das duas listas em disco');

const vCandMax = candidatas[candidatas.length - 1].v;
const vDiarioMax = diarios[diarios.length - 1].v;
const acima = candidatas.filter((c) => c.v > vDiarioMax).map((c) => c.nome);
const semDiario = candidatas.filter((c) => !diarios.some((d) => d.v === c.v)).map((c) => c.nome);

// 2) a pega: o shell da candidata mais nova contra o que o diario mais novo registou como ar.
const dirMaisNova = join(REPO, candidatas[candidatas.length - 1].nome);
const shellPath = join(dirMaisNova, 'index.html');
const diario = JSON.parse(readFileSync(join(REPO, diarios[diarios.length - 1].nome), 'utf8'));
const reg = diario.conferencia_no_ar || {};
const pegada = {
  caminho_lido_do_nome_do_directorio: candidatas[candidatas.length - 1].nome + '/index.html',
  existe: existsSync(shellPath),
};
if (pegada.existe) {
  const buf = readFileSync(shellPath);
  pegada.bytes = buf.length;
  pegada.md5 = createHash('md5').update(buf).digest('hex');
  pegada.registo_do_diario = { md5: reg.md5_agora ?? null, bytes: reg.bytes_agora ?? null };
  pegada.byte_identico_ao_ar_registrado = pegada.md5 === reg.md5_agora && pegada.bytes === reg.bytes_agora;
}

const PORTOES = [
  ['a_versao_mais_nova_em_disco_e_a_mesma_do_diario_mais_novo', [vCandMax, vDiarioMax], [vDiarioMax, vCandMax]],
  ['nenhuma_candidata_e_mais_nova_que_a_versao_publicada', acima.length, 0],
  ['o_shell_da_candidata_mais_nova_bate_com_o_ar_do_diario_mais_novo', pegada.byte_identico_ao_ar_registrado ?? null, true],
];
const lista = PORTOES.map(([nome, obtido, esperado]) => ({ nome, obtido, esperado, ok: JSON.stringify(obtido) === JSON.stringify(esperado) }));
const falhas = lista.filter((p) => !p.ok).length;

const emissor = readFileSync(join(REPO, PECA));
const out = {
  peca: PECA, em: new Date().toISOString(), emissor_bytes: emissor.length,
  emissor_md5: createHash('md5').update(emissor).digest('hex'),
  estado: falhas > 0 ? 'PORTAO_VERMELHO' : 'MEDIDO',
  pergunta: 'ha candidata pronta a publicar, ou o grupo «OK de publicacao» das linhas abertas esta bloqueado sobre trabalho que ainda nao existe?',
  contagens: { directorios_candidata: candidatas.length, diarios_de_publicacao: diarios.length, versoes_candidatas: [...new Set(candidatas.map((c) => c.v))].length },
  mais_nova_candidata: candidatas[candidatas.length - 1].nome,
  mais_novo_diario: diarios[diarios.length - 1].nome,
  candidatas_acima_da_publicada: acima,
  candidatas_sem_diario_de_publicacao: semDiario,
  pega_da_mais_nova: pegada,
  portoes: { total: lista.length, falhas, lista },
  o_que_prova: [
    'quantos directorios de candidata e quantos diarios de publicacao existem neste disco, por numero lido do nome',
    'que a mais nova candidata em disco e a mesma versao do mais novo diario de publicacao',
    'que a shell da candidata mais nova e byte a byte o ar que esse diario registou',
    'que nenhuma candidata em disco esta acima da versao publicada',
  ],
  o_que_NAO_prova: [
    `por que razao as ${semDiario.length} pastas sem diario nao o tem: a peca conta apenas quantas estao acima da versao publicada (zero), e nao distingue trabalho abandonado de trabalho superado`,
    `que as ${semDiario.length} pastas sem diario estao bem ou mal`,
    'que o ar publicado e o ar servido: isso e a peca p136, que apanha a shell por URL lida do proprio diario',
    'que nada ha a publicar no futuro: a pergunta desta peca e se ha candidata pronta AGORA',
  ],
};
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log('candidatas=' + out.contagens.directorios_candidata + ' (versoes distintas ' + out.contagens.versoes_candidatas + ') diarios=' + out.contagens.diarios_de_publicacao);
console.log('mais_nova=' + out.mais_nova_candidata + '  mais_novo_diario=' + out.mais_novo_diario + '  acima_da_publicada=' + acima.length);
console.log('sem_diario=' + semDiario.length + ': ' + semDiario.join(' | '));
console.log('pega: ' + (pegada.md5 || 'sem ficheiro') + '/' + (pegada.bytes || 0) + ' igual_ao_diario=' + pegada.byte_identico_ao_ar_registrado);
console.log('portoes: ' + (lista.length - falhas) + '/' + falhas + ' · estado=' + out.estado);
console.log('escrito em ' + OUT);
if (falhas > 0) process.exit(1);
