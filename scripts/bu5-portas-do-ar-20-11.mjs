// BU-5 — portas do ar actual por papel, lidas dos ficheiros m5 cuja pegada de shell bate com o bundle
// versionado, e confrontadas com os marcadores `data-section` do próprio bundle (fonte diferente).
// Somente leitura: nada deste instrumento escreve fora de evidence/bu5-portas-*.
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const BUNDLE = `${DIR}/bfr-candidata-v136-secretaria-de-educacao/index.html`;
const SUF = process.env.BU5_SUF || '';
const OUT = `${DIR}/evidence/bu5-portas-do-ar${SUF}-20-11.json`;
const TXT = `${DIR}/evidence/bu5-portas-do-ar${SUF}-20-11.txt`;
if (existsSync(OUT) || existsSync(TXT)) throw new Error(`ABORTA: ${OUT} já existe — correr com BU5_SUF novo`);
const t0 = Date.now();

const bundle = readFileSync(BUNDLE, 'utf8');
const md5Bundle = createHash('md5').update(bundle).digest('hex');
const bytesBundle = Buffer.byteLength(bundle, 'utf8');
// a pegada do bundle não basta: o diário de publicação e a certidão da candidata são as outras duas fontes
const publicacao = JSON.parse(readFileSync(`${DIR}/audit-publicacao-v136.json`, 'utf8'));
const certidao = JSON.parse(readFileSync(`${DIR}/bfr-candidata-v136-secretaria-de-educacao/portoes-v136-candidata.json`, 'utf8'));
const linhaDoDiario = publicacao.md5['bfr-candidata-v136-secretaria-de-educacao/index.html'] || '';
const md5DoDiario = (linhaDoDiario.match(/^([0-9a-f]{32})/) || [])[1] || null;

// marcadores de secção: duas classes legítimas no documento servido
//  (a) atributo estático `data-section="X"`; (b) atribuição em runtime `X.dataset.section = ...`,
//      com o identificador resolvido por `const IDENT = 'literal'`. A primeira versão só via (a) e
//      chumbou `secretaria-municipal`, cujo item de navegacao e montado em runtime (index.html:28723).
const estaticas = new Set([...bundle.matchAll(/data-section="([^"]+)"/g)].map((m) => m[1]));
const porLiteral = new Set([...bundle.matchAll(/dataset\.section\s*=\s*['"]([^'"]+)['"]/g)].map((m) => m[1]));
const porIdent = [...bundle.matchAll(/dataset\.section\s*=\s*([A-Za-z_$][\w$]*)/g)].map((m) => m[1]);
const literaisDeConst = new Map();
for (const m of bundle.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*['"]([a-z0-9:_-]{2,})['"]/g)) if (!literaisDeConst.has(m[1])) literaisDeConst.set(m[1], m[2]);
const porIdentResolvidas = {};
for (const id of porIdent) porIdentResolvidas[id] = literaisDeConst.get(id) || null;
const declaradas = new Set([...estaticas, ...porLiteral, ...Object.values(porIdentResolvidas).filter(Boolean)]);
// `more` não é secção: é o botão da gaveta, declarado no produto com aria-haspopup
const EXCECOES_DE_NAV = new Set(['more']);

const fich = readdirSync(`${DIR}/evidence`).filter((f) => /^ah2-mobile2-m5-.*\.json$/.test(f) && !f.startsWith('ANTERIOR-'));
const noAr = [], foraDoAr = [];
for (const f of fich) {
  let j;
  try { j = JSON.parse(readFileSync(`${DIR}/evidence/${f}`, 'utf8')); } catch (e) { foraDoAr.push({ ficheiro: f, motivo: `parse: ${String(e.message).slice(0, 80)}` }); continue; }
  if (j.md5_shell !== md5Bundle) { foraDoAr.push({ ficheiro: f, motivo: 'md5_shell_doutro_ar', md5: j.md5_shell }); continue; }
  noAr.push({ ficheiro: f, papel: j.papel, larguras_declaradas: j.larguras || [], bandas: Object.keys(j.bandas || {}).map(Number).sort((a, b) => a - b), celulas: [] });
}

// união por papel, com o rótulo legível que o browser mostrou
const porPapel = {};
const indiceInvertido = {};
const declaradasSemBanda = [];
for (const reg of noAr) {
  const j = JSON.parse(readFileSync(`${DIR}/evidence/${reg.ficheiro}`, 'utf8'));
  const p = (porPapel[reg.papel] ||= { destinos: new Map(), fich: 0, larguras: new Set(), declaradas_sem_banda: [] });
  p.fich++;
  for (const w of reg.larguras_declaradas) if (!reg.bandas.includes(w)) { p.declaradas_sem_banda.push(w); declaradasSemBanda.push(`${reg.papel}@${w}:${reg.ficheiro}`); }
  for (const [w, banda] of Object.entries(j.bandas || {})) {
    p.larguras.add(Number(w));
    const cen = banda.censo || {};
    for (const lado of ['barra', 'gaveta']) {
      for (const it of (cen[lado] || [])) {
        const rota = it.route;
        if (!rota) continue;
        if (!p.destinos.has(rota)) p.destinos.set(rota, String(it.rot || '').slice(0, 40));
        (indiceInvertido[rota] ||= new Set()).add(reg.papel);
      }
    }
  }
}

const papeis = Object.keys(porPapel).sort();
const portasPorPapel = Object.fromEntries(papeis.map((p) => [p, porPapel[p].destinos.size]));
const rotasMedidas = new Set(Object.keys(indiceInvertido));
const naoResolvidas = [...rotasMedidas].filter((r) => !declaradas.has(r) && !EXCECOES_DE_NAV.has(r));

// fixture: a prédica tem de falhar num nome inventado e tem de apanhar a classe de runtime
const fixtureGralha = !declaradas.has('rota-que-nao-existe-no-documento') && !EXCECOES_DE_NAV.has('rota-que-nao-existe-no-documento');
const fixtureValido = [...rotasMedidas].some((r) => estaticas.has(r));
const fixtureRuntime = [...rotasMedidas].filter((r) => !estaticas.has(r) && declaradas.has(r));

const gates = [];
const G = (nome, cond, detalhe) => gates.push({ nome, veredito: cond ? 'VERDE' : 'VERMELHO', detalhe });
G('bundle_md5_bate_com_a_linha_do_diario_de_publicacao_v136', md5Bundle === md5DoDiario, { medido: md5Bundle, no_diario: md5DoDiario, linha: linhaDoDiario });
G('bundle_bytes_batem_com_a_certidao_da_candidata', bytesBundle === certidao.saida?.bytes, { medido: bytesBundle, na_certidao: certidao.saida?.bytes ?? null });
G('a_predica_de_pegada_rejeita_os_m5_de_outro_ar', foraDoAr.length > 0 && noAr.length > 0, { contados: noAr.length, rejeitados: foraDoAr.length, md5_aceite: md5Bundle });
G('toda_rota_medida_no_browser_e_declarada_no_documento', naoResolvidas.length === 0, { nao_resolvidas: naoResolvidas, declaradas_n: declaradas.size, estaticas_n: estaticas.size, rotas_medidas_n: rotasMedidas.size, excecoes_de_nav: [...EXCECOES_DE_NAV] });
G('o_predicado_de_resolucao_dispara_na_rota_inventada', fixtureGralha, { gralha: 'rota-que-nao-existe-no-documento', resolvida: declaradas.has('rota-que-nao-existe-no-documento') });
G('o_predicado_de_resolucao_nao_dispara_numa_rota_medida_de_verdade', fixtureValido, { exemplo: [...rotasMedidas].filter((r) => estaticas.has(r)).slice(0, 4) });
G('a_classe_nova_de_marcador_em_runtime_tem_prova', fixtureRuntime.length > 0, { so_em_runtime: fixtureRuntime, identificadores_resolvidos: porIdentResolvidas });
G('os_papeis_sem_porta_sao_so_o_pending', papeis.filter((p) => portasPorPapel[p] === 0).every((p) => p === 'pending'), { sem_porta: papeis.filter((p) => portasPorPapel[p] === 0) });
G('a_contagem_por_papel_bate_com_a_uniao_recontada_dos_destinos', papeis.every((p) => portasPorPapel[p] === porPapel[p].destinos.size), { soma_portas: Object.values(portasPorPapel).reduce((a, b) => a + b, 0), destinos_unicos_globais: rotasMedidas.size });

const res = {
  em: new Date().toISOString(), modo: 'read-only', instrumento: 'scripts/bu5-portas-do-ar-20-11.mjs',
  bundle: { caminho: BUNDLE.split('/').pop(), bytes: bytesBundle, md5: md5Bundle },
  declaradas_n: declaradas.size, estaticas_n: estaticas.size, por_literal_n: porLiteral.size,
  identificadores_de_runtime: porIdentResolvidas,
  rotas_nao_resolvidas: naoResolvidas,
  m5_ficheiros: fich.length, m5_no_ar: noAr.length, m5_doutro_ar: foraDoAr.length,
  papeis: papeis.length,
  portas_por_papel: portasPorPapel,
  destinos_por_papel: Object.fromEntries(papeis.map((p) => [p, [...porPapel[p].destinos.entries()].map(([r, rot]) => `${r}«${rot}»`).sort()])),
  larguras_por_papel: Object.fromEntries(papeis.map((p) => [p, [...porPapel[p].larguras].sort((a, b) => a - b)])),
  declaradas_sem_banda: declaradasSemBanda,
  indice_invertido: Object.fromEntries([...rotasMedidas].sort().map((r) => [r, { papeis: [...indiceInvertido[r]].sort(), n: indiceInvertido[r].size }])),
  nao_resolvidas_no_bundle: naoResolvidas,
  veredictos: gates,
};
const vermelhas = gates.filter((g) => g.veredito === 'VERMELHO');
res.veredito_final = vermelhas.length === 0 ? `BU5_PORTAS_VERDE ${gates.length}/0` : `BU5_PORTAS_VERMELHO ${gates.length - vermelhas.length}/${vermelhas.length} ${vermelhas.map((v) => v.nome).join(',')}`;
res.msd = Date.now() - t0;

writeFileSync(OUT, JSON.stringify(res, null, 2) + '\n');
const txt = [
  `veredito=${res.veredito_final}`,
  `bundle=${res.bundle.bytes} B md5 ${res.bundle.md5} declaradas=${res.declaradas_n} estaticas=${res.estaticas_n} so_runtime=${fixtureRuntime.join(',') || 'nenhuma'}`,
  `m5: ficheiros=${res.m5_ficheiros} no_ar=${res.m5_no_ar} doutro_ar=${res.m5_doutro_ar} papeis=${res.papeis}`,
  `portas=${papeis.map((p) => `${p}:${portasPorPapel[p]}`).join(' ')}`,
  `larguras=${papeis.map((p) => `${p}:[${res.larguras_por_papel[p].join(',')}]`).join(' ')}`,
  `declaradas_sem_banda=${declaradasSemBanda.length ? declaradasSemBanda.join(',') : 'nenhuma'}`,
  `nao_resolvidas_no_bundle=${naoResolvidas.join(',') || 'nenhuma'}`,
  `gates=${gates.map((g) => `${g.nome}:${g.veredito}`).join(' ')}`,
  `node_exit=0 ms=${res.msd}`,
].join('\n') + '\n';
writeFileSync(TXT, txt);
console.log(txt);
