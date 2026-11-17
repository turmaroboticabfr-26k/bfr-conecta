// A varredura mobile mede o que um dedo alcança; este programa responde ao «porque» sem abrir browser.
// Causa provada até agora em leitura de código: #71-92 de app/bfr-responsive-presentation.js constrói a
// gaveta a partir dos nós `#appShell .sidebar .nav-item[data-section]:not(.hidden)` — logo uma seção que o
// mapa de acessos concede ao papel, mas que não tem botão na sidebar do HTML servido, não tem porta no
// telemóvel. E o caminho inverso também acontece: botão há, mapa não concede. Isto confirma as duas
// direções contra os bytes realmente servidos (não contra o index.html local, que tem outro md5).
// Só-leitura: 0 escrita, 0 DDL, 0 deploy, 0 browser. Uso: node scripts/ah2-causa-mapa.mjs <secao> [secao…]
import { createHash } from 'node:crypto';

const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const SECOES = process.argv.slice(2);
if (!SECOES.length) throw new Error('ABORTA: dizer que seções comparar');
const txt = await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' } })).text();
console.log('bytes servidos: ' + txt.length + '  md5: ' + createHash('md5').update(txt).digest('hex'));
// 1) o mapa de acessos por papel, lido dos mesmos bytes
const ini = txt.indexOf('roleSectionAccess = {');
if (ini === -1) throw new Error('ABORTA: roleSectionAccess não está nas bytes servidas');
const bloco = txt.slice(ini + 'roleSectionAccess = '.length, txt.indexOf('};', ini) + 1);
const MAPA = {};
for (const m of bloco.matchAll(/'?([a-z_]+)'?\s*:\s*\[([^\]]*)\]/g)) MAPA[m[1]] = [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]);
console.log('papéis no mapa: ' + Object.keys(MAPA).join(' '));
// 2) os botões de navegação que existem no markup, com o que os esconde
const botes = [...txt.matchAll(/<[^>]*data-section="([a-z0-9:_-]+)"[^>]*>/g)].map((m) => m[0]);
const porSecao = {};
for (const b of botes) { const s = b.match(/data-section="([a-z0-9:_-]+)"/)[1]; (porSecao[s] = porSecao[s] || []).push(b); }
for (const s of SECOES) {
  const donos = Object.entries(MAPA).filter(([, v]) => v.includes(s)).map(([k]) => k);
  const sem_mapa = Object.entries(MAPA).filter(([, v]) => !v.includes(s)).map(([k]) => k);
  const bs = porSecao[s] || [];
  console.log('\n=== ' + s + ' ===');
  console.log('  concedida a: ' + (donos.join(' ') || 'NINGUÉM no mapa'));
  console.log('  negada a:    ' + (sem_mapa.length === Object.keys(MAPA).length ? 'a todos os papéis do mapa' : sem_mapa.join(' ')));
  console.log('  botões no markup servido: ' + bs.length);
  bs.slice(0, 6).forEach((b) => console.log('    ' + b.replace(/\s+/g, ' ').slice(0, 190)));
  const ocultos = bs.filter((b) => /class="[^"]*\bhidden\b/.test(b) || /hidden(?=[\s>])/.test(b.replace(/data-[a-z-]+="[^"]*"/g, '')));
  console.log('  botões marcados hidden: ' + ocultos.length + (ocultos.length ? '  <-- é estes que a gaveta do telemóvel não vê (bfr-responsive-presentation.js:77)' : ''));
  // Vista associada: é o container `id` que o painel mede; se não existir nada com este nome, a rota cai vazia.
  const vistas = [...txt.matchAll(/id="([A-Za-z0-9_-]*(?:View|Panel|Section))"/g)].map((m) => m[1]);
  const provavel = vistas.filter((v) => v.toLowerCase().includes(s.split('-').slice(-1)[0].slice(0, 6).toLowerCase()));
  console.log('  vistas com nome aparentado: ' + (provavel.slice(0, 8).join(' ') || 'nenhuma'));
}
