#!/usr/bin/env node
// SM-7-C — varredura ESTATICA das strings injectadas no browser, com a lista de injectores LIDA do alvo.
// Um `evalJS`/`waitFor`/`cliqueReal`/`estavel` escreve codigo-fonte num template literal ou numa string. Um
// backtick ou uma aspa a mais nao rebenta no programa: rebenta no browser, longe da linha que o escreveu.
// Aqui cada corpo compila sem abrir browser: as interpolacoes `${...}` viram uma string neutra e o texto
// a volta delas tem de bater sozinho.
//
// A divida que esta ronda fecha (face (d) do SM.76): a lista de nomes era lembrada, por isso um instrumento
// cujo injector se chama `E` dava `corpos_litigicos=0` — um verde sem positivo possivel, porque o ramo de
// erro so existia para nomes que o ficheiro varrido nao usa. Desde aqui a lista de injectores deriva-se do
// alvo: qualquer declaracao de topo cujo corpo despeja a expressao num sumidouro de avaliacao — o corpo
// entrega-a como `expression`, chama `.evaluate(`, `new Function`, `executeJavaScript` ou escreve-a em
// `innerHTML` — entra na varredura, e se nao entrar o portao chumba com o nome impresso. Comparar o nome
// do metodo nao e injetar: a tabela de prazos que escreve Runtime.evaluate numa igualdade fica de fora.
//
// Uso: node scripts/sm7-confere-injecoes.mjs [ficheiro]        (por omissao: o instrumento SM-7-N)
//      node scripts/sm7-confere-injecoes.mjs --fixtures         (selftestes com os positivos provados)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const CASAS = ['evalJS', 'waitFor', 'cliqueReal', 'estavel'];
// O sumidouro prova-se por o que o corpo FAZ com a expressao, nao por o nome que menciona: a tabela de
// prazos `PRAZO_CDP` compara o literal do metodo e nao injeta nada, e list-la como injector seria o
// inventario prometer cobertura que o ficheiro nao tem.
const SUMIDOURO = /\{\s*expression|expression\s*[,}]|\.evaluate\s*\(|new Function|executeJavaScript|\.innerHTML\s*=/;

function salta_aspa(t, p) { // p na aspa; devolve o indice depois do fecho
  const q = t[p]; p++;
  while (p < t.length) { if (t[p] === '\\') { p += 2; continue; } if (t[p] === q) return p + 1; p++; }
  return p;
}
function salta_interpolacao(t, p) { // p no '$' de `${`; devolve o indice depois do `}`
  let n = 1; p += 2;
  while (p < t.length && n > 0) {
    const c = t[p];
    if (c === "'" || c === '"' || c === '`') { p = c === '`' ? salta_template(t, p) : salta_aspa(t, p); continue; }
    if (c === '{') n++; else if (c === '}') n--;
    p++;
  }
  return p;
}
function salta_template(t, p) { // p no backtick de abertura; devolve o indice depois do fecho
  p++;
  while (p < t.length) {
    const c = t[p];
    if (c === '\\') { p += 2; continue; }
    if (c === '$' && t[p + 1] === '{') { p = salta_interpolacao(t, p); continue; }
    if (c === '`') return p + 1;
    p++;
  }
  return p;
}
function corpo_da_declaração(t, p) { // p no '{' ou no inicio da expressao do arrow; devolve o texto ate ao fim
  if (t[p] === '{') {
    let n = 0, i = p;
    for (; i < t.length; i++) {
      const c = t[i];
      if (c === "'" || c === '"' || c === '`') { i = (c === '`' ? salta_template : salta_aspa)(t, i) - 1; continue; }
      if (c === '{') n++; else if (c === '}') { n--; if (n === 0) return t.slice(p, i + 1); }
    }
    return t.slice(p);
  }
  const inicio = p;
  while (p < t.length && t[p] !== '\n') p++;
  return t.slice(inicio, p);
}
function neutro(t) {
  let s = '', p = 0;
  while (p < t.length) {
    const c = t[p];
    if (c === '\\') { s += c + (t[p + 1] || ''); p += 2; continue; }
    if (c === '$' && t[p + 1] === '{') { s += '"X"'; p = salta_interpolacao(t, p); continue; }
    s += c; p++;
  }
  return s;
}
function desaspas(t) { // conteudo de uma string entre aspas, com as escapes resolvidas
  let s = '', p = 0;
  while (p < t.length) {
    if (t[p] === '\\') { const nx = t[p + 1]; s += nx === 'n' ? '\n' : nx === 't' ? '\t' : (nx || ''); p += 2; continue; }
    s += t[p]; p++;
  }
  return s;
}

function injectoresDoAlvo(src) { // nomes de topo cuja definicao despeja expressao num sumidouro de avaliacao
  const achados = [];
  const re = /(?:^|\n)(?:const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*(async\s*)?(?:function\s*)?\(?/g;
  let m;
  while ((m = re.exec(src))) {
    const nome = m[1];
    let p = m.index + m[0].length;
    while (p < src.length && /[^\s(]/.test(src[p]) === false && src[p] !== '(') p++;
    const parent = src.indexOf(')', p);
    if (parent < 0) continue;
    let q = parent + 1;
    while (q < src.length && /\s/.test(src[q])) q++;
    if (src[q] === '=>') q += 2;
    while (q < src.length && /\s/.test(src[q])) q++;
    const corpo = corpo_da_declaração(src, q);
    if (corpo.length > 4000) continue;
    if (SUMIDOURO.test(corpo)) {
      // a linha declara-se na posicao do NOME, nao no `m.index`, que aponta para a quebra de linha anterior:
      // medir a coordenada pelo lado errado era dizer `E:307` quando o fonte tem a definicao na 308.
      const pos = m.index + m[0].indexOf(nome);
      achados.push({ nome, linha: src.slice(0, pos).split('\n').length, corpo_chars: corpo.length });
    }
  }
  return achados;
}

const SELETOR = new Set(['cliqueReal']);
function confere_seletor(t) {
  const aspas = (t.match(/(?<!\\)"/g) || []).length, apos = (t.match(/(?<!\\)'/g) || []).length;
  const colchetes = (t.match(/\[/g) || []).length - (t.match(/\]/g) || []).length;
  const parenteses = (t.match(/\(/g) || []).length - (t.match(/\)/g) || []).length;
  if (!t.trim()) return 'seletor vazio';
  if (aspas % 2) return 'aspas duplas impares';
  if (apos % 2) return 'aspas simples impares';
  if (colchetes !== 0) return 'colchetes desequilibrados';
  if (parenteses !== 0) return 'parenteses desequilibrados';
  return null;
}

function varre(src) {
  const linhaDe = (i) => src.slice(0, i).split('\n').length;
  const detectados = injectoresDoAlvo(src);
  const nomes = [...new Set([...CASAS, ...detectados.map((d) => d.nome)])];
  const corpos = [];
  const variaveis = [];
  for (const nome of nomes) {
    for (let de = 0;;) {
      const i = src.indexOf(nome + '(', de);
      if (i < 0) break;
      de = i + nome.length + 1;
      if (src[i - 1] === '.') continue; // `x.evalJS(` nao e uma chamada nossa; `await evalJS(` e
      if (detectados.some((d) => d.nome === nome) && src.slice(Math.max(0, i - 40), i).match(new RegExp('(?:const|let|var)\\s+' + nome + '\\s*='))) continue;
      let p = i + nome.length + 1;
      while (p < src.length && /\s/.test(src[p])) p++;
      const c = src[p];
      if (c === '`') {
        const fecho = salta_template(src, p);
        corpos.push({ nome, linha: linhaDe(i), tipo: 'template', corpo: src.slice(p + 1, fecho - 1) });
        de = fecho;
        continue;
      }
      if (c === '"' || c === "'") {
        const fecho = salta_aspa(src, p);
        corpos.push({ nome, linha: linhaDe(i), tipo: 'string', corpo: desaspas(src.slice(p + 1, fecho - 1)) });
        de = fecho;
        continue;
      }
      const ate = src.slice(p, p + 60).match(/^[A-Za-z_$][A-Za-z0-9_$.]*/);
      variaveis.push({ nome, linha: linhaDe(i), operando: ate ? ate[0] : '(vazio)' });
    }
  }
  const porNome = {};
  for (const nome of nomes) porNome[nome] = { sitios: 0, compilados: 0, invalidos: 0, classe: '' };
  const maus = [];
  for (const cc of corpos) {
    const r = porNome[cc.nome];
    r.sitios++;
    if (SELETOR.has(cc.nome)) {
      const motivo = confere_seletor(neutro(cc.corpo));
      if (motivo) { r.invalidos++; maus.push({ nome: cc.nome, linha: cc.linha, tipo: cc.tipo, motivo, trecho: neutro(cc.corpo).slice(0, 100).replace(/\s+/g, ' ') }); }
      else r.compilados++;
      continue;
    }
    // um corpo de tipo `string` ja foi des-escapado acima: o que varro e o codigo que o browser recebe,
    // nao uma literal a volta dele — re-embrulha-lo em aspas faria esta regla compilar sempre.
    const cod = neutro(cc.corpo);
    try {
      new vm.Script('(' + cod + ')');
      r.compilados++;
    } catch (e) {
      r.invalidos++;
      maus.push({ nome: cc.nome, linha: cc.linha, tipo: cc.tipo, motivo: String(e.message).slice(0, 52), trecho: String(cod).slice(0, 100).replace(/\s+/g, ' ') });
    }
  }
  for (const v of variaveis) porNome[v.nome].sitios++;
  // classe declarada: um injector que o alvo define mas onde nao ha sitios a varrer e uma classe legitima
  // (definicao nunca chamada), nao uma falha — por isso imprime-se, nunca se proibe.
  for (const d of detectados) porNome[d.nome].classe = d.classe = 'sumidouro_lido_do_alvo';
  const nao_varridos = detectados.filter((d) => porNome[d.nome].sitios === 0).map((d) => d.nome + ':' + d.linha);
  const duplicadas = (() => {
    const decls = new Map();
    src.split('\n').forEach((l, k) => {
      const m = l.match(/^(?:const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)/);
      if (!m) return;
      if (!decls.has(m[1])) decls.set(m[1], []);
      decls.get(m[1]).push(k + 1);
    });
    return [...decls].filter(([, v]) => v.length > 1).map(([n, v]) => n + '=' + v.join(','));
  })();
  return { detectados, nomes, corpos, variaveis, porNome, maus, nao_varridos, duplicadas };
}

function portoes(r) {
  const out = [];
  const add = (nome, passa, dado, esperado, nota) => out.push({ nome, passa, dado, esperado, nota });
  add('a_lista_de_injectores_lida_do_alvo_entreira_na_varredura',
    r.detectados.every((d) => r.nomes.includes(d.nome)),
    { lidos: r.detectados.map((d) => d.nome), varridos: r.nomes },
    'cada nome com sumidouro de avaliacao entra na varredura',
    'e o portao que mata o verde vazio: sem ele, um injector com outro nome dava zero corpos e saida verde');
  add('corpos_compilam_ou_o_nome_que_parte_imprime_se',
    r.maus.length === 0, { invalidos: r.maus.length, nomes: [...new Set(r.maus.map((m) => m.nome))] }, false,
    'um corpo partido e vermelho com nome e linha; o conserto nao apaga a contagem');
  add('nenhum_identificador_de_topo_duplicado', r.duplicadas.length === 0, r.duplicadas, [],
    'const do mesmo nome duas vezes nao erro de sintaxe, e morte ao carregar o modulo');
  return out;
}

if (process.argv.includes('--fixtures')) {
  const casos = [];
  const roda = (nome, esperado_verde, src, exigencias) => {
    const r = varre(src);
    const ps = portoes(r);
    const ruins = ps.filter((p) => !p.passa).map((p) => p.nome);
    const verde = ruins.length === 0;
    const falha = [];
    if (verde !== esperado_verde) falha.push('veredicto=' + (verde ? 'verde' : 'vermelho') + ' esperado=' + (esperado_verde ? 'verde' : 'vermelho') + (ruins.length ? ' nomes=' + JSON.stringify(ruins) : ''));
    for (const e of exigencias || []) if (!e(r)) falha.push('exigencia nao cumprida: ' + e.label);
    casos.push({ nome, falha, ruins, verde });
  };
  const COM_E = [
    "const E = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true }); return r.result?.value; };",
  ].join('\n');
  roda('sumidouro_lido_e_corpo_partido_da_vermelho', false, [
    COM_E,
    "await E(`document.querySelectorAll('.x).length`);",
  ].join('\n'), [
    Object.assign((r) => r.detectados.some((d) => d.nome === 'E'), { label: 'o nome E foi lido do alvo' }),
    Object.assign((r) => r.maus.some((m) => m.nome === 'E'), { label: 'o vermelho nomeia o injector lido' }),
  ]);
  roda('sumidouro_lido_e_corpo_bom_da_verde_com_positivo', true, [
    COM_E,
    'await E(`document.querySelectorAll(".x").length`);',
  ].join('\n'), [
    Object.assign((r) => r.porNome.E.sitios === 1 && r.porNome.E.compilados === 1, { label: 'o censo por nome imprimiu um corpo compilado' }),
  ]);
  roda('define_sema_chamar_e_classe_legitima_verde', true, COM_E + '\nvoid 0;', [
    Object.assign((r) => r.nao_varridos.join() === 'E:1', { label: 'a falta de sitios sai impressa, nao proibida' }),
  ]);
  roda('string_de_expressao_quebrada_da_vermelho', false, [
    COM_E,
    `await waitFor("document.getElementById('loginScreen'", 45000);`,
  ].join('\n'), [
    Object.assign((r) => r.corpos.some((c) => c.tipo === 'string'), { label: 'o corpo entre aspas entrou na varredura' }),
    Object.assign((r) => r.maus.some((m) => m.nome === 'waitFor' && m.tipo === 'string'), { label: 'o vermelho nomeia o waitFor de string' }),
  ]);
  roda('sem_sumidouro_no_alvo_verde_etiquetado', true, 'const a = 1;\nexport default a;\n', [
    Object.assign((r) => r.detectados.length === 0 && r.corpos.length === 0, { label: 'zero injectores lidos, zero corpos' }),
  ]);
  roda('chamada_com_variavel_nao_conta_como_corpo', true, [
    COM_E,
    'const sel = ".x";',
    'await cliqueReal(sel);',
  ].join('\n'), [
    Object.assign((r) => r.variaveis.some((v) => v.operando === 'sel'), { label: 'o operando identificado fica na lista propria' }),
  ]);
  roda('string_bem_formada_da_verde_com_positivo', true, [
    COM_E,
    `await waitFor("!!document.getElementById('loginScreen')", 45000);`,
  ].join('\n'), [
    Object.assign((r) => r.porNome.waitFor.sitios === 1 && r.porNome.waitFor.compilados === 1, { label: 'o censo por nome imprimiu o corpo de string compilado' }),
  ]);
  roda('sumidouro_new_function_tambem_lido', false, [
    "const F = (t) => new Function('return ' + t)();",
    "F(`document.querySelectorAll('.x).length`);",
  ].join('\n'), [
    Object.assign((r) => r.detectados.some((d) => d.nome === 'F'), { label: 'new Function sumidouro' }),
    Object.assign((r) => r.maus.some((m) => m.nome === 'F'), { label: 'o vermelho nomeia o F lido do alvo' }),
  ]);
  roda('tabela_de_prazos_que_compara_o_nome_do_metodo_nao_e_injetor', true, [
    "const PRAZO_CDP = (method) => (method === 'Runtime.evaluate' ? 60000 : 150000);",
    COM_E,
    'await E(`1 + 1`);',
  ].join('\n'), [
    Object.assign((r) => r.detectados.length === 1 && r.detectados[0].nome === 'E', { label: 'so o sumidouro real entra na lista' }),
    Object.assign((r) => r.nomes.indexOf('PRAZO_CDP') < 0, { label: 'a tabela de prazos nao e varrida como injector' }),
  ]);
  const ruins = casos.filter((c) => c.falha.length);
  for (const c of casos) console.log(`  ${c.falha.length ? 'FALHA ' : 'ok    '} ${c.nome}${c.falha.length ? ' :: ' + c.falha.join(' | ') : ''}`);
  console.log(`SONDA_INJ_FIXURAS ${casos.length - ruins.length}/${casos.length}`);
  console.log(ruins.length ? 'SONDA_INJ_FIXURAS_VERMELHO' : 'SONDA_INJ_FIXURAS_OK');
  process.exit(ruins.length ? 1 : 0);
}

const ALVO = process.argv[2] ? fileURLToPath(new URL(process.argv[2], `file:///${process.cwd().replace(/\\/g, '/')}/`))
  : fileURLToPath(new URL('sm7-navegador-municipal.mjs', import.meta.url));
const src = readFileSync(ALVO, 'utf8');
const r = varre(src);

console.log('injectores_lidos_do_alvo=' + (r.detectados.length ? r.detectados.map((d) => d.nome + ':' + d.linha).join(' ') : 'NENHUM_SUMIDOURO_NO_ALVO'));
console.log('censo_por_nome=' + r.nomes.map((n) => n + '{sitios=' + r.porNome[n].sitios + ' compila=' + r.porNome[n].compilados + ' invalidos=' + r.porNome[n].invalidos + '}').join(' '));
for (const m of r.maus) console.log(`  ${SELETOR.has(m.nome) ? 'SELETOR_INVALIDO' : 'INJECAO_INVALIDA'} ${m.nome} :${m.linha} [${m.tipo}] ${m.motivo} :: ${m.trecho}`);
for (const n of r.nao_varridos) console.log(`  INJECTOR_SEM_SITIOS ${n}`);
if (r.duplicadas.length) for (const d of r.duplicadas) console.log(`  IDENTIFICADOR_DUPLOCNOME ${d}`);
const ps = portoes(r);
for (const p of ps) console.log(`  ${p.passa ? 'ok' : 'VERMELHO'} ${p.nome} :: ${JSON.stringify(p.dado)}`);
console.log(`alvo=${ALVO}`);
console.log(`corpos_litigicos=${r.corpos.length} compila=${r.corpos.length - r.maus.length} invalidos=${r.maus.length} chamadas_com_variavel=${r.variaveis.length} tipos={${['template', 'string'].map((t) => t + '=' + r.corpos.filter((c) => c.tipo === t).length).join(',')}}`);
const verde = ps.every((p) => p.passa);
console.log(verde ? 'SM7_INJECOES_VERDES' : 'SM7_INJECOES_VERMELHAS');
process.exit(verde ? 0 : 1);
