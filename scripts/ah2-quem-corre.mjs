// A grelha §5 corre em condutores em paralelo e já houve duas confusões neste projecto por ler o estado
// pelos diários em vez de o medir: um condutor dado como morto estava vivo e um dado como vivo não existia.
// Este programa responde à pergunta «o que está a correr AGORA» por processo, não por memória: lista os
// node filhos do condutor e da varredura mobile, a porta CDP de cada Chrome e, por comparação, quem são os
// Chrome órfãos (porta escutada sem dono). Só-leitura: não mata nem lança nada.
// Uso: node scripts/ah2-quem-corre.mjs
import { spawnSync } from 'node:child_process';

const ps = (cmd) => String(spawnSync('powershell.exe', ['-NoProfile', '-Command', cmd], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).stdout || '');
// Passar o script por stdin evita que o bash asfixie as aspas antes de chegar ao PowerShell.
const nodes = ps("$OutputEncoding=[Text.Encoding]::UTF8; Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | ForEach-Object { \"$($_.ProcessId)|$($_.CommandLine)\" }");
const chromes = ps("$OutputEncoding=[Text.Encoding]::UTF8; Get-CimInstance Win32_Process -Filter \"Name='chrome.exe'\" | ForEach-Object { \"$($_.ProcessId)|$($_.CommandLine)\" }");
const donos = new Map();
for (const l of nodes.split(/\r?\n/)) {
  const i = l.indexOf('|'); if (i < 0) continue;
  const pid = l.slice(0, i).trim(); const c = l.slice(i + 1);
  const d = /ah2-m5-driver\.mjs\s+(\d+)\s+(\S*)\s*(\d*)/.exec(c);
  if (d) donos.set('driver ' + pid, { pid, orcamento: d[1], papeis: d[2], porta: d[3] || '9381' });
  else if (/ah2-mobile2\.mjs/.test(c)) {
    const m = /ah2-mobile2\.mjs\s+(\S+)\s+(\S+)\s+(\S+)/.exec(c);
    if (m) donos.set('filho ' + pid, { pid, papel: m[1], larguras: m[2], rotulo: m[3], porta: (/\bAH2_PORT=(\d+)/.exec(c) || [])[1] || '?' });
  } else if (/chrome/.test(c)) { /* não é nosso */ }
}
const escutando = [];
for (const l of chromes.split(/\r?\n/)) {
  const i = l.indexOf('|'); if (i < 0) continue;
  const pid = l.slice(0, i).trim(); const c = l.slice(i + 1);
  const p = /--remote-debugging-port=(\d+)/.exec(c);
  if (p) escutando.push({ pid, porta: +p[1], perfil: (/--user-data-dir=("[^"]*"|\S+)/.exec(c) || [])[1] });
}
// Um Chrome é «nosso» quando o directório de perfil dele traz o rótulo de uma varredura viva. Isto não é
// cosmética: a versão anterior só comparava portas, e como AH2_PORT vai no ambiente (não no argv) o port
// do filho saía '?' e TODOS os Chrome vivos eram dados como órfãos — um receita para matar por PID um
// browser que está a medir uma banda da grelha.
const portasComDono = new Set([...donos.values()].map((d) => d.porta).filter((x) => /^\d+$/.test(x)).map(Number));
const rotulosVivos = [...donos.values()].map((d) => d.rotulo).filter(Boolean);
const dono_de = (e) => (portasComDono.has(e.porta) ? 'porta' : rotulosVivos.find((r) => (e.perfil || '').includes(r)) ? 'rotulo ' + rotulosVivos.find((r) => (e.perfil || '').includes(r)) : null);
console.log('CONDUTORES E FILHOS VIVOS');
if (!donos.size) console.log('  (nenhum processo de condutor/varredura mobile — a grelha parou)');
for (const [k, d] of donos) console.log('  ' + k + ': ' + JSON.stringify(d));
console.log('CHROME COM PORTA CDP: ' + escutando.length);
for (const e of escutando) { const d = dono_de(e); console.log(`  porta ${e.porta} pid ${e.pid} ${d ? `[${d}]` : '(SEM DONO CONHECIDO = órfão)'} perfil=${e.perfil || '?'}`); }
console.log('PORTAS ESCUTADAS SEM DONO: ' + (escutando.filter((e) => !dono_de(e)).map((e) => e.porta).join('/') || 'nenhuma'));
