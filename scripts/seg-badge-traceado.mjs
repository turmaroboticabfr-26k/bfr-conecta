// SEG-BADGE-TRACEADO — liga o valor que o seg-badge-token-probe.mjs declarou morto ao valor
// que efectivamente esta no historico empurrado. Sem isso a prova era sobre o ficheiro do disco.
// Somente-leitura: git show + md5. Nunca impresso: o token, so booleanos e hashes.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import crypto from 'node:crypto';
import { DIR } from './c2-lib.mjs';

const CAMINHO = 'docs/c2-fixtures.json';
const disco = readFileSync(`${DIR}/${CAMINHO}`, 'utf8');
const tokenDisco = JSON.parse(disco).badge_token;
const md5 = (b) => crypto.createHash('md5').update(b).digest('hex');
const redig = (s) => String(s).split(String(tokenDisco)).join('REDACTADO');
const git = (args) => { try { return { ok: true, out: execFileSync('git', args, { cwd: DIR, encoding: 'latin1' }) }; } catch (e) { return { ok: false, out: redig(e.stdout || '') + redig(e.stderr || '') }; } };

const refs = [['d26b4fa', 'commit que adicionou o ficheiro'], ['refs/remotes/origin/main', 'tip empurrado de hoje'], ['HEAD', 'arvore local']];
const linhas = [];
for (const [ref, papel] of refs) {
  const r = git(['show', `${ref}:${CAMINHO}`]);
  if (!r.ok) { linhas.push({ ref, papel, existe_no_ref: false, nota: r.out.trim().slice(0, 80) }); continue; }
  const blob = Buffer.from(r.out, 'latin1');
  let tokenIgu = false;
  try { tokenIgu = JSON.parse(blob.toString('utf8')).badge_token === tokenDisco; } catch { /* blob nao e JSON */ }
  linhas.push({ ref, papel, existe_no_ref: true, bytes: blob.length, md5: md5(blob), md5_igual_ao_disco: md5(blob) === md5(disco), token_igual_ao_disco: tokenIgu });
}
for (const l of linhas) console.log(`${l.ref.padEnd(26)} ${l.papel.padEnd(30)} ${l.existe_no_ref ? `${l.bytes} B  md5=${l.md5}  igual_disco=${l.md5_igual_ao_disco}  token_igual=${l.token_igual_ao_disco}` : 'NAO EXISTE nesse ref'}`);

const ts = (ref) => git(['show', '-s', '--format=%cI', ref]).out.trim();
const commit = ts('d26b4fa'), limpeza = JSON.parse(readFileSync(`${DIR}/docs/c2-4-limpeza.json`, 'utf8')).em;
const mint = JSON.parse(disco).em;
const deltaMin = (Math.min(Math.abs(Date.parse(commit) - Date.parse(limpeza))) / 60000).toFixed(1);
console.log(`\njanela de vida da linha no banco : ${mint} -> ${limpeza}`);
console.log(`valor entrou no git em              : ${commit}`);
console.log(`o commit e POSTERIOR a limpeza por  : ${deltaMin} minutos`);
const viveu = Date.parse(commit) > Date.parse(limpeza);
console.log(`\n${viveu ? 'SEM JANELA' : 'COM JANELA'}: ${viveu ? 'quando o valor foi commitado, a linha ja estava apagada' : 'houve momento em que o valor commitado correspondia a uma linha viva'}`);
