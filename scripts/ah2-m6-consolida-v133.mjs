// AH-M6 consolidador — le os 15 artefactos v133b (re-varredura a 390 contra o ar, pos-publicacao da v133)
// e aplica a mesma prédica de cobertura do condutor m5: banda coerente = barra do censo com botões a
// caixa, sem praga, pelo menos uma secao aberta a toque, 0 estouro horizontal, 0 falhas do instrumento.
// Nao inventa linhas: cada papel sem artefacto conta como FALTA, nao como verde.
// Uso: node scripts/ah2-m6-consolida-v133.mjs
import { readFileSync, existsSync, writeFileSync } from 'node:fs';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const EV = `${DIR}/evidence`;
const OUT = `${EV}/ah2-m6-v133-consolidado-18-11.json`;

const src = readFileSync(`${DIR}/scripts/ah2-varredura.mjs`, 'utf8');
const m = src.match(/const TODOS\s*=\s*\[([^\]]*)\]/);
if (!m) throw new Error('ABORTA: enum de perfis não encontrado em ah2-varredura.mjs');
const PAPEIS = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
if (PAPEIS.length < 10) throw new Error('ABORTA: enum lido tem só ' + PAPEIS.length + ' perfis');

const out = { ciclo: 'AH-7b-M6-V133-SWEEP', em: new Date().toISOString(), largura: 390, papeis: [], faltas: [], vermelhos: [] };
for (const papel of PAPEIS) {
  const f = `${EV}/ah2-mobile2-v133b-${papel}.json`;
  if (!existsSync(f)) { out.faltas.push(papel); continue; }
  const j = JSON.parse(readFileSync(f, 'utf8'));
  if (j.ciclo !== 'AH-7b-MOBILE' || j.papel !== papel) { out.faltas.push(`${papel}:artefacto_de_outro_ciclo`); continue; }
  const b = j.bandas?.['390'];
  if (!b || b.pela_praga) { out.faltas.push(`${papel}:${b?.pela_praga ? 'praga' : 'sem_banda_390'}`); continue; }
  const coerente = b.censo && b.censo.barra_existe !== false
    && (b.censo.barra || []).some((x) => x.w > 0 && x.h > 0)
    && (b.abertas || 0) > 0 && !(b.estouro || []).length && !(j.falhas || []).length;
  out.papeis.push({ papel, coerente, abertas: b.abertas || 0, estouro: (b.estouro || []).length,
    rotas_barra: (b.censo?.barra || []).length, rotas_gaveta: (b.censo?.gaveta || []).length,
    falhas: (j.falhas || []).slice(0, 6), artefacto: f.split('/').pop() });
  if (!coerente) out.vermelhos.push(papel);
}
out.totais = { papeis: PAPEIS.length, coerentes: out.papeis.filter((p) => p.coerente).length, faltas: out.faltas.length, vermelhos: out.vermelhos.length };
out.veredito = out.totais.vermelhos ? 'AH7b_V133_COM_DEFEITOS' : (out.totais.faltas ? 'AH7b_V133_INCOMPLETO' : 'AH7b_V133_390_LIMPO');
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`${out.veredito} — coerentes ${out.totais.coerentes}/${PAPEIS.length}, faltas ${out.faltas.length}, vermelhos ${out.vermelhos.length}`);
if (out.vermelhos.length) console.log('VERMELHOS: ' + out.vermelhos.join(', '));
if (out.faltas.length) console.log('FALTAM: ' + out.faltas.join(', '));
process.exit(out.totais.vermelhos || out.totais.faltas ? 1 : 0);
