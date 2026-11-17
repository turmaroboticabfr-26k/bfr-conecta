// Porque este programa existe: a célula #30 (`inicio@developer` em 1440 = 6141 ms, 141 ms acima do teto de
// 6000) só vale como achado do produto se eu souber se o `developer` é sempre o mais lento ou se foi um
// disparo isolado. `ah2-m5-home-largas.mjs` conta por banda; este ordena. Só-leitura: 0 browser, 0 escrita
// em base. Uso: node scripts/ah2-m5-home-ranking.mjs [rotulo]
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const ROTULO = process.argv[2] || 'v1';
const OUT = `${DIR}/evidence/ah2-m5-home-ranking-${ROTULO}.json`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — usar outro rótulo');
const MELHOR = {};
for (const f of readdirSync(`${DIR}/evidence`).filter((x) => /^ah2-varredura-.*\.json$/.test(x))) {
  let j; try { j = JSON.parse(readFileSync(`${DIR}/evidence/${f}`, 'utf8')); } catch { continue; }
  if (!j.stages || !Array.isArray(j.bandas)) continue;
  for (const [papel, bandas] of Object.entries(j.stages)) {
    for (const [banda, s] of Object.entries(bandas)) {
      if (!/^\d+$/.test(banda)) continue;
      // O `pedagogical` renderiza as vistas do professor: a mesma secção aparece como `professor-inicio`.
      // Conto a chave literal e o alias, e gravo qual delas deu o número para a coluna não ser ambígua.
      const k = [`${papel}@${banda}`, s.peca?.inicio?.ms != null ? 'inicio' : (s.peca?.['professor-inicio']?.ms != null ? 'professor-inicio' : null)];
      if (!k[1]) continue;
      const ms = s.peca[k[1]].ms, chave = k[1];
      if (!MELHOR[k[0]] || ms > MELHOR[k[0]].ms) MELHOR[k[0]] = { papel, banda: +banda, ms, chave, ficheiro: f, painel: `${s.peca[chave].painel?.id}#${s.peca[chave].painel?.c}`, md5: j.md5_shell || null };
    }
  }
}
const por_banda = {};
for (const e of Object.values(MELHOR)) (por_banda[e.banda] ||= []).push(e);
const ordens = {};
for (const [b, lista] of Object.entries(por_banda)) {
  lista.sort((x, y) => y.ms - x.ms);
  ordens[b] = { n: lista.length, top6: lista.slice(0, 6).map((e, i) => `${i + 1}.${e.papel}/${e.chave}=${e.ms}`), developer_posicao: (lista.findIndex((e) => e.papel === 'developer') + 1) || null };
}
const mediana = (v) => { if (!v.length) return null; v = v.slice().sort((a, b) => a - b); return v.length % 2 ? v[(v.length - 1) / 2] : Math.round((v[v.length / 2 - 1] + v[v.length / 2]) / 2); };
// A mediana com par ímpar/par troca de definição (valor do meio vs média dos dois do meio), e isso chega para
// mover 300 ms uma banda só por causa de UMA célula extra. Por isso as duas populações saem lado a lado: a
// pergunta «a banda é mais lenta?» responde-se com a banda SEM o papel que se quer acusar.
const medianas = {};
for (const [b, lista] of Object.entries(por_banda)) {
  const todas = lista.map((e) => e.ms);
  const sem_dev = lista.filter((e) => e.papel !== 'developer').map((e) => e.ms);
  medianas[b] = { n_todas: todas.length, mediana_todas: mediana(todas), n_sem_developer: sem_dev.length, mediana_sem_developer: mediana(sem_dev), max: Math.max(...todas) };
}
const saida = { ciclo: 'AH-M5-HOME-RANKING', em: new Date().toISOString(), rotulo: ROTULO,
  pergunta: 'o `inicio` mais lento é sempre o do developer, ou o disparo de 6141 ms em 1440 foi isolado?',
  nota_de_conta: 'uma célula por (papel, banda): quando mais que um artefacto mede a mesma célula fica o MAIOR ms, que é o que interessa a um teto de tempo. `professor-inicio` é a mesma secção do `pedagogical` sob alias de vista.',
  md5_vistos: [...new Set(Object.values(MELHOR).map((e) => e.md5).filter(Boolean))],
  medianas, ordens, leitura: null };
saida.leitura = Object.entries(ordens).map(([b, o]) => `${b}px: developer em ${o.developer_posicao}.º de ${o.n}`).join(' · ');
writeFileSync(OUT, JSON.stringify(saida, null, 2) + '\n');
for (const [b, o] of Object.entries(ordens)) console.log(`${b}px (n=${o.n}) · developer ${o.developer_posicao}º\n  ${o.top6.join('  ')}`);
console.log('\nLEITURA: ' + saida.leitura + '\nESCRITO: ' + OUT.split('/').pop());
