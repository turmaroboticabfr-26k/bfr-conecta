// Porque este programa existe: uma primeira versão comparava a `firma` do painel (id + nº de caracteres) de
// um toque com a do anterior e chamava «painel parado» à igualdade. A ideia era apanhar toques que navegam
// sem mudar o ecrã. Falhou como prova, e o motivo está nos próprios dados: no coordinator, `coordinatorView`
// devolve 54164 caracteres para `horarios`, `ocorrencias`, `fotos` E `comunicados` — a mesma contagem em
// quatro seções diferentes e em duas larguras (360 e 414). Páginas distintas não têm conteúdo
// byte-a-byte igual por acaso; o que o seletor mede é um contentor partilhado pelo papel, não a secção.
// Logo «firma igual» não prova que o toque não fez nada, e «firma diferente» também não prova que fez.
// O que sobrevive e é defensável é a comparação entre PAPÉIS da MESMA rota: mesmo instrumento, mesma largura,
// mesma rota → se um papel vê 2791 caracteres e outro vê 0, a diferença não pode vir do instrumento. É isso
// que este programa conta, e nada mais. Só-leitura: 0 browser, 0 escrita em base.
// Uso: node scripts/ah2-m5-resolucao-vista.mjs [rotulo]
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const ROTULO = process.argv[2] || 'v1';
const OUT = `${DIR}/evidence/ah2-m5-resolucao-vista-${ROTULO}.json`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — usar outro rótulo');

// Por (papel × largura) fica a leitura com mais seções medidas — a precedência é a do consolidador.
const melhor = {};
for (const f of readdirSync(`${DIR}/evidence`).filter((x) => /^ah2-mobile2-.*\.json$/.test(x))) {
  const j = JSON.parse(readFileSync(`${DIR}/evidence/${f}`, 'utf8'));
  if (!j.papel || !j.bandas) continue;
  for (const [w, b] of Object.entries(j.bandas)) {
    const seq = Object.entries(b.seccoes || {}).map(([rota, p]) => ({ rota, id: p?.painel?.id ?? null, c: p?.painel?.c ?? null, ativa: p?.seccao_ativa ?? null }));
    if (!seq.length) continue;
    const k = `${j.papel}@${w}`;
    if (!melhor[k] || seq.length > melhor[k].seq.length) melhor[k] = { ficheiro: f, seq, declaradas: j.declaradas || [], md5: j.md5_shell };
  }
}

// 1) Contentor partilhado: um mesmo id que serve ≥3 rotas do papel e devolve a mesma contagem para elas.
//    É a prova de que a comparação horizontal (toque n vs. toque n-1) não discriminina, e vale por papel.
const contentores_partilhados = [];
for (const [k, e] of Object.entries(melhor)) {
  const [papel, w] = k.split('@');
  const por_firma = {};
  for (const s of e.seq) { if (!s.id || s.c === null) continue; (por_firma[`${s.id}#${s.c}`] ||= []).push(s.rota); }
  for (const [firma, rotas] of Object.entries(por_firma)) if (rotas.length >= 3) contentores_partilhados.push({ papel, largura: +w, firma, rotas });
}
contentores_partilhados.sort((a, b) => a.papel.localeCompare(b.papel) || a.largura - b.largura);

// 2) A comparação que presta: mesma rota, papéis diferentes. `mede_0` = há papel que vê 0 caracteres e outro
//    que vê conteúdo na mesma rota; `vistas_diferentes` = a rota cai em vistas distintas conforme o papel.
const por_rota = {};
for (const [k, e] of Object.entries(melhor)) {
  const [papel, w] = k.split('@');
  for (const s of e.seq) (por_rota[s.rota] ||= {})[`${papel}@${w}`] = { id: s.id, c: s.c, ativa: s.ativa };
}
const resolvem = [];
for (const [rota, por] of Object.entries(por_rota)) {
  const lidos = Object.entries(por).filter(([, v]) => v.c !== null && v.c !== undefined);
  if (lidos.length < 2) continue;
  const zeros = lidos.filter(([, v]) => v.c === 0).map(([p]) => p);
  const nao_zeros = lidos.filter(([, v]) => v.c > 0);
  const vistas = [...new Set(lidos.map(([, v]) => v.id).filter(Boolean))];
  const por_vista = {};
  for (const [p, v] of lidos) (por_vista[v.id] ||= new Set()).add(p.split('@')[0]);
  if (!zeros.length && vistas.length < 2) continue;
  resolvem.push({
    rota, leituras: lidos.length, vistas,
    veem_zero: zeros, veem_conteudo: [...new Set(nao_zeros.map(([p, v]) => `${p.split('@')[0]}=${v.c}`))].sort(),
    vista_por_papel: Object.fromEntries(Object.entries(por_vista).map(([id, set]) => [id, [...set].sort()])),
  });
}
resolvem.sort((a, b) => (b.veem_zero.length ? 1 : 0) - (a.veem_zero.length ? 1 : 0) || a.rota.localeCompare(b.rota));

// 3) «O marcador não foi para a rota tocada»: esta comparação não precisa do toque anterior, e por isso não
//    herda a contaminação do contentor partilhado. Divide-se em duas famílias deliberadamente: as rotas com
//    `:` (ex. `director:overview`) são tratadas à parte porque o app marca a família inteira com uma só
//    secção (`direcao`) — aí o desacordo é o desenho dos namespaced, não um ecrã que não responde.
const marcador_fora = {};
for (const [k, e] of Object.entries(melhor)) {
  const [papel, w] = k.split('@');
  for (const s of e.seq) {
    if (!s.id || s.c === null || !s.ativa) continue;
    if (s.ativa === s.rota) continue;
    const simples = !s.rota.includes(':');
    const chave = simples ? s.rota : s.rota.split(':')[0] + ':*';
    (marcador_fora[chave] ||= {})[`${papel}`] ||= new Set();
    marcador_fora[chave][papel].add(`${s.rota}→ativa=${s.ativa} em ${w}${s.c === 0 ? ' (painel vazio)' : ''}`);
  }
}
const familia_namespaced = Object.entries(marcador_fora).filter(([r]) => r.endsWith(':*')).sort();
const familia_simples = Object.entries(marcador_fora).filter(([r]) => !r.endsWith(':*')).sort((a, b) => Object.keys(b[1]).length - Object.keys(a[1]).length || a[0].localeCompare(b[0]));

const unicos = (a) => [...new Set(a)];
const saida = {
  ciclo: 'AH-M5-RESOLUCAO-VISTA', em: new Date().toISOString(), rotulo: ROTULO,
  bandas_lidas: Object.keys(melhor).length, md5_shell: unicos(Object.values(melhor).map((e) => e.md5)).filter(Boolean),
  o_que_nao_prova: 'igualdade da firma do painel entre dois toques seguidos. Ver contentores_partilhados: um id com a mesma contagem para ≥3 rotas do mesmo papel, em mais de uma largura, significa que o seletor mede o contentor do papel e não a secção. «Painel não mudou» não é alegável com este instrumento.',
  o_que_prova: 'a mesma rota medida em papéis diferentes com o mesmo instrumento: 0 caracteres para um papel e conteúdo para noutro não pode ser artefacto da medição. E o desacordo entre a rota tocada e a `seccao_ativa` não depende do toque anterior, logo não herda o contentor partilhado.',
  contentores_partilhados, rotas_onde_o_papel_muda_a_resolucao: resolvem,
  marcador_fora_da_rota_tocada: Object.fromEntries(familia_simples.map(([r, p]) => [r, Object.fromEntries(Object.entries(p).map(([q, set]) => [q, [...set].sort()]))])),
  marcador_fora_em_rotas_namespaced: Object.fromEntries(familia_namespaced.map(([r, p]) => [r, Object.fromEntries(Object.entries(p).map(([q, set]) => [q, [...set].sort()]))])),
};
writeFileSync(OUT, JSON.stringify(saida, null, 2) + '\n');
console.log(`bandas lidas=${saida.bandas_lidas} · contentores partilhados=${contentores_partilhados.length} · rotas com resolução dependente do papel=${resolvem.length}`);
console.log('\n1) CONTENTORES PARTILHADOS (por que é que «firma igual» não prova nada):');
for (const c of contentores_partilhados.slice(0, 14)) console.log(`   ${c.papel.padEnd(21)} @${c.largura} ${c.firma.padEnd(30)} serve ${c.rotas.length} rotas: ${c.rotas.join(' ')}`);
console.log('\n2) MESMA ROTA, RESOLUÇÃO DIFERENTE CONFORME O PAPEL:');
for (const r of resolvem) {
  console.log(`   ${r.rota}  (${r.leituras} leituras) vistas=${r.vistas.join(',')}`);
  if (r.veem_zero.length) console.log(`     veem 0 caracteres: ${r.veem_zero.join(' ')}`);
  if (r.veem_zero.length && r.veem_conteudo.length) console.log(`     enquanto: ${r.veem_conteudo.slice(0, 6).join(' ')}`);
  if (r.vistas.length > 1) for (const [id, paps] of Object.entries(r.vista_por_papel)) console.log(`     ${String(id).padEnd(24)} → ${paps.join(' ')}`);
}
console.log('ESCRITO: ' + OUT.split('/').pop());
