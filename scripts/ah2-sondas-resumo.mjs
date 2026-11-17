// O veredito vive no artefacto, não no stdout — por isso o condutor lê-o do disco e imprime o que cada
// sonda mediu (primeiro preenchimento, série até ao preenchimento, maior painel da página, exceções e
// estatuto não-200 da rede). Só-leitura, e serve para o relatório derivado não ter de repetir a régua.
// Uso: node scripts/ah2-sondas-resumo.mjs [prefixo=ah2-sonda-]
import { readFileSync, readdirSync } from 'node:fs';
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const PREF = process.argv[2] || 'ah2-sonda-';
const fich = readdirSync(`${DIR}/evidence`).filter((f) => f.startsWith(PREF) && (f.includes('-tempo-') ) && f.endsWith('.json')).sort();
for (const f of fich) {
  let j; try { j = JSON.parse(readFileSync(`${DIR}/evidence/${f}`, 'utf8')); } catch (e) { console.log(`${f}: ilegível — ${e.message.slice(0, 50)}`); continue; }
  const p = (j.serie || []).find((x) => x && typeof x.c === 'number' && x.c > 0);
  const zeros = (j.serie || []).filter((x) => x.c === 0).length;
  const nao200 = (j.rede_janela || []).filter((r) => r.st && (r.st < 200 || r.st > 299) || r.erro);
  console.log(`${f.replace(/^(ah2-sonda-apoio-tempo-|ah2-sonda-painel-tempo-)/, '').replace('.json', '')} :: ${j.papel}@${j.largura} rota=${j.rota || 'apoio'} painel=${j.painel || 'supportView'} md5=${(j.md5_shell || '').slice(0, 8)} amostras=${(j.serie || []).length} zeros=${zeros} ` + (p ? `ENCHE ${p.c}c aos ${p.t_ms_apos_toque}ms (ativa=${p.ativa} filhos=${p.n_filhos})` : 'PERMANECE A 0') + ` | maior=${j.painel_maior ? j.painel_maior.id + ':' + j.painel_maior.c : '-'} excecoes=${(j.erros_janela || []).length} rede_nao200=${nao200.length ? nao200.map((r) => r.u.split('/').pop() + '=' + (r.st || r.erro)).slice(0, 3).join(',') : 'nenhuma'}`);
  console.log(`   veredito: ${j.veredito}`);
}
