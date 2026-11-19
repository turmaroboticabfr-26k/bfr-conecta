#!/usr/bin/env node
// SM.23 peça 6 (versão 2) — O QUE O MÓDULO MUNICIPAL LÊ, medido dentro do SEU INVÓLUCRO DECLARADO.
// O que a versão anterior tinha de errado, e por que motivo ela fica no disco e não é apagada:
//   evidence/sm23-formas-de-chamada-na-faixa-municipal-18-11-ANTERIOR-faixa-de-16kb-so-contava-a-grafia-com-ponto.json
//   (1) recortava ±16 000 chars à volta das âncoras `bfrMunicipal`. Não era preciso adivinhar: o produtor
//       DECLARA o invólucro — `<script data-bfr-municipal-module="1">`. É a única fronteira estrutural real do
//       HTML e as três corridas do leitor da aba tinham-na procurado no sítio errado (corpos de função).
//   (2) contava apenas `.from(` com ponto e reportava `from_aspa_simples: faixa=0`. O módulo, porém, abre o
//       próprio helper `ler(chave, build)` e passa-lhe `(from) => from('schools')`: o `from` é PARAMETRO, logo
//       não tem ponto. A mesma corrida listava 11 mesas noutro campo — um zero de grafo foi lido como zero de
//       leitura. Régua que só conhece uma grafia não pode afirmar ausência.
// Aqui: cada verbo de acesso é contado nas DUAS grafias (com ponto e solto), dentro do invólucro e no corpus
// inteiro, e a régua tem fixture positivo OBRIGATÓRIO nas duas grafias, porque foi exactamente isso que faltou.
// Só leitura: fetch dos bytes servidos + texto. Nenhum SQL, nenhum segredo lido ou impresso.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = process.env.SM23_SUF ? '-' + process.env.SM23_SUF : '';
const OUT = join(REPO, `evidence/sm23-involucro-e-grafias-do-modulo-municipal-18-11${SUF}.json`);
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com SM23_SUF=novo, não por cima');
const t0 = Date.now();

const dj = JSON.parse(readFileSync(join(REPO, 'audit-publicacao-v134.json'), 'utf8'));
const alvoUrl = dj.deploy?.url;
if (!alvoUrl || !/^https:\/\/[a-z0-9.-]+\.workers\.dev$/.test(alvoUrl)) throw new Error('ABORTA: deploy.url não é uma origem workers.dev limpa: ' + String(alvoUrl).slice(0, 80));
const resp = await fetch(alvoUrl + '/', { headers: { 'cache-control': 'no-cache' } });
if (!resp.ok) throw new Error('ABORTA: alvo HTTP ' + resp.status);
const corpo = await resp.text();
const bytes = Buffer.byteLength(corpo, 'utf8');
const md5 = createHash('md5').update(corpo, 'utf8').digest('hex');
// Identidade da candidata local: só posso chamar «o que está no ar» àquilo cujos bytes batem com o ficheiro que
// este repositório versionou. Comparo md5, não o nome do ficheiro.
const localTxt = readFileSync(join(REPO, 'bfr-candidata-v134-sidebar-escondida/index.html'), 'utf8');
const localMd5 = createHash('md5').update(localTxt, 'utf8').digest('hex');

const Toca = (alvo, de = corpo) => { const v = []; let i = 0; while ((i = de.indexOf(alvo, i)) >= 0) { v.push(i); i += alvo.length; } return v; };

// ── Invólucro declarado ────────────────────────────────────────────────────────────────────────────────
const Aberturas = (de) => [...de.matchAll(/<script\b[^>]*\bdata-bfr-municipal-module\b[^>]*>/gi)].map((m) => ({ desde: m.index, corpo_desde: m.index + m[0].length, tag: m[0] }));
const aberturas = Aberturas(corpo);
const fechamentosDe = (desde) => { const i = corpo.indexOf('</script>', desde); return i < 0 ? corpo.length : i; };
const inv = aberturas.length === 1 ? { desde: aberturas[0].desde, corpo_desde: aberturas[0].corpo_desde, fim: fechamentosDe(aberturas[0].corpo_desde), tag: aberturas[0].tag } : null;
const dentro = inv ? corpo.slice(inv.corpo_desde, inv.fim) : '';
const munOffs = Toca('bfrMunicipal');
const ancoras_dentro = inv ? munOffs.filter((o) => o >= inv.corpo_desde && o < inv.fim).length : 0;

// ── Réguas de grafia, nas duas formas ──────────────────────────────────────────────────────────────────
const VERBOS = ['from', 'rpc', 'insert', 'update', 'delete', 'upsert', 'select', 'single', 'maybeSingle'];
const RE_PONTO = (v) => new RegExp('\\.' + v + '\\s*\\(', 'g');
const RE_SOLTO = (v) => new RegExp('(?<![.\\w])' + v + '\\s*\\(', 'g');
const Conta = (re, t) => (t.match(re) || []).length;
const linhasDeGrafia = (t, rotulo) => VERBOS.flatMap((v) => [
  { eixo: rotulo, verbo: v, grafo: 'com_ponto', ocorrencias: Conta(RE_PONTO(v), t) },
  { eixo: rotulo, verbo: v, grafo: 'solto', ocorrencias: Conta(RE_SOLTO(v), t) },
]).concat([
  { eixo: rotulo, verbo: 'fetch', grafo: 'solto', ocorrencias: Conta(RE_SOLTO('fetch'), t) },
  { eixo: rotulo, verbo: 'rest_v1_literal', grafo: 'url', ocorrencias: Toca('/rest/v1/', t).length },
]);
const noInv = linhasDeGrafia(dentro, 'involucro');
const noCorpus = linhasDeGrafia(corpo, 'corpus');

// Nomes de mesa/função: `\b` casa depois de ponto E de parêntesis, por isto uma só regex serve as duas grafias.
const RE_NOMES = /\b(?:from|rpc|insert|update|delete|upsert)\s*\(\s*['"`]([A-Za-z_]\w*)['"`]/g;
const nomesDe = (t) => { const s = new Map(); for (const m of t.matchAll(new RegExp(RE_NOMES.source, 'g'))) s.set(m[1], (s.get(m[1]) || 0) + 1); return [...s.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])); };
const nomes_no_inv = nomesDe(dentro);
const nomes_no_corpus = nomesDe(corpo);

// Fixture OBRIGATÓRIO: a régua tem de disparar nas duas grafias. Foi a falta disto que deixou a versão
// anterior afirmar `from: 0` numa faixa que tinha 19 chamadas. A primeira redacção deste fixture escreveu
// `x.rpc('fn_solta')` — pontuado — e o portão da grafo solta deu 0 contra 2 no com_ponto: o defeito era do
// fixture, não da régua, e ficou registado como …-ANTERIOR-fixture-com-rpc-pontuado…json.
const FIX = "a.from('mesa_pontuada').select('id'); b.rpc('fn_pontuada'); const q = from('mesa_solta'); rpc('fn_solta'); y.insert('mesa_de_escrita');";
const fixture = {
  com_ponto_from: Conta(RE_PONTO('from'), FIX), solto_from: Conta(RE_SOLTO('from'), FIX),
  com_ponto_rpc: Conta(RE_PONTO('rpc'), FIX), solto_rpc: Conta(RE_SOLTO('rpc'), FIX),
  nomes: nomesDe(FIX).map(([n]) => n),
};
const NEGATIVO = "from('mesa_que_nao_existe_nesta_base_zzz')";
const controle_negativo = { agulha: NEGATIVO, no_corpus: Toca(NEGATIVO).length, no_involucro: Toca(NEGATIVO, dentro).length };

// As 6 superfícies que o DDL de 18/11 endureceu + o gate legítimo do módulo.
const SUPERFICIE_DDL = ['bfr_municipal_school_stats', 'bfr_municipal_network_totals', 'bfr_municipal_municipalities', 'bfr_municipal_access_grants', 'bfr_municipal_audit', 'bfr_school_in_municipal_scope'];
const GATE = 'bfr_is_municipal_authority';
const como_texto = Object.fromEntries([...SUPERFICIE_DDL, GATE].map((n) => [n, { no_involucro: Toca(n, dentro).length, no_corpus: Toca(n).length }]));

// Chaves de cache do helper `ler(...)` e a mesa que cada uma abre, por proximidade (sem exigir a forma exacta).
const chamadasLer = [...dentro.matchAll(/\bler\(\s*['"`]([\w-]+)['"`]/g)].map((m) => ({ chave: m[1], offset: inv.corpo_desde + m.index }));
const abreMesa = [];
for (const c of chamadasLer) {
  const rel = c.offset - inv.corpo_desde;
  const janela = dentro.slice(rel, rel + 220);
  const mm = new RegExp(RE_NOMES.source, 'g').exec(janela);
  abreMesa.push({ ...c, mesa: mm ? mm[1] : null, janela_chars: janela.length });
}
const definicaoLer = (() => {
  const i = dentro.search(/function\s+ler\s*\(/);
  if (i < 0) return null;
  const a = dentro.indexOf('{', i); if (a < 0) return null;
  const fim = Math.min(dentro.length, a + 8000);
  let prof = 0;
  for (let k = a; k < fim; k++) { if (dentro[k] === '{') prof++; else if (dentro[k] === '}') { prof--; if (prof === 0) return { offset: inv.corpo_desde + a, chars: k + 1 - a, truncado: false, texto: dentro.slice(a, k + 1) }; } }
  return { offset: inv.corpo_desde + a, chars: fim - a, truncado: true, texto: dentro.slice(a, fim) };
})();
const o_ler_devolve = definicaoLer ? ['linhas', 'total', 'escolasDistintas', 'erro'].filter((campo) => new RegExp('\\b' + campo + '\\b').test(definicaoLer.texto)) : [];

const falhas = [];
const g = (nome, cond, detalhe) => { if (!cond) falhas.push(`${nome}: ${JSON.stringify(detalhe).slice(0, 300)}`); return { nome, verde: !!cond, detalhe }; };
const portoes = [
  g('o_involucre_e_declarado_pelo_produtor_e_unico', aberturas.length === 1, { aberturas: aberturas.length, tags: aberturas.map((a) => a.tag) }),
  g('o_involucre_contem_todas_as_ancoras_do_modulo', Boolean(inv) && munOffs.length > 0 && ancoras_dentro === munOffs.length, { ancoras_no_corpus: munOffs.length, ancoras_dentro, chars_involucro: dentro.length, margem: 'zero — contenção exacta' }),
  g('o_involucre_e_uma_fracao_pequena_do_corpus', Boolean(inv) && dentro.length > 5000 && dentro.length * 10 < corpo.length, { chars_involucro: dentro.length, chars_corpus: corpo.length }),
  g('a_pegada_servida_e_a_candidata_versionada', localMd5 === md5, { md5_servido: md5, md5_local: localMd5 }),
  g('o_fixture_dispara_na_grafia_com_ponto', fixture.com_ponto_from === 1 && fixture.com_ponto_rpc === 1, fixture),
  g('o_fixture_dispara_na_grafia_solta', fixture.solto_from === 1 && fixture.solto_rpc === 1, fixture),
  g('o_fixture_extrai_os_cinco_nomes_das_duas_grafias', fixture.nomes.length === 5, fixture.nomes),
  g('a_regua_nao_inventa_nada_no_controlo_negativo', controle_negativo.no_corpus === 0 && controle_negativo.no_involucro === 0, controle_negativo),
  g('o_modulo_tem_leituras_nomeadas_por_mesa', nomes_no_inv.length > 0, { nomes_no_inv }),
  g('nenhuma_das_seis_superficies_endurecidas_e_nome_do_modulo', SUPERFICIE_DDL.every((n) => como_texto[n].no_involucro === 0 && como_texto[n].no_corpus === 0), como_texto),
  g('o_gate_do_modulo_e_a_unica_fn_nomeada_no_involucre', como_texto[GATE].no_involucro >= 1 && nomes_no_inv.filter(([n]) => n === GATE).length === 1, { gate: como_texto[GATE], nomes: nomes_no_inv }),
  g('as_duas_grafias_de_from_estao_as_duas_no_registo', noInv.filter((x) => x.verbo === 'from').every((x) => Number.isInteger(x.ocorrencias)) && noInv.filter((x) => x.verbo === 'from').length === 2, noInv.filter((x) => x.verbo === 'from')),
  g('o_helper_de_leitura_devolve_um_total_calculado_no_cliente', Boolean(definicaoLer) && definicaoLer.truncado === false && o_ler_devolve.includes('total') && o_ler_devolve.includes('linhas'), { definicaoLer: definicaoLer ? { chars: definicaoLer.chars, truncado: definicaoLer.truncado } : null, campos: o_ler_devolve }),
  g('toda_a_grelha_de_grafias_foi_emitida_com_o_seu_numero', noInv.length === noCorpus.length && noInv.length === (VERBOS.length * 2 + 2), { linhas_involucro: noInv.length, linhas_corpus: noCorpus.length }),
];

const o = {
  programa: 'scripts/sm23-formas-de-chamada-no-modulo-municipal-18-11.mjs',
  em: new Date().toISOString(),
  duracao_ms: Date.now() - t0,
  pergunta: 'que mesas e que funções o módulo da Secretaria Municipal abre, e alguma delas é uma das seis superficies que o DDL de 18/11 endureceu?',
  metodo: 'fetch + md5 contra a candidata versionada; invólucro = o `<script data-bfr-municipal-module>` declarado pelo produtor, não uma janela; contagem por verbo NAS DUAS grafias (.x( e x( ); nomes de mesa por regex que casa as duas; fixture positivo por grafo e controlo negativo; zero SQL',
  substitui: 'evidence/sm23-formas-de-chamada-na-faixa-municipal-18-11-ANTERIOR-faixa-de-16kb-so-contava-a-grafia-com-ponto.json',
  antecessores: ['evidence/sm23-leitura-aba-municipal-18-11-ANTERIOR-janela-fixa-de-24kb-sobre-colhia-vizinhos.json', 'evidence/sm23-leitura-aba-municipal-18-11-ANTERIOR-exigia-marca-dentro-de-cada-corpo.json', 'evidence/sm23-leitura-aba-municipal-18-11-ANTERIOR-exigia-involucre-unico-e-corpos-de-40bytes.json', 'evidence/sm23-formas-de-chamada-na-faixa-municipal-18-11-ANTERIOR-faixa-de-16kb-so-contava-a-grafia-com-ponto.json', 'evidence/sm23-involucro-e-grafias-do-modulo-municipal-18-11-ANTERIOR-fixture-com-rpc-pontuado-dos-lados.json'],
  servido: { url: alvoUrl, status: resp.status, bytes, md5 },
  candidata_local: { ficheiro: 'bfr-candidata-v134-sidebar-escondida/index.html', md5: localMd5, identica_ao_servido: localMd5 === md5 },
  involucro: inv ? { tag: inv.tag, desde: inv.desde, corpo_desde: inv.corpo_desde, fim: inv.fim, chars: dentro.length, fracao_do_corpus: Number((dentro.length / corpo.length).toFixed(4)), ancoras_bfrMunicipal_dentro: ancoras_dentro, ancoras_no_corpus: munOffs.length } : null,
  fixture_da_regua: fixture,
  controle_negativo,
  grelha_de_grafias: { no_involucre: noInv, no_corpus: noCorpus },
  mesas_e_funcoes_nomeadas: { no_involucro: nomes_no_inv, no_corpus_distintas: nomes_no_corpus.length },
  chamadas_de_leitura_por_chave: abreMesa,
  helper_ler: definicaoLer ? { offset: definicaoLer.offset, chars: definicaoLer.chars, truncado: definicaoLer.truncado, devolve_campos: o_ler_devolve } : null,
  superficies_endurecidas_como_texto: como_texto,
  portoes,
};
o.conclusao = {
  frases_que_esta_corrida_autoriza: [
    `o módulo tem invólucro próprio no ar — ${inv ? inv.tag : 'AUSENTE'} — com ${dentro.length} chars de ${bytes} servidos, e as ${munOffs.length} âncoras bfrMunicipal estão todas dentro dele`,
    `as mesas e funções que ele abre por nome são ${JSON.stringify(nomes_no_inv)} — nenhuma das seis superficies endurecidas pelo DDL aparece, em texto solto nem como rota`,
    `o módulo abre-as pelo seu próprio helper \`ler(chave, build)\` com \`from('mesa')\` SEM ponto (${noInv.find((x) => x.verbo === 'from' && x.grafo === 'solto').ocorrencias} chamadas soltas contra ${noInv.find((x) => x.verbo === 'from' && x.grafo === 'com_ponto').ocorrencias} com ponto): foi por isto que a corrida anterior leu \`from: 0\` num módulo que lê 11 mesas`,
    `o \`ler\` devolve ${JSON.stringify(o_ler_devolve)} — os números que a aba pinta são contados no cliente sobre essas mesas, pelo que endurecer a vista e os agregados não muda o que está na tela`,
  ],
  o_que_este_artefacto_nao_prova: [
    'não prova quantas linhas cada uma dessas 11 mesas devolve a cada papel: isso é RLS por mesa e está medido noutros artefactos (sm23-causa-vista, sm23-causa-predicado)',
    'não prova o que o utilizador vê no ecrã: prova o código servido. A passada autenticada clicando a aba é outro instrumento.',
  ],
};
o.veredito = falhas.length === 0 ? 'INVOLUCRO_E_GRAFIAS_CONFERIDOS' : `VERMELHO: ${falhas.length}`;
o.falhas = falhas;
if (falhas.length) { const p = OUT.replace(/\.json$/, '-VERMELHO.json'); writeFileSync(p, JSON.stringify(o, null, 2) + '\n'); for (const f of falhas) console.log('  FALTA ' + f); console.log(`SM23_INVOLUCRO_VERMELHO · registo ${p}`); process.exit(1); }
writeFileSync(OUT, JSON.stringify(o, null, 2) + '\n');
console.log('SERVIDO', JSON.stringify(o.servido), 'LOCAL_IGUAL', o.candidata_local.identica_ao_servido);
console.log('INVOLUCRO', JSON.stringify(o.involucro));
console.log('FIXTURE', JSON.stringify(fixture), 'NEGATIVO', JSON.stringify(controle_negativo));
for (let i = 0; i < noInv.length; i++) console.log(`  ${noInv[i].verbo}/${noInv[i].grafo}: involucro=${noInv[i].ocorrencias} corpus=${noCorpus[i].ocorrencias}`);
console.log('MESAS', JSON.stringify(nomes_no_inv));
console.log('CHAVES_LER', JSON.stringify(abreMesa.map((x) => `${x.chave}=${x.mesa}`)));
console.log('SUPERFICIE', JSON.stringify(como_texto));
for (const p of o.portoes) console.log(`  portao ${p.nome}: ${p.verde ? 'VERDE' : 'VERMELHO'}`);
console.log(`SM23_INVOLUCRO_CONFERIDO · registo ${OUT} · ${o.duracao_ms} ms`);
