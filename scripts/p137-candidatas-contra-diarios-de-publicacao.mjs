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
// Face do §SM.73, mesma raiz do §SM.68 T1: esta regua lia `conferencia_no_ar.md5_agora`, nome que o diario
// mais novo (v144) nao declara — ele declara `shell_md5`. Ler um campo que o produtor nao escreve nao devolve
// «medida ausente», devolve `undefined`, e a igualdade com `undefined` so pode dar vermelho: um portao de
// identidade incapaz de verde. O remedio e do lado do leitor: uma familia de grafias aceites, resolvida contra
// as chaves que o registo realmente tem, abortando quando nenhuma resolve ou quando duas resolvem. O mecanismo
// e o do p116; as familias governam blocos diferentes (la o `bundle`, aqui a `conferencia_no_ar` da shell).
const FAMILIAS_SHELL = {
  md5_da_shell: ['md5_agora', 'shell_md5'],
  bytes_da_shell: ['bytes_agora', 'shell_bytes'],
};
const norma = (k) => String(k).replace(/[^a-z0-9]/gi, '').toLowerCase();
function resolve_campo(obj, familia, onde) {
  const aceites = familia.map(norma);
  const nomes = Object.keys(obj || {});
  const batentes = nomes.filter((n) => aceites.includes(norma(n)));
  if (batentes.length === 0) throw new Error('ABORTA: ' + onde + ' nao declara nenhuma grafia de «' + familia.join('/') + '» — as chaves lidas sao ' + JSON.stringify(nomes).slice(0, 200));
  if (batentes.length > 1) throw new Error('ABORTA: ' + onde + ' declara ' + batentes.length + ' grafias da mesma familia (' + batentes.join(', ') + ') — a regua nao escolhe uma por ordem de Object.keys');
  return { nome: batentes[0], valor: obj[batentes[0]] };
}
// As fixtures dao o positivo e o negativo a cada ramo: sem elas a familia e uma lista lembrada, e um `0` no
// censo nao quer dizer «nada cai aqui», quer dizer «a expressao nunca foi tentada».
const FIX_RESOL = [];
{
  const aborta = (fn) => { try { fn(); return 'nao_aborta'; } catch (e) { return String(e.message).startsWith('ABORTA:') ? 'aborta' : 'erro_' + e.message.slice(0, 20); } };
  const caso = (id, espera, obtido) => FIX_RESOL.push({ id, espera, obtido, bate: espera === obtido });
  const F = (bloco, fam) => { try { return resolve_campo(bloco, fam, 'f').nome; } catch (e) { return aborta(() => { throw e; }); } };
  caso('r1_grafia_antiga_resolve', 'md5_agora', F({ md5_agora: 'a', bytes_agora: 1 }, FAMILIAS_SHELL.md5_da_shell));
  caso('r2_grafia_nova_resolve', 'shell_md5', F({ shell_md5: 'a', shell_bytes: 1 }, FAMILIAS_SHELL.md5_da_shell));
  caso('r3_bytes_na_grafia_do_produtor', 'shell_bytes', F({ shell_md5: 'a', shell_bytes: 1 }, FAMILIAS_SHELL.bytes_da_shell));
  caso('r3b_bytes_na_grafia_antiga', 'bytes_agora', F({ md5_agora: 'a', bytes_agora: 1 }, FAMILIAS_SHELL.bytes_da_shell));
  caso('r4_duas_grafias_aborta', 'aborta', F({ md5_agora: 'a', shell_md5: 'b' }, FAMILIAS_SHELL.md5_da_shell));
  caso('r5_nenhuma_grafia_aborta', 'aborta', F({ versao: 'x', percentagem: 100 }, FAMILIAS_SHELL.md5_da_shell));
  caso('r6_bloco_vazio_aborta', 'aborta', F({}, FAMILIAS_SHELL.md5_da_shell));
  caso('r7_camel_de_outro_bloco_nao_e_aceite', 'aborta', F({ htmlMd5: 'a' }, FAMILIAS_SHELL.md5_da_shell));
}

const dirMaisNova = join(REPO, candidatas[candidatas.length - 1].nome);
const shellPath = join(dirMaisNova, 'index.html');
const diarioNome = diarios[diarios.length - 1].nome;
const diario = JSON.parse(readFileSync(join(REPO, diarioNome), 'utf8'));
const reg = diario.conferencia_no_ar || {};
const pegada = {
  caminho_lido_do_nome_do_directorio: candidatas[candidatas.length - 1].nome + '/index.html',
  existe: existsSync(shellPath),
};
if (pegada.existe) {
  const buf = readFileSync(shellPath);
  pegada.bytes = buf.length;
  pegada.md5 = createHash('md5').update(buf).digest('hex');
  const campo_md5 = resolve_campo(reg, FAMILIAS_SHELL.md5_da_shell, 'conferencia_no_ar de ' + diarioNome);
  const campo_bytes = resolve_campo(reg, FAMILIAS_SHELL.bytes_da_shell, 'conferencia_no_ar de ' + diarioNome);
  pegada.grafia_lida_no_diario = { md5: campo_md5.nome, bytes: campo_bytes.nome };
  pegada.registo_do_diario = { md5: String(campo_md5.valor).slice(0, 32), bytes: campo_bytes.valor };
  pegada.byte_identico_ao_ar_registrado = pegada.md5 === campo_md5.valor && pegada.bytes === campo_bytes.valor;
}

// 2b) o numero lido do nome do diario nao ve a letra: `audit-publicacao-v144.json` declara la dentro
// `version: "v144c"`, e e essa letra que tem de bater com a da candidata mais nova, senao o portao (1)
// abaixo diria «a mesma versao» sobre uma letra que nenhum dos dois nomes prova.
const letra_do_diario = String(diario.version ?? 'NAO_DECLARADA');
const letra_da_candidata = /^bfr-candidata-(v\d+[a-z]?)/.exec(candidatas[candidatas.length - 1].nome)[1];

// 2c) censo: cada diario tem de cair numa classe declarada, e todas as classes se imprimem mesmo vazias —
// um «0» sem a lista das classes ao lado e a contagem auto-referente do §SM.60, nao uma cobertura provada.
// Quatro classes, cada uma com positivo medido neste disco: declara, nao declara, nao tem bloco, nao e JSON.
const CLASSES_DECLARADAS = ['declara_a_grafia_da_shell', 'bloco_sem_grafia_da_shell', 'declara_duas_grafias', 'sem_bloco_de_conferencia', 'nao_e_json_lidavel'];
function classe_do_diario(caminho) {
  let texto;
  try { texto = readFileSync(caminho, 'utf8'); } catch (e) { return { classe: 'nao_e_json_lidavel', porque: String(e.message).slice(0, 40) }; }
  let corpo;
  try { corpo = JSON.parse(texto); } catch (e) { return { classe: 'nao_e_json_lidavel', porque: 'JSON.parse: ' + String(e.message).slice(0, 40) }; }
  const bloco = corpo.conferencia_no_ar;
  if (!bloco || typeof bloco !== 'object') return { classe: 'sem_bloco_de_conferencia', porque: 'conferencia_no_ar ausente' };
  try { return { classe: 'declara_a_grafia_da_shell', porque: resolve_campo(bloco, FAMILIAS_SHELL.md5_da_shell, 'x').nome }; }
  catch (e) {
    const msg = String(e.message);
    return { classe: msg.includes('mesma familia') ? 'declara_duas_grafias' : 'bloco_sem_grafia_da_shell', porque: msg.slice(0, 60) };
  }
}
const censo_de_diarios = {};
for (const c of CLASSES_DECLARADAS) censo_de_diarios[c] = [];
for (const d of diarios) {
  const { classe } = classe_do_diario(join(REPO, d.nome));
  (censo_de_diarios[classe] = censo_de_diarios[classe] || []).push(d.nome);
}
const classes_fora_do_declarado = Object.keys(censo_de_diarios).filter((c) => !CLASSES_DECLARADAS.includes(c));
// Cobertura da familia, medida e nao lembrada: cada grafia aceite tem de ter um fixture que a resolva, senao a
// lista cresceu sem que a regua a tentasse. O numero de fixtures nao e portao — seria tautologia com o
// comprimento da propria lista; o que tem positivo e o conjunto das grafias nunca resolvidas.
const ACEITES = FAMILIAS_SHELL.md5_da_shell.concat(FAMILIAS_SHELL.bytes_da_shell);
const grafias_sem_fixture = ACEITES.filter((g) => !FIX_RESOL.some((f) => f.espera === g));

const PORTOES = [
  ['a_versao_numerica_mais_nova_em_disco_e_a_mesma_do_diario_mais_novo', [vCandMax, vDiarioMax], [vDiarioMax, vCandMax]],
  ['a_letra_declarada_dentro_do_diario_e_a_mesma_do_directorio_da_candidata', [letra_do_diario, letra_da_candidata], [letra_da_candidata, letra_do_diario]],
  ['nenhuma_candidata_e_mais_nova_que_a_versao_publicada', acima.length, 0],
  ['o_shell_da_candidata_mais_nova_bate_com_o_ar_do_diario_mais_novo', pegada.byte_identico_ao_ar_registrado ?? null, true],
  ['nenhum_diario_fica_fora_das_classes_declaradas_do_censo', classes_fora_do_declarado, []],
  ['toda_grafia_aceita_da_familia_tem_fixture_que_a_resolve', grafias_sem_fixture, []],
  ['nenhuma_fixture_da_resolucao_bateu_errado', FIX_RESOL.filter((f) => !f.bate).map((f) => f.id), []],
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
  versoes_declaradas: { diario_lido_do_campo_version: letra_do_diario, candidata_lida_do_nome_do_directorio: letra_da_candidata },
  familia_de_grafias_aceites: FAMILIAS_SHELL,
  censo_de_grafias_dos_diarios: { classes_declaradas: CLASSES_DECLARADAS, por_classe: censo_de_diarios, fora_das_classes: classes_fora_do_declarado, grafias_aceitas_sem_fixture: grafias_sem_fixture },
  prova_da_resolucao: FIX_RESOL,
  candidatas_acima_da_publicada: acima,
  candidatas_sem_diario_de_publicacao: semDiario,
  pega_da_mais_nova: pegada,
  portoes: { total: lista.length, falhas, lista },
  o_que_prova: [
    'quantos directorios de candidata e quantos diarios de publicacao existem neste disco, por numero lido do nome',
    'que a mais nova candidata em disco e a mesma versao numerica do mais novo diario de publicacao',
    'que a letra declarada dentro do diario e a mesma do nome do directorio da candidata mais nova',
    'que a shell da candidata mais nova e byte a byte o ar que esse diario registou, na grafia que o propio diario declara',
    'que nenhuma candidata em disco esta acima da versao publicada',
    'em que classe de grafia da shell cai cada diario, com as cinco classes declaradas impressas mesmo vazias',
    'que cada grafia aceite pela familia tem uma fixture que a resolve, provada pelo conjunto das nunca resolvidas',
  ],
  o_que_NAO_prova: [
    `por que razao as ${semDiario.length} pastas sem diario nao o tem: a peca conta apenas quantas estao acima da versao publicada (zero), e nao distingue trabalho abandonado de trabalho superado`,
    `que as ${semDiario.length} pastas sem diario estao bem ou mal`,
    'que o ar publicado e o ar servido: isso e a peca p136, que apanha a shell por URL lida do proprio diario',
    'que nada ha a publicar no futuro: a pergunta desta peca e se ha candidata pronta AGORA',
    'que as cinco classes do censo sejam todas as possiveis: um diario cuja grafia ainda nao entrou na familia cai em «bloco_sem_grafia_da_shell», a mesma classe dum diario que nunca registou a shell — o nome diz o que a predica mede, nao o que o diario quis dizer',
    'que o diario mais novo seja o da candidata mais nova por outro caminho que nao o numero do nome: as letras sao conferidas pelo campo `version`, que o numero nao ve',
  ],
};
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log('candidatas=' + out.contagens.directorios_candidata + ' (versoes distintas ' + out.contagens.versoes_candidatas + ') diarios=' + out.contagens.diarios_de_publicacao);
console.log('mais_nova=' + out.mais_nova_candidata + '  mais_novo_diario=' + out.mais_novo_diario + '  acima_da_publicada=' + acima.length);
console.log('sem_diario=' + semDiario.length + ': ' + semDiario.join(' | '));
console.log('pega: ' + (pegada.md5 || 'sem ficheiro') + '/' + (pegada.bytes || 0) + ' igual_ao_diario=' + pegada.byte_identico_ao_ar_registrado + ' grafia_lida=' + (pegada.grafia_lida_no_diario ? pegada.grafia_lida_no_diario.md5 + '/' + pegada.grafia_lida_no_diario.bytes : 'abortou_antes'));
console.log('versoes_declaradas: diario=' + letra_do_diario + ' directora=' + letra_da_candidata);
console.log('censo_de_grafias: ' + Object.entries(censo_de_diarios).map(([k, v]) => k + '=' + v.length).join(' '));
console.log('fixtures_de_resolucao: ' + FIX_RESOL.filter((f) => f.bate).length + '/' + FIX_RESOL.length + ' sem_fixture=' + JSON.stringify(grafias_sem_fixture));
console.log('portoes: ' + (lista.length - falhas) + '/' + falhas + ' · estado=' + out.estado);
console.log('escrito em ' + OUT);
if (falhas > 0) process.exit(1);
