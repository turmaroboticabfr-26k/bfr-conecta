// O monitor é o único papel do §5 em que a moldura mobile não monta, e os censos dizem `presentation:null` —
// ou seja, o `#appShell` nunca levou o atributo `data-presentation`, que é o que o módulo de apresentação escreve
// quando decide o modo. A tentação é chamar-lhe «defeito do monitor a 320-430». Antes disso há uma alternativa a
// testar com o que já está no disco: uma corrida de arranque. O `ms_ready` do monitor é 376-453 ms nas cinco
// larguras falhadas e 1078 ms na única que montou. Se `presentation` dependesse da largura, o 414 não seria
// especial; se depender de o módulo apanhar o `ready` do shell, então a variável que importa é o tempo, e ela é
// testável em todos os papéis. Este programa imprime, por (papel × largura), o par (apresentação, ms_ready) de
// todas as bandas medidas e de todas as travadas, para a decisão ser lida e não escolhida.
// Só-leitura: 0 browser, 0 escrita em base.
// Uso: node scripts/ah2-m5-presentation.mjs [rotulo]
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const ROTULO = process.argv[2] || 'v1';
const OUT = `${DIR}/evidence/ah2-m5-presentation-${ROTULO}.json`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — usar outro rótulo');

const celulas = new Map();
for (const f of readdirSync(`${DIR}/evidence`).filter((x) => /^ah2-mobile2-.*\.json$/.test(x))) {
  const j = JSON.parse(readFileSync(`${DIR}/evidence/${f}`, 'utf8'));
  if (!j.papel) continue;
  for (const [w, b] of Object.entries(j.bandas || {})) {
    const k = `${j.papel}@${w}`;
    const reg = { papel: j.papel, largura: +w, estado: 'medida', presentation: b.censo?.presentation ?? null, body_mobile: !!b.censo?.body_mobile, barra: !!b.censo?.barra_existe, ms_ready: b.ms_ready ?? null, abertas: b.abertas ?? 0, md5: j.md5_shell, ficheiro: f };
    const velho = celulas.get(k);
    if (!velho || (reg.abertas >= velho.abertas && (reg.ms_ready ?? -1) >= (velho.ms_ready ?? -1))) celulas.set(k, reg);
  }
  for (const bq of j.bloqueadas || []) {
    const k = `${j.papel}@${bq.largura}`;
    const reg = { papel: j.papel, largura: bq.largura, estado: 'travada', presentation: bq.censo?.presentation ?? null, body_mobile: !!bq.censo?.body_mobile, barra: !!bq.censo?.barra_existe, ms_ready: bq.ms_ready ?? null, abertas: 0, md5: j.md5_shell, ficheiro: f };
    const velho = celulas.get(k);
    if (!velho || velho.estado === 'travada') celulas.set(k, reg);
  }
}
const linhas = [...celulas.values()].sort((a, b) => a.papel.localeCompare(b.papel) || a.largura - b.largura);
const sem = linhas.filter((l) => !l.presentation);
const com = linhas.filter((l) => l.presentation);
const mediana = (a) => { const s = a.filter((x) => typeof x === 'number').sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
const saida = {
  ciclo: 'AH-M5-PRESENTATION', em: new Date().toISOString(), celulas: linhas.length,
  o_que_testa: 'a ausência de #appShell[data-presentation] segue a largura (defeito do papel) ou o tempo de arranque (corrida entre o módulo e o ready do shell)?',
  sem_atributo: sem.length, com_atributo: com.length,
  papeis_sem_atributo: [...new Set(sem.map((l) => `${l.papel}@${l.largura}`))].sort(),
  ms_ready_mediana_sem: mediana(sem.map((l) => l.ms_ready)), ms_ready_mediana_com: mediana(com.map((l) => l.ms_ready)),
  ms_ready_faixa_sem: [Math.min(...sem.map((l) => l.ms_ready ?? 1e9)), Math.max(...sem.map((l) => l.ms_ready ?? -1))],
  ms_ready_faixa_com: [Math.min(...com.map((l) => l.ms_ready ?? 1e9)), Math.max(...com.map((l) => l.ms_ready ?? -1))],
  larguras_onde_o_mesmo_papel_muda: [...new Set(linhas.map((l) => l.papel))].filter((p) => {
    const as = linhas.filter((l) => l.papel === p).map((l) => !!l.presentation);
    return new Set(as).size > 1;
  }),
  linhas: sem, todas: linhas,
};
writeFileSync(OUT, JSON.stringify(saida, null, 2) + '\n');
console.log(`células=${saida.celulas} · com atributo=${saida.com_atributo} · sem atributo=${saida.sem_atributo}`);
console.log('células sem data-presentation: ' + (saida.papeis_sem_atributo.join(' ') || 'nenhuma'));
console.log(`ms_ready mediana — sem atributo: ${saida.ms_ready_mediana_sem} · com atributo: ${saida.ms_ready_mediana_com}`);
console.log(`faixa ms_ready — sem: ${saida.ms_ready_faixa_sem.join('..')} · com: ${saida.ms_ready_faixa_com.join('..')}`);
console.log('papéis com o atributo presente nalgumas larguras e ausente noutras: ' + (saida.larguras_onde_o_mesmo_papel_muda.join(' ') || 'nenhum'));
console.log('ESCRITO: ' + OUT.split('/').pop());
