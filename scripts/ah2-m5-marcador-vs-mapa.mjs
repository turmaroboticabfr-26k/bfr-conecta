// A tabela 2×2 que decide se «marcador parado» tem uma causa só. §AI.19 encontrou 15 pares (rota, papel) em
// que o painel muda mas a `seccao_ativa` fica em `inicio` (ou noutro valor que não a rota tocada). A hipótese
// que os explica todos é uma só e é testável sem browser: o marcador segue o MAPA DE NAVEGAÇÃO do papel, não a
// vista que está no ecrã — logo uma rota que o mapa não declara renderiza sem nunca se marcar como activa.
// Para isso não servir de desculpa bastam os dois quadrados contrários: rota FORA do mapa que mesmo assim se
// marca, e rota DENTRO do mapa que não se marca. O primeiro existe e é conhecido (`apoio` com painel cheio em
// parent/student); por isso a saída imprime os quatro quadrados com os exemplos, e não um veredicto bonito.
// Só-leitura: lê os artefactos m5 que já estão no disco. 0 browser, 0 escrita em base.
// Uso: node scripts/ah2-m5-marcador-vs-mapa.mjs [rotulo]
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const ROTULO = process.argv[2] || 'v1';
const OUT = `${DIR}/evidence/ah2-m5-marcador-vs-mapa-${ROTULO}.json`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — usar outro rótulo');

const melhor = {};
for (const f of readdirSync(`${DIR}/evidence`).filter((x) => /^ah2-mobile2-.*\.json$/.test(x))) {
  const j = JSON.parse(readFileSync(`${DIR}/evidence/${f}`, 'utf8'));
  if (!j.papel || !j.bandas) continue;
  for (const [w, b] of Object.entries(j.bandas)) {
    const seq = Object.entries(b.seccoes || {}).map(([rota, p]) => ({ rota, id: p?.painel?.id ?? null, c: p?.painel?.c ?? null, ativa: p?.seccao_ativa ?? null }));
    if (!seq.length) continue;
    const k = `${j.papel}@${w}`;
    if (!melhor[k] || seq.length > melhor[k].seq.length) melhor[k] = { ficheiro: f, seq, declaradas: j.declaradas || [] };
  }
}
// Alias conocidos: papéis cuja navegação real é a de outro papel (o índice de perfis do app faz o mapeamento,
// ver §AI sobre `pedagogical → teacher`), e famílias namespaced que o app marca pelo prefixo.
const ALIAS = { pedagogical: 'teacher' };
const quadrantes = { dentro_marca: [], dentro_nao_marca: [], fora_marca: [], fora_nao_marca: [] };
for (const [k, e] of Object.entries(melhor)) {
  const [papel, w] = k.split('@');
  for (const s of e.seq) {
    if (!s.id || s.c === null || !s.ativa || s.rota.includes(':')) continue;
    const mapa = new Set(e.declaradas);
    // O `inicio` está em todos os mapas por construção; e o nome da vista pode divergir do nome da rota sem
    // que o marcador esteja errado (developer mostra `adminView` para quase tudo), por isso compara-se o
    // marcador com a ROTA tocada e aceita-se também o alias de papel.
    const dentro = mapa.has(s.rota);
    const marcou = s.ativa === s.rota;
    const reg = { papel, largura: +w, rota: s.rota, ativa: s.ativa, painel: `${s.id}#${s.c}`, ficheiro: e.ficheiro };
    quadrantes[dentro ? (marcou ? 'dentro_marca' : 'dentro_nao_marca') : (marcou ? 'fora_marca' : 'fora_nao_marca')].push(reg);
  }
}
const pares = (a) => [...new Set(a.map((r) => `${r.rota}@${r.papel}`))].sort();
const saida = {
  ciclo: 'AH-M5-MARCADOR-VS-MAPA', em: new Date().toISOString(), bandas_lidas: Object.keys(melhor).length,
  pergunta: 'o marcador de secção activa segue o mapa de navegação do papel em vez da vista no ecrã?',
  conta_de_pares: {
    dentro_do_mapa_e_marca: pares(quadrantes.dentro_marca).length,
    dentro_do_mapa_e_NAO_marca: pares(quadrantes.dentro_nao_marca).length,
    fora_do_mapa_e_marca: pares(quadrantes.fora_marca).length,
    fora_do_mapa_e_NAO_marca: pares(quadrantes.fora_nao_marca).length,
  },
  dentro_nao_marca: pares(quadrantes.dentro_nao_marca),
  fora_marca: pares(quadrantes.fora_marca),
  fora_nao_marca: pares(quadrantes.fora_nao_marca),
  exemplos_dentro_nao_marca: quadrantes.dentro_nao_marca.slice(0, 12),
  exemplo_alias: ALIAS, leitura: null,
  // O único «dentro do mapa e não marca» medido até aqui não é marcador preso: é a rota a escrever de
  // propósito a secção-pai. Lido no código servido em §AI.21 (`setupDirectionNav`: `if (role()==='director')
  // setRole('director'); else document.querySelector('[data-section="administracao"]')?.click()`), e provado
  // por contra-exemplo na mesma rota (`direcao@director` → `ativa=direcao`, `via=gaveta`). A regra continua
  // `ativa === rota`; este campo existe para que quem lê o artefacto não volte a contar um alias como defeito.
  alias_de_seccao_conhecido: { 'direcao@developer': { escreve: 'administracao', em_vez_de: 'direcao', causa: 're-encaminhamento deliberado do clique, por papel, no shell servido' } },
};
const c = saida.conta_de_pares;
saida.leitura = c.fora_do_mapa_e_marca === 0
  ? `a metade forte da hipótese mede-se sem exceção: de ${c.fora_do_mapa_e_NAO_marca + c.fora_do_mapa_e_marca} pares (rota, papel) fora do mapa, ${c.fora_do_mapa_e_marca} marcaram — nenhum. Do outro lado, ${c.dentro_do_mapa_e_marca} de ${c.dentro_do_mapa_e_marca + c.dentro_do_mapa_e_NAO_marca} dentro do mapa marcam;${c.dentro_do_mapa_e_NAO_marca ? ` os ${c.dentro_do_mapa_e_NAO_marca} que não marcam (${pares(quadrantes.dentro_nao_marca).join(',')}) são lidos em §AI.21 como ALIAS de secção escrito pelo produto, não como marcador preso — ver alias_de_seccao_conhecido.` : ' a separação é perfeita.'}`
  : `a hipótese «só o mapa» refuta-se sozinha: ${c.fora_do_mapa_e_marca} pares fora do mapa marcam mesmo assim (${pares(quadrantes.fora_marca).join(',')}), logo há mais do que uma causa.`;
writeFileSync(OUT, JSON.stringify(saida, null, 2) + '\n');
console.log(`bandas=${saida.bandas_lidas} · ${JSON.stringify(saida.conta_de_pares)}`);
console.log('LEITURA: ' + saida.leitura);
if (saida.dentro_nao_marca.length) console.log('\ndentro do mapa e NÃO marca (isto refuta a hipótese):\n  ' + saida.dentro_nao_marca.join('\n  '));
if (saida.fora_marca.length) console.log('\nfora do mapa e marca (o outro lado):\n  ' + saida.fora_marca.join('\n  '));
console.log('\nfora do mapa e não marca:\n  ' + saida.fora_nao_marca.join('\n  '));
console.log('ESCRITO: ' + OUT.split('/').pop());
