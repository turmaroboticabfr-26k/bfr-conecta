#!/usr/bin/env node
// SM.23 peça 7 — ONDE É QUE O MÓDULO MUNICIPAL APLICA O SEU ESCOPO (só leitura, código servido).
// Porque esta peça existe: a peça 6 mediu QUE mesas o módulo abre (11, todas escolares ou de supervisão) e que
// NENHUM dos seis nomes endurecidos pelo DDL aparece no bundle. Isso deixa a pergunta de §5 em aberto: se o
// escopo «por município» não vem da base (nem de vista, nem de RPC), vem de onde? Uma resposta escrita à mão
// seria «venha de onde vier, está aplicado» — que é exactamente a frase que o briefing proíbe («não apenas
// esconder botões»). Então meço: para cada leitura, os filtros que a acompanham, separados das projecções.
// Distinção que importa: `city`/`state` aparecem na LISTA DE COLUNAS (`select('id,name,code,city,state')`) e
// isso não filtra nada; um filtro é `.eq('col',…)`/`.in('col',…)`/`.gte(`/`.like(`. Confundi os dois na corrida
// das grafias (um `from: 0` lido como «não lê»), por isso aqui o extractor tem fixture que sabe ver um filtro
// de município sintético e um controlo negativo que sabe não existir.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = process.env.SM23_SUF ? '-' + process.env.SM23_SUF : '';
const OUT = join(REPO, `evidence/sm23-escopo-aplicado-por-leitura-18-11${SUF}.json`);
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
const localTxt = readFileSync(join(REPO, 'bfr-candidata-v134-sidebar-escondida/index.html'), 'utf8');
const localMd5 = createHash('md5').update(localTxt, 'utf8').digest('hex');

const aberturas = [...corpo.matchAll(/<script\b[^>]*\bdata-bfr-municipal-module\b[^>]*>/gi)].map((m) => ({ desde: m.index, corpo_desde: m.index + m[0].length, tag: m[0] }));
if (aberturas.length !== 1) throw new Error('ABORTA: o invólucro declarado não é único (' + aberturas.length + ') — a peça 6 mediu 1; se mudou, o ar mudou e nada daqui se aplica');
const inv = { desde: aberturas[0].desde, corpo_desde: aberturas[0].corpo_desde, fim: corpo.indexOf('</script>', aberturas[0].corpo_desde) };
const dentro = corpo.slice(inv.corpo_desde, inv.fim);
const G = (off) => inv.corpo_desde + off;

const RE_MESA = /\b(?:from|rpc)\s*\(\s*['"`]([A-Za-z_]\w*)['"`]/g;
const FILTROS = { eq: /\.eq\(\s*['"`]([\w.]+)['"`]/g, in: /\.in\(\s*['"`]([\w.]+)['"`]/g, gte: /\.gte\(\s*['"`]([\w.]+)['"`]/g, lte: /\.lte\(\s*['"`]([\w.]+)['"`]/g, like: /\.like\(\s*['"`]([\w.]+)['"`]/g, is: /\.is\(\s*['"`]([\w.]+)['"`]/g, or: /\.or\(/g, textSearch: /\.textSearch\(\s*['"`]([\w.]+)['"`]/g };
const filtrosEm = (t) => Object.fromEntries(Object.entries(FILTROS).map(([nome, re]) => [nome, [...t.matchAll(new RegExp(re.source, 'g'))].map((m) => m[1] ?? null)]));
const projecoesEm = (t) => [...t.matchAll(/\.select\(\s*['"`]([^'"`]{0,400})['"`]/g)].map((m) => m[1]);

// Cada leitura = do `from(` até ao próximo `from(`/fim do invólucro. Encadeamento é por proximidade textual, e
// reporto o comprimento da cadeia para que uma cadeia cortada seja visível em vez de silenciosa.
const inicios = [...dentro.matchAll(new RegExp(RE_MESA.source, 'g'))].map((m) => ({ nome: m[1], desde: m.index, texto: m[0] }));
const leituras = inicios.map((s, i) => {
  const ate = i + 1 < inicios.length ? inicios[i + 1].desde : dentro.length;
  const cadeia = dentro.slice(s.desde, ate);
  const f = filtrosEm(cadeia);
  const proj = projecoesEm(cadeia);
  return { mesa: s.nome, offset: G(s.desde), chars_cadeia: cadeia.length, filtros: f, colunas_filtradas: [...new Set(Object.values(f).flat().filter(Boolean))], projecoes: proj };
});
const COLUNAS_DE_MUNICIPIO = ['municipality_id', 'municipio_id', 'municipality', 'municipio'];
const filtram_municipio = leituras.filter((l) => l.colunas_filtradas.some((c) => COLUNAS_DE_MUNICIPIO.includes(c))).map((l) => l.mesa);
const project_municipio = leituras.filter((l) => l.projecoes.some((p) => COLUNAS_DE_MUNICIPIO.some((c) => p.includes(c)))).map((l) => l.mesa);
// No lado do cliente, um filtro pode ser feito em JavaScript em vez de PostgREST. A primeira redacção desta peça
// só procurava a palavra inglesa `municipalit*` e ficou vermelha por exigir uma menção que não existe: ausência
// de UMA agulha não é ausência de conceito, mas também não se pode afirmar o contrário sem listar as agulhas.
// Por isso a varrnedura é por FAMÍLIA (inglês, português, marcador de DOM, colunas geográficas), cada família
// imprime o seu número — inclusive zero — e o portão exige que todas saiam, não que alguma dispare.
const FAMILIAS = [
  { familia: 'municipalit_qualsquer_caixa', re: /[Mm]unicipalit\w*/g },
  { familia: 'municipio_portugues', re: /[Mm]unici[pP]io\w*/g },
  { familia: 'bfrMunicipal_marca_de_dom', re: /bfrMunicipal\w*/g },
  { familia: 'mun_hifen_classe_css', re: /mun-[a-z][\w-]*/g },
  { familia: 'city', re: /\bcity\b/g },
  { familia: 'estado_uf', re: /\b(?:estado|uf)\b/g },
];
const mencoes_por_familia = FAMILIAS.map((f) => {
  const ocorrencias = [...dentro.matchAll(new RegExp(f.re.source, 'g'))].map((m) => ({ termo: m[0], offset: G(m.index), antes: dentro.slice(Math.max(0, m.index - 60), m.index).replace(/\s+/g, ' '), depois: dentro.slice(m.index, m.index + 70).replace(/\s+/g, ' ') }));
  return { familia: f.familia, ocorrencias: ocorrencias.length, termos: [...new Set(ocorrencias.map((o) => o.termo))], exemplos: ocorrencias.slice(0, 8) };
});
const mencoes_municipio_no_inv = mencoes_por_familia.flatMap((x) => x.exemplos);

// Fixture da régua de filtros: sabe ver um filtro de município sintético nas duas origens.
const FIX = "z.from('mesa_sint').select('id,municipality_id').eq('municipality_id', x).in('estado', ys).gte('created_at', d); if (r.municipality_id === k) { }";
const fixF = filtrosEm(FIX);
const fixProj = projecoesEm(FIX);
const NEG = ".eq('coluna_que_nao_existe_nesta_app_zzz'";
const negF = filtrosEm(NEG);
// Fixture da varrnedura por família: as seis famílias aplicadas a um texto sintético que cita as seis. Sem
// isto, «a família `municipio_portugues` deu 0» não distingue «o módulo não fala de município» de «a minha
// regex está cega» — que é exactamente a dúvida com que esta peça abriu vermelha.
const FIX_FAMILIAS = "const municipalityId = 1; const municipio = 'x'; document.getElementById('bfrMunicipalTab'); css('mun-painel'); const city='SP', estado='SP', uf='SP';";
const fixFamilias = FAMILIAS.map((f) => ({ familia: f.familia, ocorrencias: [...FIX_FAMILIAS.matchAll(new RegExp(f.re.source, 'g'))].length }));
const SUPERFICIE = ['bfr_municipal_school_stats', 'bfr_municipal_network_totals', 'bfr_municipal_municipalities', 'bfr_municipal_access_grants', 'bfr_municipal_audit', 'bfr_school_in_municipal_scope'];

const falhas = [];
const g = (nome, cond, detalhe) => { if (!cond) falhas.push(`${nome}: ${JSON.stringify(detalhe).slice(0, 300)}`); return { nome, verde: !!cond, detalhe }; };
const portoes = [
  g('a_pegada_servida_e_a_candidata_versionada', localMd5 === md5, { md5_servido: md5, md5_local: localMd5 }),
  g('o_involucre_e_o_mesmo_da_peca_6', dentro.length > 5000 && inv.fim > inv.corpo_desde, { chars: dentro.length, desde: inv.desde, fim: inv.fim }),
  g('o_extractor_de_filtros_ve_um_eq_de_municipio_no_fixture', fixF.eq.includes('municipality_id'), fixF),
  g('o_extractor_de_filtros_ve_in_e_gte_no_fixture', fixF.in.includes('estado') && fixF.gte.includes('created_at'), fixF),
  g('o_extractor_de_projecoes_nao_se_confunde_com_filtro', fixProj.some((p) => p.includes('municipality_id')) && fixF.eq.length === 1, { fixProj, eq: fixF.eq }),
  g('a_regua_nao_inventa_filtros_no_controlo_negativo', JSON.stringify(negF).includes('coluna_que_nao_existe_nesta_app_zzz') && !JSON.stringify(negF).includes('municipality'), negF),
  g('cada_leitura_do_modulo_foi_medida_com_a_sua_cadeia', leituras.length >= 12 && leituras.every((l) => l.chars_cadeia > 0), { leituras: leituras.length,cadeias: leituras.map((l) => `${l.mesa}@${l.chars_cadeia}`) }),
  g('nenhuma_leitura_do_modulo_filha_no_servidor_por_municipio', filtram_municipio.length === 0, { filtram_municipio, colunas_procuradas: COLUNAS_DE_MUNICIPIO }),
  g('a_varredura_por_familia_dispara_nas_seis_agulhas_do_fixture', fixFamilias.length === FAMILIAS.length && fixFamilias.every((x) => x.ocorrencias >= 1), fixFamilias),
  g('toda_familia_saida_com_o_seu_numero_e_as_mencoes_com_contexto_legivel', mencoes_por_familia.length === FAMILIAS.length && mencoes_por_familia.every((x) => Number.isInteger(x.ocorrencias)) && mencoes_municipio_no_inv.every((m) => typeof m.termo === 'string' && m.termo.length > 0 && m.offset >= inv.corpo_desde && m.offset < inv.fim), { por_familia: mencoes_por_familia.map((x) => `${x.familia}=${x.ocorrencias}`), termos: [...new Set(mencoes_municipio_no_inv.map((m) => m.termo))], leituras_que_projectam_municipio: project_municipio }),
  g('a_unica_funcao_de_backend_chamada_e_o_gate_de_autoridade', leituras.filter((l) => l.mesa === 'bfr_is_municipal_authority').length === 1 && SUPERFICIE.every((n) => dentro.indexOf(n) < 0), { funcoes: leituras.filter((l) => l.mesa === 'bfr_is_municipal_authority').map((l) => l.offset) }),
];

const o = {
  programa: 'scripts/sm23-escopo-aplicado-por-leitura-18-11.mjs',
  em: new Date().toISOString(),
  duracao_ms: Date.now() - t0,
  pergunta: 'se nenhum nome municipal de backend está no bundle, onde é que o escopo «por município» da Secretaria Municipal é aplicado?',
  metodo: 'fetch + md5 contra a candidata; invólucro declarado `data-bfr-municipal-module`; por leitura, separo FILTRO (.eq/.in/.gte/.lte/.like/.is/.or/.textSearch) de PROJECCÃO (1.º argumento do .select); mencões de `municipalit*` no corpo do módulo reportadas com contexto; fixture obrigatório por classe de régua; zero SQL',
  precedentes: ['evidence/sm23-involucro-e-grafias-do-modulo-municipal-18-11.json', 'evidence/sm23-conferencia-nomes-municipais-18-11.json', 'evidence/sm23-escopo-aplicado-por-leitura-18-11-ANTERIOR-so-procurava-a-palavra-inglesa-municipalit.json'],
  servido: { url: alvoUrl, status: resp.status, bytes, md5 },
  involucro: { tag: aberturas[0].tag, desde: inv.desde, corpo_desde: inv.corpo_desde, fim: inv.fim, chars: dentro.length },
  fixture: { filtros: fixF, projecoes: fixProj, controle_negativo: negF, familias: fixFamilias },
  colunas_de_municipio_procuradas: COLUNAS_DE_MUNICIPIO,
  leituras,
  resumo: {
    mesas_lidas: [...new Set(leituras.map((l) => l.mesa))].sort(),
    colunas_filtradas_em_todas_as_leituras: [...new Set(leituras.flatMap((l) => l.colunas_filtradas))].sort(),
    leituras_que_filtram_por_municipio: filtram_municipio,
    leituras_que_projectam_municipio: project_municipio,
  },
  mencoes_de_municipio_no_involucre_por_familia: mencoes_por_familia,
  portoes,
};
o.conclusao = {
  frases_que_esta_corrida_autoriza: [
    `as ${leituras.length} leituras do módulo filtram por ${JSON.stringify(o.resumo.colunas_filtradas_em_todas_as_leituras)} — nenhuma por coluna de município (${JSON.stringify(filtram_municipio)})`,
    `dentro do invólucro, as famílias de agulha dão ${JSON.stringify(mencoes_por_familia.map((x) => `${x.familia}=${x.ocorrencias}`))} — cada zero deste registo é o zero duma agulha que sei disparar noutro texto (fixture no mesmo ficheiro), não uma afirmação sobre o conceito`,
    'logo, para o que este módulo pinta, o que separa um município do outro NÃO é uma cláusula escrita no módulo municipal: ou vem da RLS das mesas que ele abre, ou não vem — e a RLS por papel está medida em sm23-causa-vista-18-11.json',
  ],
  o_que_este_artefacto_nao_prova: [
    'não prova o que a RLS deixa passar por mesa e por papel: é código servido, não consulta executada',
    'não prova que nenhuma filtragem acontece mais tarde em JavaScript sobre dados já trazidos: prova apenas que as cadeias de leitura não pedem o filtro ao servidor. As menções de `municipalit*` com contexto ficam neste ficheiro para essa leitura.',
  ],
};
o.veredito = falhas.length === 0 ? 'ESCOPO_POR_LEITURA_CONFERIDO' : `VERMELHO: ${falhas.length}`;
o.falhas = falhas;
if (falhas.length) { const p = OUT.replace(/\.json$/, '-VERMELHO.json'); writeFileSync(p, JSON.stringify(o, null, 2) + '\n'); for (const f of falhas) console.log('  FALTA ' + f); console.log(`SM23_ESCOPO_VERMELHO · registo ${p}`); process.exit(1); }
writeFileSync(OUT, JSON.stringify(o, null, 2) + '\n');
console.log('SERVIDO', JSON.stringify(o.servido), 'LOCAL_IGUAL', localMd5 === md5);
console.log('RESUMO', JSON.stringify(o.resumo));
for (const l of o.leituras) console.log(`  leitura ${l.mesa}@${l.offset}: cadeia=${l.chars_cadeia} filtros=${JSON.stringify(l.colunas_filtradas)} select=${l.projecoes.length}`);
console.log('FAMILIAS', JSON.stringify(mencoes_por_familia.map((x) => `${x.familia}=${x.ocorrencias}`)), 'TERMOS', JSON.stringify([...new Set(mencoes_municipio_no_inv.map((m) => m.termo))]).slice(0, 600));
for (const p of o.portoes) console.log(`  portao ${p.nome}: ${p.verde ? 'VERDE' : 'VERMELHO'}`);
console.log(`SM23_ESCOPO_CONFERIDO · registo ${OUT} · ${o.duracao_ms} ms`);
