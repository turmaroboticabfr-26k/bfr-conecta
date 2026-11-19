#!/usr/bin/env node
// SM.23 peça 6 — FORMAS DE CHAMADA DE DADOS NA FAIXA DO MÓDULO MUNICIPAL (só leitura).
// Porque esta peça existe: as três corridas do leitor da aba (`…-ANTERIOR-*.json`) ficaram vermelhas por
// prédicas minhas e deixaram uma afirmação mal lida no registo — `rotas_em_toda_a_faixa = {from:[], rpc:[bfr_is_municipal_authority]}`.
// Um vazio de `.from('` NÃO quer dizer «a aba não lê mesas»: quer dizer que a agulha com apóstrofo não dispara
// na faixa. Uma régua de ausência que só conhece uma grafia confunde «não está lá» com «não sei procurar».
// Aqui conto TODAS as grafias de chamada de dados que o bundle pode usar (aspa simples, dupla, crase, chamadas
// sem argumento, REST directo, verbos de escrita), uma linha por grafia, com a contagem separada entre faixa e
// corpus inteiro, para que a diferença de escala fique visível. O controlo positivo é uma grafia que SEI existir no corpus; o negativo é
// uma grafia que não existe em lado nenhum. Nada disto toca a base: fetch + texto.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = process.env.SM23_SUF ? '-' + process.env.SM23_SUF : '';
const OUT = join(REPO, `evidence/sm23-formas-de-chamada-na-faixa-municipal-18-11-ANTERIOR-faixa-de-16kb-so-contava-a-grafia-com-ponto${SUF}.json`);
// SUPERADA por scripts/sm23-formas-de-chamada-no-modulo-municipal-18-11.mjs, por dois defeitos próprios e não
// do produto: (1) a faixa era ±16 000 chars à volta das âncoras, quando o módulo tem invólucro DECLARADO
// (`<script data-bfr-municipal-module="1">`); (2) o censo de grafias só procurava `.from(` com ponto, e o
// módulo chama `from('schools')` solto, dentro do seu próprio helper `ler(chave, build)` — por isso deu
// `from_aspa_simples: faixa=0` enquanto a regex de mesas, essa sim sem ponto, listava 11 mesas. Um zero de
// grafo foi lido como zero de leitura.
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

const Toca = (alvo, de = corpo) => { const v = []; let i = 0; while ((i = de.indexOf(alvo, i)) >= 0) { v.push(i); i += alvo.length; } return v; };
const munOffs = Toca('bfrMunicipal');
if (!munOffs.length) throw new Error('ABORTA: nenhum `bfrMunicipal` nos bytes servidos');
const MARGEM = 16_000;
const faixa = { desde: Math.max(0, munOffs[0] - MARGEM), ate: Math.min(corpo.length, munOffs[munOffs.length - 1] + MARGEM) };
const trecho = corpo.slice(faixa.desde, faixa.ate);

// Grafias de acesso a dados. Uma linha por grafia, para que um vazio diga alguma coisa.
const GRAFIAS = [
  { id: 'from_aspa_simples', agulha: ".from('" },
  { id: 'from_aspa_dupla', agulha: '.from("' },
  { id: 'from_crase', agulha: '.from(`' },
  { id: 'from_sem_argue', agulha: '.from(' },
  { id: 'from_espacada', agulha: '.from (' },
  { id: 'rpc', agulha: '.rpc(' },
  { id: 'insert', agulha: '.insert(' },
  { id: 'update', agulha: '.update(' },
  { id: 'delete', agulha: '.delete(' },
  { id: 'upsert', agulha: '.upsert(' },
  { id: 'select_chamada', agulha: '.select(' },
  { id: 'single', agulha: '.single(' },
  { id: 'maybeSingle', agulha: '.maybeSingle(' },
  { id: 'rest_v1_directo', agulha: '/rest/v1/' },
  { id: 'fetch_chamada', agulha: 'fetch(' },
  { id: 'count_exact', agulha: 'count=exact' },
];
const NOME_DA_MESA = /(?:from|rpc|insert|update|delete|upsert|select)\s*\(\s*['"`]([A-Za-z_][\w$]*)['"`]/g;
const nomesNaFaixa = (t) => { const s = new Map(); let m; const re = new RegExp(NOME_DA_MESA.source, 'g'); while ((m = re.exec(t)) !== null) s.set(m[1], (s.get(m[1]) || 0) + 1); return [...s.entries()].sort((a, b) => b[1] - a[1]); };
const contexto = (t, off) => t.slice(Math.max(0, off - 70), off + 90).replace(/\s+/g, ' ');
const porGrafia = GRAFIAS.map((gf) => { const naFaixa = Toca(gf.agulha, trecho); const noCorpus = Toca(gf.agulha); return { grafia: gf.id, agulha: gf.agulha, ocorrencias_na_faixa: naFaixa.length, ocorrencias_no_corpus: noCorpus.length, exemplos_na_faixa: naFaixa.slice(0, 4).map((o) => contexto(trecho, o)) }; });
const mesas_na_faixa = nomesNaFaixa(trecho);
const mesas_no_corpus = nomesNaFaixa(corpo);

// As 7 superfícies endurecidas pelo DDL de 18/11, reafirmadas aqui por nome de grafo de dados e não só por texto solto.
const SUPERFICIE_DDL = ['bfr_municipal_school_stats', 'bfr_municipal_network_totals', 'bfr_municipal_municipalities', 'bfr_municipal_access_grants', 'bfr_municipal_audit', 'bfr_school_in_municipal_scope', 'bfr_is_municipal_authority'];
const como_rota = Object.fromEntries(SUPERFICIE_DDL.map((n) => [n, mesas_no_corpus.filter(([mesa]) => mesa === n).map(([, c]) => c)[0] ?? 0]));

const C_POSITIVO = '.from(';
const C_NEGATIVO = '.from(' + 'nada_que_existe_nesta_app_zzz';
const controle = { positivo: { agulha: C_POSITIVO, no_corpus: Toca(C_POSITIVO).length, na_faixa: Toca(C_POSITIVO, trecho).length }, negativo: { agulha: C_NEGATIVO, no_corpus: Toca(C_NEGATIVO).length } };

const falhas = [];
const g = (nome, cond, detalhe) => { if (!cond) falhas.push(`${nome}: ${JSON.stringify(detalhe).slice(0, 260)}`); return { nome, verde: !!cond, detalhe }; };
const portoes = [
  g('a_faixa_e_muito_menor_que_o_corpus', trecho.length > 1000 && trecho.length * 20 < corpo.length, { chars_faixa: trecho.length, chars_corpus: corpo.length, razao: Math.round(corpo.length / trecho.length) }),
  g('o_censo_de_grafias_tem_positivo_no_corpus', controle.positivo.no_corpus > 0, controle.positivo),
  g('o_censo_de_grafias_nao_inventa_no_negativo', controle.negativo.no_corpus === 0, controle.negativo),
  g('toda_grafia_representada_com_o_seu_numero', porGrafia.length === GRAFIAS.length && porGrafia.every((x) => Number.isInteger(x.ocorrencias_na_faixa) && Number.isInteger(x.ocorrencias_no_corpus)), { declaradas: GRAFIAS.length, emitidas: porGrafia.length }),
  g('nenhuma_das_sete_superficies_e_rota_nomeada_no_bundle', SUPERFICIE_DDL.slice(0, 6).every((n) => como_rota[n] === 0), { como_rota, aviso: 'a 7.ª, bfr_is_municipal_authority, É chamada por nome e está fora deste portão de propósito' }),
  g('o_gate_municipal_e_de_facto_uma_chamada_rpc_nomeada', como_rota.bfr_is_municipal_authority > 0, como_rota.bfr_is_municipal_authority),
  g('a_faixa_declara_as_mesas_que_lê_por_nome', mesas_na_faixa.length > 0, { mesas_na_faixa }),
  g('a_lista_de_mesas_da_faixa_e_subconjunto_da_lista_do_corpus', mesas_na_faixa.every(([m]) => mesas_no_corpus.some(([c]) => c === m)), { na_faixa: mesas_na_faixa.map(([m]) => m), tamanho_corpus: mesas_no_corpus.length }),
];

const o = {
  programa: 'scripts/sm23-formas-de-chamada-na-faixa-municipal-18-11.mjs',
  em: new Date().toISOString(),
  duracao_ms: Date.now() - t0,
  pergunta: 'a aba municipal lê mesas por nome, e o vazio de `.from(` na faixa queria dizer alguma coisa?',
  metodo: 'fetch dos bytes servidos; faixa = primeira à última âncora `bfrMunicipal` ± margem; contagem por índice de 16 grafias de acesso a dados, na faixa e no corpus; nomes de mesa extraídos da chamada; zero SQL',
  porque_existe: 'as três corridas do leitor da aba ficaram vermelhas por prédicas minhas; a única linha que sobreviveu nelas (`from:[]` na faixa) é uma asserção sobre UMA grafia, não sobre leitura de dados',
  antecessores: ['evidence/sm23-leitura-aba-municipal-18-11-ANTERIOR-janela-fixa-de-24kb-sobre-colhia-vizinhos.json', 'evidence/sm23-leitura-aba-municipal-18-11-ANTERIOR-exigia-marca-dentro-de-cada-corpo.json', 'evidence/sm23-leitura-aba-municipal-18-11-ANTERIOR-exigia-involucre-unico-e-corpos-de-40bytes.json'],
  servido: { url: alvoUrl, status: resp.status, bytes, md5 },
  faixa: { desde: faixa.desde, ate: faixa.ate, chars: trecho.length, ancoras: munOffs.length, margem: MARGEM },
  controles: controle,
  por_grafia: porGrafia,
  mesas_nomeadas: { na_faixa: mesas_na_faixa, no_corpus: mesas_no_corpus },
  superficies_ddl_como_rota_nomeada: como_rota,
  portoes,
};
o.conclusao = {
  frases_que_esta_corrida_autoriza: [
    `na faixa do módulo (${trecho.length} chars, ${munOffs.length} âncoras) as grafias de acesso a dados que disparam são ${JSON.stringify(porGrafia.filter((x) => x.ocorrencias_na_faixa > 0).map((x) => `${x.grafia}×${x.ocorrencias_na_faixa}`))}`,
    `as mesas nomeadas dentro da faixa são ${JSON.stringify(mesas_na_faixa)}; no corpus inteiro são ${mesas_no_corpus.length} nomes distintos`,
    'portanto «a aba não lê mesas» nunca foi o que `from:[]` queria dizer: o que se prova aqui é que NENHUM dos 6 nomes endurecidos pelo DDL aparece como rota nomeada em byte nenhum do bundle, por nenhuma das 16 grafias procuradas',
  ],
  o_que_este_artefacto_nao_prova: [
    'não prova o fluxo de dados da aba: chamadas construídas com variáveis (`from(t)`, um helper partilhado) não têm nome de mesa na grafo de chamada e só seriam apanhadas pelo nome da mesa — que, para os 6 nomes endurecidos, tem 0 ocorrências em texto solto no corpus (medida em sm23-conferencia-nomes-municipais-18-11.json)',
    'não prova nada sobre a base: não correu SQL',
  ],
};
o.veredito = falhas.length === 0 ? 'GRAFIAS_CONFERIDAS' : `VERMELHO: ${falhas.length}`;
o.falhas = falhas;
if (falhas.length) { const p = OUT.replace(/\.json$/, '-VERMELHO.json'); writeFileSync(p, JSON.stringify(o, null, 2) + '\n'); for (const f of falhas) console.log('  FALTA ' + f); console.log(`SM23_GRAFIAS_VERMELHO · registo ${p}`); process.exit(1); }
writeFileSync(OUT, JSON.stringify(o, null, 2) + '\n');
console.log('SERVIDO', JSON.stringify(o.servido));
console.log('FAIXA', JSON.stringify(o.faixa));
console.log('CONTROLES', JSON.stringify(o.controles));
for (const x of o.por_grafia) console.log(`  grafia ${x.grafia}: faixa=${x.ocorrencias_na_faixa} corpus=${x.ocorrencias_no_corpus}`);
console.log('MESAS_FAIXA', JSON.stringify(mesas_na_faixa));
console.log('SUPERFICIE_DDL_COMO_ROTA', JSON.stringify(como_rota));
for (const p of o.portoes) console.log(`  portao ${p.nome}: ${p.verde ? 'VERDE' : 'VERMELHO'}`);
console.log(`SM23_GRAFIAS_CONFERIDO · registo ${OUT} · ${o.duracao_ms} ms`);
