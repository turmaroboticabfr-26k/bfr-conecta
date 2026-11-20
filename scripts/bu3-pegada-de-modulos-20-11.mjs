// BU-3 — pegada de cada módulo do ar contra o catálogo: que mesas e RPCs cada bloco usa,
// que papéis as alcançam, e o que o código chama e não existe (a classe da PEN-42, generalizada).
// Só-leitura: lê o bundle versionado e o artefacto da matriz de autorização; o banco só é lido.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { sql } from './s19-lib.mjs';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = process.env.BU3_SUF || '';
const OUT = `${DIR}/evidence/bu3-pegada-de-modulos-20-11${SUF}.json`;
const TXT = `${DIR}/evidence/bu3-pegada-de-modulos-20-11${SUF}.txt`;
if (existsSync(OUT) || existsSync(TXT)) throw new Error(`ABORTA: ${OUT} já existe — correr com BU3_SUF novo`);
const t0 = Date.now();
const MATRIZ = process.env.BU3_MATRIZ || `${DIR}/evidence/bu2c-caminhos-de-autorizacao-20-11c.json`;
if (!existsSync(MATRIZ)) throw new Error('falta a matriz de autorização (bu2c) — o cruzamento não se inventa');

const BUNDLE = `${DIR}/bfr-candidata-v136-secretaria-de-educacao/index.html`;
const bundle = readFileSync(BUNDLE, 'utf8');
const bytes = Buffer.byteLength(bundle, 'utf8');
const md5 = createHash('md5').update(bundle).digest('hex');
const publicacao = JSON.parse(readFileSync(`${DIR}/audit-publicacao-v136.json`, 'utf8'));
const certidao = JSON.parse(readFileSync(`${DIR}/bfr-candidata-v136-secretaria-de-educacao/portoes-v136-candidata.json`, 'utf8'));
// o diário guarda «md5 (N B)» por ficheiro; a certidão guarda saida.md5/bytes — as duas fontes do mesmo número
const linhaDoDiario = publicacao.md5['bfr-candidata-v136-secretaria-de-educacao/index.html'] || '';
const md5DoDiario = (linhaDoDiario.match(/^([0-9a-f]{32})/) || [])[1] || null;
const bytesDoDiario = Number((linhaDoDiario.match(/\((\d+) B\)/) || [])[1] || 0) || null;

const matriz = JSON.parse(readFileSync(MATRIZ, 'utf8'));
const papeis = matriz.papeis_enum;
const ENUM = new Set(papeis);

// 1. regiões de script com identidade (data-bfr-module / data-bfr-deferred / id / municipal)
// varredor com semântica de parser: um <script> fecha no PRIMEIRO </script>; depois dele,
// só o próximo <script> abre região. Assim nenhuma região contém outra e nenhum byte é contado duas vezes.
function varreScripts(txt) {
  const eventos = [...txt.matchAll(/<script\b[^>]*>|<\/script>/g)];
  const regioes = [], todas = [];
  const v = { aberturas_honoradas: 0, aberturas_textuais_dentro_de_corpo: 0, fechos_que_fecharam_elemento: 0, fechos_sem_abertura: 0 };
  let aberturaAtual = null;
  for (const ev of eventos) {
    if (ev[0] === '</script>') {
      if (aberturaAtual) {
        v.fechos_que_fecharam_elemento++;
        const corpo = { ...aberturaAtual, fim: ev.index, chars: ev.index - aberturaAtual.corpoInicio };
        todas.push(corpo); // todo corpo conta para a pegada global, identificado ou não
        if (aberturaAtual.nome) regioes.push(corpo);
        aberturaAtual = null;
      } else v.fechos_sem_abertura++;
      continue;
    }
    if (aberturaAtual) { v.aberturas_textuais_dentro_de_corpo++; continue; } // texto dentro dum corpo: não é elemento
    v.aberturas_honoradas++;
    const attrs = ev[0];
    const attr = (nome) => (attrs.match(new RegExp(`${nome}="([^"]*)"`)) || [])[1] || null;
    const nome = attr('data-bfr-module') || attr('data-bfr-deferred') || attr('id') || (attrs.includes('data-bfr-municipal-module') ? 'modulo-municipal' : null);
    aberturaAtual = {
      nome,
      off: ev.index,
      corpoInicio: ev.index + ev[0].length,
      diferido: attrs.includes('type="text/plain"'),
      desativado: attrs.includes('data-bfr-auth-deferred-disabled') || attrs.includes('deferred-disabled'),
      critico_para: attr('data-bfr-critical-roles'),
      src: attr('src'),
    };
  }
  const porFechar = aberturaAtual && aberturaAtual.nome ? { nome: aberturaAtual.nome, off: aberturaAtual.off } : null;
  return { regioes, todas, varredura: v, porFechar, eventos: eventos.length };
}
const varrido = varreScripts(bundle);
const comCorpo = (lista) => lista.map((r) => ({ ...r, corpo: bundle.slice(r.corpoInicio, r.fim) }));
const regioUnica = comCorpo(varrido.regioes);
const todasUnica = comCorpo(varrido.todas);
const censoTags = {
  ...varrido.varredura,
  eventos_de_tag_no_texto_bruto: varrido.eventos,
  regioes_identificadas: regioUnica.length,
  corpos_de_script_no_documento: todasUnica.length,
  bytes_dos_corpos: regioUnica.reduce((s, r) => s + r.chars, 0),
  bytes_de_todo_script: todasUnica.reduce((s, r) => s + r.chars, 0),
  regioes_sem_identidade: todasUnica.filter((r) => !r.nome).length,
  bytes_sem_identidade: todasUnica.filter((r) => !r.nome).reduce((s, r) => s + r.chars, 0),
};
// fixture da régua de fecho: um documento partido tem de ser apanhado, senão o verde não quer dizer nada
const fixturePartido = varreScripts('<script id="a">var x = 1;');
const fixtureInteiro = varreScripts('<script id="a">var x = 1;</script><script data-bfr-module="b">y</script>');
const fixtureTextoIL = varreScripts('<script id="a">var s = "<script data-bfr-module=b>novo</scr' + 'ipt>";</script>');

// 2. pegada por região
const extraidoDe = (corpo) => ({
  tabelas: [...new Set([...corpo.matchAll(/\.from\(\s*'([a-z_0-9]+)'/g)].map((m) => m[1]))].sort(),
  rpcs: [...new Set([...corpo.matchAll(/\.rpc\(\s*'([a-z_0-9]+)'/g)].map((m) => m[1]))].sort(),
  buckets: [...new Set([...corpo.matchAll(/\.storage\.from\(\s*'([a-z_0-9-]+)'/g)].map((m) => m[1]))].sort(),
  canais: [...new Set([...corpo.matchAll(/\.channel\(\s*[`'"]([a-zA-Z_0-9$ {}-]+?)[`'"]/g)].map((m) => m[1]))].sort(),
  secoes: [...new Set([...corpo.matchAll(/(?:navigateToSection\(\s*|data-section=["'])([a-z_0-9-]+)/g)].map((m) => m[1]))].sort(),
  selects: [...new Set([...corpo.matchAll(/querySelector(?:All)?\(\s*['"`]([^'"`]{2,60})['"`]/g)].map((m) => m[1]))].length,
});

const res = {
  em: new Date().toISOString(), modo: 'read-only', instrumento: 'scripts/bu3-pegada-de-modulos-20-11.mjs',
  bundle: { caminho: BUNDLE.replace(DIR + '/', ''), bytes, md5, chars: bundle.length },
  publicacao: { versao: publicacao.version || null, deploy: publicacao.deploy?.version_id ?? null,
    deployment_created: publicacao.deploy?.deployment_created ?? null, url_do_ar: publicacao.deploy?.url ?? null,
    linha_do_index_no_diario: linhaDoDiario },
  certidao: { saida: certidao.saida || null, origem: certidao.origem || null, veredito: certidao.veredito || null },
  tags: censoTags,
  matriz_de_autorizacao_usada: MATRIZ.replace(DIR + '/', ''),
};

// 3. catálogo: nomes de mesas e funções, para a diferença de conjuntos
const cat = await sql(`select 'tabela:'||c.relname as objeto from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind in ('r','v')
  union all select 'funcao:'||p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'`);
const mesas = new Set(cat.filter((l) => l.objeto.startsWith('tabela:')).map((l) => l.objeto.slice(7)));
const funcoes = new Set(cat.filter((l) => l.objeto.startsWith('funcao:')).map((l) => l.objeto.slice(7)));

// 4. por região: papéis alcançáveis pelas mesas que ela lê, e mesas sem caminho para o cliente
const regioesResumo = [];
for (const r of regioUnica) {
  const peg = extraidoDe(r.corpo);
  const alcancaveis = {}, foraDoCatalogo = [], semCaminhoParaPapel = {};
  for (const t of peg.tabelas) {
    const noCatalogo = !mesas.has(t);
    const porPapel = papeis.filter((p) => (matriz.matriz[p].leitura_larga || []).includes(t) || (matriz.matriz[p].escrita_larga || []).includes(t));
    alcancaveis[t] = { no_catalogo: noCatalogo, papeis: porPapel };
    if (noCatalogo) foraDoCatalogo.push(t);
    if (!noCatalogo && porPapel.length === 0) semCaminhoParaPapel[t] = matriz.tabelas_sem_politica?.includes(t) ? 'sem_politica_nenhuma' : 'sem_papel_na_expression';
  }
  const rpcsAuse = peg.rpcs.filter((n) => !funcoes.has(n));
  regioesResumo.push({
    nome: r.nome, off: r.off, chars: r.chars, diferido: r.diferido, desativado: r.desativado,
    critico_para: r.critico_para, src: r.src,
    tabelas: peg.tabelas, rpcs: peg.rpcs, buckets: peg.buckets, canais: peg.canais, secoes: peg.secoes,
    n_selectores: peg.selects,
    mesas_fora_do_catalogo: foraDoCatalogo,
    mesas_sem_caminho_de_papel: semCaminhoParaPapel,
    rpcs_fora_do_catalogo: rpcsAuse,
    papeis_alcancaveis: [...new Set(peg.tabelas.flatMap((t) => alcancaveis[t].papeis))].sort(),
  });
}
res.regioes = regioesResumo;
res.regioes_n = regioesResumo.length;

// 5. agregado global do bundle
const todas = [...new Set(regioesResumo.flatMap((r) => r.tabelas))].sort();
const todosRpc = [...new Set(regioesResumo.flatMap((r) => r.rpcs))].sort();
res.agregado = {
  tabelas_citadas_pelo_bundle: todas.length,
  rpcs_chamadas: todosRpc.length,
  rpcs_fora_do_catalogo: [...new Set(regioesResumo.flatMap((r) => r.rpcs_fora_do_catalogo))].sort(),
  tabelas_fora_do_catalogo: [...new Set(regioesResumo.flatMap((r) => r.mesas_fora_do_catalogo))].sort(),
  tabelas_no_catalogo_sem_papel_alcancavel: [...new Set(regioesResumo.flatMap((r) => Object.keys(r.mesas_sem_caminho_de_papel)))].sort(),
  buckets: [...new Set(regioesResumo.flatMap((r) => r.buckets))].sort(),
  canais: [...new Set(regioesResumo.flatMap((r) => r.canais))].length,
  regioes_diferidas: regioesResumo.filter((r) => r.diferido).length,
  regioes_desativadas: regioesResumo.filter((r) => r.desativado).map((r) => r.nome),
};

// 5b. pegada sobre TODO o texto de script, identificado ou não: sem isto, «órfã» significa apenas
// «não citada dentro duma região com nome», e a interface pode chamá-la noutro sítio
const uniao = (chave) => [...new Set(todasUnica.map((r) => extraidoDe(r.corpo)[chave]).flat())].sort();
const glob = { tabelas: uniao('tabelas'), rpcs: uniao('rpcs'), buckets: uniao('buckets'), canais: uniao('canais'), secoes: uniao('secoes') };
res.pegada_global = {
  corpos: todasUnica.length,
  tabelas_n: glob.tabelas.length, rpcs_n: glob.rpcs.length,
  tabelas_globais: glob.tabelas, rpcs_globais: glob.rpcs, canais_globais: glob.canais, secoes_globais: glob.secoes,
  buckets: glob.buckets, canais: glob.canais.length,
  rpcs_fora_do_catalogo: glob.rpcs.filter((n) => !funcoes.has(n)).sort(),
  tabelas_fora_do_catalogo: glob.tabelas.filter((t) => !mesas.has(t)).sort(),
  tabelas_citadas_soma_fora_das_regioes_identificadas: glob.tabelas.filter((t) => !todas.includes(t)).sort(),
  rpcs_citados_so_fora_das_regioes_identificadas: glob.rpcs.filter((n) => !todosRpc.includes(n)).sort(),
};

// 6. o que existe no catálogo mas o bundle nunca nomeia (mesas órfãs de interface)
res.mesas_do_catalogo_sem_citacao_no_bundle = [...mesas].filter((t) => !glob.tabelas.includes(t)).sort();

// 7. o ar medido AGORA: «este bundle é o que está no ar» não pode vir de memória
const URL_AR = publicacao.deploy?.url || null;
if (!URL_AR) throw new Error('falta deploy.url no diário de publicação — a URL não se dactilografa');
let ar;
try {
  const r = await fetch(URL_AR, { headers: { 'cache-control': 'no-cache' }, signal: AbortSignal.timeout(120_000) });
  const corpo = await r.text();
  ar = { url: URL_AR, status: r.status, bytes: Buffer.byteLength(corpo, 'utf8'), chars: corpo.length,
    md5: createHash('md5').update(corpo).digest('hex'), x_frame_options: r.headers.get('x-frame-options'),
    cache_status: r.headers.get('cf-cache-status'), content_type: r.headers.get('content-type') };
} catch (e) {
  ar = { url: URL_AR, ok: false, erro: String(e.message || e).slice(0, 300) };
}
res.ar = ar;

// portões
const gates = [];
const G = (nome, cond, detalhe) => gates.push({ nome, veredito: cond ? 'VERDE' : 'VERMELHO', detalhe });
G('bundle_md5_bate_com_a_linha_do_diario_de_publicacao_v136', res.bundle.md5 === md5DoDiario, { medido: res.bundle.md5, no_diario: md5DoDiario, linha: linhaDoDiario });
G('bundle_bytes_batem_com_a_certidao_da_candidata', res.bundle.bytes === certidao.saida?.bytes, { medido: res.bundle.bytes, na_certidao: certidao.saida?.bytes ?? null });
G('as_duas_fontes_de_md5_do_index_batem_entre_si', md5DoDiario === certidao.saida?.index_md5, { diario: md5DoDiario, certidao: certidao.saida?.index_md5 ?? null });
G('o_que_o_ar_devolve_agora_bate_com_o_bundle_versionado', ar.md5 === res.bundle.md5 && ar.bytes === res.bundle.bytes, { ar, local: { md5: res.bundle.md5, bytes: res.bundle.bytes } });
const sobrepostas = [];
const ordenadas = [...regioUnica].sort((a, b) => a.off - b.off);
for (let i = 1; i < ordenadas.length; i++) if (ordenadas[i].off < ordenadas[i - 1].fim) sobrepostas.push(`${ordenadas[i - 1].nome}+${ordenadas[i].nome}`);
if (sobrepostas.length) res.sobreposicoes_inesperadas = sobrepostas;
G('a_regua_de_fecho_de_script_dispara_no_fixture_partido_e_nao_no_inteiro',
  !!fixturePartido.porFechar && fixturePartido.regioes.length === 0 && !fixtureInteiro.porFechar && fixtureInteiro.regioes.length === 2
  && fixtureTextoIL.regioes.length === 1 && fixtureTextoIL.varredura.aberturas_textuais_dentro_de_corpo === 1,
  { partido: fixturePartido, inteiro: fixtureInteiro, texto_dentro_de_corpo: fixtureTextoIL });
res.fixtures_da_regua_de_script = { partido: fixturePartido.varredura, inteiro: fixtureInteiro.varredura, texto_dentro_de_corpo: fixtureTextoIL.varredura };
G('cada_abertura_honorada_do_bundle_tem_o_seu_fecho', varrido.varredura.aberturas_honoradas === varrido.varredura.fechos_que_fecharam_elemento && !varrido.porFechar && varrido.varredura.fechos_sem_abertura === 0,
  { ...varrido.varredura, abertura_sem_fecho: varrido.porFechar });
G('a_soma_dos_corpos_das_regioes_nao_ultrapassa_o_documento', regioUnica.reduce((s, r) => s + r.chars, 0) < bytes, { soma_corpos: regioUnica.reduce((s, r) => s + r.chars, 0), bytes_do_bundle: bytes });
G('o_rollup_de_tabelas_batem_com_a_uniao_das_regioes', res.agregado.tabelas_citadas_pelo_bundle === new Set(regioesResumo.flatMap((r) => r.tabelas)).size, { rollup: res.agregado.tabelas_citadas_pelo_bundle, uniao: new Set(regioesResumo.flatMap((r) => r.tabelas)).size });
const contagemDiretaDeObjetos = (await sql(`select count(distinct c.oid)::int as n from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','v')`))[0].n;
G('o_conjunto_de_mesas_bate_com_contagem_direta_do_catalogo', mesas.size === contagemDiretaDeObjetos, { nomes: mesas.size, contagem_direta: contagemDiretaDeObjetos, nota: 'nomes distintos <= objetos; desigualdade significa sobrecarga de nome' });
G('nenhuma_tabela_citada_pelo_bundle_fora_do_catalogo', res.agregado.tabelas_fora_do_catalogo.length === 0, { ausentes: res.agregado.tabelas_fora_do_catalogo, citadas: res.agregado.tabelas_citadas_pelo_bundle });
G('nenhuma_rpc_chamada_pelo_bundle_fora_das_funcoes_do_catalogo', res.agregado.rpcs_fora_do_catalogo.length === 0, { ausentes: res.agregado.rpcs_fora_do_catalogo, chamadas: res.agregado.rpcs_chamadas });
G('toda_regiao_que_consulta_mesas_tem_pelo_menos_um_papel_alcancavel', regioesResumo.filter((r) => r.tabelas.length > 0).every((r) => r.papeis_alcancaveis.length > 0), { sem_papel: regioesResumo.filter((r) => r.tabelas.length > 0 && r.papeis_alcancaveis.length === 0).map((r) => r.nome) });
const papeisInventados = [...new Set(regioesResumo.flatMap((r) => r.papeis_alcancaveis))].filter((p) => !ENUM.has(p));
G('os_papeis_atribuidos_ao_bundle_sao_todos_do_enum', papeisInventados.length === 0, { inventados: papeisInventados });
G('toda_regiao_tem_nome_legivel_e_corpo_nao_vazio', regioesResumo.every((r) => !!r.nome && r.chars > 20), { menores: regioesResumo.filter((r) => r.chars <= 20).map((r) => `${r.nome}@${r.off}`) });
// a versão anterior declarava 111 mesas órfãs usando só o texto das regiões com nome: a régua abaixo
// exige que a união global contenha a das regiões e que a prédica de citação não dependa duma identidade
const perdidasNaGlobal = [...todas].filter((t) => !glob.tabelas.includes(t));
const rpcsPerdidosNaGlobal = [...todosRpc].filter((n) => !glob.rpcs.includes(n));
G('a_pegada_global_contem_a_das_regioes_identificadas', perdidasNaGlobal.length === 0 && rpcsPerdidosNaGlobal.length === 0, { tabelas_perdidas: perdidasNaGlobal, rpcs_perdidos: rpcsPerdidosNaGlobal });
G('o_predicado_de_citacao_de_mesas_nao_exige_identidade_na_regiao', extraidoDe("const q = supabase.from('profiles').select('*'); supabase.rpc('x');").tabelas.includes('profiles'),
  { corpo_sem_nome: "supabase.from('profiles') achado=" + JSON.stringify(extraidoDe("supabase.from('profiles')").tabelas) });
G('as_orfas_sao_o_complemento_da_uniao_global_contra_o_catalogo', res.mesas_do_catalogo_sem_citacao_no_bundle.length === mesas.size - glob.tabelas.filter((t) => mesas.has(t)).length
  && res.mesas_do_catalogo_sem_citacao_no_bundle.every((t) => !glob.tabelas.includes(t)),
  { orfas: res.mesas_do_catalogo_sem_citacao_no_bundle.length, mesas: mesas.size, citadas_no_catalogo: glob.tabelas.filter((t) => mesas.has(t)).length });

res.veredictos = gates;
const vermelhas = gates.filter((g) => g.veredito === 'VERMELHO');
res.veredito_final = vermelhas.length === 0 ? `BU3_PEGADA_VERDE ${gates.length}/0` : `BU3_PEGADA_VERMELHO ${gates.length - vermelhas.length}/${vermelhas.length} ${vermelhas.map((v) => v.nome).join(',')}`;
res.msd = Date.now() - t0;

writeFileSync(OUT, JSON.stringify(res, null, 2) + '\n');
const txt = [
  `veredito=${res.veredito_final}`,
  `bundle=${res.bundle.caminho} bytes=${res.bundle.bytes} md5=${res.bundle.md5} chars=${res.bundle.chars}`,
  `publicacao=${JSON.stringify(res.publicacao)}`,
  `certidao_saida=${JSON.stringify(res.certidao.saida)}`,
  `ar=${JSON.stringify(res.ar)}`,
  `tags=${JSON.stringify(res.tags)}`,
  `regioes=${res.regioes_n} diferidas=${res.agregado.regioes_diferidas} desativadas=${res.agregado.regioes_desativadas.join(',') || 'nenhuma'}`,
  `tabelas_citadas=${res.agregado.tabelas_citadas_pelo_bundle} rpcs=${res.agregado.rpcs_chamadas} buckets=${res.agregado.buckets.join(',')} canais=${res.agregado.canais}`,
  `rpcs_fora_do_catalogo=${res.agregado.rpcs_fora_do_catalogo.join(',') || 'nenhuma'}`,
  `tabelas_fora_do_catalogo=${res.agregado.tabelas_fora_do_catalogo.join(',') || 'nenhuma'}`,
  `tabelas_sem_papel_alcancavel=${res.agregado.tabelas_no_catalogo_sem_papel_alcancavel.join(',') || 'nenhuma'}`,
  `mesas_orfas_de_citacao=${res.mesas_do_catalogo_sem_citacao_no_bundle.length}: ${res.mesas_do_catalogo_sem_citacao_no_bundle.slice(0, 60).join(',')}`,
  `pegada_global=${JSON.stringify({ corpos: res.pegada_global.corpos, tabelas_n: res.pegada_global.tabelas_n, rpcs_n: res.pegada_global.rpcs_n, rpcs_globais: res.pegada_global.rpcs_globais, rpcs_fora: res.pegada_global.rpcs_fora_do_catalogo, tabelas_fora: res.pegada_global.tabelas_fora_do_catalogo,buckets: res.pegada_global.buckets, canais: res.pegada_global.canais, so_fora_das_regioes: res.pegada_global.tabelas_citadas_soma_fora_das_regioes_identificadas.slice(0, 40), regioes_sem_identidade: res.tags.regioes_sem_identidade, bytes_sem_identidade: res.tags.bytes_sem_identidade })}`,
  `top_regioes=${regioesResumo.map((r) => `${r.nome}|${r.chars}|t${r.tabelas.length}|r${r.rpcs.length}|p${r.papeis_alcancaveis.length}`).sort((a, b) => Number(b.split('|')[1]) - Number(a.split('|')[1])).slice(0, 25).join(' ')}`,
  `gates=${gates.map((g) => `${g.nome}:${g.veredito}`).join(' ')}`,
  `node_exit=0 ms=${res.msd}`,
].join('\n') + '\n';
writeFileSync(TXT, txt);
console.log(txt);
