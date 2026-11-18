// Instrumento de leitura: consolida os factos medidos do ciclo SM-6/SM-4 para o registo da auditoria.
// Não escreve nada, não publica, não corre DDL.
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const RAIZ = new URL('..', import.meta.url);
const j = (p) => JSON.parse(readFileSync(new URL(p, RAIZ), 'utf8'));
const t = (p) => readFileSync(new URL(p, RAIZ), 'utf8');

const fichas = [
  ['evidence/sm6-colunas-e-vinculos-17-11.json'],
  ['evidence/sm6-candidata-municipal-17-11.json'],
  ['evidence/sm6-sonda-splice-17-11.json'],
  ['evidence/sm4-preflight-ddl-municipal-17-11.json'],
  ['evidence/sm6-candidata-municipal-17-11-ANTERIOR-um_body_presumido.json'],
  ['evidence/sm6-candidata-municipal-17-11-ANTERIOR-host-fora-do-seletor-do-mapa.json'],
  ['evidence/sm6-candidata-municipal-17-11-ANTERIOR-prosa_contada_como_uso_de_token.json'],
];
for (const [p] of fichas) {
  if (!existsSync(new URL(p, RAIZ))) { console.log(`${p} :: AUSENTE`); continue; }
  const o = j(p);
  const chaves = Object.keys(o);
  console.log(`\n### ${p}`);
  console.log(`  chaves: ${chaves.join(', ')}`);
  for (const k of chaves) {
    const v = o[k];
    const s = typeof v === 'string' ? v : JSON.stringify(v);
    if (/veredito|resultado|status|ok|SAIDA|SAIDA|saida|autotest|AUTOTEST|resumo/i.test(k) || (s && s.length < 240)) {
      console.log(`  ${k} = ${s && s.length > 230 ? s.slice(0, 230) + '…' : s}`);
    }
  }
}

console.log('\n### selector real de syncRoleNavigation + chaves do mapa (medidas no shell base)');
const base = t('bfr-candidata-v121-rotulos-supervisor/index.html');
const i = base.indexOf('function syncRoleNavigation');
const recorte = base.slice(i, i + 2200);
const sel = recorte.match(/querySelectorAll\('([^']*)'/);
console.log(`  syncRoleNavigation em offset ${i}`);
console.log(`  selector = ${sel ? sel[1] : 'NAO ENCONTRADO'}`);
const k = base.indexOf('roleSectionAccess');
const bloco = base.slice(k, k + 4000);
const abre = bloco.indexOf('{');
let prof = 0, fim = -1;
for (let n = abre; n < bloco.length; n++) {
  if (bloco[n] === '{') prof++;
  else if (bloco[n] === '}') { prof--; if (prof === 0) { fim = n; break; } }
}
const literal = bloco.slice(abre, fim + 1);
const chavesMapa = [...literal.matchAll(/(?:^|[,{])\s*'?([a-z_]+)'?\s*:/gm)].map((m) => m[1]);
console.log(`  roleSectionAccess em offset ${k}; chaves medidas = ${chavesMapa.length}: ${chavesMapa.join(', ')}`);
console.log(`  admin contem secretaria-municipal? ${/admin\s*:\s*\[[^\]]*'secretaria-municipal'/.test(literal)}`);
console.log(`  md5 do literal do mapa = ${createHash('md5').update(literal).digest('hex')}`);
