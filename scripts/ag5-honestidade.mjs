// Leitura de honestidade: que marcadores de verde aparecem REALMENTE nos resultados de ferramenta do
// diário desta sessão, e o que o censo AG-5 diz (reedido do artefacto, não da memória truncada pelo tail).
import { readFileSync } from 'node:fs';
const SESS = 'C:/Users/pcmac/.qoder/projects/C--Users-pcmac-Documents-Qoder-2026-11-15-2e9c4296/2e9c4296-1bee-49dd-9f1e-defbe54c4db8.jsonl';
const linhas = readFileSync(SESS, 'utf8').split('\n');
const MARCAS = ['FIN2_HIGIENE_VERDE', 'AG3_CANDIDATA_VERDE', 'AG3_RUNTIME_VERDE', 'AG4_CANDIDATA_VERDE', 'AG4_RUNTIME_VERDE', 'AG5_CENSO_FEITO', 'AF1_AUDITORIA_FINAL_VERDE'];
const emResults = {}, emComandos = {};
for (const m of MARCAS) { emResults[m] = 0; emComandos[m] = 0; }
for (const l of linhas) {
  if (!l.trim()) continue;
  let j; try { j = JSON.parse(l); } catch { continue; }
  const tipo = j?.message?.role;
  const bruto = JSON.stringify(j?.message?.content ?? '');
  for (const m of MARCAS) {
    if (!bruto.includes(m)) continue;
    if (tipo === 'user' && bruto.includes('tool_result')) emResults[m]++;
    else if (tipo === 'assistant') emComandos[m]++;
  }
}
console.log('marcador'.padEnd(26), 'em_resultado_de_ferramenta', '  em_comando_que_escreve_o_marco');
for (const m of MARCAS) console.log(m.padEnd(26), String(emResults[m]).padStart(24), '  ', String(emComandos[m]).padStart(22));

const c = JSON.parse(readFileSync('C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta/evidence/ag5-rm25-rm21-censo-17-11.json', 'utf8'));
console.log(`\nRM-2.5: ${c.rm25.definicoes_de_loaders} loaders · ${c.rm25.com_guarda} com guarda · ${c.rm25.sem_guarda.length} sem · catch vazios em loaders ${c.rm25.catch_vazios}, no ficheiro ${c.rm25.catch_vazios_fora_de_loaders} · setam_error ${c.rm25.setam_error}`);
console.log(`RM-2.1: setInterval ${c.rm21.setInterval_total} · re-armando-se a si mesmo ${c.rm21.setTimeout_re_armando_se_a_si.length} · escritas periódicas no menu ${c.rm21.escritas_periodicas_no_menu}`);
console.log('loaders sem guarda:', c.rm25.sem_guarda.join(', ') || '(nenhum)');
