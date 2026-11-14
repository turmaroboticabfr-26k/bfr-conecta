import fs from 'node:fs';
import crypto from 'node:crypto';

const dir = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const candDir = `${dir}/bfr-candidata-v119-supervisao-embed`;
const basePath = `${dir}/ar-shell.html`;
const candPath = `${candDir}/index.html`;

const LIVE_MD5 = 'ae59d35346b685b2fbf9d18ade4fa5cd';
const LIVE_BYTES = 3489467;
const OLD = 'school_id,schools(name)';
const NEW = 'school_id,sports_schools(name)';
const TARGET_LINE = 23684;

const md5 = b => crypto.createHash('md5').update(b).digest('hex');
const die = m => { console.error(`ABORTO: ${m}`); process.exit(1); };

const base = fs.readFileSync(basePath, 'utf8');
const baseBuf = fs.readFileSync(basePath);
if (md5(baseBuf) !== LIVE_MD5) die(`base md5 ${md5(baseBuf)} != ar ${LIVE_MD5}`);
if (baseBuf.length !== LIVE_BYTES) die(`base bytes ${baseBuf.length} != ${LIVE_BYTES}`);

const lines = base.split('\n');
if ((base.match(/school_id,schools\(name\)/g) || []).length !== 1) die('token velho nao e unico');
if ((base.match(/school_id,sports_schools\(name\)/g) || []).length !== 0) die('token novo ja existe na base');
const hitLine = lines.findIndex(l => l.includes(OLD)) + 1;
if (hitLine !== TARGET_LINE) die(`token na linha ${hitLine}, esperado ${TARGET_LINE}`);

const cand = base.replace(OLD, NEW);
fs.writeFileSync(candPath, cand, 'utf8');

const candBuf = fs.readFileSync(candPath);
console.log(`base        ${baseBuf.length} B md5 ${md5(baseBuf)} (linha ${lines.length})`);
console.log(`candidata   ${candBuf.length} B md5 ${md5(candBuf)} (linha ${cand.split('\n').length})`);
console.log(`delta       ${candBuf.length - baseBuf.length} B`);
console.log(`\nhunk na linha ${TARGET_LINE} (pos ${lines[TARGET_LINE - 1].indexOf(OLD)}):`);
console.log(`  antes: ...${lines[TARGET_LINE - 1].slice(150, 240)}`);
console.log(`  depois: ...${cand.split('\n')[TARGET_LINE - 1].slice(150, 247)}`);
console.log(`\ngravado em ${candPath}`);
