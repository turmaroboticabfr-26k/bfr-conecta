// Leitor do artefacto dvfc2: imprime o desfecho por passo sem despejar 17 KB na conversa.
import { readFileSync } from 'node:fs';
const j = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const top = (o) => Object.keys(o).join(',');
console.log('TOPO: ' + top(j));
for (const [k, v] of Object.entries(j)) {
  if (Array.isArray(v)) console.log('  ' + k + ': array ×' + v.length);
  else if (v && typeof v === 'object') console.log('  ' + k + ': {' + top(v) + '}');
  else console.log('  ' + k + ' = ' + JSON.stringify(v));
}
const passos = j.passos || j.caminho || j.varrimento || null;
if (Array.isArray(passos)) {
  for (const p of passos) {
    console.log('--- PASSO ' + JSON.stringify({ rota: p.rota ?? p.secao ?? p.alvo ?? p.id, gaveta: p.gaveta ?? p.gaveta_aberta, saida: p.saida ?? p.desfecho ?? p.resultado, nao_tocavel: p.nao_tocavel, detalhe: p.detalhe, porque: p.porque, ms: p.ms, itens: p.itens, sem_caixa: p.sem_caixa, abre: p.abre ?? p.aberto }));
    if (p.censo) console.log('    censo ' + JSON.stringify(p.censo).slice(0, 300));
    if (p.dialogo) console.log('    dialogo ' + JSON.stringify(p.dialogo).slice(0, 300));
    if (p.saidas) console.log('    saidas ' + JSON.stringify(p.saidas).slice(0, 300));
    if (p.cubrir) console.log('    cubrir ' + JSON.stringify(p.cubrir).slice(0, 200));
    if (p.CUBRE) console.log('    CUBRE ' + JSON.stringify(p.CUBRE).slice(0, 200));
  }
}
if (j.resumo) console.log('RESUMO ' + JSON.stringify(j.resumo, null, 1).slice(0, 2500));
