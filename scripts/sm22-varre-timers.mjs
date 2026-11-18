#!/usr/bin/env node
// SM-22 (peca 3, SOMENTE LEITURA): duas coisas que a peca 1 nomeou mal e uma que nao mediu.
//  (a) RENOMEIA o marcador `pen01_sidebar_display_flex_em_body`: o que ele media e o bloco
//      sm8-fix da sidebar (o fecho do §SM.21), nao a «fome de timers» da PEN-01. Nome de
//      grandeza e promessa de regua, por isso a saida nova chama-o pelo que ele mede.
//  (b) PEN-19 de verdade: os 20 `setInterval(...,1200)` do shell vivo — o que cada corpo toca.
//  (c) PEN-01 de verdade: os timers do menu mobile (intervalos + listeners de visibilidade).
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const OUT = join(REPO, 'evidence/sm22-varre-timers-18-11d.json');
if (existsSync(OUT)) throw new Error(`ABORTA: ${OUT} existe — correr com outro nome, nao por cima`);

const md5 = (b) => createHash('md5').update(b).digest('hex');
const vivo = JSON.parse(readFileSync(join(REPO, 'evidence/sm22-varre-vivo-pen-18-11b.json'), 'utf8'));
const candBuf = readFileSync(join(REPO, 'bfr-candidata-v134-sidebar-escondida/index.html'));
if (md5(candBuf) !== vivo.identidade.shell_md5) throw new Error('ABORTA: candidata local nao e byte-idêntica ao ar medido na peca 1');
const txt = candBuf.toString('utf8');
const base = readFileSync(join(REPO, 'bfr-candidata-v133-secretaria-municipal/index.html'), 'utf8');

// (a) o bloco sm8-fix, pelo nome do que mede
const regra = (t) => ({
  bloco_sm8_fix_presente: /<style id="bfr-mobile-nav-sm8-fix"/.test(t),
  sidebar_flex_importantem_em_body: (t.match(/#appShell\.ready \.sidebar\s*\{\s*display:\s*flex\s*!important/g) || []).length,
  asset_display_none_important: (t.match(/#appShell\.ready\s*>\s*\.sidebar\s*\{\s*display:\s*none\s*!important/g) || []).length,
});
const sm21fix = { no_ar_v134: regra(txt), na_base_v133: regra(base) };

// (b) os 20 intervalos de 1200 ms: extrai o corpo de cada um e diz o que toca
const corpoIntervalo = (t, from) => {
  let n = 0;
  for (let k = from; k < t.length; k++) {
    const c = t[k];
    if (c === '(') n++;
    else if (c === ')') { n--; if (n === 0) return t.slice(from, k + 1); }
  }
  return null;
};
// (b2) o salto transitivo de profundidade 1. A primeira versao desta regua procurava
// `navButton` dentro do corpo do setInterval e dava 0 — mas o corpo chama `syncNav()`, e e
// dentro de `syncNav` que o navButton se escreve (index.html:19975-19977). Um 0 por nao
// atravessar uma chamada e a mesma cegueira de contar o atributo em vez dos botoes.
const corpoFuncaoNome = (t, nome) => {
  const i = t.indexOf(`function ${nome}(`);
  if (i < 0) return null;
  const abre = t.indexOf('{', i);
  let n = 0;
  for (let k = abre; k < t.length; k++) {
    if (t[k] === '{') n++;
    else if (t[k] === '}') { n--; if (n === 0) return t.slice(abre, k + 1); }
  }
  return null;
};
const corpoIntervaloPorNome = (t, from) => corpoIntervalo(t, from);
// As tres formas que o bundle usa, medidas no texto:
//   setInterval(syncNav, 1200)            -> referencia nua (a forma que a regua cega perdeu)
//   setInterval(() => { ... }, 1200)      -> lambda inline
//   setInterval(ensure, 1200)             -> outra referencia
// Um regex que so aceita `nome(` apanha a segunda forma e devolve 0 nas outras duas.
// O corpo devolvido pelo balanceamento comeca no `(` de `setInterval(`, por isso ele ha de
// ser removido antes de decidir a forma — deixar o `(` dentro fazia `(syncNav, 1200)` cair
// na ramificacao de lambda e dar `nomes=[]`, que e exatamente a cegueira que se procurava.
const argoPeriodico = (corpo) => corpo.replace(/^\(/, '').replace(/,\s*1200\s*\)\s*$/, '').trim();
const colhe2 = (t) => {
  const alvos = [];
  let i = 0;
  while ((i = t.indexOf('setInterval(', i)) >= 0) {
    const corpo = corpoIntervaloPorNome(t, i + 'setInterval'.length);
    if (corpo) {
      const periodo = (/,\s*(\d+)\s*\)$/.exec(corpo) || [])[1];
      if (periodo === '1200') {
        const argo = argoPeriodico(corpo);
        const referenciaNua = /^[\w$.]+$/.test(argo);
        const nomes = referenciaNua ? [argo] : [...new Set((argo.match(/\b(\w+)\s*\(/g) || []).map((s) => s.replace(/\s*\($/, '')))];
        const alcancados = nomes.map((nome) => {
          const c = corpoFuncaoNome(t, nome.replace(/^.*\./, ''));
          return { nome, corpo_bytes: c ? Buffer.byteLength(c) : 0, toca_navButton_direto: !!c && /navButton/.test(c) };
        });
        const diretoNoArgo = /navButton/.test(argo);
        alvos.push({
          offset_bytes: Buffer.byteLength(t.slice(0, i), 'utf8'),
          bytes: corpo.length,
          forma: referenciaNua ? 'referencia_nua' : 'lambda_inline',
          nomes,
          escrito_periodico_de_navButton: diretoNoArgo || alcancados.some((a) => a.toca_navButton_direto),
          salto: alcancados.filter((a) => a.toca_navButton_direto).map((a) => a.nome),
        });
      }
    }
    i += 12;
  }
  return alvos;
};
const per1200Ar = colhe2(txt);
const per1200Base = colhe2(base);
// os 20 casamentos textuais de ",1200)" vs os setInterval de 1200: a diferenca e setTimeout
// (uma so), nao intervalo — medir os dois lados para nao deixar um numero solto na prosa.
const separa1200 = (t) => {
  const todos = (t.match(/,\s*1200\s*\)/g) || []).length;
  const int = colhe2(t).length;
  const time = [...t.matchAll(/setTimeout\(/g)].filter((m) => {
    const corpo = corpoIntervalo(t, m.index + 'setTimeout'.length);
    return corpo && /,\s*1200\s*\)$/.test(corpo);
  }).length;
  return { textual_1200: todos, setInterval_1200: int, setTimeout_1200: time, resto_sem_timer: todos - int - time };
};
const pen19 = {
  intervalos_1200_no_ar: per1200Ar.length,
  intervalos_1200_na_base_v133: per1200Base.length,
  escritores_periodicos_de_navButton_no_ar: per1200Ar.filter((a) => a.escrito_periodico_de_navButton).length,
  saltos: per1200Ar.filter((a) => a.escrito_periodico_de_navButton).map((a) => `${a.salto.join('+')} @${a.offset_bytes}B (${a.bytes}B)`),
  contagem_de_1200: { no_ar: separa1200(txt), na_base_v133: separa1200(base) },
  poder_de_fogo: per1200Ar.length > 0 && per1200Ar.some((a) => a.escrito_periodico_de_navButton),
};

// FIXTURE NEGATIVO: a regua so vale se cair a zero quando se corta a aresta. Ha duas arestas
// possiveis no bundle — a referencia `setInterval(syncNav, 1200)` e o salto syncNav->navButton —
// e o mutante corta as DUAS, senao o 0 do mutante provaria pouco.
const mutRef = txt.replace(/setInterval\(\s*syncNav\s*,/g, 'setInterval(nadaAqui,');
const mutAresta = mutRef.replace(/forEach\(host => navButton\(host(, true)?\)\);/g, 'forEach(host => nadaAqui(host));');
const colheMutRef = colhe2(mutRef);
const colheMutAresta = colhe2(mutAresta);
const n = (a) => a.filter((x) => x.escrito_periodico_de_navButton).length;
pen19.fixture_negativo = {
  formas_no_ar: Object.fromEntries(per1200Ar.reduce((m, a) => m.set(a.forma, (m.get(a.forma) || 0) + 1), new Map())),
  escritores_no_ar: n(per1200Ar),
  escritores_se_a_referencia_for_cortada: n(colheMutRef),
  escritores_se_a_referencia_e_a_aresta_forem_cortadas: n(colheMutAresta),
  // o mutante da referencia tem de valer como "esta sonda nao ve mais o escritor" — se ainda
  // contar 1 por outra via, o contador nao esta amarrado a aresta que se cortou.
  regua_discrimina_a_referencia: n(per1200Ar) > n(colheMutRef),
  regua_zera_com_ambos_os_cortes: n(colheMutAresta) === 0,
};

// (c) PEN-01: o que o menu mobile faz por timer — contagem de intervalos cuja janela de
// trabalho e o menu, mais os requestAnimationFrame do mesmo ramo.
const pen01 = {
  intervalos_totais_no_ar: (txt.match(/setInterval/g) || []).length,
  intervalos_totais_na_base: (base.match(/setInterval/g) || []).length,
  mencoes_requestAnimationFrame_no_ar: (txt.match(/requestAnimationFrame/g) || []).length,
  mencoes_MutationObserver_no_ar: (txt.match(/new MutationObserver/g) || []).length,
  mencoes_MutationObserver_na_base: (base.match(/new MutationObserver/g) || []).length,
  nota: 'nenhum marcador de "fome de timers" pode sair daqui: PEN-01 e medida de tempo de espera entre o toque e o paint (RM-2.1), nao de contagem de codigo. O que esta regua mede e a massa estatica de timers.',
};

const out = { em: new Date().toISOString(), identidade: { ar_md5: vivo.identidade.shell_md5, candidato_md5: md5(candBuf), bytes: candBuf.length }, pen01_massa_de_codigo: pen01, pen19_intervalos_1200: pen19, sm21_sidebar_fix: sm21fix };
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`sm21_fix: v134={bloco:${sm21fix.no_ar_v134.bloco_sm8_fix_presente}, flex_em_body:${sm21fix.no_ar_v134.sidebar_flex_importantem_em_body}, none_asset:${sm21fix.no_ar_v134.asset_display_none_important}} v133={bloco:${sm21fix.na_base_v133.bloco_sm8_fix_presente}, flex_em_body:${sm21fix.na_base_v133.sidebar_flex_importantem_em_body}, none_asset:${sm21fix.na_base_v133.asset_display_none_important}}`);
console.log(`PEN-19: intervalos 1200 ar=${pen19.intervalos_1200_no_ar} base=${pen19.intervalos_1200_na_base_v133} escritores_navButton=${pen19.escritores_periodicos_de_navButton_no_ar} formas=${JSON.stringify(pen19.fixture_negativo.formas_no_ar)}`);
for (const a of per1200Ar) console.log(`  @${a.offset_bytes}B forma=${a.forma} nomes=[${a.nomes.join(',')}] navButton=${a.escrito_periodico_de_navButton ? 'SIM' : 'nao'}`);
console.log(`PEN-19 fixture: ${JSON.stringify(pen19.fixture_negativo)}`);
console.log(`PEN-19 contagem de 1200: ar=${JSON.stringify(pen19.contagem_de_1200.no_ar)} base=${JSON.stringify(pen19.contagem_de_1200.na_base_v133)}`);
console.log(`PEN-01 (massa, nao tempo): setInterval ar=${pen01.intervalos_totais_no_ar} base=${pen01.intervalos_totais_na_base} rAF=${pen01.mencoes_requestAnimationFrame_no_ar} MutationObserver ar=${pen01.mencoes_MutationObserver_no_ar} base=${pen01.mencoes_MutationObserver_na_base}`);
console.log(`\nSM22_P3_OK · registo evidence/sm22-varre-timers-18-11d.json`);
