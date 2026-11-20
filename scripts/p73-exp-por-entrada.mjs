// P73-S2 — corrigendo a minha propria regua: `p73-estado-das-cadeias.mjs` deduplicava por hash do refresh
// token e guardava o `exp` VISTO POR ULTIMO, logo um acesso ainda valido podia ficar escondido atras dum
// registo mais velho do mesmo token de refresh. Aqui nao ha deduplicacao: cada entrada de cada ficheiro e
// medida por si, e para cada papel fica o maior `exp` e quantas entradas estao vivas. So-leitura, 0 escrita.
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const REPO = `${DIR}/bfr-conecta`;
const OUT = `${REPO}/evidence/p73-exp-por-entrada-19-11.json`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — renomeie como ANTERIOR e re-corra');
const dsrc = readFileSync(`${REPO}/scripts/ah2-varredura.mjs`, 'utf8');
const mT = /const TODOS\s*=\s*\[([^\]]*)\]/.exec(dsrc);
if (!mT) throw new Error('ABORTA: enum de perfis nao lido de ah2-varredura.mjs');
const PAPEIS = [...mT[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
const agora = Math.floor(Date.now() / 1000);
const expDoJWT = (t) => { try { return JSON.parse(Buffer.from(String(t).split('.')[1], 'base64url').toString('utf8')).exp; } catch { return null; } };
const ficheiros = readdirSync(DIR).filter((f) => /^ah2-sess/.test(f) && f.endsWith('.json')).sort();
const por_papel = {}; const nao_decifraveis = [];
for (const f of ficheiros) {
  let j; try { j = JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8')); } catch { continue; }
  for (const p of PAPEIS) {
    const s = j[p]; if (!s || !s.access_token) continue;
    const exp = expDoJWT(s.access_token);
    if (exp === null) { nao_decifraveis.push({ ficheiro: f, papel: p }); continue; }
    const v = (por_papel[p] = por_papel[p] || { entradas: 0, vivas: 0, exp_max: 0 });
    v.entradas++; if (exp > agora) v.vivas++; v.exp_max = Math.max(v.exp_max, exp);
  }
}
const linhas = []; let vivos = 0;
for (const p of PAPEIS) {
  const v = por_papel[p] || { entradas: 0, vivas: 0, exp_max: 0 };
  if (v.vivas > 0) vivos++;
  linhas.push((v.vivas ? 'VERDE  ' : 'VERMELHO ') + p.padEnd(21) + ' entradas=' + v.entradas + ' acessos_vivos=' + v.vivas + ' exp_max_em_s=' + (v.exp_max ? v.exp_max - agora : '-'));
  console.log(linhas[linhas.length - 1]);
}
const sem = PAPEIS.filter((p) => !por_papel[p] || !por_papel[p].vivas);
writeFileSync(OUT, JSON.stringify({ programa: 'scripts/p73-exp-por-entrada.mjs', em: new Date().toISOString(), agora_epoch: agora, ficheiros: ficheiros.length, por_papel, nao_decifraveis: nao_decifraveis.length, papeis_vivos: vivos, sem_acesso_vivo: sem }, null, 2) + '\n');
console.log('PAPEIS COM PELO MENOS UM ACESSO VIVO: ' + vivos + '/' + PAPEIS.length + ' · SEM: ' + (sem.join(',') || 'nenhum') + ' · entradas nao decifraveis=' + nao_decifraveis.length);
console.log('registo ' + OUT);
