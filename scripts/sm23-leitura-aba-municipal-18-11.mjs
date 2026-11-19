#!/usr/bin/env node
// SM.23 — O QUE A ABA MUNICIPAL LÊ. Duas versões morreram antes desta e ficam no disco:
//   1) evidence/sm23-leitura-aba-municipal-18-11-ANTERIOR-janela-fixa-de-24kb-sobre-colhia-vizinhos.json
//      — janela fixa de 24 KB a partir de cada `MunicipalView` devolveu `fontes_da_aba` com TODAS as mesas
//      da app (students 57, profiles 33, classes 31…), incluindo rotas sem relação com o módulo. Régua que
//      apanha vizinhos não pode autorizar a frase «a aba municipal lê X».
//   2) .g-sm23-aba-mun-INTERROMPIDA-corpo-truncado-de-260kb-por-cabecalho.txt (directório da sessão)
//      — corpo por profundidade SEM limite de área: cada cabeçalho do corpus minificado fatiava até 260 KB,
//      e o passo seguinte (`fontesDe` sobre os invólucros) nunca terminou. O stdout parou em MUN, depois de
//      `PASS0`, o que prova que o atolamento era da escala, não da rede.
// Esta versão limita a extração à FAIA do embed (margem declarada em bytes a partir do primeiro e último
// `bfrMunicipal`), recorta corpos por profundidade com teto pequeno, e nunca fatia corpo por corpo fora dela.
// A afirmação forte continua a ser a AUSÊNCIA: `bfr_municipal_school_stats` tem de ter 0 ocorrências nos
// bytes servidos. Para presença, cada ocorrência é resolvida pelo corpo mais pequeno que a contém.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = process.env.SM23_SUF ? '-' + process.env.SM23_SUF : '';
const OUT = join(REPO, `evidence/sm23-leitura-aba-municipal-18-11${SUF}.json`);
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com SM23_SUF=novo, não por cima');
const t0 = Date.now();
const marca = (p) => console.log(`PASS ${p} · ${Date.now() - t0} ms`);

const dj = JSON.parse(readFileSync(join(REPO, 'audit-publicacao-v134.json'), 'utf8'));
const alvoUrl = dj.deploy?.url;
if (!alvoUrl || !/^https:\/\/[a-z0-9.-]+\.workers\.dev$/.test(alvoUrl)) throw new Error('ABORTA: deploy.url do diário não é uma origem de workers.dev limpa: ' + String(alvoUrl).slice(0, 80));
const resp = await fetch(alvoUrl + '/', { headers: { 'cache-control': 'no-cache' } });
if (!resp.ok) throw new Error('ABORTA: alvo HTTP ' + resp.status);
const corpo = await resp.text();
const bytes = Buffer.byteLength(corpo, 'utf8');
const md5 = createHash('md5').update(corpo, 'utf8').digest('hex');
const localTxt = readFileSync(join(REPO, 'bfr-candidata-v134-sidebar-escondida/index.html'), 'utf8');
const localMd5 = createHash('md5').update(localTxt, 'utf8').digest('hex');
marca('fetch + md5');

const Toca = (alvo, de = corpo) => { const v = []; let i = 0; while ((i = de.indexOf(alvo, i)) >= 0) { v.push(i); i += alvo.length; } return v; };
const munOffs = Toca('bfrMunicipal');
if (!munOffs.length) throw new Error('ABORTA: nenhum `bfrMunicipal` nos bytes servidos — a aba não está no ar, medir outra coisa');
const MARGEM = 16_000;
const faixa = { desde: Math.max(0, munOffs[0] - MARGEM), ate: Math.min(corpo.length, munOffs[munOffs.length - 1] + MARGEM) };
const areaDaFaixa = faixa.ate - faixa.desde;
const trecho = corpo.slice(faixa.desde, faixa.ate);
marca(`faixa do embed definida: ${areaDaFaixa} chars, ${munOffs.length} âncoras`);

// Corpo por profundidade, com teto: um corpo que não fecha dentro do teto é `truncado:true` e é reportado,
// nunca tratado como corpo completo. O teto é pequeno porque a régua só precisa de cabecalhos DENTRO da faixa.
const TETO_CORPO = 90_000;
const Corpo = (desdeFaixa) => {
  const a = trecho.indexOf('{', desdeFaixa);
  if (a < 0) return null;
  const fim = Math.min(trecho.length, a + TETO_CORPO);
  let prof = 0;
  for (let i = a; i < fim; i++) {
    if (trecho[i] === '{') prof++;
    else if (trecho[i] === '}') { prof--; if (prof === 0) return { desde: a, ate: i + 1, texto: trecho.slice(a, i + 1), truncado: false }; }
  }
  return { desde: a, ate: fim, texto: trecho.slice(a, fim), truncado: true };
};
const bruto = [];
for (const m of [/function\s+([A-Za-z_$][\w$]*)\s*\(/g, /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(/g]) {
  let x; while ((x = m.exec(trecho)) !== null) { const c = Corpo(x.index + x[0].length - 1); if (c) bruto.push({ nome: x[1], desde: faixa.desde + c.desde, ate: faixa.desde + c.ate, texto: c.texto, truncado: c.truncado }); }
}
const dedup = [];
for (const h of bruto.sort((a, b) => a.desde - b.desde)) { const u = dedup[dedup.length - 1]; if (u && h.desde < u.ate) continue; dedup.push(h); }
marca(`cabeçalhos na faixa: ${bruto.length} → mínimos não sobrepostos ${dedup.length}`);

const fontesDe = (t) => {
  const apanha = (aguia, offset) => { const v = []; let i = 0; while ((i = t.indexOf(aguia, i)) >= 0) { const ab = t.indexOf("'", i + offset); const fe = ab >= 0 ? t.indexOf("'", ab + 1) : -1; if (fe > ab) v.push(t.slice(ab + 1, fe)); i += aguia.length; } return v; };
  return { from: [...new Set(apanha('.from(', 6))], rpc: [...new Set(apanha('.rpc(', 5))], select: [...new Set(apanha('.select(', 8).map((s) => s.slice(0, 120)))], url: [...new Set(apanha('/rest/v1/', 9))] };
};
const MUNICIPAL = (t) => t.includes('bfrMunicipal') || /mun-[a-z]/.test(t) || t.includes('MunicipalView');
// Pertencer ao módulo é QUESTÃO DE CONTENÇÃO, não de marca: a corrida anterior (preservada como
// …-ANTERIOR-exigia-marca-dentro-de-cada-corpo.json) exigia que CADA corpo citasse `bfrMunicipal`/`mun-`
// e por isso deitou fora precisamente as funções que consultam dados — `sondarBackend()` e `desenhar()`
// vivem dentro do invólucro mas só falam de mesas. Aqui: o invólucro é o menor corpo extraído que contém
// a primeira e a última âncora; tudo o que está contido nele é do módulo; o resto da faixa é reportado à parte.
const comAmbos = dedup.filter((h) => h.desde <= munOffs[0] && h.ate >= munOffs[munOffs.length - 1]);
const menor = comAmbos.length ? comAmbos.reduce((a, b) => ((b.ate - b.desde) < (a.ate - a.desde) ? b : a)) : null;
const modulo = menor ? { desde: menor.desde, ate: menor.ate, nome: menor.nome, bytes: Buffer.byteLength(menor.texto, 'utf8'), origem: 'corpo_extraido' }
  : { desde: faixa.desde, ate: faixa.ate, nome: null, bytes: areaDaFaixa, origem: 'sem_involucre_extraido_a_faixa' };
const doModulo = menor ? dedup.filter((h) => h !== menor && h.desde >= menor.desde && h.ate <= menor.ate) : dedup.filter((h) => h.desde >= modulo.desde && h.ate <= modulo.ate);
const foraDoModulo = dedup.filter((h) => !doModulo.includes(h) && h !== menor);
const porFuncao = doModulo.map((h) => { const f = fontesDe(h.texto); return { nome: h.nome, offset: h.desde, bytes_corpo: Buffer.byteLength(h.texto, 'utf8'), truncado: h.truncado, cita_marca_municipal: MUNICIPAL(h.texto), from: f.from, rpc: f.rpc, select: f.select, url_rest: f.url }; });
const porForaDoModulo = foraDoModulo.map((h) => { const f = fontesDe(h.texto); return { nome: h.nome, offset: h.desde, bytes_corpo: Buffer.byteLength(h.texto, 'utf8'), from: f.from, rpc: f.rpc }; });
const topoDoModulo = (() => {
  if (!menor) return null;
  let resto = '';
  let cursor = menor.desde;
  for (const h of doModulo.slice().sort((a, b) => a.desde - b.desde)) { if (h.desde > cursor) resto += corpo.slice(cursor, h.desde); cursor = Math.max(cursor, h.ate); }
  if (cursor < menor.ate) resto += corpo.slice(cursor, menor.ate);
  const f = fontesDe(resto);
  return { bytes_resto: Buffer.byteLength(resto, 'utf8'), from: f.from, rpc: f.rpc };
})();
const uniao = (campo) => { const s = new Set(); for (const f of porFuncao) for (const x of f[campo]) s.add(x); return [...s].sort(); };
const topico = (() => {
  // Código da faixa que não pertence a nenhum corpo extraído reporta-se à parte, para que a lista de rotas
  // não finja ser exaustiva quando não é.
  let coberto = 0;
  for (const h of dedup) coberto += Math.min(h.ate, faixa.ate) - Math.max(h.desde, faixa.desde);
  const f = fontesDe(trecho);
  return { chars_da_faixa: areaDaFaixa, chars_cobertos_por_corpos: coberto, rotas_em_toda_a_faixa: { from: f.from, rpc: f.rpc } };
})();

// Resolução por ocorrência sobre TODOS os corpos da faixa: o corpo mais pequeno que contém decide.
const NOMES_MUN_BACKEND = ['bfr_municipal_school_stats', 'bfr_municipal_network_totals', 'bfr_municipal_municipalities', 'bfr_municipal_access_grants', 'bfr_municipal_audit', 'bfr_school_in_municipal_scope', 'bfr_is_municipal_authority'];
const resolve = (nome) => Toca(nome).map((off) => {
  const contem = dedup.filter((h) => h.desde <= off && off < h.ate);
  const base = { offset_global: off, no_modulo: off >= modulo.desde && off < modulo.ate };
  if (!contem.length) return { ...base, menor_corpo: null, municipal: false, nota: 'resto_do_involucre_ou_topo' };
  const m = contem.reduce((a, b) => (b.ate - b.desde < a.ate - a.desde ? b : a));
  return { ...base, menor_corpo: m.nome, bytes_menor_corpo: Buffer.byteLength(m.texto, 'utf8'), municipal: MUNICIPAL(m.texto), do_modulo: doModulo.includes(m) || m === menor };
});
const presenca = NOMES_MUN_BACKEND.map((n) => { const r = resolve(n); return { nome: n, ocorrencias_no_corpus: r.length, no_modulo: r.filter((x) => x.no_modulo).length, dentro_de_corpo_do_modulo: r.filter((x) => x.do_modulo === true).length, por_ocorrencia: r }; });
marca('presença dos 7 nomes resolvida');

const falhas = [];
const g = (nome, cond, detalhe) => { if (!cond) falhas.push(`${nome}: ${JSON.stringify(detalhe).slice(0, 260)}`); return { nome, verde: !!cond, detalhe }; };
const portoes = [
  g('fixture_posivo_todas_as_chamadas_de_gate_municipal_caem_no_involucre', presenca.find((x) => x.nome === 'bfr_is_municipal_authority').no_modulo === presenca.find((x) => x.nome === 'bfr_is_municipal_authority').ocorrencias_no_corpus && presenca.find((x) => x.nome === 'bfr_is_municipal_authority').ocorrencias_no_corpus > 0, presenca.find((x) => x.nome === 'bfr_is_municipal_authority')),
  g('o_involucre_do_modulo_foi_extraido_nao_inventado', Boolean(menor), { origem: modulo.origem, nome: modulo.nome, bytes: modulo.bytes }),
  g('a_regua_extrai_corpos_com_bytes_positivos', porFuncao.length > 0 && porFuncao.every((f) => f.bytes_corpo > 40), porFuncao.map((f) => `${f.nome}=${f.bytes_corpo}`)),
  g('nenhum_corpo_bate_no_teto_de_profundidade', dedup.every((h) => h.truncado === false), { teto: TETO_CORPO, truncados: dedup.filter((h) => h.truncado).map((h) => `${h.nome}@${h.desde}`) }),
  g('o_modulo_nao_e_a_shell_toda', modulo.bytes < bytes && porFuncao.length < dedup.length, { bytes_modulo: modulo.bytes, bytes_corpus: bytes, corpos_no_modulo: porFuncao.length, funcoes_na_faixa: dedup.length }),
  g('a_vista_de_backend_nao_aparece_em_byte_nenhum_servido', Toca('bfr_municipal_school_stats').length === 0, { ocorrencias: Toca('bfr_municipal_school_stats').length }),
  g('os_agregados_e_o_catalogo_municipal_de_backend_tem_zero_ocorrencias', presenca.filter((x) => ['bfr_municipal_network_totals', 'bfr_municipal_municipalities', 'bfr_municipal_access_grants', 'bfr_municipal_audit', 'bfr_school_in_municipal_scope'].includes(x.nome)).every((x) => x.ocorrencias_no_corpus === 0), presenca.map((x) => `${x.nome}=${x.ocorrencias_no_corpus}`)),
  g('a_lista_de_rotas_do_modulo_nao_e_vazia', uniao('from').length + uniao('rpc').length + ((topoDoModulo?.from.length || 0) + (topoDoModulo?.rpc.length || 0)) > 0, { dos_corpos: { from: uniao('from'), rpc: uniao('rpc') }, do_resto_do_involucre: topoDoModulo }),
  g('nenhuma_rota_do_modulo_e_nome_municipal_de_backend', uniao('from').concat(uniao('rpc'), topoDoModulo?.from || [], topoDoModulo?.rpc || []).every((n) => !NOMES_MUN_BACKEND.includes(n)), { from: uniao('from'), rpc: uniao('rpc'), topo: topoDoModulo }),
];

const o = {
  programa: 'scripts/sm23-leitura-aba-municipal-18-11.mjs',
  em: new Date().toISOString(),
  duracao_ms: Date.now() - t0,
  pergunta: 'a vista `bfr_municipal_school_stats` devolve 0 linhas a todos os papéis — é isso que o utilizador vê vazio na aba municipal?',
  metodo: 'fetch dos bytes servidos; faixa do embed por âncoras `bfrMunicipal` ± margem; corpos por profundidade com teto; pertencer ao módulo é contenção no invólucro extraído, não marca no corpo; zero SQL',
  antecessores: ['evidence/sm23-leitura-aba-municipal-18-11-ANTERIOR-janela-fixa-de-24kb-sobre-colhia-vizinhos.json', 'evidence/sm23-leitura-aba-municipal-18-11-ANTERIOR-exigia-marca-dentro-de-cada-corpo.json', '.g-sm23-aba-mun-INTERROMPIDA-corpo-truncado-de-260kb-por-cabecalho.txt (fora do repositório, sessão)'],
  escala: { bytes_do_corpus: bytes, chars_da_faixa: areaDaFaixa, ancoras_bfrMunicipal: munOffs.length, margem_declarada: MARGEM, teto_corpo: TETO_CORPO, cabecalhos_na_faixa: bruto.length, corpos_nao_sobrepostos: dedup.length, bytes_do_involucre: modulo.bytes, origem_do_involucre: modulo.origem, nome_do_involucre: modulo.nome, corpos_no_modulo: porFuncao.length, corpos_fora_do_modulo_na_faixa: porForaDoModulo.length, corpos_que_citam_a_marca: porFuncao.filter((f) => f.cita_marca_municipal).length },
  servido: { url: alvoUrl, status: resp.status, bytes, md5 },
  candidata_local: { ficheiro: 'bfr-candidata-v134-sidebar-escondida/index.html', bytes: Buffer.byteLength(localTxt, 'utf8'), md5: localMd5, identica_ao_servido: localMd5 === md5 },
  nomes_municipais_de_backend: presenca,
  rotas_do_modulo: { dos_corpos: { from: uniao('from'), rpc: uniao('rpc'), select: uniao('select'), url_rest: uniao('url_rest') }, do_resto_do_involucre: topoDoModulo },
  rotas_em_toda_a_faixa_incluindo_codigo_de_topo: topico.rotas_em_toda_a_faixa,
  por_funcao: porFuncao,
  por_fora_do_modulo: porForaDoModulo,
  ocorrencias_da_vista_no_corpus: Toca('bfr_municipal_school_stats').length,
  portoes,
};
o.conclusao = {
  nomes_municipais_de_backend_presentes_no_bundle: presenca.filter((x) => x.ocorrencias_no_corpus > 0).map((x) => x.nome),
  nomes_municipais_de_backend_ausentes_do_bundle: presenca.filter((x) => x.ocorrencias_no_corpus === 0).map((x) => x.nome),
  frases_que_esta_corrida_autoriza: [
    `dos 7 nomes municipais de backend, ${presenca.filter((x) => x.ocorrencias_no_corpus > 0).length} aparecem nos bytes servidos (${JSON.stringify(presenca.filter((x) => x.ocorrencias_no_corpus > 0).map((x) => `${x.nome}×${x.ocorrencias_no_corpus}`))}) e ${presenca.filter((x) => x.ocorrencias_no_corpus === 0).length} têm zero ocorrências em ${bytes} bytes`,
    'a vista e os agregados que o DDL de 18/11 endureceu não são chamados por byte nenhum do bundle: o 0 que eles devolvem NÃO é o número que a aba pinta',
    `as rotas dentro do invólucro do módulo são ${JSON.stringify({ from: uniao('from'), rpc: uniao('rpc'), resto_do_involucre: topoDoModulo })}`,
  ],
};
o.veredito = falhas.length === 0 ? 'ABA_MUNICIPAL_CONFERIDA' : `VERMELHO: ${falhas.length}`;
o.falhas = falhas;
if (falhas.length) { const p = OUT.replace(/\.json$/, '-VERMELHO.json'); writeFileSync(p, JSON.stringify(o, null, 2) + '\n'); for (const f of falhas) console.log('  FALTA ' + f); console.log(`SM23_ABA_MUN_VERMELHO · registo ${p}`); process.exit(1); }
writeFileSync(OUT, JSON.stringify(o, null, 2) + '\n');
console.log('SERVIDO', JSON.stringify(o.servido), 'LOCAL', JSON.stringify(o.candidata_local));
console.log('ESCALA', JSON.stringify(o.escala));
console.log('MUN', JSON.stringify(presenca.map((x) => `${x.nome}:${x.ocorrencias_no_corpus}occ/${x.dentro_de_corpo_municipal}em_corpo_mun`)));
console.log('ROTAS_DA_ABA', JSON.stringify(o.rotas_da_aba));
console.log('ROTAS_DA_FAIXA', JSON.stringify(o.rotas_em_toda_a_faixa_incluindo_codigo_de_topo));
console.log('FUNCOES', JSON.stringify(porFuncao.map((f) => `${f.nome}:${f.bytes_corpo}b:${f.from.join('+') || '-'}:${f.rpc.join('+') || '-'}`)));
for (const p of o.portoes) console.log(`  portao ${p.nome}: ${p.verde ? 'VERDE' : 'VERMELHO'}`);
console.log(`SM23_ABA_MUN_CONFERIDO · registo ${OUT} · ${o.duracao_ms} ms`);
