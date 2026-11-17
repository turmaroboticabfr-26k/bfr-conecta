// Porque este programa existe: §AI.19 ponto 5 ficou com uma única célula que o mecanismo não explicava —
// `direcao@developer` está no `roleSectionAccess` do papel e mesmo assim o marcador fica em `administracao`
// nas 6 larguras. As outras 14 são «fora do mapa», esta é «dentro do mapa e não marca». Este programa não
// abre browser e não escreve em base: vai buscar os BYTES SERVIDOS (mesmo `fetch` e mesmo recorte de regex
// do instrumento ah2-mobile2) e responde a três perguntas concretas — (1) `direcao` está na lista do `admin`?
// (2) existe um `button[data-section="direcao"]` nos bytes servidos? (3) que código toca em `direcao` e o
// que é que esse código faz com a sidebar. A hipótese que quero poder falsificar é a de que o
// `syncActiveNavigation` não tem alvo para marcar e deixa ficar o valor anterior.
// Uso: node scripts/ah2-m5-direcao-developer.mjs
import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const OUT = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta/evidence/ah2-m5-direcao-developer-v1.json';
const txt = await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' } })).text();
const md5 = createHash('md5').update(txt).digest('hex');

const ini = txt.indexOf('roleSectionAccess = {');
if (ini === -1) throw new Error('ABORTA: roleSectionAccess não está nas bytes servidas — o mapa mudou de forma');
const bloco = txt.slice(ini + 'roleSectionAccess = '.length, txt.indexOf('};', ini) + 1);
const MAPA = {};
for (const m of bloco.matchAll(/'?([a-z_]+)'?\s*:\s*\[([^\]]*)\]/g)) MAPA[m[1]] = [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]);

// (2)-porta declarada: botões com data-section no shell servido, e os seus rótulos quando legíveis.
const botoes = [...txt.matchAll(/data-section="([a-z0-9\-]+)"/g)].map((m) => m[1]);
const unicos = [...new Set(botoes)].sort();

// (3) quem menciona `direcao` no script servido: janela de ±140 caracteres à volta de cada ocorrência, para
//     se poder ler o contexto sem depender de eu adivinhar a função.
const ocorrencias = [];
for (const m of txt.matchAll(/direcao/g)) {
  const a = Math.max(0, m.index - 140), b = Math.min(txt.length, m.index + 160);
  ocorrencias.push({ offset: m.index, trecho: txt.slice(a, b).replace(/\s+/g, ' ') });
}

// syncActiveNavigation: como é que ele escolhe o item a marcar, e o que faz quando não encontra.
const sna = txt.indexOf('function syncActiveNavigation');
const sna_txt = sna === -1 ? null : txt.slice(sna, sna + 900);
const saida = {
  ciclo: 'AH-M5-DIRECAO-DEVELOPER', em: new Date().toISOString(), md5_shell: md5, bytes: txt.length,
  mapa_admin: MAPA.admin || null, mapa_director: MAPA.director || null,
  direcao_na_lista_admin: !!(MAPA.admin || []).includes('direcao'),
  botoes_data_section: unicos,
  ha_botao_direcao: unicos.includes('direcao'),
  ha_botao_administracao: unicos.includes('administracao'),
  syncActiveNavigation: sna_txt,
  ocorrencias_direcao: ocorrencias.slice(0, 40),
  n_ocorrencias_direcao: ocorrencias.length,
};
writeFileSync(OUT, JSON.stringify(saida, null, 2) + '\n');
console.log(`md5=${md5.slice(0, 12)} · direcao na lista admin=${saida.direcao_na_lista_admin} · botão data-section="direcao"=${saida.ha_botao_direcao} · ocorrências de 'direcao'=${saida.n_ocorrencias_direcao}`);
console.log('mapa.admin =', JSON.stringify(saida.mapa_admin));
console.log('botões:', unicos.join(' '));
if (saida.syncActiveNavigation) console.log('\nsyncActiveNavigation:\n' + saida.syncActiveNavigation.replace(/\s+/g, ' ').slice(0, 700));
console.log('\nOCORRÊNCIAS DE direcao:');
for (const o of saida.ocorrencias_direcao) console.log(`  @${o.offset}  ${o.trecho.slice(0, 220)}`);
console.log('\nESCRITO: ' + OUT.split('/').pop());
