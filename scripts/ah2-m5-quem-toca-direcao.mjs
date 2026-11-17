// Porque este programa existe: escrevi no §AI.21 que `direcao` também não marcava em `coordinator` e `director`
// com o marcador em `inicio`, e isso foi **afirmação sem verificação**. Este programa conta, por papel e por
// largura, todas as leituras da rota `direcao` nas bandas do §5, com a `seccao_ativa` observada — para que a
// frase do documento se possa sustentar ou ser corrigida com o número à frente. Só-leitura, 0 browser.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const por_papel = {};
for (const f of readdirSync(`${DIR}/evidence`).filter((x) => /^ah2-mobile2-.*\.json$/.test(x))) {
  let j; try { j = JSON.parse(readFileSync(`${DIR}/evidence/${f}`, 'utf8')); } catch { continue; }
  if (!j.papel || !j.bandas) continue;
  for (const [w, b] of Object.entries(j.bandas)) {
    const s = (b.seccoes || {})['direcao'];
    if (!s) continue;
    (por_papel[j.papel] ||= {})[w] = { ativa: s.seccao_ativa ?? null, painel: s.painel ? `${s.painel.id}#${s.painel.c}` : null, via: s.via ?? null, ficheiro: f };
  }
}
const saida = { ciclo: 'AH-M5-QUEM-TOCA-DIRECAO', em: new Date().toISOString(), leituras: por_papel };
writeFileSync(`${DIR}/evidence/ah2-m5-quem-toca-direcao-v1.json`, JSON.stringify(saida, null, 2) + '\n');
console.log('papéis com leitura de `direcao`:', Object.keys(por_papel).sort().join(' '));
for (const [p, por_w] of Object.entries(por_papel)) {
  const ativas = [...new Set(Object.values(por_w).map((x) => x.ativa))];
  console.log(`  ${p.padEnd(21)} ${Object.keys(por_w).length} larguras · ativa=${ativas.join(',')} · painel=${[...new Set(Object.values(por_w).map((x) => x.painel))].join(',')} · via=${[...new Set(Object.values(por_w).map((x) => x.via))].join(',')}`);
}
