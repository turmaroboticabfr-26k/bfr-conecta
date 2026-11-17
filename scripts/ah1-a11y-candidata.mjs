// AH-1 (peça 3) — candidata v126 a11y da secretaria, SEM PUBLICAR. Parte da v123 publicada
// (md5 do worker conferido) e corrige SÓ as classes de defeito MEDIDAS com a conta test do
// ciclo AH-1, régua lida de evidence/ah1-secretaria-navegador-17-11.json:
//   P1  checkboxes 13×13 (tap<44, ×46 em bfrCommunicationView)  → 24×24 (piso WCAG 2.2 AA)
//   P2  .bfr-communication-help 10px                             → 12px
//   P3  <p> do FAQ do ContentHub 10px (×3, regra duplicada no    → 12px
//       bundle: literal <style> + textContent)
//   P4  a.text-button «Telefone não informado» 137×22 (×500 em   → min-height:44px,
//       secretaryView, linhas de responsável)                      display:inline-flex
// 0 DDL, 0 deploy, 0 fixture, 0 credencial. publicado=false até OK literal.
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { criarGates } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const BASE_DIR = 'worker-deploy-v123-pdfs';
const CAND_DIR = 'bfr-candidata-v126-a11y-secretaria';
const DIARIO = 'evidence/ah1-a11y-candidata-17-11.json';
const MEDIDO = 'evidence/ah1-secretaria-navegador-17-11.json';
const BASE_MD5 = '7044c8c02368fbc2a99edc1b366e2326';

const BASE = join(REPO, BASE_DIR);
const CAND = join(REPO, CAND_DIR);
if (existsSync(CAND)) throw new Error(`já existe ${CAND_DIR} — renomeie a candidata anterior com md5 dos dois lados, não por cima`);
if (existsSync(join(REPO, DIARIO))) throw new Error(`já existe ${DIARIO} — renomeie com md5 dos dois lados, não por cima`);

const g = criarGates();
const md5 = (s) => createHash('md5').update(s).digest('hex');
const conta = (t, sub) => t.split(sub).length - 1;

// ═══ régua: o artefacto medido do ciclo AH-1 (não a memória) ═══
const medido = JSON.parse(readFileSync(join(REPO, MEDIDO), 'utf8'));
const abas = medido.stages.abas;
const sec = abas.secretaria, com = abas.comunicacao, cont = abas.conteudos;
g.gate('régua: secretaria 500 taps <44 e amostra é a.text-button 137×22',
  [sec.tap_menor_44, sec.taps_amostra[0]?.tag, sec.taps_amostra[0]?.cls, sec.taps_amostra[0]?.rect],
  [500, 'A', 'text-button', [137, 22]]);
g.gate('régua: comunicacao 46 taps <44 e amostra é INPUT 13×13',
  [com.tap_menor_44, com.taps_amostra[0]?.tag, com.taps_amostra[0]?.rect],
  [46, 'INPUT', [13, 13]]);
g.gate('régua: comunicacao 1 fonte <11 e é .bfr-communication-help a 10px',
  [com.fonte_menor_11, com.fontes_amostra[0]?.cls, com.fontes_amostra[0]?.px],
  [1, 'bfr-communication-help', 10]);
g.gate('régua: conteudos 3 fontes <11 e são <p> sem classe a 10px',
  [cont.fonte_menor_11, cont.fontes_amostra.every(f => f.tag === 'P' && f.cls === '' && f.px === 10)],
  [3, true]);

// ═══ base = a v123 publicada ═══
const baseWorker = readFileSync(join(BASE, 'worker.mjs'), 'utf8');
g.gate('base_e_a_v123_publicada', md5(baseWorker), BASE_MD5);

// ═══ os 4 patches ═══
const P1 = {
  nome: 'checkboxes do comunicado 13×13 → 24×24',
  de: '.bfr-communication-check input{width:auto}',
  para: '.bfr-communication-check input{width:24px;height:24px;min-width:24px;min-height:24px}',
  n: 1,
};
const P2 = {
  nome: '.bfr-communication-help 10px → 12px',
  de: '.bfr-communication-help{padding:11px;border-radius:11px;background:#f4f8ff;color:#506481;font-size:10px;line-height:1.5}',
  para: '.bfr-communication-help{padding:11px;border-radius:11px;background:#f4f8ff;color:#506481;font-size:12px;line-height:1.5}',
  n: 1,
};
const P3 = {
  nome: '<p> do FAQ do ContentHub 10px → 12px (as 2 cópias do CSS no bundle)',
  de: '.bfr-faq p{margin-top:8px;color:#6a817a;font-size:10px;line-height:1.5}',
  para: '.bfr-faq p{margin-top:8px;color:#6a817a;font-size:12px;line-height:1.5}',
  n: 2,
};
const ANCHOR4 = '.restriction-item button { margin-top:8px; }';
const REGRA4 = '\\n        .restriction-item a.text-button { display:inline-flex; align-items:center; min-height:44px; }';
const P4 = {
  nome: 'a.text-button das linhas de responsável 137×22 → alvo de 44px',
  de: ANCHOR4,
  para: ANCHOR4 + REGRA4,
  nova_regra: REGRA4,
  n: 1,
  insercao: true,
};
const patches = [P1, P2, P3, P4];

for (const p of patches) g.gate(`chave_unica_no_base: ${p.nome}`, conta(baseWorker, p.de), p.n);

let novo = baseWorker;
for (const p of patches) {
  if (p.n === 1) novo = novo.replace(p.de, p.para);
  else novo = novo.split(p.de).join(p.para);
}
for (const p of patches) {
  if (p.insercao) {
    g.gate(`insercao_${p.nome}: âncora preservada`, conta(novo, p.de), p.n);
    g.gate(`insercao_${p.nome}: regra nova presente`, conta(novo, p.nova_regra), 1);
  } else {
    g.gate(`substituicao_${p.nome}: chave antiga zerou`, conta(novo, p.de), 0);
    g.gate(`substituicao_${p.nome}: chave nova = ${p.n}`, conta(novo, p.para), p.n);
  }
}

// ═══ censo de fontes: o delta tem de ser exatamente o dos patches ═══
g.gate('censo font-size:10px caiu exatamente 3', conta(baseWorker, 'font-size:10px') - conta(novo, 'font-size:10px'), 3);
g.gate('censo font-size:12px subiu exatamente 3', conta(novo, 'font-size:12px') - conta(baseWorker, 'font-size:12px'), 3);
g.gate('censo font-size:9px/11px intactos',
  [conta(novo, 'font-size:9px'), conta(novo, 'font-size:11px')],
  [conta(baseWorker, 'font-size:9px'), conta(baseWorker, 'font-size:11px')]);

// ═══ escrever a candidata: cópia da v123 com o worker substituído ═══
mkdirSync(CAND, { recursive: true });
cpSync(BASE, CAND, { recursive: true });
writeFileSync(join(CAND, 'worker.mjs'), novo);
const md5Cand = md5(novo);
g.gate('candidata_difere_do_base', md5Cand !== md5(baseWorker), true);
const deltaEsperado = patches.reduce((a, p) => a + (Buffer.byteLength(p.para) - Buffer.byteLength(p.de)), 0);
g.gate('delta_de_bytes_igual_ao_dos_patches', Buffer.byteLength(novo) - Buffer.byteLength(baseWorker), deltaEsperado);

// ═══ reversibilidade ═══
let revertido = novo;
for (const p of patches) {
  if (p.n === 1) revertido = revertido.replace(p.para, p.de);
  else revertido = revertido.split(p.para).join(p.de);
}
g.gate('reversivel_ao_md5_do_base', md5(revertido), md5(baseWorker));

// ═══ árvore byte-a-byte fora do worker ═══
const arvore = (dir, sub = '') => {
  const acc = {};
  for (const f of readdirSync(join(dir, sub))) {
    const r = join(dir, sub, f);
    if (statSync(r).isDirectory()) Object.assign(acc, arvore(dir, join(sub, f)));
    else acc[join(sub, f)] = md5(readFileSync(r));
  }
  return acc;
};
const aBase = arvore(BASE), aCand = arvore(CAND);
g.gate('mesma_lista_de_ficheiros', Object.keys(aCand).sort(), Object.keys(aBase).sort());
g.gate('nada_fora_do_worker_mudou', Object.keys(aBase).filter((f) => aBase[f] !== aCand[f] && !/(^|[\\/])worker\.mjs$/.test(f)), []);

// ═══ autocontrol ═══
const adulterado = baseWorker.replace(P1.de, P1.para.replace('24px', '23px'));
g.gate('autocobranca_mordeu (checkbox adulterado difere)', md5(adulterado) !== md5Cand, true);

// ═══ diário ═══
const { portoes, falhas } = g.resumo();
writeFileSync(join(REPO, DIARIO), JSON.stringify({
  em: new Date().toISOString(),
  ciclo: 'AH-1 peça 3 — candidata v126 a11y da secretaria, sem publicar',
  ok_literal: 'finalize 100 % utilizando uma conta test se for preciso',
  base_dir: BASE_DIR, base_md5: md5(baseWorker),
  candidata_dir: CAND_DIR, candidata_md5: md5Cand,
  regua: MEDIDO,
  delta_bytes: Buffer.byteLength(novo) - Buffer.byteLength(baseWorker),
  patches: patches.map((p) => ({ nome: p.nome, de: p.de, para: p.para, ocorrencias: p.n })),
  fora_de_escopo: [
    'a amostra do navegador tem cap de 12: outras classes <44 além das amostradas podem existir; a candidata corrige apenas as classes medidas',
    '.bfr-upgrade-item p{font-size:10px} (10px latente no ContentHub) não foi tocado: 0 itens visíveis na medição',
    'as 2 seções sem botão de menu no v123 (escola-historia, coordenacao-chat) são achado de navegação, não de a11y — fora desta candidata',
  ],
  publicado: false,
  portoes, falhas,
}, null, 2) + '\n');

for (const f of falhas) console.log('VERMELHO  ' + f);
if (falhas.length === 0) { console.log(`AH1_A11Y_CANDIDATA_VERDE ${portoes} portões / 0 falhas · ${BASE_DIR} → ${CAND_DIR} · publicado=false · diário ${DIARIO}`); process.exit(0); }
console.log(`AH1_A11Y_CANDIDATA_VERMELHA ${falhas.length} falha(s) de ${portoes} portões`);
process.exit(1);
