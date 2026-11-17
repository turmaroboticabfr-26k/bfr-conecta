// O rasto do predicado degenerado, procurado nos diários que JÁ ESTÃO em disco (nenhum browser, nenhum mint).
// Motivo: se `window.innerWidth` se dilata até à largura do conteúdo, então uma célula com transbordo
// horizontal não dá `estouro_h=true` — dá `estouro_h=false` E `largura` maior do que a banda pedida. Logo a
// coluna `largura` dos diários é a testemunha involuntária: onde ela excede a banda, houve overflow e a
// auditoria registou-o como ausência dele.
import { readdirSync, readFileSync } from 'node:fs';
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta/evidence';
const nomes = readdirSync(DIR).filter(p => p.endsWith('.json') && /ah2-(mobile|varredura|professor|desktop|home|m5)/.test(p));
const saida = { ficheiros_lidos: 0, ficheiros_com_largura: 0, celulas: 0, cells_com_bandas: 0, acima_da_banda: [], por_valor: {} };
const saida_sem_banda = [];
const recolhe = (x, chave, fora) => { if (!x || typeof x !== 'object') return; for (const [k, v] of Object.entries(x)) { if (k === chave) fora.push(v); else if (k === 'largura' && typeof v === 'number') fora.push(v); else if (k !== 'taps_amostra' && k !== 'fontes_amostra' && k !== 'por_ficheiro') recolhe(v, chave, fora); } };
for (const p of nomes) {
  let j; try { j = JSON.parse(readFileSync(DIR + '/' + p, 'utf8')); } catch { continue; }
  saida.ficheiros_lidos++;
  const larguras_celula = [];
  const walk = (x, caminho) => {
    if (!x || typeof x !== 'object') return;
    for (const [k, v] of Object.entries(x)) {
      if (k === 'largura' && typeof v === 'number') { larguras_celula.push({ caminho: caminho + '/' + k, largura: v, estouro_h: x.estouro_h ?? null, painel: v_painel(x) }); }
      else if (v && typeof v === 'object' && k !== 'taps_amostra' && k !== 'fontes_amostra') walk(v, caminho + '/' + k);
    }
  };
  walk(j, '');
  if (!larguras_celula.length) continue;
  saida.ficheiros_com_largura++;
  saida.celulas += larguras_celula.length;
  // As bandas pedidas pelo próprio diário: campo declarado pelo produtor, não a minha memória.
  const bandas = new Set();
  const colhe_bandas = (x) => { if (!x || typeof x !== 'object') return; for (const [k, v] of Object.entries(x)) { if ((k === 'larguras' || k === 'banda' || k === 'largura_pedida') && (Array.isArray(v) || typeof v === 'number')) (Array.isArray(v) ? v : [v]).forEach(n => typeof n === 'number' && bandas.add(n)); else if (v && typeof v === 'object') colhe_bandas(v); } };
  colhe_bandas(j);
  if (!bandas.size) { saida_sem_banda.push(p + ' | ' + larguras_celula.length + ' células, nenhum campo de banda no diário'); continue; }
  [...bandas].forEach(b => { saida.por_valor[b] = (saida.por_valor[b] || 0) + larguras_celula.filter(c => c.largura === b).length; });
  for (const c of larguras_celula) {
    const banda_mais_pertinente = [...bandas].sort((a, b) => Math.abs(a - c.largura) - Math.abs(b - c.largura))[0];
    if (c.largura > banda_mais_pertinente) { saida.acima_da_banda.push({ ficheiro: p, caminho: c.caminho, banda_declarada_mais_perto: banda_mais_pertinente, largura_gravada: c.largura, excede_px: c.largura - banda_mais_pertinente, estouro_h_gravado: c.estouro_h, painel: c.painel }); }
  }
  saida.cells_com_bandas += larguras_celula.length;
}
function v_painel(o) { const p = o.painel || o.peca && o.painel; if (!p || typeof p !== 'object') return null; return p.id ?? null; }
saida.veredito = saida.acima_da_banda.length ? 'HA_RASTO_DE_DILATACAO' : 'NENHUMA_CELULA_ACIMA_DA_BANDA_DECLARADA';
console.log(JSON.stringify({ ...saida, acima_da_banda: saida.acima_da_banda.slice(0, 12), total_acima: saida.acima_da_banda.length, ficheiros_sem_banda_declarada: saida_sem_banda.length }, null, 1));
console.log('\nVEREDITO: ' + saida.veredito + ' · células acima da banda: ' + saida.acima_da_banda.length + '/' + saida.cells_com_bandas);
console.log('ficheiros sem campo de banda (não testáveis): ' + saida_sem_banda.length);
saida_sem_banda.slice(0, 8).forEach(s => console.log('  sem banda: ' + s));
