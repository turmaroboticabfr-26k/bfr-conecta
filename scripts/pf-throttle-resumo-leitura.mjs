// Leitura pura: imprime vereditos e portões dos artefatos do ciclo do throttle.
import { readFileSync } from 'node:fs';
const dir = 'C:/Users/pcmac/.kiro/crew/uploads/';
const nomes = ['pf-throttle-aplicar.json', 'pf-throttle-confere-aplicacao.json',
  'pf-throttle-fixture.json', 'pf-throttle-ensaio.json', 'pf-throttle-limpeza.json', 'pf-throttle-reset.json'];

for (const n of nomes) {
  const j = JSON.parse(readFileSync(dir + n, 'utf8'));
  const portas = j.portas ?? j.gates ?? j.verificacoes ?? null;
  let ok = null, tot = null;
  if (Array.isArray(portas)) { tot = portas.length; ok = portas.filter(p => p?.ok === true).length; }
  else if (portas && typeof portas === 'object') {
    const v = Object.values(portas);
    tot = v.length;
    ok = v.filter(p => (typeof p === 'object' && p !== null ? p.ok : p) === true).length;
  }
  const veredito = j.veredito ?? j.veredicto ?? j.resultado ?? j.status ?? null;
  const ts = j.executado_em ?? j.gravado_em ?? j.em ?? j.data ?? null;
  console.log(`${n} | veredito=${JSON.stringify(veredito)} | portoes=${ok}/${tot ?? '-'} | ts=${ts} | chaves=${Object.keys(j).slice(0, 14).join(',')}`);
}
