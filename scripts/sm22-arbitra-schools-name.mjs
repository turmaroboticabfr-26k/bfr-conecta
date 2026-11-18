#!/usr/bin/env node
// SM-22 (peca 18, SOMENTE LEITURA): arbitra a divergencia entre a peca 17 e a peca 16c.
// A 17, olhando 900 caracteres para tras de cada `schools(name)`, diz que as duas Occorrencias estao
// em chamadas de `classes`; a 16c, pareando `from('X').select('Y')`, diz que duas chamadas de
// `supervision_requests` tem `schools(name)` no select. As duas afirmacoes nao podem ser verdadeiras
// com duas ocorrencias no ficheiro. A unica saida e imprimir o texto dos pares, nao mais uma
// contagem: aqui ve-se cada par (origem, select) encontrado e a posicao de cada `schools(name)`.
const { existsSync, readFileSync, writeFileSync } = await import('node:fs');
const { join } = await import('node:path');
const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const OUT = join(REPO, 'evidence/sm22-arbitra-schools-name-18-11b.json');
if (existsSync(OUT)) throw new Error(`ABORTA: ${OUT} existe`);
const alvo = (/https:\/\/[a-z0-9.-]+\.workers\.dev/i.exec(readFileSync(join(REPO, 'audit-publicacao-v134.json'), 'utf8')) || [])[0];
const shell = await (await fetch(alvo + '/', { headers: { 'cache-control': 'no-cache' } })).text();
if (shell.length < 100000) throw new Error('ABORTA: shell curto demais para ser o bundle');

// o par (origem, select) e ajeita com a bandeira `d`, que da os INDICES de cada grupo: assim o
// intervalo do `select` e medido, nao estimado com uma janela à volta como na peca 17
const PARES = /from\(\s*['"]([a-z_][a-z0-9_]*)['"]\s*\)(?:\.select\(\s*['"`]([^'"`]*)['"`])?/gd;
const pares = [];
for (const x of shell.matchAll(PARES)) {
  const [, , selIdx] = x.indices;
  pares.push({ de: x[1], select: x[2] || '', offset: x.index,
    select_inicio: selIdx ? selIdx[0] : null, select_fim: selIdx ? selIdx[1] : null });
}
const deSup = pares.filter((p) => p.de === 'supervision_requests');
const deClasses = pares.filter((p) => p.de === 'classes');
const posicoes = [...shell.matchAll(/(?<![a-z0-9_])schools\(name\)/g)].map((x) => x.index);
// para cada ocorrencia, o par cujo INTERVALO DE SELECT a contem — a resposta nao depende de janela
const contexto_de_cada = posicoes.map((pos) => {
  const queContem = pares.filter((p) => p.select_inicio !== null && pos >= p.select_inicio && pos < p.select_fim);
  return { offset: pos, dentro_do_select_de: queContem.map((p) => `${p.de}@${p.offset}`),
    trecho: shell.slice(pos - 160, pos + 40).replace(/\s+/g, ' ') };
});
// A primeira versao desta peca comparava as duas reguas com `.includes('schools(name)')`, que e
// substring: `sports_schools(name)` contem-lhe a chave e por isso a contagem de `supervision_requests`
// era 3 e `as_duas_reguas_dizem_o_mesmo` saia `false` SEMPRE, fosse qual fosse o banco. A regua boa e a
// com fronteira (nada de [a-z0-9_] antes); a cega fica no artefacto, ao lado, como fixture do defeito.
const temNaked = (s) => /(?<![a-z0-9_])schools\(name\)/.test(s);
const classesComNaked = deClasses.filter((p) => temNaked(p.select));
const supComNaked = deSup.filter((p) => temNaked(p.select));
const supComNaked_cega = deSup.filter((p) => p.select.includes('schools(name)'));
const origensDasPosicoes = [...new Set(contexto_de_cada.flatMap((c) => c.dentro_do_select_de.map((s) => s.split('@')[0])))].sort();
const origensDosPares = [...new Set(pares.filter((p) => temNaked(p.select)).map((p) => p.de))].sort();
const out = { em: new Date().toISOString(),
  metodo: 'GET do shell; indices exatos do grupo `select` (bandeira d); zero escrita',
  n_pares_from_select: pares.length, n_supervision_requests: deSup.length, n_classes: deClasses.length,
  supervision_requests: deSup, classes_com_schools: classesComNaked,
  posicoes_schools_name: posicoes, contexto_de_cada,
  // as duas reguas tem de convergir sobre a MESMA origem e nenhuma delas pode nomear
  // `supervision_requests`: e isso que fecha o PEN-31 sem reabrir o PEN-28.
  regua_das_posicoes: origensDasPosicoes, regua_dos_pares: origensDosPares,
  regua_cega_includes_supervision: supComNaked_cega.length, regua_com_fronteira_supervision: supComNaked.length,
  as_duas_reguas_dizem_o_mesmo: origensDasPosicoes.join() === origensDosPares.join() && !origensDasPosicoes.includes('supervision_requests') };
if (!out.as_duas_reguas_dizem_o_mesmo) throw new Error(`ABORTA: a regua das posicoes [${origensDasPosicoes}] e a dos pares [${origensDosPares}] nao convergem, ou nomeiam supervision_requests — esta peca nao arbitra nada e nenhuma cifra vai para a auditoria`);
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`pares from().select() no shell: ${pares.length} | supervision_requests=${deSup.length} classes=${deClasses.length}`);
for (const p of deSup) console.log(`  supervision_requests select=${JSON.stringify(p.select).slice(0, 220)}`);
for (const p of classesComNaked) console.log(`  classes select=${JSON.stringify(p.select).slice(0, 220)}`);
for (const c of contexto_de_cada) console.log(`  ocorrencia @${c.offset}: dentro_de=[${c.dentro_do_select_de.join(', ')}] …${c.trecho}`);
console.log(`reguas: posicoes=[${origensDasPosicoes}] pares=[${origensDosPares}] | cega_includes_supervision=${supComNaked_cega.length} com_fronteira_supervision=${supComNaked.length} | as duas reguas dizem o mesmo: ${out.as_duas_reguas_dizem_o_mesmo}`);
console.log(`SM22_ARBITRA_OK · ${OUT}`);
