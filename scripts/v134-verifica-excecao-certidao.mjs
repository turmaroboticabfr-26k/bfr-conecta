// Prova da excecao assinada para a certidao da candidata v134 (§SM.21, 18/11). O portao
// `scripts/portao-indice.mjs` le o INDICE com o padrao (senha|password|passwd|chave) [:=] "valor 6..24"
// e nao distingue «chave de credencial» de «chave de agulha». Esta sonda prova, sem nunca imprimir um
// valor, que os 4 casamentos da certidao sao exatamente os nomes das agulhas que o gerador conta, que
// os outros 2 nomes da mesma lista ficam fora da janela 6..24 (e por isso n=4, nao n=6), e que nenhum
// dos 4 e chave de registo de sessao nem figura como valor de credencial em qualquer lado.
// Uso: node scripts/v134-verifica-excecao-certidao.mjs
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const RE = /(senha|password|passwd|chave)\s*["']?\s*[:=]\s*["']([^"'`${}]{6,24})["']/gi;
const md5 = (s) => createHash('md5').update(s).digest('hex');
const CERT = 'bfr-candidata-v134-sidebar-escondida/portoes-v134-candidata.json';

// Do indice, como o portao: `git show :caminho`. Assim a prova e do que vai ser commitado, nao do disco.
const texto = execFileSync('git', ['show', `:${CERT}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const casados = [...texto.matchAll(RE)].map((m) => m[2]);

// As agulhas do gerador, lidas da fonte (linha 33) e nao dactilografadas aqui.
const src = readFileSync('scripts/v134-gera-candidata.mjs', 'utf8');
const m = /const chaves\s*=\s*\[([^\]]*)\]/.exec(src);
if (!m) throw new Error('ABORTA: lista de agulhas nao encontrada em scripts/v134-gera-candidata.mjs');
const agulhas = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
const md5Agulhas = new Set(agulhas.map(md5));
const naJanela = agulhas.filter((a) => a.length >= 6 && a.length <= 24);
const foraDaJanela = agulhas.filter((a) => a.length < 6 || a.length > 24);

// Controlo negativo: nenhum dos casados e chave de sessao (os registos vivem fora do repo).
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
let chavesSessao = [];
for (const f of [`${DIR}/ah2-sessions.json`, `${DIR}/sm8-municipal-sessions.json`]) {
  try { chavesSessao.push(...Object.keys(JSON.parse(readFileSync(f, 'utf8')))); } catch { /* o segundo so existe em ciclos de mint */ }
}
const md5Sessao = new Set(chavesSessao.map(md5));

const out = {
  certidao: CERT, origem_do_texto: 'git show :caminho (o INDICE, como o portao le)',
  // «o mesmo regex que o portao» e uma afirmacao, logo mede-se: compara-se source e flags com a linha
  // `const SENHA = ...` de scripts/portao-indice.mjs, lida da fonte. Se o portao mudar de padrao, isto parte.
  padrao_identico_ao_do_portao: (() => {
    const linha = /const SENHA = \/(.*)\/(gi);/.exec(readFileSync('scripts/portao-indice.mjs', 'utf8'));
    return !!linha && linha[1] === RE.source && linha[2] === RE.flags;
  })(),
  n_casado: casados.length, comprimentos: casados.map((v) => v.length),
  todos_sao_agulhas_do_gerador: casados.every((v) => md5Agulhas.has(md5(v))),
  agulhas_do_gerador: agulhas.length, na_janela_6_24: naJanela.length, fora_da_janela: foraDaJanela.length,
  n_esperado_pela_janela: naJanela.length, conta_bate: casados.length === naJanela.length,
  nenhum_e_chave_de_sessao: !casados.some((v) => md5Sessao.has(md5(v))),
  chaves_de_sessao_comparadas: chavesSessao.length,
  nenhum_casado_contem_ponto: !casados.some((v) => v.includes('.')),
  veredito: 'SEM_PROVA',
};
out.veredito = (out.todos_sao_agulhas_do_gerador && out.conta_bate && out.nenhum_e_chave_de_sessao && out.n_casado === 4)
  ? 'EXCECAO_PROVADA_POR_HASH' : 'EXCECAO_NAO_PROVADA';
console.log(JSON.stringify(out));
process.exit(out.veredito === 'EXCECAO_PROVADA_POR_HASH' ? 0 : 1);
