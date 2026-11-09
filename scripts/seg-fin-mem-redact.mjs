// Higiene de registos: a memoria do P1 lista as senhas em claro dos 14 scripts retirados do
// tracking. O texto claro nao e preciso no registo — o que importa e saber QUAL linha tem QUAL
// senha, e um md5+comprimento faz isso sem reproduzir a credencial.
// Dry-run por omissao. --apply escreve e congela a copia original em os.tmpdir() (fora do repo,
// porque uma copia em evidence/ meteria senha em claro dentro do historico empurravel).
// Nunca imprime o valor: apenas linha, ficheiro, len e md5 de 12 hex.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const MEM = 'C:/Users/pcmac/.qoder/projects/C--Users-pcmac-Documents-Qoder-2026-10-13-28077d9a/memory';
const ALVO = path.join(MEM, 'bfr-security-remediation-p1.md');
const md5 = (s) => crypto.createHash('md5').update(s).digest('hex').slice(0, 12);

// linha da lista: - `caminho` (senha)
const LINHA = /^(\s*-\s*`[^`]+`)\s*\(([^()\n]+)\)\s*$/;
const apply = process.argv.includes('--apply');

const src = fs.readFileSync(ALVO, 'utf8');
const linhas = src.split(/\r?\n/);
const saida = [];
let n = 0;
for (const l of linhas) {
  const m = l.match(LINHA);
  if (!m) { saida.push(l); continue; }
  const valor = m[2].trim();
  // interpolacao de codigo nao e credencial; e um valor curto demais e so ruido (ex.: "(3)")
  if (valor.includes('${') || valor.length < 6) { saida.push(l); continue; }
  // idempotencia: uma linha ja redigida `(md5 abc… len=12)` casa o padrao de colheita e seria
  // colhida como senha nova — o redactor transformar-se-ia no seu proprio falso positivo.
  if (/^md5 [0-9a-f]{12} len=\d+$/.test(valor)) { console.log(`  (ja redigida, ignorada: ${m[1].trim()})`); saida.push(l); continue; }
  n++;
  console.log(`linha ${n}: ${m[1].trim()} -> len=${valor.length} md5=${md5(valor)}`);
  saida.push(`${m[1]} (md5 ${md5(valor)} len=${valor.length})`);
}
if (!n) { console.log('INSTRUMENTO CEGO: zero linhas de senha reconhecidas'); process.exit(1); }
console.log(`\nsenhas em claro encontradas no registo: ${n}`);
if (!apply) { console.log('dry-run: nada escrito. Use --apply.'); process.exit(0); }

const bak = path.join(os.tmpdir(), `bfr-mem-redact-${new Date().toISOString().slice(0, 10)}.md`);
fs.copyFileSync(ALVO, bak);
fs.writeFileSync(ALVO, saida.join('\n'), 'utf8');
console.log(`aplicado: ${n} redigidas; original em ${bak}`);
