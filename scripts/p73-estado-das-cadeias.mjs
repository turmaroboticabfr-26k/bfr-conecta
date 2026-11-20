// P73-S — sondagem de estado das cadeias de sessão, só-leitura, antes de pedir qualquer escrita no banco.
// Catorze papéis devolveram `refresh_token_already_used`. Isso NÃO quer dizer «não há sessão»: quer dizer
// «este refresh token já rodou». Um refresh que FALHA não consome nada, por isso varrer todas as cadeias
// distintas em disco é seguro; e enquanto o `exp` do JWT de acesso estiver no futuro o browser pode arrancar
// sem renovar — o que decide se a grelha precisa de mint (escrita) ou só de um instrumento que não renova.
// Nunca imprime um token: só comprimento, prefixo de classe, `exp` lido do JWT e hash de 12 hex da cadeia.
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const REPO = `${DIR}/bfr-conecta`;
const SUF = (process.argv[2] || '19-11').trim();
const OUT = `${REPO}/evidence/p73-estado-das-cadeias-${SUF}.json`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — renomeie como ANTERIOR e re-corra');

const dsrc = readFileSync(`${REPO}/scripts/ah2-varredura.mjs`, 'utf8');
const mT = /const TODOS\s*=\s*\[([^\]]*)\]/.exec(dsrc);
if (!mT) throw new Error('ABORTA: enum de perfis nao lido de ah2-varredura.mjs');
const PAPEIS = [...mT[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);

const hash = (s) => createHash('md5').update(Buffer.from(String(s))).digest('hex').slice(0, 12);
const expDoJWT = (t) => { try { return JSON.parse(Buffer.from(String(t).split('.')[1], 'base64url').toString('utf8')).exp; } catch { return null; } };
const agora = Math.floor(Date.now() / 1000);

const ficheiros = readdirSync(DIR).filter((f) => /^ah2-sess/.test(f) && f.endsWith('.json')).sort();
const saida = { programa: 'scripts/p73-estado-das-cadeias.mjs', em: new Date().toISOString(), agora_epoch: agora, ficheiros_varridos: ficheiros.length, papeis: {} };
const cadeias = {};
for (const f of ficheiros) {
  let j; try { j = JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8')); } catch { continue; }
  for (const p of PAPEIS) {
    const s = j[p]; if (!s || !s.access_token) continue;
    const exp = expDoJWT(s.access_token);
    const chave = hash(s.refresh_token);
    (saida.papeis[p] = saida.papeis[p] || { cadenas_distintas: {}, acessos_validos: 0, exp_mais_tarde: 0, ficheiros: 0 }).ficheiros++;
    saida.papeis[p].cadenas_distintas[chave] = saida.papeis[p].cadenas_distintas[chave] || { vista_em: [], exp: null, expira_em_s: null };
    const reg = saida.papeis[p].cadenas_distintas[chave];
    reg.vista_em.push(f);
    reg.exp = exp; reg.expira_em_s = exp ? exp - agora : null;
    if (exp && exp > agora) { saida.papeis[p].acessos_validos++; saida.papeis[p].exp_mais_tarde = Math.max(saida.papeis[p].exp_mais_tarde, exp - agora); }
  }
}
for (const p of PAPEIS) {
  const v = saida.papeis[p]; if (!v) { saida.papeis[p] = { ausencia_total: true }; continue; }
  const distinta = Object.keys(v.cadenas_distintas);
  v.cadenas_distintas_n = distinta.length;
  v.pode_arrancar_sem_renovar = v.acessos_validos > 0;
  delete v.cadenas_distintas;
  console.log((v.pode_arrancar_sem_renovar ? 'VERDE  ' : 'VERMELHO ') + p.padEnd(21) + ' ficheiros=' + v.ficheiros + ' cadeias_distintas=' + v.cadenas_distintas_n + ' acessos_validos=' + v.acessos_validos + ' exp_mais_tarde=' + v.exp_mais_tarde + 's');
}
const arrancam = PAPEIS.filter((p) => saida.papeis[p] && saida.papeis[p].pode_arrancar_sem_renovar);
const caem = PAPEIS.filter((p) => !saida.papeis[p] || !saida.papeis[p].pode_arrancar_sem_renovar);
saida.resumo = { papeis: PAPEIS.length, arrancam_sem_renovar: arrancam.length, sem_acesso_valido: caem.length, lista_sem_acesso: caem };
writeFileSync(OUT, JSON.stringify(saida, null, 2) + '\n');
console.log('ARRANCAM SEM RENOVAR: ' + arrancam.length + '/' + PAPEIS.length + ' · SEM ACESSO VÁLIDO: ' + (caem.join(',') || 'nenhum'));
console.log(caem.length ? 'P73_ESTADO_COM_FALHAS · registo ' + OUT : 'P73_ESTADO_OK · registo ' + OUT);
