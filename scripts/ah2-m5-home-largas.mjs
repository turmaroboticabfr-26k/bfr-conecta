// Porque este programa existe: a linha do §14 «o `inicio` do `developer` não assentou em 6 s a 1440 (1441 ms
// acima do teto)» foi escrita de memória de uma leitura e tem de sobreviver a duas perguntas: (1) em QUE
// ficheiro está esse número e quantos ms acima do teto ele é; (2) se a falha é do `developer` ou da banda
// larga — porque se 1440/1920 falham em vários papéis a causa é a largura, não a vista. O tempo está em
// `stages[papel][banda].peca.inicio.ms`, medido contra `tetos.estabilizacao_ms` (6000), e é isso que este
// programa vai ler. Só-leitura: 0 browser, 0 escrita em base.
// Uso: node scripts/ah2-m5-home-largas.mjs [rotulo]
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const ROTULO = process.argv[2] || 'v1';
const OUT = `${DIR}/evidence/ah2-m5-home-largas-${ROTULO}.json`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — usar outro rótulo');

const linhas = [];
for (const f of readdirSync(`${DIR}/evidence`).filter((x) => /^ah2-varredura-17-11.*\.json$/.test(x))) {
  let j; try { j = JSON.parse(readFileSync(`${DIR}/evidence/${f}`, 'utf8')); } catch { continue; }
  const teto = j.tetos?.estabilizacao_ms ?? null;
  if (!j.stages || !teto) continue;
  for (const [papel, por_banda] of Object.entries(j.stages)) {
    for (const [banda, s] of Object.entries(por_banda || {})) {
      const peca = s?.peca || {};
      const ini = peca['inicio'] || null;
      const acima = Object.entries(peca).filter(([, p]) => typeof p?.ms === 'number' && p.ms > teto)
        .map(([k, p]) => `${k}=${p.ms}`);
      linhas.push({
        ficheiro: f, papel, banda: +banda, md5_shell: j.md5_shell,
        ms_ready: s?.ms_ready ?? null, ms_inicio: ini?.ms ?? null,
        painel_inicio: ini?.painel ? `${ini.painel.id}#${ini.painel.c}` : null,
        seccoes_medidas: Object.keys(peca).length, acima_do_teto: acima, teto,
      });
    }
  }
}
if (!linhas.length) throw new Error('ABORTA: 0 bandas lidas em `stages` — a régua mudou de forma e isto tem de ser relido, não assumido');

const mediana = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
const largas = [...new Set(linhas.map((l) => l.banda))].filter((b) => b >= 1366).sort((a, b) => a - b);
const por_banda = {};
for (const b of largas) {
  const ls = linhas.filter((l) => l.banda === b);
  por_banda[b] = {
    bandas: ls.length, papéis: [...new Set(ls.map((l) => l.papel))].length,
    com_inicio_medido: ls.filter((l) => l.ms_inicio !== null).length,
    inicio_acima_do_teto: ls.filter((l) => l.ms_inicio !== null && l.ms_inicio > l.teto).map((l) => `${l.papel}=${l.ms_inicio}`),
    qualquer_seccao_acima_do_teto: ls.filter((l) => l.acima_do_teto.length).map((l) => `${l.papel}: ${l.acima_do_teto.join(',')}`),
    mediana_ms_inicio: mediana(ls.map((l) => l.ms_inicio).filter((x) => x !== null)),
    max_ms_inicio: Math.max(0, ...ls.map((l) => l.ms_inicio || 0)),
  };
}
const dev1440 = linhas.filter((l) => l.papel === 'developer' && l.banda === 1440);
writeFileSync(OUT, JSON.stringify({
  ciclo: 'AH-M5-HOME-LARGAS', em: new Date().toISOString(), rotulo: ROTULO,
  o_que_testa: 'se o `inicio` acima dos 6 s é uma propriedade do papel developer ou da banda larga: conta por banda, com o número de papéis e quais falharam.',
  ficheiros_lidos: [...new Set(linhas.map((l) => l.ficheiro))].length, bandas_lidas: linhas.length,
  tetos: [...new Set(linhas.map((l) => l.teto))], md5_shell: [...new Set(linhas.map((l) => l.md5_shell).filter(Boolean))],
  por_banda_larga: por_banda, developer_1440: dev1440,
}, null, 2) + '\n');
console.log(`bandas lidas=${linhas.length} de ${[...new Set(linhas.map((l) => l.ficheiro))].length} ficheiros · md5=${(por_banda => [...new Set(linhas.map((l) => l.md5_shell))].join(','))()}`);
for (const [b, g] of Object.entries(por_banda)) {
  console.log(`\n${b}px: ${g.bandas} bandas de ${g['papéis']} papéis · inicio medido em ${g.com_inicio_medido} · mediana ${g.mediana_ms_inicio} ms · max ${g.max_ms_inicio} ms`);
  if (g.inicio_acima_do_teto.length) console.log(`   inicio ACIMA dos ${linhas.find((l) => l.banda === +b).teto} ms: ${g.inicio_acima_do_teto.join(' ')}`);
  for (const q of g.qualquer_seccao_acima_do_teto) console.log(`   acima do teto: ${q}`);
}
console.log('\ndetalhe developer@1440:');
for (const l of dev1440) console.log(`  ${l.ficheiro} · ms_ready=${l.ms_ready} · ms_inicio=${l.ms_inicio} · painel=${l.painel_inicio} · seccoes=${l.seccoes_medidas} · acima=${l.acima_do_teto.join(',') || '-'}`);
console.log('\nESCRITO: ' + OUT.split('/').pop());
