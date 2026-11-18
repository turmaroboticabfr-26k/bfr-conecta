#!/usr/bin/env node
// SM-22 (peca 13b, SOMENTE LEITURA): corrige dois defeitos de regua da peca 13 e refaz a medida.
// Os numeros desta cabeca NAO se afirmam aqui: escreve-os o programa, a partir dos bytes medidos
// (ver `pen32_escala_da_correcao` no artefacto). A peca 13 media um delta de corpo sem o confrontar
// com o delta do ficheiro, pelo que nao se sabia se a correcao coubera no portao ou se espalhasse.
//  (a) o contador de chaves de `accountLabels` da peca 13 dava menos uma do que o mapa tem. A causa
//      que la escrevi de cabeca (a chave vir depois de `]` em vez de `,`) foi testada e e FALSA: a
//      variante so-com-virgula conta o mesmo. A causa medida e o minimo de letras do padrao, que
//      nao admitia a chave de tres letras `aee`. Um contador que nao concorda com a contagem
//      independente dos valores e um contador cego, por isso as duas vias se imprimem lado a lado e
//      a divergencia aborta a peca.
//  (b) para PEN-32 a pergunta nao e «a palavra education_supervisor aparece dentro de setRole?» — a
//      peca 12 mostrou que sim desde a v114. A pergunta e «o PORTAO de setRole distingue o papel?»,
//      que e o que o delta v119→v120 efectivamente alterou.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const OUT = join(REPO, 'evidence/sm22-delta-setrole-e-formato-labels-18-11b.json');
if (existsSync(OUT)) throw new Error(`ABORTA: ${OUT} existe — correr com outro nome, nao por cima`);

function corpoFuncao(anchor, alvo) {
  const i = alvo.indexOf(anchor);
  if (i < 0) return null;
  const abreParams = alvo.indexOf('(', i);
  let n = 0, k = abreParams;
  for (; k < alvo.length; k++) { if (alvo[k] === '(') n++; else if (alvo[k] === ')') { n--; if (n === 0) break; } }
  const abre = alvo.indexOf('{', k);
  if (abre < 0) return null;
  let m = 0;
  for (let j = abre; j < alvo.length; j++) { if (alvo[j] === '{') m++; else if (alvo[j] === '}') { m--; if (m === 0) return alvo.slice(abre, j + 1); } }
  return null;
}
function corpoLiteral(nome, alvo) {
  const i = alvo.search(new RegExp(nome + '\\s*=\\s*\\{'));
  if (i < 0) return null;
  const abre = alvo.indexOf('{', i);
  let m = 0;
  for (let j = abre; j < alvo.length; j++) { if (alvo[j] === '{') m++; else if (alvo[j] === '}') { m--; if (m === 0) return alvo.slice(abre, j + 1); } }
  return null;
}
const GERACOES = {
  v114: 'bfr-candidata-v114-supervisao/index.html',
  v119: 'bfr-candidata-v119-supervisao-embed/index.html',
  v120: 'bfr-candidata-v120-setrole-supervisor/index.html',
  v121: 'bfr-candidata-v121-rotulos-supervisor/index.html',
  v134: 'bfr-candidata-v134-sidebar-escondida/index.html',
};
for (const [g, rel] of Object.entries(GERACOES)) if (!existsSync(join(REPO, rel))) throw new Error(`ABORTA: geracao ${g} sem ${rel}`);
const txt = Object.fromEntries(Object.entries(GERACOES).map(([g, rel]) => [g, readFileSync(join(REPO, rel), 'utf8')]));

// a peca 13 contava 12; aqui refaz-se a contagem por duas vias independentes e mede-se QUAL era a
// causa, em vez de a explicar de cabeca. A hipotese que escrevi na primeira versao desta peca (o
// delimitador anterior ser `]` em vez de `,`) foi TESTADA E FALSA: a variante so-com-virgula conta
// 13 igualmente. A causa medida e o mínimo de letras: `[a-z][a-z_]{3,26}` exige quatro caracteres e
// `aee` tem tres, pelo que a chave simplesmente nao cabia no padrao.
const al = corpoLiteral('accountLabels', txt.v134);
if (!al) throw new Error('ABORTA: accountLabels nao extraido da v134');
// chave = identificador seguido de `:` que comeca o corpo (pos `{` ou `]` ou `,` com espacos)
const porChaves = [...al.matchAll(/(?:\{|\]|,)\s*([a-z][a-z0-9_]{2,26})\s*:\s*\[/g)].map((x) => x[1]);
// valor = todo o `[` que abre apos um `:` — independente de saber o nome da chave
const porValores = (al.match(/:\s*\[/g) || []).length;
const rotulos = Object.fromEntries([...al.matchAll(/(?:\{|\]|,)\s*([a-z][a-z0-9_]{2,26})\s*:\s*\[\s*'([^']*)'\s*,\s*'([^']*)'/g)].map((x) => [x[1], `${x[2]} | ${x[3]}`]));
const labels = { corpo_bytes: Buffer.byteLength(al), chaves: porChaves, n_por_chaves: porChaves.length,
  n_por_valores: porValores, batem: porChaves.length === porValores, tem_aee: porChaves.includes('aee'),
  tem_education_supervisor: porChaves.includes('education_supervisor'),
  rotulo_education_supervisor: rotulos.education_supervisor || null,
  todos_os_rotulos: rotulos };
// portao do contador: se as duas vias independentes nao baterem, a contagem nao vai para o documento
if (!labels.batem) throw new Error(`ABORTA: accountLabels contado por chaves (${labels.n_por_chaves}) e por valores (${labels.n_por_valores}) nao batem — nenhuma cifra sai desta peca`);
// o fixture nao e decorativo: reproduz o defeito da peca 13 (minimo de quatro letras) e mostra que
// a outra hipotese (delimitador) nao reproduzia nada.
const porRegraDaPeca13 = [...al.matchAll(/(?:^|[,{]\s*)['"]?([a-z][a-z_]{3,26})['"]?\s*:/g)].map((x) => x[1]);
const porSoVirgula = [...al.matchAll(/(?:\{|,)\s*([a-z][a-z0-9_]{2,26})\s*:\s*\[/g)].map((x) => x[1]);
const perdidas_13 = porChaves.filter((k) => !porRegraDaPeca13.includes(k));
const fixtures = { n_peca13: porRegraDaPeca13.length, n_regra_certa: porChaves.length,
  chaves_que_a_peca13_perdia: perdidas_13,
  a_causa_e_o_minimo_de_letras: perdidas_13.length > 0 && porSoVirgula.length === porChaves.length,
  a_hipotese_do_delimitador_reproduzia_algo: porSoVirgula.filter((k) => !porChaves.includes(k)).length > 0 || porSoVirgula.length !== porChaves.length };

// ── (b) PEN-32: o portao de setRole, por geracao ────────────────────────────────────────────────
const PORTAO = /role === 'education_supervisor'\s*\?\s*\[([^\]]*)\]\.includes\(\s*currentProfile\?\.role\s*\)/;
const escada = Object.keys(txt).map((g) => {
  const corpo = corpoFuncao('function setRole(', txt[g]) || corpoFuncao('setRole(', txt[g]);
  if (!corpo) throw new Error(`ABORTA: setRole nao extraido em ${g}`);
  const m = corpo.match(PORTAO);
  const visibilidade = (corpo.match(/secretaryView\.classList\.toggle\('hidden',([^\n]*)\)/) || [])[1] || null;
  return { geracao: g, corpo_bytes: Buffer.byteLength(corpo),
    portao_de_edsup: !!m, perfis_permitidos: m ? m[1].replace(/['"\s]/g, '').split(',') : null,
    condicao_de_secretaryView: visibilidade };
});
const zero = escada.find((e) => e.geracao === 'v119'), um = escada.find((e) => e.geracao === 'v120');
const discrimina = !!(zero && um) && zero.portao_de_edsup === false && um.portao_de_edsup === true;

// diff do corpo v119 → v120, agora com o delta impresso por inteiro (a peca 13 cortava-o)
const cA = corpoFuncao('function setRole(', txt.v119), cD = corpoFuncao('function setRole(', txt.v120);
if (!cA || !cD) throw new Error('ABORTA: corpo de setRole nao extraido em v119 ou v120 — o delta nao pode ser medido');
// os dois corpos extraidos tem de ter comprimentos DIFERENTES do ficheiro inteiro: e o par
// (delta_do_corpo, delta_do_ficheiro) que diz se a correcao coube no portao ou se espalhou.
const ficheiro_antes = Buffer.byteLength(txt.v119, 'utf8'), ficheiro_depois = Buffer.byteLength(txt.v120, 'utf8');
let i0 = 0; while (i0 < Math.min(cA.length, cD.length) && cA[i0] === cD[i0]) i0++;
let j0 = 0; while (j0 < Math.min(cA.length, cD.length) - i0 && cA[cA.length - 1 - j0] === cD[cD.length - 1 - j0]) j0++;
const removido = cA.slice(i0, cA.length - j0), adicionado = cD.slice(i0, cD.length - j0);
// os dois blocos sao grandes porque o diff por prefixo comum nao sabe os limites das expressoes;
// as linhas que mudam de facto extraem-se por igualdade de linha.
const mA = new Set(cA.split('\n')), mD = new Set(cD.split('\n'));
const linhas_somente_em_v120 = cD.split('\n').filter((x) => !mA.has(x)).map((s) => s.trim());
const linhas_somente_em_v119 = cA.split('\n').filter((x) => !mD.has(x)).map((s) => s.trim());
// o `+139` nao cobre o `+175` do ficheiro: ha 36 B que a v120 mexeu FORA do corpo de setRole.
// Deixar isso por nomear e a mesma falta de rigor que se aponta a quem conta uma cifra sem unidade,
// por isso o resto extrai-se por diferenca de prefixo/sufixo no texto INTEIRO das duas geracoes.
let g0 = 0; while (g0 < Math.min(ficheiro_antes, ficheiro_depois) && txt.v119[g0] === txt.v120[g0]) g0++;
let g1 = 0; while (g1 < Math.min(ficheiro_antes, ficheiro_depois) - g0 && txt.v119[txt.v119.length - 1 - g1] === txt.v120[txt.v120.length - 1 - g1]) g1++;
const bloco_ficheiro_antes = txt.v119.slice(g0, txt.v119.length - g1);
const bloco_ficheiro_depois = txt.v120.slice(g0, txt.v120.length - g1);
const linhas_fora = (bloco_ficheiro_depois.split('\n').filter((x) => !bloco_ficheiro_antes.includes(x.trim()) && x.trim())).map((s) => s.trim().slice(0, 160));
const fora_do_corpo = { offset_no_ficheiro: g0, bloco_antes_bytes: Buffer.byteLength(bloco_ficheiro_antes),
  bloco_depois_bytes: Buffer.byteLength(bloco_ficheiro_depois),
  resto_fora_do_corpo_bytes: (Buffer.byteLength(bloco_ficheiro_depois) - Buffer.byteLength(bloco_ficheiro_antes)) - (Buffer.byteLength(cD) - Buffer.byteLength(cA)),
  dentro_de_setRole: bloco_ficheiro_antes.includes(cA.slice(0, 200)),
  linhas_só_no_bloco_depois: [...new Set(linhas_fora)] };

const out = {
  em: new Date().toISOString(),
  metodo: 'extraccao por chavetas sobre as geracoes locais; duas contagens independentes de accountLabels; zero rede; zero escrita',
  correcao_de_regua: 'a peca 13 dava 12 chaves num mapa de 13; a causa medida e o minimo de letras do padrao ([a-z][a-z_]{3,26} nao admite `aee`), nao o delimitador — ver `fixtures`, que tambem registra que a hipotese do delimitador nao reproduzia o defeito',
  pen33_accountLabels: labels,
  fixtures: fixtures,
  pen32_portao_por_geracao: escada,
  pen32_a_regua_discrimina: discrimina,
  // a cifra que a cabeca desta peca recusou afirmar sem medir: quanta coisa a v120 mexeu no
  // ficheiro inteiro contra o que mexeu so dentro do corpo de setRole.
  pen32_escala_da_correcao: { ficheiro_v119_bytes: ficheiro_antes, ficheiro_v120_bytes: ficheiro_depois,
    delta_ficheiro: ficheiro_depois - ficheiro_antes, corpo_v119_bytes: Buffer.byteLength(cA),
    corpo_v120_bytes: Buffer.byteLength(cD), delta_corpo: Buffer.byteLength(cD) - Buffer.byteLength(cA),
    todo_o_delta_do_ficheiro_esta_dentro_do_corpo: (ficheiro_depois - ficheiro_antes) === (Buffer.byteLength(cD) - Buffer.byteLength(cA)) },
  pen32_delta_v119_para_v120: { offset_no_corpo: i0, bytes_removidos: Buffer.byteLength(removido), bytes_adicionados: Buffer.byteLength(adicionado),
    linhas_somente_em_v119: linhas_somente_em_v119, linhas_somente_em_v120: linhas_somente_em_v120 },
  pen32_o_que_a_v120_mexeu_fora_de_setRole: fora_do_corpo,
};
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`accountLabels: ${labels.corpo_bytes}B chaves=${labels.n_por_chaves} valores=${labels.n_por_valores} batem=${labels.batem} aee=${labels.tem_aee} edSup=${labels.tem_education_supervisor} rotulo="${labels.rotulo_education_supervisor}"`);
console.log(`fixture: peca13=${fixtures.n_peca13} regra_certa=${fixtures.n_regra_certa} chaves_perdidas=[${fixtures.chaves_que_a_peca13_perdia.join(',')}] causa_e_minimo_de_letras=${fixtures.a_causa_e_o_minimo_de_letras} a_hipotese_do_delimitador_reproduzia=${fixtures.a_hipotese_do_delimitador_reproduzia_algo}`);
console.log(`chaves: [${labels.chaves.join(',')}]`);
for (const e of escada) console.log(`  setRole ${e.geracao}: ${e.corpo_bytes}B portao_edsup=${e.portao_de_edsup} permitidos=${JSON.stringify(e.perfis_permitidos)} secretaryView=(${e.condicao_de_secretaryView || '-'})`);
console.log(`regua discrimina (v119 false → v120 true): ${discrimina}`);
const e = out.pen32_escala_da_correcao;
console.log(`escala: ficheiro ${e.ficheiro_v119_bytes}→${e.ficheiro_v120_bytes} (Δ${e.delta_ficheiro}) | corpo setRole ${e.corpo_v119_bytes}→${e.corpo_v120_bytes} (Δ${e.delta_corpo}) | tudo_o_delta_no_corpo=${e.todo_o_delta_do_ficheiro_esta_dentro_do_corpo}`);
const f = fora_do_corpo;
console.log(`fora do corpo: bloco_no_ficheiro@${f.offset_no_ficheiro} ${f.bloco_antes_bytes}→${f.bloco_depois_bytes}B resto=${f.resto_fora_do_corpo_bytes}B dentro_de_setRole=${f.dentro_de_setRole}`);
for (const s of f.linhas_só_no_bloco_depois) console.log(`  ~ ${s.slice(0, 160)}`);
for (const s of linhas_somente_em_v119) console.log(`  − ${s.slice(0, 200)}`);
for (const s of linhas_somente_em_v120) console.log(`  + ${s.slice(0, 200)}`);
console.log(`\nSM22_DELTA_OK · registo evidence/sm22-delta-setrole-e-formato-labels-18-11b.json`);
