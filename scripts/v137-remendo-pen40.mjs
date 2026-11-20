// V137 — remendo PEN-40 no módulo de apresentação responsiva (bfr-responsive-presentation.js).
// Diagnóstico medido 19/11: sob o churn contínuo do monitor (~199 lotes de mutação/s), o debounce
// de 60 ms é rearmado para sempre e o sync() — que monta a barra de baixo — morre de fome
// (2 361 armed / 0 won a 320 px). O teto de 250 ms já disparava, mas só pintava o realce
// (paintHighlight), que pinta sobre uma barra inexistente.
// Remendo: no teto, além do realce, garante o chrome montado — ensureChromeMontado() só age quando
// a shell está ready, a media é mobile e falta appbar/gaveta/barra; ensureMobileChrome e createNav
// são idempotentes e guardados por existência, então o teto continua barato e não amplifica o churn.
// 0 deploy, 0 DDL, 0 escrita no ar. Única escrita: bfr-candidata-v137-remendo-pen40/ (módulo +
// portões). Se o diretório já existir, verifica byte a byte; se diferir, ABORTA.
// O index.html NÃO muda (a v136 publicada serve o módulo com ?v=14 e o fetch é network-first);
// o bump da etiqueta do SW (v136→v137) é feito pelo v137-gera-bundle.mjs.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const ORIGEM = `${DIR}/app/bfr-responsive-presentation.js`;
const DEPLOY = `${DIR}/worker-deploy-v136-secretaria-de-educacao/public/bfr-responsive-presentation.js`;
const PARA = `${DIR}/bfr-candidata-v137-remendo-pen40`;
const EV_OUT = `${DIR}/evidence/v137-remendo-pen40-20-11.json`;
const EV_TXT = `${DIR}/evidence/v137-remendo-pen40-20-11.txt`;
const EV_OUT_V = `${DIR}/evidence/v137-remendo-pen40-20-11-VERMELHO.json`;
const EV_TXT_V = `${DIR}/evidence/v137-remendo-pen40-20-11-VERMELHO.txt`;
const MD5_ORIGEM = 'a83f77baba7453851b287080686c7afb'; // medido 19/11: app/ == public/ da v136, byte a byte
if ([EV_OUT, EV_TXT, EV_OUT_V, EV_TXT_V].some((f) => fs.existsSync(f)))
  throw new Error('ABORTA: artefacto de evidência já existe — renomeie como ANTERIOR e re-corra');

const md5 = (b) => crypto.createHash('md5').update(b).digest('hex');
const count = (t, x) => t.split(x).length - 1;
const bytes = (s) => Buffer.byteLength(s, 'utf8');

let portao = 0; const falhas = [];
const G = (nome, ok, dado) => {
  portao++;
  if (!ok) { falhas.push(nome); console.log(`VERMELHO ${nome} :: ${JSON.stringify(dado).slice(0, 220)}`); }
  else console.log(`verde ${nome}`);
};

const antes = fs.readFileSync(ORIGEM, 'utf8');

// ---- o par de/para (uma única substituição) ----
const DE = '  const pintaSozinho = () => { timer = null; desde = Date.now(); paintHighlight(); };';
const PARA_BLOCO = `  // PEN-40: sob churn contínuo o debounce nunca vence e o sync() — que monta a barra — nunca
  // corre. O teto (250 ms) já pinta o realce; agora também garante o chrome montado quando ele
  // ainda não nasceu. ensureMobileChrome e createNav são idempotentes e guardados por existência:
  // o teto continua barato, sem amplificar o churn que o dispara. O resto do sync fica para o
  // primeiro sossego.
  const pintaSozinho = () => { timer = null; desde = Date.now(); paintHighlight(); ensureChromeMontado(); };
  function ensureChromeMontado() {
    const shell = app();
    if (!shell || !shell.classList.contains('ready') || !mobile.matches) return;
    if (!document.getElementById('bfrMobileBottomNav') || !document.getElementById('bfrMobileAppbar') || !document.getElementById('bfrMobileDrawer')) {
      ensureMobileChrome();
      createNav();
    }
  }`;

// ---- portões «antes» ----
G('V137_C0_origem_e_o_module_do_repo', md5(Buffer.from(antes, 'utf8')) === MD5_ORIGEM,
  { md5: md5(Buffer.from(antes, 'utf8')), bytes: bytes(antes) });
G('V137_C1_deploy_public_v136_byte_a_byte', md5(fs.readFileSync(DEPLOY)) === MD5_ORIGEM,
  { md5: md5(fs.readFileSync(DEPLOY)), bytes: fs.statSync(DEPLOY).size });
G('V137_A_bloco_velho_dispara_exactamente_1x', count(antes, DE) === 1, { medido: count(antes, DE), esperado: 1 });
G('V137_A_ensureChromeMontado_ainda_nao_existe', count(antes, 'ensureChromeMontado') === 0, { medido: count(antes, 'ensureChromeMontado') });
G('V137_A_chamadas_atuais', {
  ensureMobileChrome_call: count(antes, 'ensureMobileChrome();'),
  createNav_call: count(antes, 'createNav();'),
  paintHighlight_call: count(antes, 'paintHighlight();'),
  pintaSozinho: count(antes, 'pintaSozinho'),
}, { ensureMobileChrome_call: 1, createNav_call: 1, paintHighlight_call: 1, pintaSozinho: 2 });

// ---- cirurgia ----
const depois = antes.split(DE).join(PARA_BLOCO);

// ---- portões «depois» ----
G('V137_D_bloco_velho_sumiu', count(depois, DE) === 0, { sobras: count(depois, DE), esperado: 0 });
G('V137_D_ensureChromeMontado_declarada_e_chamada', count(depois, 'ensureChromeMontado') === 2, { medido: count(depois, 'ensureChromeMontado'), esperado: 2 });
G('V137_D_chamadas_novas', {
  ensureMobileChrome_call: count(depois, 'ensureMobileChrome();'),
  createNav_call: count(depois, 'createNav();'),
  paintHighlight_call: count(depois, 'paintHighlight();'),
  pintaSozinho: count(depois, 'pintaSozinho'),
}, { ensureMobileChrome_call: 2, createNav_call: 2, paintHighlight_call: 1, pintaSozinho: 2 });

// ---- controlos negativos: o que NÃO pode mudar ----
const NAO_MUDA = [
  ['debounce_dispara', 'const dispara = () => { timer = null; desde = 0; sync(); };'],
  ['piso_teto', 'const PISO = 60, TETO = 250;'],
  ['clear_timeout', 'if (timer) clearTimeout(timer);'],
  ['armar_timer', 'timer = setTimeout(dispara, PISO);'],
  ['chamada_no_teto', '{ pintaSozinho(); return; }'],
  ['decl_paint', 'function paintHighlight()'],
  ['decl_createNav', 'function createNav()'],
  ['decl_ensureMobileChrome', 'function ensureMobileChrome()'],
  ['observer', 'new MutationObserver(schedule)'],
  ['listener_ready', "window.addEventListener('bfr:app-ready', schedule);"],
  ['listener_navigation', "window.addEventListener('bfr:navigation', schedule);"],
];
for (const [nome, alvo] of NAO_MUDA) {
  const a = count(antes, alvo), d = count(depois, alvo);
  G(`V137_K_${nome}`, a === 1 && d === 1, { antes: a, depois: d, esperado: 1 });
}

// ---- delta de bytes exacto ----
const deltaEsperado = bytes(PARA_BLOCO) - bytes(DE);
const deltaMedido = bytes(depois) - bytes(antes);
G('V137_B_delta_de_bytes', deltaMedido === deltaEsperado, { medido: deltaMedido, esperado: deltaEsperado });

// ---- sintaxe: o módulo remendado tem de compilar ----
const tmp = `${DIR}/bfr-candidata-v137-remendo-pen40.module-check.tmp.mjs`;
fs.writeFileSync(tmp, depois);
const chk = spawnSync(process.execPath, ['--check', tmp], { encoding: 'utf8' });
const compila = chk.status === 0;
const erroCompil = compila ? null : (chk.stderr || chk.stdout || '').trim();
fs.unlinkSync(tmp);
G('V137_S_module_remendado_compila', compila, { erro: erroCompil });

// ---- escrita (ou verificação) do diretório da candidata ----
let escrita = 'verificado_sem_reescrever';
if (fs.existsSync(PARA)) {
  const ja = fs.readFileSync(`${PARA}/bfr-responsive-presentation.js`, 'utf8');
  G('V137_W_directorio_ja_existia_verificado_igual', ja === depois,
    { md5_disco: md5(Buffer.from(ja, 'utf8')), md5_novo: md5(Buffer.from(depois, 'utf8')) });
} else {
  fs.mkdirSync(PARA, { recursive: true });
  fs.writeFileSync(`${PARA}/bfr-responsive-presentation.js`, depois);
  escrita = 'agora';
  G('V137_W_escrita_e_leitura_bate', fs.readFileSync(`${PARA}/bfr-responsive-presentation.js`, 'utf8') === depois,
    { bytes: bytes(depois) });
}

const out = {
  version: 'v137', em: new Date().toISOString(), escrita,
  pen: 'PEN-40 (barra mobile morre de fome sob churn: teto de 250 ms passa a montar o chrome quando falta)',
  origem: { dir: 'app', ficheiro: 'bfr-responsive-presentation.js', md5: md5(Buffer.from(antes, 'utf8')), bytes: bytes(antes) },
  deploy_comparado: { dir: 'worker-deploy-v136-secretaria-de-educacao/public', md5: md5(fs.readFileSync(DEPLOY)), byte_a_byte_com_a_origem: true },
  saida: { dir: PARA.split('/').pop(), ficheiro: 'bfr-responsive-presentation.js', md5: md5(Buffer.from(depois, 'utf8')), bytes: bytes(depois) },
  remendo: { de: DE, para: PARA_BLOCO, delta_bytes: deltaMedido },
  controlos_negativos: NAO_MUDA.map(([nome]) => nome),
  index_html_intocado: true,
  delta_bytes: deltaMedido,
  portoes: `${portao}/${falhas.length}`,
  veredito: falhas.length ? `V137_REMENDO_FALHOU ${portao}/${falhas.length}` : `V137_REMENDO_OK ${portao}/${falhas.length}`,
};
fs.writeFileSync(`${PARA}/portoes-v137-remendo-pen40.json`, JSON.stringify(out, null, 2) + '\n');
const linhas = [
  out.veredito,
  `origem=${out.origem.md5} (${out.origem.bytes} B)  saida=${out.saida.md5} (${out.saida.bytes} B)  delta=${out.delta_bytes} B`,
  `escrito ${PARA}/portoes-v137-remendo-pen40.json`,
];
if (falhas.length) {
  linhas.push('VERMELHOS: ' + falhas.join(', '));
  fs.writeFileSync(EV_OUT_V, JSON.stringify(out, null, 2) + '\n');
  fs.writeFileSync(EV_TXT_V, linhas.join('\n') + '\nnode_exit=1\n');
  console.log('VERMELHOS: ' + falhas.join(', '));
  process.exit(1);
}
fs.writeFileSync(EV_OUT, JSON.stringify(out, null, 2) + '\n');
fs.writeFileSync(EV_TXT, linhas.join('\n') + '\nnode_exit=0\n');
console.log(`escrito ${PARA}/portoes-v137-remendo-pen40.json`);
console.log(`${out.veredito}  md5=${out.saida.md5}  ${out.saida.bytes} B  (origem ${out.origem.md5} ${out.origem.bytes} B, delta=${out.delta_bytes} B)`);
process.exit(0);
