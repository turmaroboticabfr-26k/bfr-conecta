// A tabela emite `conteudos`/`notificacoes` @ pedagogical como «sem medição coerente em 320…430», mas o mesmo
// rodapé diz que o pedagogical tem banda coerente nas seis. Uma das duas frases está errada, e a resposta está
// nos artefactos: o `declaradas` é por ficheiro (última corrida ganha) e o `declaradas_sem_rota` é por banda —
// se a banda coerente não listou a rota nem como porta nem como «sem rota», a célula é um buraco do instrumento.
// Só-leitura. Uso: node scripts/ah2-confere-pedagogical.mjs [rota]
import { readFileSync, readdirSync } from 'node:fs';
const EV = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta/evidence';
const SÓ_SHAPE = process.argv.includes('--shape');
const ROTAS = SÓ_SHAPE ? [] : (process.argv.slice(2).filter((a) => !a.startsWith('--')));
const fich = readdirSync(EV).filter((f) => /^ah2-mobile2-m5-pedagogical.*\.json$/.test(f)).sort();
const coerente = (b) => !!b.censo && b.censo.barra_existe !== false && (b.censo.barra || []).some((x) => x.w > 0 && x.h > 0) && (b.abertas || 0) > 0;
console.log(`artefactos do pedagogical: ${fich.length}`);
for (const f of fich) {
  const j = JSON.parse(readFileSync(`${EV}/${f}`, 'utf8'));
  const dec = j.declaradas || [];
  console.log(`\n${f} · declaradas=${dec.length} [${dec.join(',')}] · chaves=${Object.keys(j).join(',')}`);
  const linhas = [];
  for (const [w, b] of Object.entries(j.bandas || {})) {
    const portas = [...new Set([...(b.censo?.barra || []), ...(b.censo?.gaveta || [])].map((x) => x.route))];
    for (const r of ROTAS) {
      linhas.push(`  ${w} ${coerente(b) ? 'coerente' : 'oca'} ${r}: declarada=${dec.includes(r)} sem_rota=${(b.declaradas_sem_rota || []).includes(r)} porta=${portas.includes(r)} seccoes=${!!(b.seccoes || {})[r]} abertas=${b.abertas}`);
    }
    if (ROTAS.length === 0) linhas.push(`  ${w} ${coerente(b) ? 'coerente' : 'oca'}: portas=${portas.length} chaves_banda=${Object.keys(b).join(',')}`);
  }
  console.log(linhas.join('\n'));
}
