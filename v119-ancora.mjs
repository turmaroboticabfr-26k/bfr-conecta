import fs from 'node:fs';
import crypto from 'node:crypto';

const dir = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const md5 = b => crypto.createHash('md5').update(b).digest('hex');
const base = fs.readFileSync(`${dir}/ar-shell.html`, 'utf8');
const lines = base.split('\n');

console.log(`ar-shell.html bytes ${Buffer.byteLength(base)} md5 ${md5(base)} linhas ${lines.length}`);
const OLD = 'school_id,schools(name)';
const NEW = 'school_id,sports_schools(name)';
for (const [label, tok] of [['velho', OLD], ['novo', NEW]]) {
  const hits = [];
  lines.forEach((l, i) => { if (l.includes(tok)) hits.push(i + 1); });
  console.log(`token ${label} '${tok}': ${(tok === OLD ? base.split(OLD).length - 1 : base.split(NEW).length - 1)} ocorrencias, linhas ${hits.join(',') || '-'}`);
}
const ln = lines.findIndex(l => l.includes(OLD)) + 1;
console.log(`\nlinha alvo = ${ln}`);
for (let i = ln - 3; i <= ln + 2; i++) {
  const mark = i === ln ? '>>' : '  ';
  console.log(`${mark} ${i}: ${String(lines[i - 1]).slice(0, 260)}`);
}
const l = lines[ln - 1];
console.log(`\ntoken na linha: count=${l.split(OLD).length - 1} | pos do 1o=${l.indexOf(OLD)}`);
console.log(`prefixo 60 antes: ${JSON.stringify(l.slice(Math.max(0, l.indexOf(OLD) - 60), l.indexOf(OLD)))}`);
console.log(`sufixo 60 depois: ${JSON.stringify(l.slice(l.indexOf(OLD) + OLD.length, l.indexOf(OLD) + OLD.length + 60))}`);
console.log(`comprimento linha: base ${l.length} -> candidata ${l.length + NEW.length - OLD.length}`);
