#!/usr/bin/env node
// p136 (SOMENTE LEITURA, sem credenciais): re-me no ar de hoje as cifras do ledger cujo estado depende dos
// bytes servidos, e nao do banco. A casa nao re-media o ar desde 18/11 (peca sm22-varre-vivo-pen.mjs, corrida
// sobre a v134); o ledger cita `no_ar:56` para a PEN-18 com essa data no titulo, e a sub-contagem «22 sobre
// `body`» e de 12/11 e nunca foi re-medida — o §SM.22 registo-lo como pendencia de medicao, nao de produto.
//
// A URL NAO e dactilografada: le-se do diario de publicacao da versao mais nova em disco, pelo nome do campo.
// Antes de contar qualquer coisa, a peca PROVA que os bytes que esta a contar sao os bytes que esse mesmo
// diario registou como ar (`conferencia_no_ar.md5_agora` / `bytes_agora`); sem essa identidade, a contagem
// seria de um disco ou de uma cache, e a casa chama-lhe estado publicado so depois de a provar.
//
// Saida: contagens, comprimentos e mascaras. Nenhum valor literal de chave, nenhum token, nenhuma senha.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const PECA = 'scripts/p136-varre-cifras-do-ledger-no-ar.mjs';
const SUF = process.env.P136_SUF ? '-' + process.env.P136_SUF : '-22-11';
const OUT = join(REPO, 'evidence/p136-varre-cifras-do-ledger-no-ar' + SUF + '.json');
if (existsSync(OUT)) throw new Error(`ABORTA: ${OUT} existe — correr com P136_SUF=novo, nao por cima`);

// 1) o diario de publicacao mais recente em disco (escolhido por numero de versao lido do nome, nao lembrado)
const diarios = readdirSync(REPO)
  .filter((f) => /^audit-publicacao-v\d+\.json$/.test(f))
  .map((f) => ({ f, v: Number(/v(\d+)\.json$/.exec(f)[1]) }))
  .sort((a, b) => b.v - a.v);
if (!diarios.length) throw new Error('ABORTA: nenhum audit-publicacao-vNNN.json no disco');
const DIARIO = diarios[0].f;
const d = JSON.parse(readFileSync(join(REPO, DIARIO), 'utf8'));
const url = d.deploy && d.deploy.url;
if (!url) throw new Error(`ABORTA: ${DIARIO} nao tem deploy.url`);
const reg = d.conferencia_no_ar || {};
if (!reg.md5_agora || !reg.bytes_agora) throw new Error(`ABORTA: ${DIARIO} nao tem conferencia_no_ar.md5_agora/bytes_agora`);

// 2) apanha o shell sem cache e confere a identidade ANTES de contar
const r = await fetch(url + '/', { headers: { 'cache-control': 'no-cache' }, cache: 'no-store' });
const buf = Buffer.from(await r.arrayBuffer());
const texto = buf.toString('utf8');
const md5 = createHash('md5').update(buf).digest('hex');
const identidade = {
  diario: DIARIO, versao_registada: diarios[0].v, url_lida_do_diario: url,
  status: r.status, bytes_apanhados: buf.length, md5_apanhado: md5,
  bytes_registrados_no_diario: reg.bytes_agora, md5_registrado_no_diario: reg.md5_agora,
  byte_identico_ao_ar_registrado: md5 === reg.md5_agora && buf.length === reg.bytes_agora,
};
if (!identidade.byte_identico_ao_ar_registrado) {
  writeFileSync(OUT, JSON.stringify({ identidade, estado: 'DIVERGE_DO_AR_REGISTRADO — nenhuma cifra contada', em: new Date().toISOString() }, null, 2) + '\n');
  console.log('DIVERGE: ar apanhado ' + md5 + '/' + buf.length + ' vs registado ' + reg.md5_agora + '/' + reg.bytes_agora);
  process.exit(1);
}

// 3) as predicas, copiadas da peca de 18/11 para que a regua nao mude entre as duas corridas. O literal e
// lido COM as suas flags (`/…/g`), porque a contagem depende do `g`: se o produtor mudar a flag, mudo eu.
const velha = readFileSync(join(REPO, 'scripts/sm22-varre-vivo-pen.mjs'), 'utf8');
const linhaDe = (nome) => {
  const m = new RegExp('  ' + nome + ': (/.*/[a-z]*),').exec(velha);
  if (!m) throw new Error(`ABORTA: nao li a predica ${nome} em scripts/sm22-varre-vivo-pen.mjs`);
  const mm = /^\/([\s\S]*)\/([a-z]*)$/.exec(m[1]);
  if (!mm) throw new Error(`ABORTA: literal de regex nao reconhecido em ${nome}: ${m[1]}`);
  if (!mm[2].includes('g')) throw new Error(`ABORTA: a predica ${nome} nao tem a flag g, a contagem por ocorrencia nao vale: ${m[1]}`);
  return { literal_do_produtor: m[1], corpo: mm[1], flags: mm[2] };
};
const P18 = linhaDe('pen18_MutationObserver');
const RE_OBS = new RegExp(P18.corpo, P18.flags);
const nObs = (texto.match(RE_OBS) || []).length;

// A sub-contagem de 12/11 («22 sobre body») nunca teve regua escrita; escrevo-a aqui com a janela declarada:
// para cada `new MutationObserver`, procura o `.observe(` seguinte e le o alvo ate JANELA_OBS caracteres.
// A JANELA_OBS e governada pelo intervalo medido no proprio corpus, nao escolhida: na 1.ª corrida (sufixo
// sm36) usei 400 sem a medir e ela cortava um caso real — a varredura dos 56 intervalos sem janela deu
// min 25, mediana 40, p90 148, max 481, e ZERO construtores sem `.observe(` no resto do documento. 800 e o
// primeiro degrau da escada medida (200/400/800/1600/…) com 0 casos fora, com margem de 1,66x sobre o max.
// Trocar este numero sem re-correr a varredura e o defeito do §SM.34: o portao abaixo vigia os dois sentidos.
const JANELA_OBS = 800;
const pos = [];
let m2; RE_OBS.lastIndex = 0;
while ((m2 = RE_OBS.exec(texto)) !== null) pos.push(m2.index);

// Uma prédica por classe de falha, cada uma com o seu positivo: SEM_OBSERVE_NO_RESTO_DO_DOCUMENTO e o
// construtor sem `.observe(` nenhum atras de si; INTERVALO_ACIMA_DA_JANELA e o caso em que o `.observe(`
// existe mas a janela declarada nao o alcanca (e o que a 1.ª corrida escondia dentro da 1.ª classe).
const CLASSE_SEM = 'SEM_OBSERVE_NO_RESTO_DO_DOCUMENTO';
const CLASSE_FORA = 'INTERVALO_ACIMA_DA_JANELA';
const PAR_A_LADO = /\.observe\(\s*([A-Za-z_.$]{1,40})/;
const pareia = (texto2, janela) => posDe(texto2).map((p) => {
  const i = texto2.indexOf('.observe(', p);
  const intervalo = i === -1 ? null : i - p;
  if (i === -1) return { pos: p, intervalo, alvo: CLASSE_SEM };
  if (intervalo > janela) return { pos: p, intervalo, alvo: CLASSE_FORA };
  const o = PAR_A_LADO.exec(texto2.slice(p, p + janela));
  return { pos: p, intervalo, alvo: o ? o[1] : 'OBSERVE_SEM_ALVO_IDENTIFICAVEL' };
});
function posDe(texto2) {
  const re = new RegExp(P18.corpo, P18.flags);
  const out2 = [];
  let k;
  while ((k = re.exec(texto2)) !== null) out2.push(k.index);
  return out2;
}
const ocorr = pareia(texto, JANELA_OBS);
const alvos = ocorr.map((o) => o.alvo);
const intervalos = ocorr.filter((o) => o.intervalo !== null).map((o) => o.intervalo).sort((a, b) => a - b);
const estatisticasDos = (v) => ({
  n: v.length,
  min: v[0] ?? null,
  mediana: v.length ? v[Math.floor(v.length / 2)] : null,
  p90: v.length ? v[Math.floor(v.length * 0.9)] : null,
  max: v[v.length - 1] ?? null,
});
const porAlvo = {};
for (const a of alvos) porAlvo[a] = (porAlvo[a] || 0) + 1;
const sobreBody = alvos.filter((a) => a === 'document.body').length;
const semObserve = alvos.filter((a) => a === CLASSE_SEM).length;
const foraDaJanela = alvos.filter((a) => a === CLASSE_FORA).length;
const semAlvo = alvos.filter((a) => a === 'OBSERVE_SEM_ALVO_IDENTIFICAVEL').length;
const maiorIntervaloCorpus = estatisticasDos(intervalos).max;

// Os dois fixtures que dão positivo às duas classes de falha, construídos em tempo de execução. Sem eles a
// classe de `INTERVALO_ACIMA_DA_JANELA` seria um ramo morto — a forma que o §SM.32 passou a contar.
const FIX_CURTO = 'new MutationObserver(f);' + ' '.repeat(JANELA_OBS - 30) + 'x.observe(y);';
const FIX_LONGO = 'new MutationObserver(f);' + ' '.repeat(JANELA_OBS + 40) + 'x.observe(y);';
const fixCurto = pareia(FIX_CURTO, JANELA_OBS);
const fixLongo = pareia(FIX_LONGO, JANELA_OBS);
const FIX_SEM_ALVO = 'new MutationObserver(f); x.observe((a), b);';
const fixSemAlvo = pareia(FIX_SEM_ALVO, JANELA_OBS);
const FIX_SEM_OBS = 'new MutationObserver(f); e nada de observe neste resto.';
const fixSemObserve = pareia(FIX_SEM_OBS, JANELA_OBS);
const fixturesObs = {
  curto: { distancia_medida: fixCurto[0].intervalo, classe: fixCurto[0].alvo, dentro_da_janela: fixCurto[0].intervalo <= JANELA_OBS },
  longo: { distancia_medida: fixLongo[0].intervalo, classe: fixLongo[0].alvo, fora_da_janela: fixLongo[0].intervalo > JANELA_OBS },
  sem_alvo: { classe: fixSemAlvo[0].alvo, como_esperado: fixSemAlvo[0].alvo === 'OBSERVE_SEM_ALVO_IDENTIFICAVEL' },
  sem_observe: { classe: fixSemObserve[0].alvo, como_esperado: fixSemObserve[0].alvo === CLASSE_SEM },
};


// 4) a cifra com que esta corrida se compara NAO e lembrada por mim: le-se da corrida de 18/11 em disco.
const vivo1811 = JSON.parse(readFileSync(join(REPO, 'evidence/sm22-varre-vivo-pen-18-11b.json'), 'utf8'));
const reg1811 = vivo1811.marcadores && vivo1811.marcadores.pen18_MutationObserver;
if (!reg1811 || typeof reg1811.no_ar !== 'number') {
  throw new Error('ABORTA: nao li marcadores.pen18_MutationObserver.no_ar na corrida de 18/11');
}

// 4b) controlo positivo da regua: a mesma predica, aplicada a candidata v134 guardada em disco, tem de
// reproduzir a cifra que a corrida de 18/11 obteve no ar daquele dia. Se reproduzir, a diferenca de hoje
// e do ar; se nao reproduzir, a culpa e da minha regua e o veredito nao pode ser emitido.
const V134 = join(REPO, 'bfr-candidata-v134-sidebar-escondida/index.html');
let controlo = { ficheiro: 'bfr-candidata-v134-sidebar-escondida/index.html', existe: existsSync(V134) };
if (controlo.existe) {
  const t134 = readFileSync(V134, 'utf8');
  controlo = { ...controlo, contagem_da_minha_predica: (t134.match(new RegExp(P18.corpo, P18.flags)) || []).length, contagem_registrada_em_18_11: reg1811.no_ar };
  controlo.reproduz_a_corrida_velha = controlo.contagem_da_minha_predica === controlo.contagem_registrada_em_18_11;
}

const emissor = readFileSync(join(REPO, PECA));

// 5) portoes. Cada um com a cara medida e com positivo possivel: as tres classes de falha teem fixture, a
// janela e confrontada com o intervalo que ela governa (corpus <= e fixture >), e a cifra e confrontada com
// a corrida de 18/11 lida do disco. Nao ha aqui gate de soma de histograma: isso seria contar-me a mim mesmo.
const PORTOES = [
  ['a_identidade_do_ar_bate_com_o_registo_de_pos_deploy', identidade.byte_identico_ao_ar_registrado, true],
  ['o_controlo_reproduz_a_cifra_de_18_11_na_candidata_v134', controlo.contagem_da_minha_predica ?? null, controlo.contagem_registrada_em_18_11 ?? null],
  ['a_predica_lida_do_produtor_tem_a_flag_global', P18.flags.includes('g'), true],
  ['a_janela_observe_cobre_o_maior_intervalo_medido_no_corpus',
    [maiorIntervaloCorpus <= JANELA_OBS, fixturesObs.longo.distancia_medida > JANELA_OBS], [true, true]],
  ['nenhuma_das_tres_classes_de_falha_dispara_no_corpus', [semObserve, foraDaJanela, semAlvo], [0, 0, 0]],
  ['cada_classe_de_falha_tem_positivo_em_fixture',
    [fixturesObs.sem_observe.como_esperado, fixturesObs.longo.classe === CLASSE_FORA, fixturesObs.sem_alvo.como_esperado],
    [true, true, true]],
];
const lista = PORTOES.map(([nome, obtido, esperado]) => ({ nome, obtido, esperado, ok: JSON.stringify(obtido) === JSON.stringify(esperado) }));
const falhas = lista.filter((p) => !p.ok).length;
const total = lista.length;

const estado = controlo.existe && controlo.reproduz_a_corrida_velha === false
  ? 'REGUA_NAO_REPRODUZ_A_CORRIDA_VELHA — veredito nao emitido'
  : falhas > 0 ? 'PORTAO_VERMELHO — veredito nao emitido' : 'MEDIDO';
const out = {
  peca: PECA, em: new Date().toISOString(), emissor_bytes: emissor.length,
  emissor_md5: createHash('md5').update(emissor).digest('hex'),
  estado,
  predica_lida_do_produtor: P18.literal_do_produtor,
  pergunta: 'quantos MutationObserver ha no ar de hoje, e onde cada um assenta — e a cifra do ledger (56, de 18/11 sobre a v134) ainda bate?',
  identidade, controlo_da_regua: controlo,
  janela_observe: JANELA_OBS,
  intervalos_do_corpus: estatisticasDos(intervalos),
  fixtures_de_janela: fixturesObs,
  portoes: { total, falhas, lista },
  pen18: {
    no_ar_hoje: nObs, no_ar_registrado_em_18_11: reg1811.no_ar, delta: nObs - reg1811.no_ar,
    sobre_document_body: sobreBody, sem_observe_no_resto: semObserve, intervalo_acima_da_janela: foraDaJanela,
    observe_sem_alvo_identificavel: semAlvo, por_alvo: porAlvo,
  },
  o_que_prova: [
    'os bytes contados sao os do ar registado no diario (md5 e comprimento conferidos antes de contar)',
    'a contagem de `new MutationObserver` no ar de hoje, com a mesma predica lida da peca de 18/11, com as flags',
    'o alvo do `.observe(` seguinte a cada construtor, com a janela governada pelo maior intervalo medido no corpus e fixture acima dela',
    'que nenhuma das tres classes de falha da pairing e ramo morto: cada uma tem fixture que a faz disparar',
    'que a minha predica reproduce a corrida de 18/11 sobre a candidata v134 guardada em disco',
  ],
  o_que_NAO_prova: [
    'que o numero de construtores seja o numero de ouvintes activos em execucao — isto e texto estatico, nao runtime',
    'que a sub-contagem de 12/11 («22 sobre body») seja comparavel com a de hoje: ela nunca teve regua escrita, e esta e a primeira corrida com janela medida',
    'que nenhuma das cifras de PEN-19/26/29/30/32/33 (outros marcadores da peca de 18/11) se tenha movido — esta peca so conta a PEN-18',
    'que o ar corresponda a candidata em disco se o portao de identidade falhar — nesse caso a peca aborta antes de contar',
    'que a janela de hoje continue a cobrir o corpus depois da proxima publicacao: o portao vale no instante da corrida',
  ],
};
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log('identidade: ' + identidade.versao_registada + ' md5=' + md5 + ' bytes=' + buf.length + ' igual_ao_registrado=' + identidade.byte_identico_ao_ar_registrado);
console.log('intervalos sem janela: ' + JSON.stringify(estatisticasDos(intervalos)) + ' janela=' + JANELA_OBS + ' sem_observe_no_resto=' + semObserve + ' acima_da_janela=' + foraDaJanela + ' sem_alvo=' + semAlvo);
console.log('pen18: no_ar_hoje=' + nObs + ' (a corrida de 18/11 diz ' + reg1811.no_ar + ') sobre_document_body=' + sobreBody);
console.log('por_alvo: ' + JSON.stringify(porAlvo));
console.log('portoes: ' + (total - falhas) + '/' + falhas + ' · estado=' + estado);
console.log('escrito em ' + OUT);
if (falhas > 0) process.exit(1);

