// Distinguir as duas coisas que o veredito da sonda não distingue sozinho: «o painel abriu e ficou vazio»
// versus «o toque nunca abriu o painel». Para isso há três provas no próprio artefacto — `toque.por`/
// `toque.alvo` (onde se bateu), `ativa` na série (a secção que o runtime declara) e `visivel`/`oculto`
// (caixa do painel). Se `ativa` nunca for a rota pedida, a leitura 0 é do painel fechado, não de um render
// vazio; se `ativa` for a rota e `visivel:true` com `c:0`, então o produto abriu um painel sem conteúdo.
// Uso: node scripts/ah2-sonda-abriu.mjs <rotulo> [mais rótulos]
import { readFileSync } from 'node:fs';
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
for (const r of process.argv.slice(2)) {
  for (const pref of ['ah2-sonda-painel-tempo-', 'ah2-sonda-apoio-tempo-']) {
    let j; try { j = JSON.parse(readFileSync(`${DIR}/evidence/${pref}${r}.json`, 'utf8')); } catch { continue; }
    const s = j.serie || [];
    const ativas = [...new Set(s.map((x) => x.ativa))];
    const visiveis = [...new Set(s.map((x) => x.visivel))];
    const cmax = Math.max(0, ...s.map((x) => x.c || 0));
    const hmax = Math.max(0, ...s.map((x) => x.html || 0));
    console.log(`${r} :: ${j.papel}@${j.largura} rota=${j.rota || 'apoio'} painel=${j.painel || 'supportView'}`);
    console.log(`   tocou em: ${j.toque?.por} alvo=${JSON.stringify(j.toque?.alvo)}  gaveta.aberta=${j.gaveta?.aberta} ms_item=${j.ms_item_apoio_na_gaveta ?? j.ms_item_na_gaveta ?? '-'} modal=${j.modal?.id || 'nenhum'}${j.modal_agora ? ' fechado=' + JSON.stringify(j.modal_agora) : ''}`);
    console.log(`   ativa ao longo da série: ${JSON.stringify(ativas)} · visivel: ${JSON.stringify(visiveis)} · oculto: ${JSON.stringify([...new Set(s.map((x) => x.oculto))])}`);
    console.log(`   c max=${cmax} · html max=${hmax} bytes · amostras=${s.length} · censo barra.alvo=${JSON.stringify(j.censo_antes_do_toque?.barra?.alvo)} gaveta.alvo=${JSON.stringify(j.censo_antes_do_toque?.gaveta?.alvo)} sidebar=${JSON.stringify(j.censo_antes_do_toque?.sidebar)}`);
    console.log(`   censo pós-tentativas: barra.rotas=${JSON.stringify(j.toque?.censo_apos_tentativas?.barra?.rotas)} gaveta.rotas=${JSON.stringify(j.toque?.censo_apos_tentativas?.gaveta?.rotas)}`);
    console.log(`   rede da janela: ${JSON.stringify((j.rede_janela || []).slice(-4))}`);
    console.log(`   antes do toque: ${JSON.stringify(j.antes)}`);
  }
}
