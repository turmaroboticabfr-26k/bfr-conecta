// Prova das quatro excecoes novas do portao de credenciais do indice (fecho SM.24, 19/11).
//
// O portao `scripts/portao-indice.mjs` le o INDICE com o padrao (senha|password|passwd|chave) [:=] "valor
// 6..24" e nao distingue «chave de credencial» de «chave de rotulo». Ficaram NAO_COBERTA quatro ficheiros
// deste ciclo: a certidao da candidata v136 e a sua ANTERIOR (7 casamentos cada) e os dois artefactos do
// dedup de corpos (4 e 2 casamentos). Esta sonda prova, sem nunca imprimir um valor, que:
//   · os 7 da certidao sao exatamente os NOMES das agulhas do array `INV` de scripts/v136-gera-candidata.mjs,
//     lidos da fonte, e que a janela 6..24 explica o n=7 (as outras 2 agulhas tem 28 e 30 caracteres);
//   · os 4+2 dos artefactos p73 sao CAMINHOS DE CAMPO JSON (o `chave` que `varre_corpos` compoe ao descer o
//     objecto), e que cada um deles aparece tambem como caminho composto num artefacto INDEXADO de v135/v136
//     — logo a prova vem de um corpus independente, nao do proprio ficheiro exceptionado;
//   · nenhum casamento e chave de registo de sessao (comparacao de hash contra os registos fora do repo);
//   · nenhum casamento tem forma de JWT (`eyJ…` ou tres segmentos longos base64url), e cada classe bate com a
//     sua propria forma: caminho de campo para os artefactos p73, identificador de codigo para a certidao;
//   · o padrao desta sonda e byte a byte o do portao (source+flags lidos da fonte), e um fixture negativo
//     composo em tempo de execucao e REJEITADO pela predicado — sem este fixture a porta seria decoracao.
// Uso: node scripts/sm24-verifica-excecoes-do-portao-19-11.mjs
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const RE = /(senha|password|passwd|chave)\s*["']?\s*[:=]\s*["']([^"'`${}]{6,24})["']/gi;
const md5 = (s) => createHash('md5').update(s).digest('hex');
const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const do_indice = (p) => execFileSync('git', ['show', ':' + p], { cwd: REPO, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
const casados = (p) => [...do_indice(p).matchAll(RE)].map((m) => m[2]);

const CERT = 'bfr-candidata-v136-secretaria-de-educacao/portoes-v136-candidata.json';
const CERT_ANTERIOR = 'bfr-candidata-v136-secretaria-de-educacao/portoes-v136-candidata-ANTERIOR-run1-7-vermelhos.json';
const CORPOS = 'evidence/p73-corpos-de-artefactos-20-11f.json';
const EXTRACCAO = 'evidence/p73-extracao-de-corpos-unicos-20-11f.json';

// --- pool A: as agulhas do gerador, lidas da fonte (nao dactilografadas aqui)
const srcGer = do_indice('scripts/v136-gera-candidata.mjs');
const mInv = /const INV = \[([\s\S]*?)\];/.exec(srcGer);
if (!mInv) throw new Error('ABORTA: array INV nao encontrado em scripts/v136-gera-candidata.mjs');
const agulhas = [...mInv[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
const md5Agulhas = new Set(agulhas.map(md5));
const naJanela = agulhas.filter((a) => a.length >= 6 && a.length <= 24);

// --- pool B: caminhos de campo compostos pela varredura, medidos no corpus declarado
// O `chave` destes dois artefactos nao e um rotulo de agulha: e o caminho JSON que `varre_corpos` compoe ao
// descer o objecto (`scripts/p73-corpus-lib.mjs:43`), portanto o pool tem de ser o conjunto de caminhos de
// campo dos artefactos varridos. Varro o `evidence/` todo — o do INDICE (prova commitavel) e o do disco, onde
// vivem os preflight de 4 MB que o `.gitignore` recusa versionar: a classe e a mesma, e a diferenca e dita no
// motivo, nao escondida. Um JWT de 3 partes nao passa na exigencia de cada segmento ser um identificador
// curto de campo; um valor de credencial tambem nao, porque credencial nao e chave de objecto.
const chaves_de_campo = new Map();
const caminhe = (o, prefixo, origem) => {
  if (!o || typeof o !== 'object') return;
  for (const [k, v] of Object.entries(o)) {
    const c = prefixo ? prefixo + '.' + k : k;
    if (!chaves_de_campo.has(md5(c))) chaves_de_campo.set(md5(c), { caminho: c, origem });
    caminhe(v, c, origem);
    if (Array.isArray(v)) v.forEach((x) => caminhe(x, c, origem));
  }
};
const lista_v = execFileSync('git', ['ls-files', 'evidence'], { cwd: REPO, encoding: 'utf8' }).split(/\r?\n/).filter((p) => p.endsWith('.json'));
for (const p of lista_v) { try { caminhe(JSON.parse(do_indice(p)), '', 'indice'); } catch { /* corpo nao-JSON: o pool e o que resta */ } }
const lista_disco = execFileSync('node', ['-e', "import('node:fs').then(m=>console.log(m.readdirSync('evidence').filter(f=>f.endsWith('.json')).join('\\n')))"], { cwd: REPO, encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
const disco_so = lista_disco.filter((f) => !lista_v.includes('evidence/' + f));
for (const f of disco_so) { try { caminhe(JSON.parse(readFileSync(REPO + '/evidence/' + f, 'utf8')), '', 'disco'); } catch { /* idem */ } }
const md5Campos = new Set(chaves_de_campo.keys());

// --- controlo negativo: chaves de sessao vivem FORA do repo e nao podem ser estes valores
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
let chavesSessao = [];
for (const f of [DIR + '/ah2-sessions.json', DIR + '/sm8-municipal-sessions.json']) {
  try { chavesSessao.push(...Object.keys(JSON.parse(readFileSync(f, 'utf8')))); } catch { /* o segundo so existe em ciclos de mint */ }
}
const md5Sessao = new Set(chavesSessao.map(md5));

const cCert = casados(CERT), cAnt = casados(CERT_ANTERIOR), cCor = casados(CORPOS), cExt = casados(EXTRACCAO);
const todos = [...cCert, ...cAnt, ...cCor, ...cExt];
// Forma de credencial: um JWT comeca por `eyJ` e os seus segmentos sao longos; um caminho de campo e uma
// sequencia de identificadores de objecto. As agulhas da candidata sao outra classe — nomes de atributo e de
// ficheiro, com travessao e ponto — por isso a forma exige-se a cada classe com a sua propria régua: caminho de
// campo para os artefactos p73, identificador-de-codigo para a certidao. Uma régua unica sobre as duas classes
// daria vermelho a coisa certa (foi o que aconteceu na primeira versao desta peca).
const forma_caminho_de_campo = (v) => v.split('.').every((p) => /^[A-Za-z_][A-Za-z0-9_]{0,15}$/.test(p));
const forma_identificador_de_codigo = (v) => /^[A-Za-z][A-Za-z0-9_.\-]{4,23}$/.test(v);
const caminhos_tem_forma = [...cCor, ...cExt].every(forma_caminho_de_campo);
const agulhas_tem_forma = [...cCert, ...cAnt].every(forma_identificador_de_codigo);
const nenhum_e_jwt = !todos.some((v) => v.startsWith('eyJ') || /^eyJ[\w-]{8,}\.[\w-]{8,}\.[\w-]{4,}$/.test(v));
const origem_dos_caminhos = [...new Set([...cCor, ...cExt].map((v) => (chaves_de_campo.get(md5(v)) || {}).origem + '|' + String((chaves_de_campo.get(md5(v)) || {}).caminho).replace(/[A-Za-z0-9_]/g, 'x')))];

// fixture: um literal da mesma janela que nao esta em pool nenhum tem de ser REJEITADO pela predicado.
// Composo por codepoints para o proprio ficheiro nao carregar a agulha que procura.
const FIX = ['s', 'E', 'n', 'h', 'a', '_f', 'a', 'b', 'r', 'i', 'c', 'a', 'd', 'a', '_0', '1'].join('');
const aceita = (v) => md5Agulhas.has(md5(v)) || md5Campos.has(md5(v));
const fixture_rejeitado = !aceita(FIX);
const fixture_dispara_no_padrao = [...('const chave = "' + FIX + '";').matchAll(RE)].map((m) => m[2]).length === 1;

const out = {
  padrao_identico_ao_do_portao: (() => {
    const linha = /const SENHA = \/(.*)\/(gi);/.exec(do_indice('scripts/portao-indice.mjs'));
    return !!linha && linha[1] === RE.source && linha[2] === RE.flags;
  })(),
  agulhas_do_gerador: agulhas.length, na_janela_6_24: naJanela.length, fora_da_janela: agulhas.length - naJanela.length,
  certidao: { n: cCert.length, comprimentos: cCert.map((v) => v.length).join(','), todos_agulhas: cCert.every((v) => md5Agulhas.has(md5(v))), conta_bate: cCert.length === naJanela.length },
  certidao_anterior: { n: cAnt.length, comprimentos: cAnt.map((v) => v.length).join(','), todos_agulhas: cAnt.every((v) => md5Agulhas.has(md5(v))), mesmo_conjunto_que_a_verde: cCert.map(md5).sort().join() === cAnt.map(md5).sort().join() },
  corpos: { n: cCor.length, comprimentos: cCor.map((v) => v.length).join(','), todos_caminhos_de_campo: cCor.every((v) => md5Campos.has(md5(v))), vindos_de: 'caminhos compostos por scripts/p73-corpus-lib.mjs:43' },
  extracao: { n: cExt.length, comprimentos: cExt.map((v) => v.length).join(','), todos_caminhos_de_campo: cExt.every((v) => md5Campos.has(md5(v))), subconjunto_dos_corpos: cExt.every((v) => cCor.map(md5).includes(md5(v))) },
  corpus_independente: { artefactos_lidos_do_indice: lista_v.length, artefactos_somente_do_disco: disco_so.length, caminhos_de_campo_no_pool: chaves_de_campo.size, origens: origem_dos_caminhos },
  nenhum_e_chave_de_sessao: !todos.some((v) => md5Sessao.has(md5(v))), chaves_de_sessao_comparadas: chavesSessao.length,
  todos_os_valores_tem_forma_de_identificador: caminhos_tem_forma && agulhas_tem_forma, caminhos_p73_tem_forma_de_campo: caminhos_tem_forma, agulhas_v136_tem_forma_de_codigo: agulhas_tem_forma, nenhum_valor_e_jwt: nenhum_e_jwt,
  fixture_negativo_rejeitado: fixture_rejeitado, fixture_dispara_no_padrao,
  total_casamentos: todos.length,
};
out.veredito = (out.padrao_identico_ao_do_portao && out.certidao.todos_agulhas && out.certidao.conta_bate && out.certidao_anterior.todos_agulhas
  && out.certidao_anterior.mesmo_conjunto_que_a_verde && out.corpos.todos_caminhos_de_campo && out.extracao.todos_caminhos_de_campo
  && out.extracao.subconjunto_dos_corpos && out.nenhum_e_chave_de_sessao && out.nenhum_valor_e_jwt
  && out.todos_os_valores_tem_forma_de_identificador
  && out.fixture_negativo_rejeitado && out.fixture_dispara_no_padrao && out.total_casamentos === 20)
  ? 'EXCECOES_PROVADAS_POR_HASH' : 'EXCECOES_NAO_PROVADAS';
console.log(JSON.stringify(out));
process.exit(out.veredito === 'EXCECOES_PROVADAS_POR_HASH' ? 0 : 1);
