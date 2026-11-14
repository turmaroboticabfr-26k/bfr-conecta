#!/usr/bin/env node
// Varre os ficheiros RASTREADOS por classes de segredo que os padroes de chave/senha nao cobrem.
// Imprime apenas: caminho, classe, numero de ocorrencias, comprimento e forma mascara.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const raiz = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const arquivos = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);

const CLASSES = [
  ['pat_github', /ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}/g],
  ['token_cloudflare', /cfat_[A-Za-z0-9_-]{20,}|v0[01]_[A-Za-z0-9_-]{20,}/g],
  ['jwt_header_service', /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]{10,}/g],
  ['bearer_literal', /Bearer\s+["']?([A-Za-z0-9._-]{25,})/g],
  ['const_segredo', /(?:SENHA|PASSWORD|PASSWD|TOKEN|SECRET|API_KEY|APIKEY|PAT)[A-Z_0-9]*\s*[:=]\s*["']([^"'$\x60]{8,})["']/g],
  ['chave_privada', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
];

function forma(v) {
  return v.replace(/[a-z]/g, 'a').replace(/[A-Z]/g, 'A').replace(/[0-9]/g, '9').slice(0, 60);
}

let portadores = 0;
let bin = 0;
for (const f of arquivos) {
  let buf;
  try { buf = readFileSync(`${raiz}/${f}`); } catch { continue; }
  if (buf.includes(0)) { bin++; continue; }
  const t = buf.toString('utf8');
  const saida = [];
  for (const [nome, re] of CLASSES) {
    re.lastIndex = 0;
    const ms = [...t.matchAll(re)];
    if (!ms.length) continue;
    saida.push(`${nome}: n=${ms.length} ${ms.map((m) => `n=${(m[1] ?? m[0]).length} forma=${forma(m[1] ?? m[0])}`).slice(0, 3).join(' | ')}`);
  }
  if (!saida.length) continue;
  portadores++;
  console.log(`## ${f}`);
  for (const s of saida) console.log(`   ${s}`);
}
console.log(`--- visitados=${arquivos.length} binarios=${bin} portadores=${portadores}`);
