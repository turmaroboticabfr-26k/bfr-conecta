// H4/H5-1 (#1166) — mede, nos bytes DO AR, os dois resíduos registrados contra a v120.
// Somente leitura: 0 deploy, 0 mint, 0 DDL, 0 INSERT, 0 escrita no backend, 0 alteração de candidata.
// H4 = «o item Secretaria do menu fica oculto para education_supervisor (:10425)»; H5 = «accountLabels
// (:10437) não tem a chave education_supervisor, logo o chip da conta lê Responsável (:10438/:10440)».
// Nada aqui é dactilografado da memória: os alvos vêm do diário de publicação e da régua da candidata;
// os números de tela vêm do diário da bancada v3, já executado sobre estes mesmos bytes.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const CAND120 = `${DIR}/bfr-candidata-v120-setrole-supervisor`;
const REGUA = JSON.parse(readFileSync(`${CAND120}/portoes-v120-diary.json`, 'utf8'));
const PUB = JSON.parse(readFileSync(`${DIR}/audit-publicacao-v120.json`, 'utf8'));
const BANCADA = JSON.parse(readFileSync(`${CAND120}/rm17-bancada-v3-diary.json`, 'utf8'));
const BANCADA_SRC = readFileSync(`${CAND120}/rm17-bancada-v3.mjs`, 'utf8');
const AR_HTML = `${DIR}/evidence/h45-ar-v120-shell.html`;
const OUT = `${DIR}/evidence/h45-medicao-diary.json`;

const md5 = b => createHash('md5').update(b).digest('hex');
if (!existsSync(OUT)) {
  if (!existsSync(`${DIR}/evidence`)) mkdirSync(`${DIR}/evidence`, { recursive: true });
} else throw new Error('ABORTA: ' + OUT + ' existe — correr com outro nome');

const parsePar = s => { const m = /^(.*?) \((\d+) B\)$/.exec(s); return { md5: m[1], bytes: Number(m[2]) }; };
const pubDepois = parsePar(PUB.md5.shell_depois);

const ar = readFileSync(AR_HTML);
const candBuf = readFileSync(`${CAND120}/index.html`);
const src = candBuf.toString('utf8');
const L = src.split('\n');
const lineOf = sub => { const i = L.findIndex(l => l.includes(sub)); if (i < 0) return null; return i + 1; };
const occ = sub => src.split(sub).length - 1;
const at = n => (n == null ? null : L[n - 1]);
const trim = (n, k = 260) => { const s = (at(n) || '').trim(); return s.length > k ? s.slice(0, k) + '…' : s; };

// --- H5: a cadeia do rótulo da conta, do mapa ao pixel ---
const lAccountStart = lineOf('const accountLabels = {');
const lAccountUse = lineOf('const account = accountLabels[role]');
const lPaint = lineOf("'.mini-person span:not([style])'");
const mapaTexto = at(lAccountStart) || '';
const chaves = Array.from(mapaTexto.matchAll(/(\w+):\[/g)).map(m => m[1]);
const parParent = /parent:\['([^']*)','([^']*)'\]/.exec(mapaTexto);
const rotuloParent = parParent ? parParent[2] : null;
const parSupervisor = /education_supervisor:\[/.test(mapaTexto);
const fallbackTexto = at(lAccountUse) || '';
const fallbackParent = /accountLabels\.parent/.test(fallbackTexto);
const lPai = lineOf('const profileRoleOptions = [');
const rotuloApp = (() => {
  for (let j = 0; j < L.length; j++) {
    const m = /\['education_supervisor',\s*'([^']+)'\]/.exec(L[j]);
    if (m) return { linha: j + 1, rotulo: m[1] };
  }
  return null;
})();

// --- H4: o toggle do menu e quem o manda embora logo depois ---
const lToggleSecretaria = lineOf(`[data-section="secretaria"]')?.classList.toggle('hidden'`);
const toggleTexto = at(lToggleSecretaria) || '';
const aceitaSupervisor = /'education_supervisor'/.test(toggleTexto);
const lSyncCall = (() => {
  if (lToggleSecretaria == null) return null;
  for (let j = lToggleSecretaria; j < L.length; j++) if (L[j].includes('syncRoleNavigation(')) return j + 1;
  return null;
})();
const lSyncDef = lineOf('function syncRoleNavigation(');
const navQuery = (() => {
  if (lSyncDef == null) return null;
  for (let j = lSyncDef - 1; j < Math.min(L.length, lSyncDef + 14); j++) {
    if (L[j].includes('.nav-item[data-section]')) return { linha: j + 1, texto: L[j].trim().slice(0, 260) };
  }
  return null;
})();
const lAccess = lineOf('const roleSectionAccess = {');
const accessDoPapel = (() => {
  if (lAccess == null) return null;
  for (let j = lAccess - 1; j < Math.min(L.length, lAccess + 40); j++) {
    const m = /education_supervisor:\s*\[([^\]]*)\]/.exec(L[j]);
    if (m) return { linha: j + 1, secoes: m[1].split(',').map(s => s.trim().replace(/'/g, '')).filter(Boolean) };
  }
  return null;
})();

// --- as telas: o que a bancada v3 já mediu nestes bytes ---
const viewport = (() => {
  const m = /--window-size=(\d+),(\d+)/.exec(BANCADA_SRC);
  return m ? { largura: Number(m[1]), altura: Number(m[2]), fonte: 'flag do chrome no script da bancada' } : null;
})();
const banda = k => BANCADA.bandas[k];
const telas = {};
for (const k of ['base', 'cand']) {
  const b = banda(k);
  telas[k] = {
    nome: b.nome, md5_servido: b.md5_servido, bytes_servidos: b.bytes_servidos,
    passos: Object.keys(b).filter(x => /^s\d$/.test(x)).sort().map(s => {
      const m = b[s];
      return {
        passo: s, activeView: m.activeView, runtime_papel: m.runtime_papel,
        item_secretaria_visivel: m.item_secretaria_visivel, supervisao_no_menu: m.supervisao_no_menu,
        aba_supervisao_visivel: m.aba_supervisao_visivel, aba_supervisao_ativa: m.aba_supervisao_ativa,
        chip_conta: m.chip_conta, menu_visivel: m.menu_visivel, secretaryView_hidden: m.secretaryView_hidden,
      };
    }),
  };
}
const candS3 = telas.cand.passos.find(p => p.passo === 's3') || null;
const chipEmTodos = telas.cand.passos.map(p => p.chip_conta);

const lStrong = lineOf("document.querySelector('[data-account-display-name]')?.replaceChildren");
const defPai = L.findIndex(l => /^\s*function preferredDisplayName\(/.test(l));
const fimPai = defPai < 0 ? -1 : defPai + 1 + L.slice(defPai + 1).findIndex(l => /^\s*\}\s*$/.test(l));
const corpoPai = defPai < 0 ? '' : L.slice(defPai, fimPai + 1).join('\n');
const paiSemMapa = defPai >= 0 && fimPai > defPai && !corpoPai.includes('accountLabels') && !corpoPai.includes('role');

const out = {
  ciclo: 'H4/H5-1-MEDICAO', tarefa: '#1166 (RM-1.7, resíduos da v120)', em: new Date().toISOString(),
  escopo: 'somente leitura; 0 deploy, 0 mint, 0 DDL, 0 INSERT; nenhuma candidata alterada',
  origem_dos_alvos: {
    url_ar: PUB.deploy.url,
    shell_depois_publicado: pubDepois,
    regua_candidata: { candidate_md5: REGUA.candidate_md5, candidate_bytes: REGUA.candidate_bytes, hunks: REGUA.hunks },
  },
  bytes: {
    ar: { bytes: ar.length, md5: md5(ar), arquivo: AR_HTML },
    candidata_v120: { bytes: candBuf.length, md5: md5(candBuf), linhas: L.length },
  },
  h5: {
    linha_accountLabels: lAccountStart, linha_uso: lAccountUse, linha_pintura: lPaint,
    chaves_no_mapa: chaves, total_chaves: chaves.length,
    rotulo_parent_2o_elemento: rotuloParent,
    tem_chave_education_supervisor: parSupervisor,
    linha_uso_texto: fallbackTexto.trim().slice(0, 200),
    fallback_e_parent: fallbackParent,
    texto_pintado: trim(lPaint),
    o_segundo_elemento_e_o_que_aparece: occ('account[1]') === 1 && occ('account[0]') === 0,
    conta_pintura_account1: occ('account[1]'), conta_pintura_account0: occ('account[0]'),
    rotulo_oficial_do_app: rotuloApp,
    linha_profileRoleOptions: lPai,
    linha_nome_pintado_no_chip: lStrong,
    nome_do_chip_vem_de: defPai < 0 ? null : `preferredDisplayName :${defPai + 1}-${fimPai + 1}`,
    nome_do_chip_ignora_papel: paiSemMapa,
  },
  h4: {
    linha_toggle: lToggleSecretaria, toggle_texto: trim(lToggleSecretaria),
    toggle_aceita_supervisor: aceitaSupervisor,
    linha_syncRoleNavigation_chamada: lSyncCall, linha_syncRoleNavigation_def: lSyncDef,
    sync_roda_depois_do_toggle: lSyncCall != null && lToggleSecretaria != null && lSyncCall > lToggleSecretaria,
    query_do_nav: navQuery,
    linha_roleSectionAccess: lAccess,
    access_education_supervisor: accessDoPapel,
    access_contem_secretaria: !!(accessDoPapel && accessDoPapel.secoes.includes('secretaria')),
  },
  bancada_v3: { veredito: BANCADA.veredito, portoes: BANCADA.portoes, falhas: BANCADA.falhas, viewport, telas },
  conclusoes: {
    H5: 'CONFIRMADO. O mapa accountLabels tem as chaves medidas acima e nenhuma para education_supervisor; a linha de uso cai no fallback parent (Família BFR / Responsável) e é o 2º elemento do par que o app pinta no chip. O diário da bancada v3 mostra chip_conta = "Responsável" em todos os passos da banda candidata, com o papel real injetado.',
    H4: 'FALSO ALARME na banda medida (desktop 1280x900). O toggle :10425 realmente esconde o item para o papel, mas syncRoleNavigation é chamada depois no mesmo bloco síncrono e re-escreve a visibilidade de todos os .nav-item[data-section] a partir de roleSectionAccess[role], que inclui secretaria para education_supervisor. A bancada mede item_secretaria_visivel = true com runtime_papel = education_supervisor.',
    H4_limite: 'A bancada v3 gravou só a banda desktop (--window-size derivado do script). O menu mobile (.mobile-more-option[data-section], coberto pela mesma query do sync) nunca foi medido com o papel — precisa da bancada nova com as duas bandas.',
  },
  portoes: [],
};

const G = (nome, ok, detail) => { out.portoes.push({ nome, ok: !!ok, detail }); };
G('ar_bate_regua_candidata', md5(ar) === REGUA.candidate_md5, `ar ${md5(ar)} == regua ${REGUA.candidate_md5}`);
G('ar_bate_publicado', md5(ar) === pubDepois.md5 && ar.length === pubDepois.bytes, `ar ${ar.length} B ${md5(ar)}`);
G('ar_bate_candidata_disco', md5(ar) === md5(candBuf) && ar.length === candBuf.length, `candidata ${candBuf.length} B ${md5(candBuf)} linhas ${L.length}`);
G('h5_mapa_tem_12_chaves', chaves.length === 12, chaves.join(','));
G('h5_sem_chave_do_papel', parSupervisor === false, `education_supervisor no mapa: ${parSupervisor}`);
G('h5_fallback_parent', fallbackParent, fallbackTexto.trim().slice(0, 120));
G('h5_so_account1_e_pintado', out.h5.o_segundo_elemento_e_o_que_aparece, `account[1] x${occ('account[1]')} | account[0] x${occ('account[0]')}`);
G('h5_rotulo_do_app_existe', !!rotuloApp, rotuloApp ? `:${rotuloApp.linha} ${rotuloApp.rotulo}` : 'nenhum');
G('h5_nome_do_chip_nao_depende_do_papel', paiSemMapa, defPai < 0 ? 'funcao nao encontrada'
  : `preferredDisplayName :${defPai + 1}-${fimPai + 1} le apenas ${['display_name_custom', 'full_name', 'user_metadata', 'email'].filter(k => corpoPai.includes(k)).join('+')}; nao menciona accountLabels nem role; strong pintado em :${lStrong}`);
G('h4_toggle_esconde_o_papel', aceitaSupervisor === false, trim(lToggleSecretaria, 200));
G('h4_sync_roda_depois', out.h4.sync_roda_depois_do_toggle, `toggle :${lToggleSecretaria} < sync chamada :${lSyncCall}`);
G('h4_sync_cobre_o_menu', !!navQuery, navQuery ? `:${navQuery.linha} ${navQuery.texto.slice(0, 140)}` : 'nenhuma');
G('h4_access_do_papel_tem_secretaria', out.h4.access_contem_secretaria, accessDoPapel ? `:${accessDoPapel.linha} [${accessDoPapel.secoes.join(',')}]` : 'nenhum');
G('bancada_cand_md5_igual_ar', telas.cand.md5_servido === md5(ar), `${telas.cand.md5_servido} em ${telas.cand.bytes_servidos} B`);
G('bancada_h4_vermelho_na_tela', !!(candS3 && candS3.item_secretaria_visivel === true), candS3 ? `s3 item_secretaria_visivel=${candS3.item_secretaria_visivel} papel=${candS3.runtime_papel}` : 'sem s3');
G('bancada_h5_confirmado_na_tela',
  chipEmTodos.every(c => typeof c === 'string' && !c.includes('Supervisor') && c.replace(/ · .*/, '') === rotuloParent) && !!rotuloApp,
  `chip medido = "${chipEmTodos.join(' | " | "')}" | esperado pelo fallback = "${rotuloParent}" | rotulo do papel no app = "${rotuloApp ? rotuloApp.rotulo : '?'}"`);
G('bancada_sem_falha', BANCADA.falhas.length === 0 && BANCADA.veredito === 'RM17_BANCADA_V3_OK', `${BANCADA.veredito} portoes=${BANCADA.portoes}`);
G('viewport_so_um', !!viewport && viewport.largura === 1280, viewport ? `${viewport.largura}x${viewport.altura}` : 'nao gravado');

const vermes = out.portoes.filter(p => !p.ok);
out.veredito = vermes.length === 0 ? 'H45_MEDICAO_OK' : 'H45_MEDICAO_VERMELHO';
out.falhas = vermes.map(v => v.nome);
writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8');

for (const p of out.portoes) console.log(`${p.ok ? 'VERDE   ' : 'VERMELHO'}  ${p.nome}  ${p.detail}`);
console.log(`\nH5 linha accountLabels :${lAccountStart} | uso :${lAccountUse} | pintura :${lPaint}`);
console.log(`H4 toggle :${lToggleSecretaria} -> syncRoleNavigation chamada :${lSyncCall} (def :${lSyncDef})`);
console.log(`bandas medidas: ${Object.keys(telas).map(k => `${k} ${telas[k].md5_servido}`).join(' | ')}`);
console.log(`viewport da bancada v3: ${viewport ? viewport.largura + 'x' + viewport.altura : 'NAO GRAVADO'}`);
console.log(`\n${out.veredito}  portoes=${out.portoes.length} vermelhos=${vermes.length}  ->  ${OUT}`);
process.exit(vermes.length === 0 ? 0 : 1);
