// §AI.16 deixou uma pergunta em aberto que só o artefacto novo responde: o professor NÃO tem botão «Mais»
// na barra de baixo (app/bfr-responsive-presentation.js:395 — `if (!teacherRole) items.push(['Mais',…])`),
// por isso as ~18 rotas dele fora das 4 quickRoutes só se alcançam pelo hambúrguer do appbar. «Barra coerente»
// no consolidador não prova que a gaveta abriu a toque — prova só que a lista de baixo tinha botões. Este
// programa imprime, por (papel × largura), os elementos de moldura mobile que o censo viu: se a barra e a
// gaveta existem, se o hambúrguer tem caixa, se a gaveta ABRIU a toque e quantos destinos cada uma ofereceu.
// última execução por papel vence (é a que correu com os portões actuais). Só-leitura.
// Uso: node scripts/ah2-m5-cena-mobile.mjs [prefixo=m5] [--papel coordinator]
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const PREFIXO = process.argv[2] || 'm5';
const i_papel = process.argv.indexOf('--papel');
const SO_PAPEL = (process.argv.find((a) => a.startsWith('--papel=')) || '').split('=')[1] || (i_papel > 0 ? process.argv[i_papel + 1] : '') || null;
const i_grava = process.argv.indexOf('--gravar');
const OUT = i_grava > 0 ? `${DIR}/evidence/ah2-m5-cena-mobile-${process.argv[i_grava + 1]}.md` : null;
if (OUT && existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' já existe (os artefactos não se sobrescrevem)');
const saida = [];
const orig = console.log;
if (OUT) console.log = (...a) => { saida.push(a.join(' ')); orig(...a); };
const LARGURAS = [320, 360, 375, 390, 414, 430];
const coerente = (b) => !!b.censo && b.censo.barra_existe !== false && (b.censo.barra || []).some((x) => x.w > 0 && x.h > 0) && (b.abertas || 0) > 0;

// Por papel e largura guarda-se a execução mais recente (rotulo com maior sufixo numérico) que deu banda
// coerente; de nenhuma execução se aceita «melhorar» o número com dados de outra largura.
const melhor = {};
const fich = readdirSync(`${DIR}/evidence`).filter((f) => new RegExp(`^ah2-mobile2-${PREFIXO}[^/]*\\.json$`).test(f)).sort();
for (const f of fich) {
  const j = JSON.parse(readFileSync(`${DIR}/evidence/${f}`, 'utf8'));
  if (j.ciclo !== 'AH-7b-MOBILE' || (SO_PAPEL && j.papel !== SO_PAPEL)) continue;
  const n = +(parseInt((/-(\d+)\.json$/.exec(f) || [0, '0'])[1], 10));
  for (const [w, b] of Object.entries(j.bandas || {})) {
    const L = +w, k = `${j.papel}@${L}`;
    if (!coerente(b)) continue;
    if (melhor[k] && melhor[k].n >= n) continue;
    melhor[k] = { n, b, f, rotulo: j.rotulo, md5: j.md5_shell };
  }
}
console.log('| papel | largura | barra mobile | botões da barra | appbar | hambúrguer | gaveta existe | gaveta abriu a toque | destinos na gaveta | abertas | rotas alcançáveis |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const p of Object.keys(melhor).map((k) => k.split('@')[0]).filter((v, i, a) => a.indexOf(v) === i).sort()) {
  for (const L of LARGURAS) {
    const m = melhor[`${p}@${L}`];
    if (!m) continue;
    const c = m.b.censo || {};
    const alc = [...new Set([...(c.barra || []), ...(c.gaveta || [])].map((x) => x.route).filter((r) => r && r !== 'more'))];
    console.log(`| ${p} | ${L} | ${c.barra_existe === false ? 'AUSENTE' : 'sim'} | ${(c.barra || []).length} | ${c.presentation || '?'} | ${c.hamb ? 'sim' : 'NAO'} | ${c.gaveta_existe === false ? 'AUSENTE' : 'sim'} | ${m.b.gaveta_aberta_a_toque === true ? 'sim' : (m.b.gaveta_aberta_a_toque === false ? 'NAO' : '-')} | ${(c.gaveta || []).length} | ${m.b.abertas} | ${alc.length} |`);
  }
}
const sem_gaveta = Object.entries(melhor).filter(([, m]) => m.b.gaveta_aberta_a_toque === false);
if (sem_gaveta.length) console.log('\nGaveta NÃO abriu a toque (com barra coerente): ' + sem_gaveta.map(([k, m]) => k + ' exec ' + m.rotulo).join(', '));
const sem_hamb = Object.entries(melhor).filter(([, m]) => !m.b.censo.hamb);
if (sem_hamb.length) console.log('Sem hambúrguer [data-bfr-open-drawer] na moldura: ' + sem_hamb.map(([k]) => k).join(', '));
if (OUT) { console.log = orig; writeFileSync(OUT, saida.join('\n') + '\n'); console.log('ESCRITO: ' + OUT.split('/').pop()); }

// «Alcançável» menos «aberta» é um fosso que o consolidador não nomeia, e foi exatamente por o querer
// nomeado que se escreveu a frase do §AI.17 sobre o developer (26 vs 23). Este modo imprime, por papel,
// que rotas estavam no censo da melhor banda coerente e AINDA ASSIM não têm painel medido em nenhuma
// largura — com o estado que o censo deixou para elas. Sem isto, a diferença seria uma conta de memória.
if (process.argv.includes('--fosso')) {
  console.log('\n===== FOSSO alcancavel - medido =====');
  for (const p of Object.keys(melhor).map((k) => k.split('@')[0]).filter((v, i, a) => a.indexOf(v) === i).sort()) {
    const alc = new Set(); const medidas = new Set(); const estados = {};
    for (const k of Object.keys(melhor)) {
      if (!k.startsWith(p + '@')) continue;
      const b = melhor[k].b;
      const c = b.censo || {};
      for (const x of [...(c.barra || []), ...(c.gaveta || [])]) if (x.route && x.route !== 'more') alc.add(x.route);
      for (const [r, v] of Object.entries(b.seccoes || {})) {
        if (!v) continue;
        if (v.painel) medidas.add(r); else estados[r] = (estados[r] || new Set()).add(v.gaveta_nao_abriu ? 'gaveta_nao_abriu' : v.nao_tocavel || 'sem_painel');
      }
    }
    const fosso = [...alc].filter((r) => !medidas.has(r)).sort();
    console.log(`${p}: alcançáveis ${alc.size} · medidas ${medidas.size} · fosso ${fosso.length}${fosso.length ? ' → ' + fosso.map((r) => r + '[' + [...(estados[r] || ['sem registo de seccao na banda'])].join('/') + ']').join(' ') : ''}`);
  }
}
