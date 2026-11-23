#!/usr/bin/env node
// P140 — superficie de chamadas RPC do bundle servido nas DUAS formas em que a casa escreve um nome: literal
// entre aspas, e constante passada a um wrapper. SO LEITURA: nao toca o banco, nao chama /rpc, nao escreve produto.
//
// Existe porque o censo do p126 — e, por heranca, o campo `chamado_pelo_ar` do p139 — so veem a forma literal.
// Medido 22/11: o bundle da v142 tem 33 sitios `.rpc(`; 32 passam o nome como literal e 1 passa um parametro do
// wrapper `lerRpc`, e por esse sitio chegam dois nomes que o censo de 21/11 dava como nao chamados. O proprio
// p126 ja confessa esta cegueira no seu `o_que_NAO_prova`; aqui a cegueira passa a ser medida em vez de confessada.
//
// Proveniencia: a forma literal e reproduzida a partir do texto-fonte do p126 e tem de bater com o artefacto dele;
// a identidade do medido segue a disciplina do p136/p139 (ar = diario de publicacao mais novo, por bytes e md5).
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = process.env.P140_SUF ? '-' + process.env.P140_SUF : '-22-11-a';
const OUT = join(REPO, 'evidence/p140-superficie-rpc-das-duas-formas' + SUF + '.json');
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com P140_SUF=novo, nao por cima');
const t0 = Date.now();
const md5 = (b) => createHash('md5').update(b).digest('hex');

// ---- 1) a forma literal, lida do texto do produtor ---------------------------------------------------
const F_126 = 'scripts/p126-censo-rpc-do-bundle-servido.mjs';
const txt126 = readFileSync(join(REPO, F_126), 'utf8');
const mFonte = /^const RE_RPC = \/([\s\S]*?)\/g;$/m.exec(txt126);
if (!mFonte) throw new Error('ABORTA: nao li a forma literal em ' + F_126 + ' — nenhuma cifra de superficie sai daqui');
const FONTE_LITERAL = mFonte[1];
const RE_LITERAL = new RegExp(FONTE_LITERAL, 'g');
// O fixture e o lado positivo do que o produtor declara: duas chamadas literais, uma com espacos, e o que a
// forma dele NAO ve fica de fora por construcao — se um dia o produtor alargar a forma, este fixture chumba.
const FIX_LIT = "a.rpc('bfr_alpha',{x:1}); b.rpc( 'bfr_beta' );";
const FIX_LIT_ESPERADO = ['bfr_alpha', 'bfr_beta'];
const fixLit = [...new Set([...FIX_LIT.matchAll(RE_LITERAL)].map((m) => m[1]))].sort();
const fix_lit_passou = fixLit.join(',') === FIX_LIT_ESPERADO.join(',');

// ---- 2) identidade do medido, antes de contar --------------------------------------------------------
const diarios = readdirSync(REPO).filter((f) => /^audit-publicacao-v\d+\.json$/.test(f))
  .map((f) => ({ f, v: Number(/v(\d+)\.json$/.exec(f)[1]) })).sort((a, b) => b.v - a.v);
if (!diarios.length) throw new Error('ABORTA: nenhum audit-publicacao-vNNN.json no disco');
const diario = JSON.parse(readFileSync(join(REPO, diarios[0].f), 'utf8'));
const url = diario.deploy && diario.deploy.url;
const reg = diario.conferencia_no_ar || {};
if (!url || !reg.md5_agora || !reg.bytes_agora) throw new Error('ABORTA: ' + diarios[0].f + ' nao tem deploy.url nem conferencia_no_ar.md5_agora/bytes_agora');
const arBruto = Buffer.from(await (await fetch(url + '/', { headers: { 'cache-control': 'no-cache' } })).arrayBuffer());
const identidade = {
  diario: diarios[0].f, versao_registada: diarios[0].v, url_lida_do_diario: url,
  bytes_no_diario: reg.bytes_agora, md5_no_diario: reg.md5_agora,
  bytes_apanhados: arBruto.length, md5_apanhado: md5(arBruto),
  ar_bate_com_o_diario: md5(arBruto) === reg.md5_agora && arBruto.length === reg.bytes_agora,
};
const arTxt = identidade.ar_bate_com_o_diario ? arBruto.toString('utf8') : (() => { throw new Error('ABORTA: o ar nao bate com o diario — nada e contado contra bytes nao identificados'); })();

// ---- 3) os sitios `.rpc(`, classificados pela forma do primeiro argumento -----------------------------
const RE_SITIO = /\.rpc\(\s*([^,)]{0,80})/g;
const RE_CONST = /const\s+([A-Za-z_$][\w$]*)\s*=\s*'([a-z0-9_]+)'/g;
const RE_FUNC = /(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*{/g;
const CLASSES_SITIO = ['literal', 'por_constante', 'por_wrapper', 'sem_forma_conhecida'];

const LIMITE_CORPO = 60000;
const feituraFixtures = (texto) => {
  const constates = new Map();
  for (const m of texto.matchAll(RE_CONST)) constates.set(m[1], m[2]);
  const funcoes = [];
  for (const m of texto.matchAll(RE_FUNC)) {
    const abre = m.index + m[0].length - 1;
    let nivel = 0, fecha = -1;
    for (let i = abre; i < Math.min(texto.length, abre + LIMITE_CORPO); i += 1) {
      const c = texto[i];
      if (c === '{') nivel += 1;
      else if (c === '}') { nivel -= 1; if (nivel === 0) { fecha = i; break; } }
    }
    funcoes.push({ nome: m[1], params: m[2].split(',').map((x) => x.trim().split(/[\s=]/)[0]).filter(Boolean), inicio: abre, fim: fecha });
  }
  const donoDoSitio = (idx) => funcoes.filter((f) => f.fim > 0 && f.inicio <= idx && idx <= f.fim).sort((a, b) => b.inicio - a.inicio)[0] || null;
  const chamadaDe = (f) => {
    const RE_C = new RegExp('\\b' + f.nome.replace(/\$/g, '\\$') + '\\s*\\(([^;]{0,200}?)\\)', 'g');
    const out = [];
    for (const c of texto.matchAll(RE_C)) {
      const antes = texto.slice(Math.max(0, c.index - 16), c.index);
      if (/function\s*$/.test(antes) || /(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*$/.test(antes)) continue;
      if (c.index >= f.inicio && c.index <= f.fim) continue;
      out.push(c[1].split(',').map((x) => x.trim()));
    }
    return out;
  };
  const resolve = (expr, idx, depth) => {
    const e = String(expr).trim();
    if (e === '') return { classe: 'sem_forma_conhecida', nomes: [], ramos: [], por: '(vazio)' };
    const lit = /^'([a-z0-9_]+)'$/.exec(e);
    if (lit) return { classe: 'literal', nomes: [lit[1]], ramos: [], por: e };
    if (constates.has(e)) return { classe: 'por_constante', nomes: [constates.get(e)], ramos: [], por: 'const ' + e };
    if (!/^[A-Za-z_$][\w$]*$/.test(e)) return { classe: 'sem_forma_conhecida', nomes: [], ramos: [], por: e.slice(0, 40) };
    const f = donoDoSitio(idx);
    if (f && depth <= 3) {
      const pos = f.params.indexOf(e);
      if (pos >= 0) {
        const passados = chamadaDe(f);
        const ramificado = passados.map((args) => resolve(args[pos] === undefined ? '' : args[pos], idx, depth + 1));
        const nomes = [...new Set(ramificado.flatMap((r) => r.nomes))].sort();
        const ramos = ramificado.filter((r) => r.nomes.length === 0).map((r) => ({ wrapper: f.nome, dado: r.por, classe: r.classe }));
        return { classe: 'por_wrapper', nomes, ramos, por: f.nome + '(param ' + e + ' nº ' + (pos + 1) + ')', chamadas: passados };
      }
    }
    return { classe: 'sem_forma_conhecida', nomes: [], ramos: [], por: e.slice(0, 40) + ' (nao e const nem parametro de funcao com sitio)' };
  };
  const sitios = [];
  for (const m of texto.matchAll(RE_SITIO)) {
    const r = resolve(m[1], m.index, 0);
    sitios.push({ em: m.index, argumento: m[1].trim().slice(0, 40), ...r });
  }
  const semFecho = funcoes.filter((f) => f.fim < 0).map((f) => f.nome + '@' + f.inicio);
  return { sitios, constates, funcoes: funcoes.length, sem_fecho: semFecho };
};

const resumoSitios = (rr) => Object.fromEntries(CLASSES_SITIO.map((c) => {
  const dentro = rr.filter((s) => s.classe === c);
  return [c, { total: dentro.length, nomes: [...new Set(dentro.flatMap((s) => s.nomes))].sort(), em: dentro.map((s) => s.em) }];
}));
const ramosNaoResolvidos = (rr) => rr.flatMap((s) => s.ramos || []);

const medido = feituraFixtures(arTxt);
const sitios = medido.sitios;
const resumo = resumoSitios(sitios);
const ramos = ramosNaoResolvidos(sitios);
const NOMES_CHAMADOS = [...new Set(CLASSES_SITIO.flatMap((c) => resumo[c].nomes))].sort();
const NOMES_LITERAIS = resumo.literal.nomes;
const POR_CONSTANTE = [...resumo.por_constante.nomes, ...resumo.por_wrapper.nomes].sort();

// ---- 4) o que o censo anterior dizia, lido dos artefactos em disco -------------------------------------
const F_P126 = 'evidence/p126-censo-rpc-21-11-v142b.json';
const p126 = JSON.parse(readFileSync(join(REPO, F_P126), 'utf8'));
const nomes126 = [...p126.bundles[0].nomes].sort();
if (!p126.bundles[0].md5 || !p126.bundles[0].bytes) throw new Error('ABORTA: o ' + F_P126 + ' nao declara pega do bundle — nao ha o que conferir');
const pega_126_vs_ar = { caminho_no_artefacto: p126.bundles[0].caminho, md5_126: p126.bundles[0].md5, bytes_126: p126.bundles[0].bytes, md5_ar: identidade.md5_apanhado, bytes_ar: identidade.bytes_apanhados,
  bate: p126.bundles[0].md5 === identidade.md5_apanhado && p126.bundles[0].bytes === identidade.bytes_apanhados };
const reproducaoDaFormaLiteral = JSON.stringify(nomes126) === JSON.stringify(NOMES_LITERAIS);
const F_P139 = 'evidence/p139-acls-dos-nomes-do-ar-contra-o-alvo-sm37g.json';
const p139 = JSON.parse(readFileSync(join(REPO, F_P139), 'utf8'));
const revelados = NOMES_CHAMADOS.filter((n) => !nomes126.includes(n)).sort();
const UNIVERSO_139 = [...new Set([...p139.universos.nomes_do_ar, ...p139.universos.nomes_municipais_de_ddl])];
const cruzamento = revelados.map((n) => {
  const ls = p139.por_nome.filter((r) => r.nome === n);
  return { nome: n, no_universo_p139: UNIVERSO_139.includes(n), no_alvo_de_peca_de_graus: p139.universos.nomes_do_alvo.includes(n),
    oid: ls.map((r) => r.oid), anon_pode: ls.map((r) => r.anon_pode), vol: ls.map((r) => r.vol),
    chamado_pelo_ar_no_p139: ls.map((r) => r.chamado_pelo_ar) };
});
// A divergencia entre as duas corridas do p126 (3 vs 2 ausentes) nao se harmoniza: leem-se os tres registos e
// ve-se qual deles e o de hoje. O que muda entre eles e o catalogo, nao o bundle — por isso a pega do bundle.
const REGISTOS_P126 = ['evidence/p126-censo-rpc-21-11-v142.json', F_P126, 'evidence/p126-censo-rpc-21-11-v142-apos42.json'];
const serieP126 = REGISTOS_P126.map((f) => { const j = JSON.parse(readFileSync(join(REPO, f), 'utf8')); return { ficheiro: f, em: j.em, md5_bundle: j.bundles[0].md5, nomes: j.bundles[0].nomes.length, ausentes: j.ausentes.map((x) => x.nome).sort(), veredito: j.veredito }; });

// ---- 5) fixtures: cada classe e os ramos nao resolvidos tem de disparar --------------------------------
const FIX_TEXT = [
  "const NOME_K = 'bfr_k_por_constante_direta';",
  "async function embrulho(chave, nome) { const r = await c.rpc(nome, {}); return r; }",
  "embrulho('a', 'bfr_k_por_literal_na_chamada');",
  "embrulho('b', NOME_K);",
  "async function outroWrapper(chave, nome) { const r = await x.rpc(nome, {}); return r; }",
  "outroWrapper('c', variavelQueNaoEConst);",
  "c.rpc('bfr_lit_1'); d.rpc( 'bfr_lit_2' ,{}); e.rpc(varivelSolta); f.rpc(umaTemplate);",
  "const NOME_D = 'bfr_d_constante_direta'; g.rpc(NOME_D);",
].join('\n');
const fix = feituraFixtures(FIX_TEXT);
const fixResumo = resumoSitios(fix.sitios);
const fixRamos = ramosNaoResolvidos(fix.sitios);
const FIX_ESPERADO = { literal: 2, por_constante: 1, por_wrapper: 2, sem_forma_conhecida: 2 };
const fix_classes_disparam = CLASSES_SITIO.every((c) => fixResumo[c].total >= 1);
const fix_bate = JSON.stringify(Object.fromEntries(CLASSES_SITIO.map((c) => [c, fixResumo[c].total]))) === JSON.stringify(FIX_ESPERADO);
const resumo_imprime_quatro_com_corpus_vazio = JSON.stringify(Object.keys(resumoSitios([]))) === JSON.stringify(CLASSES_SITIO) && resumoSitios([]).por_wrapper.total === 0;

// ---- 6) portoes ------------------------------------------------------------------------------------------
const falhas = [];
const gate = (nome, obtido, esperado, detalhe) => {
  const verde = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!verde) falhas.push(nome);
  return { nome, verde, obtido, esperado, detalhe };
};
const portoes = [
  gate('a_identidade_do_ar_bate_com_o_diario_de_publicacao', identidade.ar_bate_com_o_diario, true, identidade),
  gate('a_forma_literal_lida_do_produtor_dispara_no_fixture_dele', fixLit, FIX_LIT_ESPERADO, { fonte: FONTE_LITERAL, ficheiro: F_126 }),
  gate('a_forma_literal_reproduzida_bate_com_o_artefacto_do_p126', [reproducaoDaFormaLiteral, NOMES_LITERAIS.length], [true, nomes126.length], { reproduzidos: NOMES_LITERAIS.length, no_artefacto: nomes126.length, veredito_p126: p126.veredito }),
  gate('cada_classe_de_sitio_tem_positivo_em_fixture', [fix_classes_disparam, fix_bate], [true, true], { obtido: Object.fromEntries(CLASSES_SITIO.map((c) => [c, fixResumo[c].total])), esperado: FIX_ESPERADO }),
  gate('os_ramos_de_wrapper_nao_resolvidos_disparam_no_fixture_e_vao_zero_no_corpus', [fixRamos.length >= 1, ramos.length], [true, 0], { no_fixture: fixRamos, no_corpus: ramos }),
  gate('o_resumo_de_sitios_imprime_as_quatro_classes_com_corpus_vazio', [resumo_imprime_quatro_com_corpus_vazio, resumoSitios([]).por_constante.total], [true, 0], { vazio: resumoSitios([]) }),
  gate('nenhum_sitio_do_ar_fica_fora_das_quatro_classes', sitios.length, CLASSES_SITIO.reduce((a, c) => a + resumo[c].total, 0), { sitios: sitios.length, por_classe: Object.fromEntries(CLASSES_SITIO.map((c) => [c, resumo[c].total])) }),
  gate('os_nomes_revelados_fora_do_censo_estao_no_universo_do_p139', revelados.every((n) => UNIVERSO_139.includes(n)), true, { revelados, universo_p139: UNIVERSO_139.length }),
  gate('a_serie_do_p126_tem_a_mesma_pega_de_bundle', [...new Set(serieP126.map((x) => x.md5_bundle))].length, 1, { registos: serieP126 }),
  gate('o_bundle_cujo_censo_conferi_e_o_mesmo_ar_de_hoje', pega_126_vs_ar.bate, true, pega_126_vs_ar),
  gate('nenhuma_funcao_do_corpus_fica_sem_fecho_dentro_do_limite_lido', [medido.sem_fecho.length, LIMITE_CORPO], [0, LIMITE_CORPO], { funcoes_varridas: medido.funcoes, sem_fecho: medido.sem_fecho }),
];

const euBruto = readFileSync(join(REPO, 'scripts/p140-superficie-rpc-das-duas-formas.mjs'));
// Proveniencia dos nomes que nao vem da forma literal: que identificador do bundle os declara. Nao e portao
// (o resolutor so sabe o que estas linhas dizem) — e o registo que permite a quem le conferir sem me crer.
const nomes_nao_lit = [...new Set([...resumo.por_constante.nomes, ...resumo.por_wrapper.nomes])].sort();
const declaracoes_dos_nomes_nao_lit = nomes_nao_lit.map((n) => ({
  nome: n,
  identificadores: [...new Set([...arTxt.matchAll(new RegExp("const\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*'" + n + "'\\s*;?", 'g'))].map((m) => m[1]))].sort(),
  ocorrencias_da_string_no_bundle: [...arTxt.matchAll(new RegExp("'" + n + "'", 'g'))].length,
}));
const saida = {
  peca: 'scripts/p140-superficie-rpc-das-duas-formas.mjs', em: new Date().toISOString(), duracao_ms: Date.now() - t0,
  emissor_bytes: euBruto.length, emissor_md5: md5(euBruto),
  pergunta: 'que nomes de funcao o bundle servido chama, contados nas duas formas em que a casa escreve um nome — literal entre aspas e constante passada a um wrapper — e quantos deles o censo de 21/11 nao via?',
  metodo: 'fetch do ar + bytes/md5 contra o diario de publicacao mais novo; a forma literal e reproduzida do texto-fonte do p126 e conferida com o artefacto dele; cada sitio `.rpc(` e classificado em quatro classes, com resolutor de constante e de parametro de funcao (profundidade maxima 3) e registo dos ramos do wrapper que nao resolvem; zero SQL, zero /rpc, zero escrita.',
  identidade_do_medido: identidade,
  forma_literal_proveniente_de: { ficheiro: F_126, fonte: FONTE_LITERAL, fixture: { obtido: fixLit, esperado: FIX_LIT_ESPERADO, passou: fix_lit_passou } },
  resumo_dos_sitios: resumo,
  nomes: { literais: NOMES_LITERAIS, por_constante_ou_wrapper: POR_CONSTANTE, chamados_uniao: NOMES_CHAMADOS },
  contagens: { sitios: sitios.length, literais: resumo.literal.total, por_constante: resumo.por_constante.total, por_wrapper: resumo.por_wrapper.total, sem_forma_conhecida: resumo.sem_forma_conhecida.total, ramos_nao_resolvidos: ramos.length, nomes_uniao: NOMES_CHAMADOS.length, p126: nomes126.length },
  censo_anterior: { ficheiro: F_P126, veredito: p126.veredito, nomes: nomes126, reproducao_da_forma_literal: reproducaoDaFormaLiteral },
  serie_p126: serieP126,
  revelados_fora_do_censo_anterior: revelados,
  declaracoes_dos_nomes_por_constante_ou_wrapper: declaracoes_dos_nomes_nao_lit,
  varredura_de_corpos: { limite_caracteres_por_funcao: LIMITE_CORPO, funcoes_lidas: medido.funcoes, sem_fecho: medido.sem_fecho, constates_lidos_no_ar: medido.constates.size },
  cruzamento_com_o_p139: { ficheiro: F_P139, linhas: cruzamento },
  sitios_por_classe: Object.fromEntries(CLASSES_SITIO.map((c) => [c, sitios.filter((s) => s.classe === c).map((s) => ({ em: s.em, argumento: s.argumento, por: s.por, nomes: s.nomes, chamadas: s.chamadas, ramos: s.ramos })) ])),
  wrappers: sitios.filter((s) => s.classe === 'por_wrapper').map((s) => ({ em: s.em, por: s.por, nomes: s.nomes, chamadas: s.chamadas })),
  fixtures: { esperado: FIX_ESPERADO, obtido: Object.fromEntries(CLASSES_SITIO.map((c) => [c, fixResumo[c].total])), ramos_no_fixture: fixRamos, texto: FIX_TEXT, sitios: fix.sitios.map((s) => ({ argumento: s.argumento, classe: s.classe, por: s.por, nomes: s.nomes })) },
  o_que_prova: 'quantos sitios `.rpc(` o bundle servido tem, que nomes cada forma entrega, e que nomes chegam ao ar por constante passada a um wrapper — portanto faltavam ao censo do p126 e ao campo `chamado_pelo_ar` do p139. A forma literal desta peca e a do produtor, reproduzida do texto dele e conferida com o artefacto dele.',
  o_que_NAO_prova: 'que o nome resolvido seja executado em runtime — uma chamada pode estar atras dum ramo nunca tomado — nem que exista no catalogo ou tenha graus: existencia, ACL e classes leem-se no p139. So vale para os bytes do ar registado no diario mais novo; nao prova nada sobre outras versoes nem sobre nomes chamados por outras formas que nao `.rpc(` (o contador de sitios e por essa forma).',
  portoes: { total: portoes.length, falhas: falhas.length, lista: portoes },
};
saida.veredito = falhas.length === 0
  ? 'P140_SUPERFICIE_MEDIDA ' + portoes.length + '/0 · sitios ' + sitios.length + ' · chamados ' + NOMES_CHAMADOS.length + ' (literais ' + NOMES_LITERAIS.length + ' + constante/wrapper ' + POR_CONSTANTE.length + ') · revelados_fora_do_censo ' + revelados.length + ' · ramos_nao_resolvidos ' + ramos.length
  : 'P140_VERMELHO_' + falhas.length;
if (falhas.length) {
  const p = OUT.replace(/\.json$/, '-VERMELHO.json');
  writeFileSync(p, JSON.stringify(saida, null, 2) + '\n');
  for (const f of falhas) console.log('  FALTA ' + f);
  console.log('P140_VERMELHO ' + falhas.length + '/' + portoes.length + ' · guarda dos dois nomes: ' + OUT + ' (nao escrito) e ' + p);
  process.exit(1);
}
writeFileSync(OUT, JSON.stringify(saida, null, 2) + '\n');
console.log('ar: ' + identidade.versao_registada + ' md5=' + identidade.md5_apanhado + ' bytes=' + identidade.bytes_apanhados + ' bate=' + identidade.ar_bate_com_o_diario);
console.log('forma literal lida de ' + F_126 + ': ' + FONTE_LITERAL + ' · fixture=' + JSON.stringify(fixLit));
for (const c of CLASSES_SITIO) console.log('  ' + c + ': sitios ' + resumo[c].total + ' · nomes ' + (resumo[c].nomes.length ? resumo[c].nomes.join(',') : '(vazio, impresso de proposito)'));
console.log('sitios=' + sitios.length + ' uniao=' + NOMES_CHAMADOS.length + ' · p126 nomes=' + nomes126.length + ' reproducao_literal=' + reproducaoDaFormaLiteral);
console.log('revelados fora do censo: ' + (revelados.join(', ') || '(nenhum)'));
for (const d of declaracoes_dos_nomes_nao_lit) console.log('  declarado por [' + d.identificadores.join(',') + '] · string no bundle ' + d.ocorrencias_da_string_no_bundle + 'x · ' + d.nome);
for (const l of cruzamento) console.log('  ' + l.nome + ': no_alvo=' + l.no_alvo_de_peca_de_graus + ' oid=' + JSON.stringify(l.oid) + ' anon_pode=' + JSON.stringify(l.anon_pode) + ' vol=' + JSON.stringify(l.vol) + ' chamado_pelo_ar_no_p139=' + JSON.stringify(l.chamado_pelo_ar_no_p139));
for (const s of serieP126) console.log('  p126 ' + s.ficheiro.split('/').pop() + ' em=' + s.em + ' nomes=' + s.nomes + ' ausentes=' + JSON.stringify(s.ausentes));
console.log('fixtures=' + JSON.stringify(Object.fromEntries(CLASSES_SITIO.map((c) => [c, fixResumo[c].total]))) + ' ramos_no_fixture=' + fixRamos.length);
for (const p of portoes) console.log('  portao ' + p.nome + ': ' + (p.verde ? 'VERDE' : 'VERMELHO'));
console.log(saida.veredito + ' · ' + saida.duracao_ms + ' ms · registo ' + OUT);
