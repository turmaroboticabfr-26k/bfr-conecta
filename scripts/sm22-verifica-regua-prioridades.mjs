#!/usr/bin/env node
// SM.22 adenda, peca 22 — a régua que se corrigiu a si própria. O fecho `scripts/sm22-estado-final.mjs`
// deu 13 portões verdes e um deles (`prioridades_somam_37`) era falso: contava a coluna 4 de uma linha do
// ledger com `split("|")` cru, sem a prédica do produtor. A linha PEN-33 tem três pipes escapados (`\|`)
// dentro de um code span, pelo que o split cru lhe deu 6 células em vez de 5: a célula 4 deixou de ser a
// letra de prioridade e passou a ser um fragmento de prosa. O `M` perdeu um e o defeito ganhou um, e a
// SOMA continuou 37 — o portão ficou verde com o próprio defeito dentro do total. Esta peça mede o facto,
// corrige a régua, e prova que a régua corrigida tem poder de fogo contra fixtures compostos aqui.
// Só lê o INDICE (`git show`) e re-corre um leitor ja versionado; zero rede, zero escrita no banco.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta/';
const OUT = process.env.SM22_REGUA_OUT ? REPO + process.env.SM22_REGUA_OUT : REPO + 'evidence/sm22-regua-prioridades-18-11.json';
const ANTERIOR = 'evidence/sm22-estado-final-18-11-ANTERIOR-a-regua-de-prioridades-partia-pipes-escapados-e-somava-a-chave-de-prosa.json';
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — um fecho nao se escreve por cima');

const md5 = (b) => createHash('md5').update(b).digest('hex');
const git = (args) => execFileSync('git', args, { cwd: REPO, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
const BARRA = String.fromCharCode(92) + '|';
const ROW = /^\| PEN-\d+ \|/;

// As duas réguas sobre o MESMO texto, lido do índice.
const roadmap = git(['show', ':docs/roadmap-master.md']);
const rows = roadmap.split(/\r?\n/).filter((l) => ROW.test(l));

// Régua crua: exactamente a que o fecho defeituoso usou (scripts/sm22-estado-final.mjs:50).
const reguaCrua = (linhas) => {
  const prio = {};
  for (const l of linhas) { const c = l.split('|').map((x) => x.trim()); prio[c[4]] = (prio[c[4]] || 0) + 1; }
  return prio;
};
// Régua do produtor: copiada de scripts/ah1-cuenta-pen.mjs (des-escapa, exige 7 partes, só conta A/M/B).
const reguaProdutor = (linhas) => {
  const c = { A: 0, M: 0, B: 0 };
  const fora = [];
  for (const r of linhas) {
    const id = (r.match(/^\|\s*([A-Za-z0-9-]+)/) || ['', 'sem-id'])[1];
    const p = r.split(BARRA).join('@@').split('|');
    if (p.length !== 7) { fora.push(id + ' colunas=' + (p.length - 2)); continue; }
    const pri = p[4].trim();
    if (pri in c) c[pri]++; else fora.push(id + ' pri=[' + pri.slice(0, 20) + ']');
  }
  return { c, fora, soma: c.A + c.M + c.B };
};

const boas = reguaProdutor(rows);
const cruas = reguaCrua(rows);
const celulasBoasCertas = rows.filter((l) => l.split(BARRA).join('@@').split('|').length === 7).length;
const chavesCruasForaDeAMB = Object.keys(cruas).filter((k) => !['A', 'M', 'B'].includes(k));

// Eixo independente: o leitor versionado, como processo filho, sobre o disco. Para que a comparação valha,
// disco e índice têm de ser o mesmo bytes — mede-se o md5 dos dois lados.
const stdoutLeitor = execFileSync('node', ['scripts/ah1-cuenta-pen.mjs'], { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const m = /^linhas PEN:\s*(\d+).*?A\s*(\d+).*?M\s*(\d+).*?B\s*(\d+).*?soma\s*(\d+)/m.exec(stdoutLeitor);
const leitor = m ? { linhas: +m[1], A: +m[2], M: +m[3], B: +m[4], soma: +m[5] } : null;
const discoBytes = readFileSync(REPO + 'docs/roadmap-master.md');
const indiceBytes = Buffer.from(roadmap, 'utf8');

// Poder de fogo: dois fixtures compostos aqui, nenhum deles uma linha lembrada por mim.
const rotulo = 'ROTULO-DE-TESTE';
const fixEscapado = `| ${rotulo} | assunto com um pipe dentro de code span a${BARRA}b | X | M | Y |`;
const fixCruo = `| ${rotulo} | assunto com um pipe CRU a|b dentro da célula | X | B | Y |`;
const boaEsc = reguaProdutor([fixEscapado]);
const boaCru = reguaProdutor([fixCruo]);
const cruaEsc = reguaCrua([fixEscapado]);

// O vermelho preservado: lê-se o ANTERIOR do disco e mede-se que o portão verde saiu do defeito.
const ant = JSON.parse(readFileSync(REPO + ANTERIOR, 'utf8'));
const antPrio = ant.estado_do_documento.prioridades;
const antChavesFora = Object.keys(antPrio).filter((k) => !['A', 'M', 'B'].includes(k));
const antSoma = Object.values(antPrio).reduce((a, b) => a + b, 0);

// O fecho re-corrido com a régua corrigida (SM22_SUF=sm22b): a correçao prova-se por execuçao, nao por olho.
const FECHO_B = 'evidence/sm22-estado-final-18-11-sm22b.json';
if (!existsSync(REPO + FECHO_B)) throw new Error('ABORTA: falta ' + FECHO_B + ' — correr scripts/sm22-estado-final.mjs com SM22_SUF=sm22b');
const fechoB = JSON.parse(readFileSync(REPO + FECHO_B, 'utf8'));

const divergentes = rows.filter((l) => { const c = l.split('|').map((x) => x.trim()); const p = l.split(BARRA).join('@@').split('|').map((x) => x.trim()); return c[4] !== p[4]; })
  .map((l) => ({ linha: l.match(/^\| PEN-\d+/)[0], pela_regua_crua: l.split('|').map((x) => x.trim())[4].slice(0, 40), pela_regua_do_produtor: l.split(BARRA).join('@@').split('|').map((x) => x.trim())[4],
    colunas_cruas: l.split('|').length - 2, colunas_boas: l.split(BARRA).join('@@').split('|').length - 2, pipes_escapados_na_linha: l.split(BARRA).length - 1 }));

const falhas = [];
const g = (nome, cond, detalhe) => { if (!cond) falhas.push(`${nome}: ${detalhe}`); return { nome, verde: !!cond, detalhe }; };
const portoes = [
  g('uma_sozinha_linha_diverge', divergentes.length === 1, `${divergentes.length} linhas divergem`),
  g('a_divergente_e_pen33', divergentes[0] && divergentes[0].linha.trim() === '| PEN-33', JSON.stringify(divergentes.map((d) => d.linha.trim()))),
  g('a_regua_crua_le_prosa_onde_e_a_letra', divergentes[0] && divergentes[0].pela_regua_crua !== 'M' && divergentes[0].pela_regua_do_produtor === 'M', JSON.stringify(divergentes[0])),
  g('a_regua_crua_ganha_uma_coluna_por_pipe_escapado', divergentes[0] && divergentes[0].colunas_boas === 5
    && divergentes[0].colunas_cruas === 5 + divergentes[0].pipes_escapados_na_linha && divergentes[0].pipes_escapados_na_linha === 3,
  JSON.stringify(divergentes[0] && { cruas: divergentes[0].colunas_cruas, boas: divergentes[0].colunas_boas, escapados: divergentes[0].pipes_escapados_na_linha })),
  g('todas_as_linhas_tem_cinco_celulas_sob_a_predica', celulasBoasCertas === rows.length, `${celulasBoasCertas} de ${rows.length}`),
  g('nenhuma_linha_fora_de_forma', boas.fora.length === 0, boas.fora.join(' · ')),
  g('a_soma_das_boas_bate_com_as_linhas', boas.soma === rows.length, `${boas.soma} contra ${rows.length}`),
  g('bate_com_o_leitor_versionado', !!leitor && leitor.linhas === rows.length && leitor.A === boas.c.A && leitor.M === boas.c.M && leitor.B === boas.c.B && leitor.soma === boas.soma, JSON.stringify({ leitor, boas: boas.c, rows: rows.length })),
  g('indice_e_disco_sao_os_mesmos_bytes', md5(discoBytes) === md5(indiceBytes), `${md5(discoBytes)} vs ${md5(indiceBytes)}`),
  g('a_regua_boa_aceita_pipe_escapado', boaEsc.fora.length === 0 && boaEsc.c.M === 1, JSON.stringify(boaEsc)),
  g('a_regua_boa_rejeita_pipe_cruo', boaCru.fora.length === 1 && boaCru.c.B === 0, JSON.stringify(boaCru)),
  g('a_regua_crua_parte_a_linha_escapada', Object.keys(cruaEsc).length === 1 && !['A', 'M', 'B'].includes(Object.keys(cruaEsc)[0]), JSON.stringify(cruaEsc)),
  g('o_anterior_tinha_a_chave_de_prosa', antChavesFora.length === 1 && antPrio.M === 12 && antPrio[antChavesFora[0]] === 1, JSON.stringify({ M: antPrio.M, fora: antChavesFora.map((k) => k.slice(0, 30)), valor: antPrio[antChavesFora[0]] })),
  g('o_anterior_somava_37_apesar_do_defeito', antSoma === 37 && antPrio.A === 13 && antPrio.B === 11, `${antSoma} · A ${antPrio.A} · B ${antPrio.B}`),
  g('o_defeito_foi_preservado_e_nao_sobrescrito', !existsSync(REPO + 'evidence/sm22-estado-final-18-11.json') && existsSync(REPO + ANTERIOR), 'o canónico ainda existe ou o ANTERIOR falta'),
  g('o_anterior_registrou_o_portao_verde_defeituoso', ant.portoes.some((p) => p.nome === 'prioridades_somam_37' && p.verde === true), JSON.stringify(ant.portoes.map((p) => p.nome))),
  g('o_fecho_recorrido_com_a_regua_do_produtor_so_tem_A_M_B', fechoB.estado_do_documento.prioridades.A === 13 && fechoB.estado_do_documento.prioridades.M === 13
    && fechoB.estado_do_documento.prioridades.B === 11 && fechoB.estado_do_documento.linhas_fora_de_forma === 0
    && Object.keys(fechoB.estado_do_documento.prioridades).join('') === 'AMB' && fechoB.veredito === 'FECHO_MEDIDO',
  JSON.stringify({ prio: fechoB.estado_do_documento.prioridades, fora: fechoB.estado_do_documento.linhas_fora_de_forma, veredito: fechoB.veredito })),
];

const out = {
  em: new Date().toISOString(),
  metodo: 'leitura do INDICE (git show :docs/roadmap-master.md) + re-corrida de scripts/ah1-cuenta-pen.mjs como filho; zero rede; zero escrita no banco; nenhum segredo impresso',
  commit: git(['rev-parse', '--short', 'HEAD']).trim(),
  ledger_no_indice: { linhas: rows.length, unicas: [...new Set(rows.map((r) => r.match(/^\| (PEN-\d+)/)[1]))].length,
    maior: [...new Set(rows.map((r) => +r.match(/PEN-(\d+)/)[1]))].sort((a, b) => b - a)[0], prioridades_A_M_B: boas.c, soma: boas.soma, fora_de_forma: boas.fora.length },
  leitor_versionado: leitor,
  disco_contra_indice: { md5_disco: md5(discoBytes), md5_indice: md5(indiceBytes) },
  divergente: divergentes,
  regua_crua_sobre_o_ledger: { chaves_fora_de_A_M_B: chavesCruasForaDeAMB.length, A: cruas.A, M: cruas.M, B: cruas.B },
  regua_boa_no_crua_no_fixture: { escapado_aceito: boaEsc.c.M === 1 && boaEsc.fora.length === 0, cruo_rejeitado: boaCru.fora.length === 1, crua_parte_o_escapado: Object.keys(cruaEsc).length === 1 },
  anterior_preservado: { ficheiro: ANTERIOR, prioridades: antPrio, soma_das_chaves: antSoma, chaves_fora_de_A_M_B: antChavesFora.length, portao_no_fecho: 'prioridades_somam_37' },
  fecho_recorrido_com_a_regua_corrigida: { ficheiro: FECHO_B, linhas: fechoB.estado_do_documento.linhas_pen,
    prioridades: fechoB.estado_do_documento.prioridades, linhas_fora_de_forma: fechoB.estado_do_documento.linhas_fora_de_forma,
    veredito: fechoB.veredito, portoes_verdes: fechoB.portoes.filter((p) => p.verde).length, portoes: fechoB.portoes.length },
  portoes,
};
out.veredito = falhas.length === 0 ? 'REGUA_CORRIGIDA_E_PROVADA' : `VERMELHO: ${falhas.length}`;
out.falhas = falhas;
if (falhas.length) { const p = OUT.replace(/\.json$/, '-VERMELHO.json'); writeFileSync(p, JSON.stringify(out, null, 2) + '\n');
  for (const f of falhas) console.log('  ' + f); console.log(`SM22_REGUA_VERMELHO · registo ${p}`); process.exit(1); }
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
for (const p of out.portoes) console.log(`  portao ${p.nome}: ${p.verde ? 'VERDE' : 'VERMELHO'}`);
console.log(JSON.stringify({ ledger: out.ledger_no_indice.linhas, A: boas.c.A, M: boas.c.M, B: boas.c.B, leitor: out.leitor_versionado, divergentes: divergentes.length }, null, 1));
console.log(`SM22_REGUA_OK · registo ${OUT}`);
