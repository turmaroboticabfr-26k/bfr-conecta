#!/usr/bin/env node
// SM-22 (peca 2, SOMENTE LEITURA): aperta as quatro reguas que a peca 1 deixou cegas ou
// frouxas (PEN-19, PEN-26, PEN-32, PEN-33) e mede o sitio exato das PEN-29/PEN-30.
// Analisa o ficheiro local da candidata v134, depois de PROVAR que ele e byte-idêntico ao
// que a peca 1 apanhou no ar — sem essa identidade, estariamos a ler um disco e a chama-lo
// de estado publicado.
//
// Saida: chaves, comprimentos e mascaras. Nenhum valor literal de chave, nenhum token.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const OUT = join(REPO, 'evidence/sm22-varre-estrutura-18-11b.json');
if (existsSync(OUT)) throw new Error(`ABORTA: ${OUT} existe — correr com outro nome, nao por cima`);

const vivo = JSON.parse(readFileSync(join(REPO, 'evidence/sm22-varre-vivo-pen-18-11b.json'), 'utf8'));
const CAND = join(REPO, 'bfr-candidata-v134-sidebar-escondida/index.html');
const candBuf = readFileSync(CAND);
const candMd5 = createHash('md5').update(candBuf).digest('hex');
const identidade = {
  candidato_md5: candMd5,
  ar_md5_medido_na_peca_1: vivo.identidade.shell_md5,
  byte_identico_ao_ar: candMd5 === vivo.identidade.shell_md5,
  bytes: candBuf.length,
};
if (!identidade.byte_identico_ao_ar) throw new Error(`ABORTA: candidata local ${candMd5} != ar ${vivo.identidade.shell_md5} — nao se pode ler o disco como se fosse o publicado`);

const txt = candBuf.toString('utf8');
const base = readFileSync(join(REPO, 'bfr-candidata-v133-secretaria-municipal/index.html'), 'utf8');
const masc = (s) => s.replace(/[A-Za-z]/g, 'a').replace(/[0-9]/g, '0');

// corpo de funcao/objeto por balanceamento de chavetas, a partir de um anchor
function corpo(anchor, alvo = txt) {
  const i = alvo.indexOf(anchor);
  if (i < 0) return null;
  const abre = alvo.indexOf('{', i);
  if (abre < 0) return null;
  let n = 0;
  for (let k = abre; k < alvo.length; k++) {
    if (alvo[k] === '{') n++;
    else if (alvo[k] === '}') { n--; if (n === 0) return alvo.slice(abre, k + 1); }
  }
  return null;
}

// PEN-32: o mapa real de setRole. A ancora tem de saltar a assinatura: `function setRole(role,
// options = {}) {` — o primeiro `{` a seguir ao anchor e o `{}` do valor por omissao, nao o corpo.
// Mordeu-me aqui: a primeira versao dava corpo de 2 bytes e «chaves=0», que lido as direitas
// significaria «o papel nao existe no mapa» quando a sonda nunca abriu o mapa.
function corpoFuncao(anchor, alvo = txt) {
  const i = alvo.indexOf(anchor);
  if (i < 0) return null;
  const abreParams = alvo.indexOf('(', i);
  let n = 0, k = abreParams;
  for (; k < alvo.length; k++) {
    if (alvo[k] === '(') n++;
    else if (alvo[k] === ')') { n--; if (n === 0) break; }
  }
  const abre = alvo.indexOf('{', k);
  if (abre < 0) return null;
  let m = 0;
  for (let j = abre; j < alvo.length; j++) {
    if (alvo[j] === '{') m++;
    else if (alvo[j] === '}') { m--; if (m === 0) return alvo.slice(abre, j + 1); }
  }
  return null;
}
const setRoleTxt = corpoFuncao('function setRole(') || corpoFuncao('setRole(');
const chavesSetRole = setRoleTxt ? [...setRoleTxt.matchAll(/['"]([a-z][a-z_]{3,26})['"]\s*:/g)].map((m) => m[1]) : [];
const pen32 = {
  ancora_encontrada: !!setRoleTxt,
  chaves: [...new Set(chavesSetRole)],
  tem_education_supervisor: new Set(chavesSetRole).has('education_supervisor'),
  corpo_bytes: setRoleTxt ? Buffer.byteLength(setRoleTxt) : 0,
  papeis_citados_no_corpo: [...new Set((setRoleTxt || '').match(/['"](developer|administrator|principal|secretary|coordenation|coordinator|teacher|student|parent|guardian|inspector|education_supervisor|sports_operator|psychology|social_work|monitor|support|municipal[a-z_]*)['"]/g) || [])].map((s) => s.replace(/['"]/g, '')),
};

// PEN-33: accountLabels — que chave devolve e o que o fallback pinta
const labelsTxt = corpo('accountLabels') || corpo('accountLabels =') || corpo('accountLabels:');
const paresLabels = labelsTxt ? [...labelsTxt.matchAll(/([a-z_]+)\s*:\s*\[([^\]]*)\]/g)].map((m) => ({ chave: m[1], par: m[2].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')) })) : [];
const sup = paresLabels.find((p) => p.chave === 'education_supervisor');
const pen33 = {
  ancora_encontrada: !!labelsTxt,
  n_pares: paresLabels.length,
  chaves: paresLabels.map((p) => p.chave),
  education_supervisor_no_mapa: !!sup,
  rotulo_education_supervisor: sup ? sup.par.join(' | ') : null,
  ocorrencias_de_Responsavel: (txt.match(/Respons/g) || []).length,
};

// PEN-26: todos os registos de SW, com o argumento tal como esta escrito (caminho ou variavel —
// nenhum dos dois e credencial). A verso anterior so casava aspas diretas e deu «0 chamadas»,
// que e uma afirmacao sobre a sonda, nao sobre a shell.
const regs = [...txt.matchAll(/serviceWorker\.register\(\s*([^,)\n]{1,90})/g)].map((m) => m[1].trim());
const swPaths = [...new Set((txt.match(/\/?sw-[A-Za-z0-9._-]+\.js/g) || []))];
const pen26 = {
  chamadas: [...txt.matchAll(/serviceWorker\.register/g)].length,
  argumentos: [...new Set(regs)],
  caminhos_sw_no_shell: swPaths,
  sw_servido_no_ar: vivo.pen26_sw,
};

// PEN-19: escritores periodicos. A casa chama-lhe «escritor periodico navButton (1,2 s)»; o que
// se mede e o periodo de cada setInterval cujo corpo cite o navButton, mais os periodos de 1200.
const corpoNav = [...txt.matchAll(/setInterval\(\s*\(?[\w$]*\)?\s*=>?\s*\{?([\s\S]{0,400}?),\s*(\d+)\s*\)/g)]
  .filter((m) => /navButton/i.test(m[1]))
  .map((m) => ({ periodo_ms: Number(m[2]), corpo_bytes: m[1].length, corpo_mascara: masc(m[1]).slice(0, 60) }));
const pen19 = {
  setInterval_total: (txt.match(/setInterval/g) || []).length,
  periodos_1200: (txt.match(/,\s*1200\s*\)/g) || []).length,
  escritores_navButton: corpoNav,
  mencoes_navButton: (txt.match(/navButton/g) || []).length,
};

// PEN-30 / PEN-29: os sitios exatos, mascados
const selAnn = [...txt.matchAll(/from\(['"]announcements['"]\)\s*\.select\(['"]([^'"]+)['"]\)/g)].map((m) => ({ mascara: masc(m[1]), bytes: m[1].length, pede_created_at: /created_at/.test(m[1]) }));
const fantasma = {};
for (const tab of ['bfr_school_shift_settings', 'bfr_school_calendar_days', 'bfr_school_calendar_month_targets'])
  fantasma[tab] = { from_chamadas: (txt.match(new RegExp(`from\\(['"]${tab}['"]\\)`, 'g')) || []).length, mencoes: (txt.match(new RegExp(tab, 'g')) || []).length };
const pen35 = { marcadore_na_regra_antiga: (txt.match(/body\.scrollWidth[^;]{0,40}innerWidth/g) || []).length, marcadore_na_regra_nova: (txt.match(/clientWidth/g) || []).length };

const out = { em: new Date().toISOString(), identidade, pen32, pen33, pen26, pen19, pen30: selAnn, pen29_fantasma: fantasma, pen35_contagem_clientWidth: pen35, base_v133_setRole_papeis: (() => { const c = corpoFuncao('function setRole(', base); return c ? [...new Set((c.match(/['"](developer|administrator|principal|secretary|coordenation|coordinator|teacher|student|parent|guardian|inspector|education_supervisor|sports_operator|psychology|social_work|monitor|support|municipal[a-z_]*)['"]/g) || []).map((s) => s.replace(/['"]/g, '')))] : null; })() };
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');

console.log(`identidade: ${out.identidade.byte_identico_ao_ar ? 'byte-idêntico ao ar' : 'DIFERENTE'} md5=${candMd5} ${candBuf.length} B`);
console.log(`PEN-32 setRole: ancora=${pen32.ancora_encontrada} corpo=${pen32.corpo_bytes} B chaves_objeto=${pen32.chaves.length} papeis_citados=${pen32.papeis_citados_no_corpo.join(',')} education_supervisor=${pen32.tem_education_supervisor}`);
console.log(`PEN-33 accountLabels: pares=${pen33.n_pares} no_mapa=${pen33.education_supervisor_no_mapa} rotulo=${pen33.rotulo_education_supervisor} ocorrencias_Respons=${pen33.ocorrencias_de_Responsavel}`);
console.log(`PEN-26 serviceWorker: chamadas=${pen26.chamadas} argumentos=${pen26.argumentos.join(',') || 'NENHUM'} caminhos=${pen26.caminhos_sw_no_shell.join(',') || 'NENHUM'} | sw_no_ar status=${pen26.sw_servido_no_ar.status} push=${pen26.sw_servido_no_ar.tem_push} notifclick=${pen26.sw_servido_no_ar.tem_notificationclick}`);
console.log(`PEN-19 setInterval_total=${pen19.setInterval_total} periodos_1200=${pen19.periodos_1200} mencoes_navButton=${pen19.mencoes_navButton} escritores_navButton=${pen19.escritores_navButton.length} periodos=${pen19.escritores_navButton.map((s) => s.periodo_ms).join(',') || '-'}`);
console.log(`PEN-30 sitios from('announcements').select=${selAnn.length} ${JSON.stringify(selAnn)}`);
console.log(`PEN-29 fantasma: ${Object.entries(fantasma).map(([k, v]) => `${k}: from=${v.from_chamadas} mencoes=${v.mencoes}`).join(' · ')}`);
console.log(`chaves setRole na base v133: ${JSON.stringify(out.base_v133_setRole_papeis)}`);
console.log(`\nSM22_ESTRUTURA_OK · registo evidence/sm22-varre-estrutura-18-11b.json`);
