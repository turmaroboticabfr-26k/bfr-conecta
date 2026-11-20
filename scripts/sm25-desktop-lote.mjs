#!/usr/bin/env node
// Lote de celulas desktop para a cobertura de PEN-35: um FILHO por celula (o produtor so
// aguenta uma largura por processo), no maximo 3 em simultaneo, portas separadas e sessao
// por papel. Uso: node scripts/sm25-desktop-lote.mjs papel@largura[,papel@largura[,...]]
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const REPO = DIR + '/bfr-conecta';
const TETO_MS = 300000;
const BASE_PORTA = 9371;
const cells = (process.argv[2] || '').split(',').filter(Boolean).map((c) => {
  const i = c.lastIndexOf('@');
  return { papel: c.slice(0, i), largura: c.slice(i + 1) };
});
if (!cells.length || cells.length > 3 || cells.some((c) => !c.papel || !/^\d{3,4}$/.test(c.largura))) {
  console.error('USO: node scripts/sm25-desktop-lote.mjs papel@largura[,papel@largura[,...]] (max 3, largura 3-4 digitos)');
  process.exit(2);
}
const sessao = (p) => DIR + '/ah2-sessao-' + p + '.json';
for (const c of cells) {
  if (!existsSync(sessao(c.papel))) { console.error('ABORTA: sem sessao para ' + c.papel); process.exit(2); }
  const out = REPO + '/evidence/ah2-mobile2-sm25-' + c.papel + '-' + c.largura + '.json';
  if (existsSync(out)) { console.error('ABORTA: artefacto ja existe - ' + out + ' (re-correr com outro rotulo, nunca por cima)'); process.exit(2); }
}
const filhos = cells.map((c, i) => new Promise((resolve) => {
  const port = String(BASE_PORTA + i);
  const f = spawn(process.execPath, [REPO + '/scripts/ah2-mobile2.mjs', c.papel, c.largura, 'sm25-' + c.papel + '-' + c.largura], {
    cwd: REPO,
    env: { ...process.env, AH2_PORT: port, AH2_TETO_MS: String(TETO_MS), AH2_SESSAO: sessao(c.papel) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let saida = '';
  f.stdout.on('data', (d) => { saida += d; });
  f.stderr.on('data', (d) => { saida += d; });
  f.on('exit', (code) => {
    console.log('FILHO ' + c.papel + '@' + c.largura + ' exit=' + code);
    const linhas = saida.split(/\r?\n/).filter((l) => /PORT|VERMELHO|PARCIAL|veredito|estouro|^\s*\d+px\/|INTERROMPIDA|FALHA|abort|ASSENTOU/i.test(l)).slice(-14);
    console.log(linhas.join('\n'));
    resolve(code || 0);
  });
}));
const r = await Promise.all(filhos);
const ok = r.every((x) => x === 0);
console.log('LOTE exit=' + (ok ? 0 : 1));
process.exit(ok ? 0 : 1);
