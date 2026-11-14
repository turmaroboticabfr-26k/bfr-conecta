// H4/H5-2 (#1167) — gera a candidata v121 sobre a v120 congelada. UM hunk no mapa accountLabels.
// H5 = o chip da conta lê o fallback parent ('Responsável') porque não há chave education_supervisor.
// H4 foi MEDIDO como falso alarme (syncRoleNavigation :10434 re-escreve o menu depois do toggle :10425),
// portanto não entra hunk de menu. NAO escreve no ar: cria apenas bfr-candidata-v121-rotulos-supervisor/index.html.
import fs from 'node:fs';
import crypto from 'node:crypto';

const dir = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const baseDir = `${dir}/bfr-candidata-v120-setrole-supervisor`;
const candDir = `${dir}/bfr-candidata-v121-rotulos-supervisor`;
const basePath = `${baseDir}/index.html`;
const candPath = `${candDir}/index.html`;
const REGUA = JSON.parse(fs.readFileSync(`${baseDir}/portoes-v120-diary.json`, 'utf8'));
const MED = JSON.parse(fs.readFileSync(`${dir}/evidence/h45-medicao-diary.json`, 'utf8'));

const md5 = s => crypto.createHash('md5').update(s).digest('hex');
const die = m => { console.error(`ABORTO: ${m}`); process.exit(1); };

// régua nunca dactilografada: md5/bytes vêm do diário dos portões da v120, linhas do diário da medição
const BASE_MD5 = REGUA.candidate_md5;
const BASE_BYTES = REGUA.candidate_bytes;
const BASE_LINES = MED.bytes.candidata_v120.linhas;

if (MED.veredito !== 'H45_MEDICAO_OK') die(`medição H4/H5 não está verde: ${MED.veredito}`);
if (MED.falhas.length !== 0) die(`medição tem vermelhos: ${MED.falhas.join(',')}`);

const baseBuf = fs.readFileSync(basePath);
if (md5(baseBuf) !== BASE_MD5) die(`base md5 ${md5(baseBuf)} != régua ${BASE_MD5}`);
if (baseBuf.length !== BASE_BYTES) die(`base bytes ${baseBuf.length} != régua ${BASE_BYTES}`);
const base = baseBuf.toString('utf8');
const bl = base.split('\n');
if (bl.length !== BASE_LINES) die(`base linhas ${bl.length} != régua ${BASE_LINES}`);

// os dois rótulos são LIDOS dos bytes, nunca batidos à mão
const lMapa = MED.h5.linha_accountLabels;
const mapaTexto = bl[lMapa - 1];
if (!mapaTexto || !mapaTexto.includes('const accountLabels = {')) die(`linha ${lMapa} não é o mapa accountLabels`);
const parSecretaria = /(secretary:\['[^']*','[^']*'\],)/.exec(mapaTexto);
if (!parSecretaria) die('par do secretary nao encontrado no mapa');
const H_OLD = parSecretaria[1];

const rotuloPapel = (() => {
  for (let j = 0; j < bl.length; j++) {
    const m = /\['education_supervisor',\s*'([^']+)'\]/.exec(bl[j]);
    if (m) return { linha: j + 1, texto: m[1] };
  }
  return null;
})();
if (!rotuloPapel) die('rotulo do papel nao encontrado nos bytes');
if (rotuloPapel.linha !== MED.h5.rotulo_oficial_do_app.linha || rotuloPapel.texto !== MED.h5.rotulo_oficial_do_app.rotulo)
  die(`rotulo lido :${rotuloPapel.linha} ${rotuloPapel.texto} != medido :${MED.h5.rotulo_oficial_do_app.linha} ${MED.h5.rotulo_oficial_do_app.rotulo}`);

const nomeAba = (() => {
  const j = bl.findIndex(l => l.includes('function supervisaoMarkup('));
  if (j < 0) return null;
  const m = /bfr-secretary-label">([^<]+)</.exec(bl[j]);
  return m ? { linha: j + 1, texto: m[1] } : null;
})();
if (!nomeAba) die('rotulo da aba Supervisao nao encontrado nos bytes');

const H_NEW = `${H_OLD} education_supervisor:['${nomeAba.texto}','${rotuloPapel.texto}'],`;
const n = (s, t) => s.split(t).length - 1;

if (n(base, H_OLD) !== 1) die(`ancora ocorre ${n(base, H_OLD)}x, esperado 1`);
if (n(base, H_NEW) !== 0) die('token novo ja existe na base');
if (mapaTexto.includes("education_supervisor:['")) die('o mapa ja tinha chave education_supervisor');
const hit = bl.findIndex(l => l.includes(H_OLD)) + 1;
if (hit !== lMapa) die(`ancora na linha ${hit}, esperado ${lMapa}`);
if (H_NEW.includes(undefined) || /undefined|null|NaN/.test(H_NEW)) die(`hunk novo carrega valor invalido: ${H_NEW}`);

if (!fs.existsSync(candDir)) fs.mkdirSync(candDir, { recursive: true });
const cand = base.replace(H_OLD, H_NEW);
fs.writeFileSync(candPath, cand, 'utf8');

const candBuf = fs.readFileSync(candPath);
const cl = cand.split('\n');
console.log(`base        ${baseBuf.length} B md5 ${md5(baseBuf)} linhas ${bl.length}`);
console.log(`candidata   ${candBuf.length} B md5 ${md5(candBuf)} linhas ${cl.length}`);
console.log(`delta       ${candBuf.length - baseBuf.length} B  (puro texto, linha unica)`);
const diffLines = [];
for (let i = 0; i < Math.max(cl.length, bl.length); i++) if (cl[i] !== bl[i]) diffLines.push(i + 1);
console.log(`linhas alteradas [${diffLines.join(',')}]`);
console.log(`\nrótulos lidos dos bytes:  [0] '${nomeAba.texto}' (:${nomeAba.linha})  [1] '${rotuloPapel.texto}' (:${rotuloPapel.linha})`);
console.log(`\nH1 linha ${lMapa}:`);
console.log(`  antes : ...${H_OLD}`);
console.log(`  depois: ...${H_NEW}`);
console.log(`\ngravado em ${candPath}`);
