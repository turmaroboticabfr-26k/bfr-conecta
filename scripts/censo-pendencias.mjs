// Censo SOMENTE LEITURA das linhas de tarefa do §13 do roadmap: quantas estão abertas e por quê.
import { readFileSync } from 'node:fs';
const DOC = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta/docs/roadmap-master.md';
const linhas = readFileSync(DOC, 'utf8').split('\n');
const ini = linhas.findIndex((l) => l.startsWith('## 13.'));
const fim = linhas.findIndex((l) => l.startsWith('## 14.'));
const celulas = [];
for (let i = ini; i < fim; i++) {
  const l = linhas[i];
  const m = l.match(/^\|\s*(RM-\d+\.\d+)\s*\|/);
  if (!m) continue;
  const celd = l.split('|').slice(1, -1).map((s) => s.trim());
  celulas.push({ id: m[1], tarefa: celd[1], status: celd[6] || '', criterio: celd[7] || '' });
}
const FECHADO = /FECHAD|APLICAD|PUBLICAD|CANCELAD|Cumprido|cumprido|ATENDIDO|Feito|feito/;
// PREDICADO CORRIGIDO 16/11 (§AF.6): a versão anterior tinha as alternativas de «parcial» em
// caixa fixa e não apanhava «Parcialmente feito», que é exactamente como o §13 escreve a RM-6.2.
// Contava 35 abertas quando havia 36 — erro de medição meu, medido e corrigido aqui.
const abertas = celulas.filter((c) => /pendente|aberto|parcial|bloqueado|não cumprido|icp|medido 12\/11 com achado/i.test(c.status) && !/^\*\*(FECHAD|APLICAD|PUBLICAD|CANCELAD)/.test(c.status));
console.log(`linhas RM-x.y no §13: ${celulas.length}`);
console.log(`abertas/parciais/bloqueadas por este predicado: ${abertas.length}`);
// Taxonomia de bloqueio, por sinais medidos no próprio texto da linha (não por opinião):
const BLOQUEIO = [
  ['_precisa_OK_de_publicação', /deploy|publicaç|publish|wrangler|versionId|version_id/i],
  ['_precisa_decisao_de_produto', /decidir|decisão|escolher|validar com|producto|produto|negocia/i],
  ['_precisa_aparelho_fisico', /aparelho|celular|dispositivo|push|notifica[çc]|hardware|tablet/i],
  ['_precisa_ddl_no_banco', /\bDDL\b|alter table|create index|migrat|constraint/i],
  ['_engenharia_de_codigo', /refator|implement|guarda| loader|catch|timer|corrigir|reescrever|candidata/i],
];
const tally = {};
for (const c of abertas) {
  const alvo = `${c.tarefa} ${c.status}`;
  const hits = BLOQUEIO.filter(([, re]) => re.test(alvo)).map(([n]) => n);
  c.bloqueios = hits.length ? hits : ['_engenharia_indefinida_no_texto'];
  for (const b of c.bloqueios) tally[b] = (tally[b] || 0) + 1;
}

for (const c of abertas) {
  const s = c.status.replace(/\s+/g, ' ');
  const tipo = /aparelho|físico|fisico|hardware|câmera|camera|crachá|cracha|telemóvel|piloto/.test(s + c.criterio) ? 'APARELHO/DECISAO-HUMANA'
    : /OK novo|OK literal|decisão|decisao|por provar|publicação/.test(s) ? 'PRECISA OK/DECISAO'
    : 'EXECUTAVEL POR MIM SE AUTORIZADO';
  console.log(`\n${c.id} [${tipo}]`);
  console.log(`  tarefa: ${c.tarefa.slice(0, 110)}`);
  console.log(`  status: ${s.slice(0, 260)}`);
  console.log(`  bloqueio: ${c.bloqueios.join(' + ')}`);
}
console.log('\n=== tally de bloqueios (uma linha pode ter mais de um) ===');
for (const [b, n] of Object.entries(tally).sort((x, y) => y[1] - x[1])) console.log(`  ${String(n).padStart(3)}  ${b}`);
console.log(`  ---\n  ${abertas.length} linhas abertas de ${celulas.length} RM no §13`);

