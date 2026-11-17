// Porque este programa existe: §AI.21 ponto 1 assinou que as três classes de credencial estavam «cobertas
// em todo o índice». Para saber se isso é verdade não basta correr o portão — é preciso medir o universo que
// ele lê e o que fica de fora, com a RÉGUA DELE e não uma que eu invente. (A primeira versão deste script
// punha um teto de «≤900 KiB e ≤64 linhas» que não existe no `portao-indice.mjs`, e daria um «983 ficheiros
// não lidos» falso: a régua real é a regex `BIN` e o `git show` falhar.) Cópia fiel de
// scripts/portao-indice.mjs:8-11, :49, :73-76.
// Três populações, cada uma com a sua culpa:
//   (1) `lidos`      = o universo do portão (1511 menos BIN menos illegíveis);
//   (2) `cegos`      = ficheiros LIDOS onde existe FORMA de credencial (padrão largo, meu) e os três
//       padrões do portão fazem 0 — aqui a discussão é o predicado;
//   (3) `fora`       = ficheiros que caem pelo `BIN` ou por `git show` falhar — aqui o predicado nem chega
//       a ser posto à prova.
// O padrão largo é voluntariamente mais largo que o do portão (nomes como `token`/`secret`/`bearer`, valores
// SEM aspas) porque serve para achar o que o portão não acha; ele não substitui a régua assinada. Valores
// nunca são impressos — só o nome do campo e a forma (`d` dígito, `h` hex), como em `ah2-forma-casos.mjs`.
// Só-leitura: `git ls-files -z` e `git show :ficheiro`. Não escreve em base, não faz DDL, não publica.
// Uso: node scripts/ah2-confere-portao-cegos.mjs [max_exemplos=8]
import { execFileSync } from 'node:child_process';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const MAXEX = parseInt(process.argv[2] || '8', 10);
const lista = execFileSync('git', ['ls-files', '-z'], { cwd: DIR, encoding: 'utf8' }).split('\0').filter(Boolean);

// Os três padrões do portão, transcritos (não reinventados) do programa que assina.
const JWT = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]*/g;
const SENHA = /(senha|password|passwd|chave)\s*["']?\s*[:=]\s*["']([^"`${}]{6,24})["']/gi;
const URLTOK = /[?&]token=([A-Za-z0-9_-]{20,})/g;
const BIN = /\.(pdf|png|jpe?g|gif|ico|webp|woff2?|ttf|zip|7z|jar|node)$/i;

// O meu padrão largo: nome de campo terminado nas palavras relevantes, valor citado OU NÃO, ≥12 caracteres.
const LARGO = /\b([A-Za-z0-9_-]*(?:anon_key|anonkey|api_key|apikey|service_role_key|access_token|refresh_token|session_token|bearer|token|jwt|secret|senha|password|passwd|chave))[A-Za-z0-9_-]*["']?\s*[:=]\s*["']?([A-Za-z0-9_.\-]{12,})["']?/gi;
const forma = (s) => s.replace(/[0-9]/g, 'd').replace(/[a-f]/gi, 'h').replace(/[g-zG-Z]/g, '·').slice(0, 26);

const lidos = [], fora_bin = [], fora_err = [];
for (const f of lista) {
  if (BIN.test(f)) { fora_bin.push(f); continue; }
  let t;
  try { t = execFileSync('git', ['show', ':' + f], { cwd: DIR, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); }
  catch { fora_err.push(f); continue; }
  const n_portao = (t.match(JWT) || []).length + (t.match(SENHA) || []).length + (t.match(URLTOK) || []).length;
  const largo = [...t.matchAll(LARGO)].map((m) => ({ campo: m[1], forma: forma(m[2]), citado: /^["']/.test(m[0].slice(m[1].length)) }));
  lidos.push({ f, largo, n_portao });
}
const com_forma = lidos.filter((x) => x.largo.length);
const cegos = com_forma.filter((x) => x.n_portao === 0);
const por_campo = {};
for (const x of com_forma) for (const c of x.largo) { const k = c.campo.replace(/[0-9_a-z-]*(?=_)/, '') + (c.citado ? ' (citado)' : ' (sem aspas)'); por_campo[k] = (por_campo[k] || 0) + 1; }

console.log(`UNIVERSO  ls_files=${lista.length}  lidos_pelo_portao=${lidos.length}  fora_por_BIN=${fora_bin.length}  fora_por_git_show_falhar=${fora_err.length}`);
console.log('FORA_BIN por extensao: ' + Object.entries(foras_bin_reduce()).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + '=' + v).join(' '));

console.log(`LARGO nos LIDOS: ${com_forma.length} ficheiros com forma de credencial, ${com_forma.reduce((a, x) => a + x.largo.length, 0)} ocorrências · em ${cegos.length} ficheiros os tres padroes do portao fazem 0`);
console.log('POR_CAMPO: ' + Object.entries(por_campo).sort((a, b) => b[1] - a[1]).slice(0, MAXEX).map(([k, v]) => k + ' ×' + v).join(' | '));
console.log('CEGOS_EXEMPLO: ' + cegos.slice(0, MAXEX).map((x) => x.f + ' [' + x.largo.length + ' formas · ' + x.largo.slice(0, 2).map((c) => c.campo + '→' + c.forma).join(', ') + ']').join(' | '));
console.log('ONDE_O_PORTAO_ACHA (os portadores assinados): ' + lidos.filter((x) => x.n_portao).map((x) => x.f + ' n=' + x.n_portao).join(' | '));

function foras_bin_reduce() { const a = {}; for (const f of fora_bin) { const e = (f.match(/\.[a-z0-9]+$/i) || ['(sem ext)'])[0].toLowerCase(); a[e] = (a[e] || 0) + 1; } return a; }
