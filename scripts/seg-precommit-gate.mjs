// Portao pre-commit: nenhum segredo entra no versionamento.
// Le os ficheiros passados por argumento (ou os staged, se vierem por --staged).
// Cobertura por camada:
//   A  credencial de servidor — PAT do GitHub, JWT service_role, chave privada PEM
//   B  segredo de utilizador — senha hardcoded do corpus, token opaco em chave nomeada,
//      JWT de sessao (role que nao e anon nem service_role), cabecalho Bearer com token
//   C  chave publica de cliente — JWT role=anon: conta, nao bloqueia
// Binario nao escaneavel (PNG, PDF, zip) fica marcado NAO COBERTO e bloqueia ate o humano
// passar --ack-binario depois de ver o ficheiro: dar OK sobre o que nao se leu foi o erro da
// primeira versao deste portao (corpus vazio) e nao se quer que volte por outro caminho.
// Imprime apenas contagens, comprimentos e caminhos — nunca o valor.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const REPO = new URL('..', import.meta.url).pathname.replace(/^\//, '');
const md5 = (s) => crypto.createHash('md5').update(s).digest('hex');
const GIT = (args) => execFileSync('git', args, { cwd: REPO, encoding: 'utf8' });

const staged = process.argv.includes('--staged');
const ackBin = process.argv.includes('--ack-binario');
const files = staged
  ? GIT(['diff', '--cached', '--name-only', '--diff-filter=ACM']).split('\n').filter(Boolean)
  : process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!files.length) { console.log('INSTRUMENTO CEGO: nenhum ficheiro para verificar'); process.exit(1); }

const PAT = /(?:ghp|github_pat|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}/g;
const JWT = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/g;
const PEM = /-----BEGIN [A-Z ]*PRIVATE KEY-----/g;
const BEARER = /\bBearer\s+["']?([A-Za-z0-9._~+/=-]{16,})/gi;
const BIN_EXT = /\.(png|jpe?g|gif|webp|ico|bmp|pdf|zip|gz|tar|7z|woff2?|ttf|otf|mp4|webm|xlsx|docx|pptx)$/i;

// Nome de chave que pertence a camada B. De proposito FORA disto ficam as chaves de cliente
// publicaveis (anon key, publishable key): sao tier C e bloqueariam cada commit do index.html.
// "secretary" contem "secret" e "secretary_uid" e o uid de uma conta, nao um segredo — por isso
// a palavra da casa das secretarias e retirada antes de testar (medido na varredura de 445
// ficheiros trackados: era o unico falso positivo por nome).
const NOME_SUSPEITO = /(?:token|secret|credential|authorization|passw|apikey|api_key)/i;
const suspeito = (k) => NOME_SUSPEITO.test(String(k).replace(/secretar[a-z]*/gi, ''));
// E o valor tem de ter ALFABETO de credencial: os unicos falsos positivos restantes na mesma
// varredura eram prosa em `authorization`/`credential` (186 e 103 caracteres com espacos).
const FORMA_CREDENCIAL = /^[A-Za-z0-9._~+/=-]{16,}$/;
// Literal de codigo: `refreshToken: '…'`, `ACCESS_TOKEN = '…'` com valor de aspecto opaco.
const TIERB_LITERAL = new RegExp(
  String.raw`\b([A-Za-z_][A-Za-z0-9_]*(?:token|secret|credential|authorization|passw)[A-Za-z0-9_]*)\s*[:=]\s*["']([A-Za-z0-9._~+/=-]{16,})["']`,
  'gi'
);

const claims = (jwt) => {
  try { return JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString()); } catch { return null; }
};

// O corpus de senhas hardcoded NAO vem dos *-sessions.json (la a chave weak_password e null):
// vem dos proprios scripts que mintam as contas sinteticas, no literal `password: '...'`.
const CORPUS_RX = /password\s*[:=]\s*["']([^"'\n]{6,})["']/gi;
const harvest = (dir, depth) => {
  if (depth < 0 || !fs.existsSync(dir)) return [];
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...harvest(p, depth - 1));
    else if (/\.(mjs|js|sql|md|json)$/.test(e.name)) {
      // um literal com ${...} e interpolacao de codigo (ex.: encrypted_password='${hash}'),
      // nao uma senha em claro; contava como senha e o portao bloqueava o proprio script.
      out.push(...[...fs.readFileSync(p, 'utf8').matchAll(CORPUS_RX)].map((m) => m[1]).filter((s) => !s.includes('${')));
    }
  }
  return out;
};
const senhasConhecidas = new Map([...new Set(harvest(REPO, 3))].map((s) => [md5(s), s.length]));
if (!senhasConhecidas.size) {
  console.log('INSTRUMENTO CEGO: corpus de senhas vazio — a verificacao de senha nao prova nada');
  process.exit(1);
}

let falha = 0, lidos = 0, naoCobertos = 0;
for (const rel of files) {
  const p = path.isAbsolute(rel) ? rel : path.join(REPO, rel);
  if (!fs.existsSync(p)) {
    console.log(`  ${rel}: INEXISTENTE — FALHA ALTA (o portao nao pode dar OK sobre o que nao leu)`);
    falha = 1; continue;
  }
  lidos++;
  const buf = fs.readFileSync(p);
  const bin = BIN_EXT.test(rel) || buf.subarray(0, 8192).includes(0);
  if (bin) {
    naoCobertos++;
    console.log(`  ${rel}: BINARIO ${buf.length} B — NAO COBERTO (texto nao escaneavel; ver o ficheiro e passar --ack-binario)`);
    if (!ackBin) falha = 1;
  }
  const txt = buf.toString('latin1');

  const pats = [...txt.matchAll(PAT)].length;
  const pem = [...txt.matchAll(PEM)].length;
  const roles = [...txt.matchAll(JWT)].map((m) => claims(m[0])).filter(Boolean).map((c) => c.role || '(sem-role)');
  const svc = roles.filter((r) => r === 'service_role').length;
  const anon = roles.filter((r) => r === 'anon').length;
  const jwtSessao = roles.length - svc - anon;

  const tierB = [];
  if (rel.endsWith('.json')) {
    let doc = null;
    try { doc = JSON.parse(txt); } catch { console.log(`  ${rel}: JSON INVALIDO — a analise estrutural tier-B nao cobre`); }
    if (doc !== null) {
      const walk = (o, chave, onde) => {
        if (Array.isArray(o)) { for (const v of o) walk(v, chave, `${onde}[]`); return; }
        if (o && typeof o === 'object') {
          for (const [k, v] of Object.entries(o)) walk(v, k, `${onde}.${k}`);
          return;
        }
        if (suspeito(chave) && FORMA_CREDENCIAL.test(String(o))) {
          tierB.push(`chave "${chave}" len ${o.length} @${onde}`);
        }
      };
      walk(doc, '', '$');
    }
  }
  for (const [, nome, valor] of txt.matchAll(TIERB_LITERAL)) tierB.push(`literal ${nome} len ${valor.length}`);
  for (const [, valor] of txt.matchAll(BEARER)) {
    if (valor.startsWith('eyJ')) { const c = claims(valor); if (c && c.role === 'anon') continue; }
    tierB.push(`Bearer len ${valor.length}`);
  }

  const literais = [...txt.matchAll(/["']([^"'\n]{6,80})["']/g)].map((m) => m[1]);
  const hits = literais.filter((l) => senhasConhecidas.has(md5(l))).length;

  const ok = pats === 0 && svc === 0 && pem === 0 && hits === 0 && tierB.length === 0 && (!bin || ackBin);
  if (!ok) falha = 1;
  console.log(`  ${rel}: PAT=${pats} service_role-JWT=${svc} PEM=${pem} senha-conhecida=${hits} ` +
    `tier-B=${tierB.length} JWT-sessao=${jwtSessao} anon-JWT=${anon} ${ok ? 'OK' : '<<< BLOQUEIA'}`);
  for (const t of tierB.slice(0, 10)) console.log(`      ${t}`);
  if (tierB.length > 10) console.log(`      (+${tierB.length - 10} ocorrencias tier-B nao listadas)`);
}
console.log(`senhas no corpus: ${senhasConhecidas.size} (comprimentos ${[...senhasConhecidas.values()].sort((a, b) => a - b).join('/')}) | ficheiros lidos: ${lidos}/${files.length} | binarios nao cobertos: ${naoCobertos}`);
if (!lidos) { console.log('INSTRUMENTO CEGO: nenhum ficheiro foi lido'); process.exit(1); }
if (naoCobertos && ackBin) console.log('NOTA: os binarios foram confirmados por humano (--ack-binario), nao por este portao.');
console.log(falha ? 'PORTAO PRE-COMMIT FALHA — ha segredo ou cobertura em falta' : 'PORTAO PRE-COMMIT OK — zero credenciais nas camadas A, B e C');
process.exit(falha);
