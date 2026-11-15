// FIM-CICLO: apenda a secao W ao fim da auditoria, com portao de ancora e idempotencia.
// O ficheiro e CRLF; o apendice entra em LF (o git normaliza). Nao reescreve nada existente.
// Se a secao ja existe, verifica conformidade do fim e sai 0 (caminho de verificacao).
import fs from 'node:fs';

const dir = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const alvo = `${dir}/docs/auditoria-bfr-conecta.md`;
const corpo = fs.readFileSync(`${dir}/scripts/fim-ciclo-secao-w.md`, 'utf8');
const die = m => { console.error(`ABORTO: ${m}`); process.exit(1); };

const doc = fs.readFileSync(alvo, 'utf8');
const ancora = 'a ordem dos acontecimentos.';
const fimDoc = doc.replace(/\r\n/g, '\n');

if (doc.includes('## W. «finalize o que falta»')) {
  const bloco = '\n---\n\n' + corpo;
  if (!fimDoc.endsWith(bloco)) {
    die(`secao W existe mas o fim nao e o bloco esperado (fim atual: ${JSON.stringify(fimDoc.slice(-120))})`);
  }
  console.log('secao W ja presente e conforme (verificacao)');
  process.exit(0);
}

if (!fimDoc.endsWith(ancora + '\n')) die(`ancora de fim nao casa (o ficheiro termina com ${JSON.stringify(doc.slice(-80))})`);
if (!corpo.startsWith('## W. «finalize o que falta»')) die('corpo nao comeca pela rubrica W');
if (!corpo.endsWith('\n')) die('corpo nao termina em newline');

const antes = fs.statSync(alvo).size;
fs.appendFileSync(alvo, '\n---\n\n' + corpo);
const depois = fs.statSync(alvo).size;
const deltaEsperado = Buffer.byteLength('\n---\n\n' + corpo, 'utf8');
if (depois - antes !== deltaEsperado) die(`delta gravado ${depois - antes} != esperado ${deltaEsperado}`);

const fim = fs.readFileSync(alvo, 'utf8');
const bloco = '\n---\n\n' + corpo;
if (!fim.replace(/\r\n/g, '\n').endsWith(bloco)) die('verificacao final do fim falhou');
console.log(`secao W apendada: ${antes} -> ${depois} B (delta +${depois - antes})`);
