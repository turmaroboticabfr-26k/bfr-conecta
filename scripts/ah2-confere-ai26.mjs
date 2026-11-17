// Antes de assinar §AI.26, os números que ele cita têm de sair do disco e não da memória: md5 por artefacto
// (hash não se compara por olho), o primeiro c>0 com o t_ms, e os campos que discriminam o chat-interno.
// Só-leitura. Uso: node scripts/ah2-confere-ai26.mjs
import { readFileSync } from 'node:fs';
const EV = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta/evidence';
const ROT = ['edschat390', 'edschat320', 'sec320', 'dev320', 'aee375', 'stu320'];
const md5 = new Map();
for (const r of ROT) {
  const ap = r.startsWith('eds') ? 'painel' : 'apoio';
  const j = JSON.parse(readFileSync(`${EV}/ah2-sonda-${ap}-tempo-${r}.json`, 'utf8'));
  const p = (j.serie || []).find((x) => x && x.c > 0);
  const s = j.serie || [];
  console.log(`${r}: ciclo=${j.ciclo} papel=${j.papel} rota=${j.rota ?? 'apoio'} painel=${j.painel ?? 'supportView'} md5=${j.md5_shell} n_am=${s.length}`);
  console.log(`   primeiro c>0: ${p ? p.c + ' c @ ' + p.t_ms_apos_toque + ' ms' : 'NENHUM'}`);
  console.log(`   ativa={${[...new Set(s.map((x) => x.ativa))].join('/')}} visivel={${[...new Set(s.map((x) => x.visivel))].join('/')}} oculto={${[...new Set(s.map((x) => x.oculto))].join('/')}} n_filhos={${[...new Set(s.map((x) => x.n_filhos))].join('/')}} html={${[...new Set(s.map((x) => x.html))].join('/')}}`);
  console.log(`   t 1º..últ = ${s[0]?.t_ms_apos_toque}..${s[s.length - 1]?.t_ms_apos_toque} ms · c_total_pagina 1º=${s[0]?.c_total_pagina ?? '-'} último=${s[s.length - 1]?.c_total_pagina ?? '-'} · exceções=${(j.erros_janela || []).length}`);
  const rede = (j.rede_janela || []);
  console.log(`   rede na janela: ${rede.length} pedido(s) → ${rede.map((x) => String(x.u).split('/')[2] + ':' + (x.st ?? x.erro)).join(', ') || 'nenhum'}`);
  console.log(`   veredito: ${String(j.veredito).slice(0, 190)}`);
  (md5.get(j.md5_shell) || md5.set(j.md5_shell, []).get(j.md5_shell)).push(r);
}
console.log('\nmd5 distintos: ' + [...md5.keys()].join(' | '));
for (const [k, v] of md5) console.log(`  ${k.split('').join(' ')}  (${v.length} artefactos: ${v.join(', ')})`);
