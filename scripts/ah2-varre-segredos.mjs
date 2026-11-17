// Um commit local não se assina sem saber o que vai dentro. Este programa percorre a lista de caminhos
// passada, lê os ficheiros de texto e classifica o que encontra por FORMA (JWT de três segmentos, chave
// anónima atribuída a uma variável, par `refresh_token` com valor, credencial no URL) e diz onde cada forma
// está — porque «0 ocorrências» dito de memória é uma afirmação minha, e dito por um varrimento é um medida.
// Não escreve nada e não imprime o valor: só o prefixo de 6 caracteres, que chega para identificar a classe
// sem pôr um segredo no stdout (que fica em ficheiros de log desta sessão).
// Uso: node scripts/ah2-varre-segredos.mjs <caminho/para/lista> [max_ficheiros]
import { readFileSync, existsSync, statSync } from 'node:fs';

const LISTA = process.argv[2];
const MAX = parseInt(process.argv[3] || '400', 10);
if (!LISTA || !existsSync(LISTA)) throw new Error('ABORTA: preciso de uma lista de caminhos: node scripts/ah2-varre-segredos.mjs <lista> [max]');
const caminhos = readFileSync(LISTA, 'utf8').split(/\r?\n/).map((x) => x.trim().replace(/\/$/, '')).filter(Boolean);
const FORMAS = [
  ['jwt_tres_segmentos', /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g],
  ['refresh_token_com_valor', /"refresh_token"\s*:\s*"[A-Za-z0-9_-]{16,}"/g],
  ['access_token_com_valor', /"access_token"\s*:\s*"ey[A-Za-z0-9_-]{16,}"/g],
  ['chave_anon_atribuida', /SUPABASE_PUBLISHABLE_KEY\s*=\s*["'`][A-Za-z0-9_-]{20,}["'`]/g],
  ['credencial_no_url', /\b[a-z][a-z0-9+.-]*:\/\/[^\s/"'@]+:[^\s/"'@]+@/gi],
  ['storage_key_com_valor', /sb-[a-z0-9]{20,}-auth-token["'`]?\s*[:=]\s*["'`]{[^}]{40,}/g]
];
const achados = {};
let lidos = 0, ignorados_binarios = 0, erros = 0;
for (const c of caminhos.slice(0, MAX)) {
  let st; try { st = statSync(c); } catch { erros++; continue; }
  if (!st.isFile()) { continue; }
  if (st.size > 12 * 1024 * 1024) { ignorados_binarios++; continue; }
  let t; try { t = readFileSync(c, 'utf8'); } catch { erros++; continue; }
  if (t.includes('\u0000')) { ignorados_binarios++; continue; }
  lidos++;
  for (const [nome, re] of FORMAS) {
    const m = t.match(re);
    if (!m) continue;
    (achados[nome] = achados[nome] || []).push({ ficheiro: c, n: m.length, amostra: m[0].slice(0, 6) + '…' });
  }
}
console.log('VARRIDO: ' + lidos + ' ficheiros de texto · ' + ignorados_binarios + ' binários/grandes · ' + erros + ' illegíveis');
for (const [nome, lista] of Object.entries(achados)) {
  console.log('\n' + nome + ': ' + lista.reduce((a, x) => a + x.n, 0) + ' ocorrências em ' + lista.length + ' ficheiro(s)');
  for (const x of lista.slice(0, 8)) console.log('  ' + x.ficheiro + '  (' + x.n + ', começa por ' + x.amostra + ')');
  if (lista.length > 8) console.log('  … ' + (lista.length - 8) + ' ficheiros mais');
}
console.log('\nVEREDITO: ' + (Object.keys(achados).length ? 'HA_SEGREDO_EM ' + Object.keys(achados).join(',') : 'NENHUMA_FORMA_DE_CREDENCIAL'));
