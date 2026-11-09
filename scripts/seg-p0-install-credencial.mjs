// Instalador da credencial do GitHub para destravar o push (09/11: o GCM esta em modo
// nao-interactivo e nao devolve credencial nenhuma, logo os commits locais ficam parados).
// Le o token de ~/.gh-token — escrito pelo proprio usuario — e nunca o imprimi: so comprimento
// e md5 de 12 hex. O valor segue por STDIN para `git credential approve`, nunca por argv
// (argv fica visivel na lista de processos e no historico da shell).
// host e username sao DERIVADOS do remote.origin.url, nao dactilografados: o username que o
// probe de 09/11 viu o GCM pedir e o dono do path do remoto.
// --dry-run nao escreve em nada (mostra o payload mascarado); --token-file= e para teste.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const REPO = new URL('..', import.meta.url).pathname.replace(/^\//, '').replace(/\/$/, '');
const md5 = (s) => crypto.createHash('md5').update(s).digest('hex').slice(0, 12);
const flagVal = (k) => {
  const p = `--${k}=`;
  const a = process.argv.find((x) => x.startsWith(p));
  return a ? a.slice(p.length) : null;
};
const DRY = process.argv.includes('--dry-run');
const TOKEN_FILE = flagVal('token-file') || path.join(os.homedir(), '.gh-token');

const GIT_ENV = { GCM_INTERACTIVE: 'never', GIT_TERMINAL_PROMPT: '0' };
const roda = (args, opts = {}) => {
  try {
    return {
      code: 0,
      out: execFileSync('git', args, {
        cwd: REPO, encoding: 'utf8', timeout: opts.timeout || 60000,
        env: { ...process.env, ...GIT_ENV, ...opts.env }, input: opts.input,
      }),
    };
  } catch (e) {
    return { code: e.status ?? 1, out: `${e.stdout || ''}${e.stderr || ''}` };
  }
};

// Mascaramento com TEXTO FIXO: backreference no substituto (\0/\1) reinsere o texto casado e
// e assim que um segredo sai por extenso num log (09/11, duas vezes).
let SEGREDO = '';
const mascara = (s) => String(s)
  .replace(/(ghp|github_pat|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}/g, 'REDACTED')
  .replace(/\/\/[^@\s/]*@/g, '//REDACTED@')
  .replace(/password=[^\n]*/g, 'password=REDACTED')
  .split(SEGREDO || '\n\0\0').join('REDACTED')
  .replace(/\s+$/, '');

const cego = (motivo) => { console.log(`INSTRUMENTO CEGO: ${motivo}`); process.exit(1); };

if (!fs.existsSync(TOKEN_FILE)) cego(`nao ha ficheiro de token em ${TOKEN_FILE} — escreve-o tu (passo 4 do plano no doc) e corre de novo`);
const cru = fs.readFileSync(TOKEN_FILE, 'utf8');
if (/\r?\n/.test(cru.trim())) cego(`${TOKEN_FILE} tem mais do que uma linha — espera-se o token sozinho`);
const token = cru.trim();
if (token.length < 32) cego(`token de len=${token.length} em ${TOKEN_FILE} — curto demais para ser um PAT valido (colagem partida?)`);
SEGREDO = token;
const tipo = token.startsWith('github_pat_') ? 'fine-grained' : token.startsWith('ghp_') ? 'classico' : 'desconhecido';
if (tipo === 'desconhecido') cego(`o conteudo de ${TOKEN_FILE} nao comeca por github_pat_ nem ghp_ — nao e um PAT, nao vou escrever isto no credential manager`);
console.log(`ficheiro: ${TOKEN_FILE} | tipo=${tipo} | len=${token.length} | md5=${md5(token)}`);

if (tipo === 'classico') console.log('aviso: este e um PAT CLASSICO (todo o account). O plano pede fine-grained com Contents RW so no repo.');

const url = roda(['config', '--get', 'remote.origin.url']).out.trim();
if (!url) cego('o repo nao tem remote.origin.url');
if (!url.startsWith('https://')) cego(`remoto nao e HTTPS (${mascara(url)}) — este instalador so cobre a cadeia HTTPS + GCM`);
const u = new URL(url);
if (u.username) cego('o URL do remoto traz credencial embutida — e o P0 outra vez; corre scripts/seg-p0-clean-remote.mjs primeiro');
const HOST = u.hostname;
const OWNER = u.pathname.split('/').filter(Boolean)[0];
if (!OWNER) cego(`nao ha dono no path do remoto (${mascara(url)}) — o username nao e derivavel`);
console.log(`remoto: ${mascara(url)} | host=${HOST} | username=${OWNER} (derivados, nao digitados)`);

const payload = `protocol=https\nhost=${HOST}\nusername=${OWNER}\npassword=${token}\n\n`;

if (DRY) {
  console.log('dry-run: nada escrito no credential manager. payload que seria enviado:');
  for (const linha of payload.split('\n').filter(Boolean)) console.log(`  ${mascara(linha)}`);
  console.log('  (terminado por linha em branco)');
  console.log('PROVA: nao ha `git credential fill` aqui — o GCM escreve para a consola, nao para o');
  console.log('stderr capturado, e um falho dele e lido como "nao ha credencial" tambem quando ha.');
  console.log('DRY RUN OK — os predicados passaram e nenhum ficheiro foi tocado');
  process.exit(0);
}

console.log('\n### escrever no credential manager (git credential approve por stdin)');
const ap = roda(['credential', 'approve'], { input: payload });
console.log(mascara(ap.out) || '(silencioso)');
console.log(`approve exit=${ap.code}`);
if (ap.code !== 0) cego('o git credential approve falhou — a credencial pode nao ter ficado guardada');

console.log('\n### conferir (somente leitura)');
const lr = roda(['ls-remote', 'origin']);
console.log(mascara(lr.out).split('\n').slice(0, 5).join('\n') || '(sem saida)');
console.log(`ls-remote exit=${lr.code}`);
if (lr.code !== 0) {
  console.log('CREDENCIAL FALHA — o ls-remote continua sem autorizacao. Motivos possiveis: token sem Contents:write no repo, token revogado, ou o GCM ignorou a entrada.');
  process.exit(1);
}

const head = roda(['rev-parse', '--short', 'HEAD']).out.trim();
const tracking = roda(['rev-parse', '--short', '--verify', 'origin/main']).out.trim();
const n = roda(['rev-list', '--count', 'origin/main..HEAD']).out.trim();
console.log(`\nHEAD=${head} | origin/main (ref local, ainda nao actualizado)=${tracking} | por empurrar=${n}`);
console.log('CREDENCIAL OK — o push esta destravado. NAO foi corrido nenhum push.');
