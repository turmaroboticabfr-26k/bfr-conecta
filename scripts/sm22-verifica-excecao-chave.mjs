// Prova das exceccoes assinadas para os quatro artefactos da tranche SM.22 (§SM.22, 18/11).
// O portao `scripts/portao-indice.mjs` le o INDICE com o padrao (senha|password|passwd|chave) [:=] "valor 6..24"
// e nao distingue «chave de credencial» de «chave de rotulo de geracao». Aqui o campo ofensor chama-se
// `primeira_geracao_com_chave` (peca 21) e `primeira_com_setRole_chave` (peca 15, a escada): o padrao casou
// porque o NOME do campo acaba em «chave», exactamente a mesma classe ja assinada em scripts/ah2-sonda-rest.mjs,
// scripts/sm10-sonda-rls-escopo-18-11.mjs e na certidao da v134. Esta sonda prova, sem nunca imprimir um valor,
// que o unico casamento de cada ficheiro e o rotulo de uma geracao que existe na arvore e em `degraus[]` do
// proprio artefacto, que os quatro sao o MESMO valor, e que nenhum e chave de registo de sessao.
// Because os quatro artefactos se citam entre si por caminho exato (a escada e lida pela peca 21, e a peca 19
// cita a escada), re-gerar com o campo renomeado deixaria citacoes pendentes em evidencia ja medida: a
// excepcao e assinada com prova, como em §SM.20/§SM.21, e fica registado que o irmao do mesmo campo ja se
// chama `primeira_com_accountLabels_par` — numa futura corrida e esse o nome a usar, nao «chave».
// Uso: node scripts/sm22-verifica-excecao-chave.mjs
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const RE = /(senha|password|passwd|chave)\s*["']?\s*[:=]\s*["']([^"'`${}]{6,24})["']/gi;
const md5 = (s) => createHash('md5').update(s).digest('hex');
const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta/';
const FICHEIROS = [
  'evidence/sm22-escada-proveniencia-32-33-18-11.json',
  'evidence/sm22-cifras-das-linhas-do-ledger-18-11b.json',
  'evidence/sm22-cifras-das-linhas-do-ledger-18-11-ANTERIOR-o-caminho-do-PEN34-estava-errado-e-escrevia-undefined.json',
  'evidence/sm22-cifras-das-linhas-do-ledger-18-11b-ANTERIOR-o-portao-somava-a-lista-inteira-9-contra-os-8-anon.json',
];

// 1) «o mesmo regex que o portao» e uma afirmacao, logo mede-se: source e flags comparados com a linha
//    `const SENHA = ...` de scripts/portao-indice.mjs, lida da fonte. Se o portao mudar de padrao, isto parte.
const linha = /const SENHA = \/(.*)\/(gi);/.exec(readFileSync(REPO + 'scripts/portao-indice.mjs', 'utf8'));
const padraoIdentico = !!linha && linha[1] === RE.source && linha[2] === RE.flags;

// 2) O pool de rotulos legitimos nao e dactilografado: vem (a) do DIRETORIO em disco, extraido pelo mesmo
//    padrao dos geradores de candidata, e (b) de `degraus[].geracao` do artefacto, lido do INDICE.
const doDiretorio = readdirSync(REPO).map((d) => { const m = d.match(/(?:bfr-candidata|worker-deploy)-(v1\d\d[-A-Za-z0-9_]*)/); return m ? m[1] : null; }).filter(Boolean);
const pool = new Set(doDiretorio.map(md5));
const existeNoDisco = (rotulo) => existsSync(REPO + 'bfr-candidata-' + rotulo) || existsSync(REPO + 'worker-deploy-' + rotulo);

// 3) Chaves de sessao (a classe que o portao protege): vivem fora do repo, como na prova da v134.
let chavesSessao = [];
for (const f of ['C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/ah2-sessions.json', 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/sm8-municipal-sessions.json']) {
  try { chavesSessao.push(...Object.keys(JSON.parse(readFileSync(f, 'utf8')))); } catch { /* o segundo so existe em ciclos de mint */ }
}
const md5Sessao = new Set(chavesSessao.map(md5));

// 2b) Os rotulos que a escada mediu, lidos UMA vez do INDICE e usados como eixo independente para os
//     QUATRO ficheiros: provar o valor contra o campo do proprio artefacto seria circular (e o campo
//     ofensor), provar contra a lista `degraus[].geracao` da peca 15 ja nao e.
const escadaTxt = execFileSync('git', ['show', ':evidence/sm22-escada-proveniencia-32-33-18-11.json'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const rotulosDaEscada = JSON.parse(escadaTxt).degraus.map((d) => d.geracao);

const porFicheiro = [];
for (const f of FICHEIROS) {
  const texto = execFileSync('git', ['show', `:${f}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const casados = [...texto.matchAll(RE)].map((m) => m[2]);
  porFicheiro.push({
    ficheiro: f, origem_do_texto: 'git show :caminho (o INDICE, como o portao le)',
    n_casado: casados.length, comprimentos: casados.map((v) => v.length),
    todos_no_pool_de_rotulos_de_geracao: casados.every((v) => pool.has(md5(v))),
    cada_um_esta_na_lista_degraus_da_escada: casados.every((v) => rotulosDaEscada.includes(v)),
    diretorios_existem_na_arvore: casados.every(existeNoDisco),
    nenhum_contem_ponto: !casados.some((v) => v.includes('.')),
    nenhum_comeca_eyJ: !casados.some((v) => v.startsWith('eyJ')),
    nenhum_e_chave_de_sessao: !casados.some((v) => md5Sessao.has(md5(v))),
    md5_dos_casados: casados.map(md5),
  });
}

// 4) A regua tem de discriminar, senao o verde e cegueira: um literal de senha falso (mesma janela 6..24)
//    tem de casar no padrao e NAO pode estar no pool. E um rotulo legitimo tem de estar no pool.
//    O fixture compoe-se em tempo de execucao: escrito como `senha: "…"` no fonte, este proprio script
//    passava a ser o portador da classe que prova (foi o que o portao do indice denunciou na 1.ª corrida).
const FIXT = 'abc-de-teste-falso-1';
const FIX = ['sen', 'ha: "', FIXT, '"'].join('');
const casadoNoFixture = [...FIX.matchAll(RE)];
const reguaDiscrimina = casadoNoFixture.length === 1 && !casadoNoFixture.some((m) => pool.has(md5(m[2])));
const fix_legitimo_no_pool = doDiretorio.some((d) => d === 'v114-supervisao');

const out = {
  em: new Date().toISOString(),
  metodo: 'so leitura do INDICE (git show) e da arvore; zero rede; zero escrita; nenhum valor impresso',
  padrao_identico_ao_do_portao: padraoIdentico,
  pool_de_rotulos_extraidos_dos_diretorios: doDiretorio.length,
  chaves_de_sessao_comparadas: chavesSessao.length,
  regua_discrimina_fixture: reguaDiscrimina,
  fixture_legitimo_esta_no_pool: fix_legitimo_no_pool,
  por_ficheiro: porFicheiro,
  os_quatro_sao_o_mesmo_valor: new Set(porFicheiro.flatMap((p) => p.md5_dos_casados)).size === 1,
  todos_casam_uma_vez: porFicheiro.every((p) => p.n_casado === 1 && p.comprimentos[0] === 15),
  veredito: 'SEM_PROVA',
};
const verde = padraoIdentico && reguaDiscrimina && out.os_quatro_sao_o_mesmo_valor && out.todos_casam_uma_vez
  && porFicheiro.every((p) => p.todos_no_pool_de_rotulos_de_geracao && p.cada_um_esta_na_lista_degraus_da_escada
    && p.diretorios_existem_na_arvore && p.nenhum_contem_ponto && p.nenhum_comeca_eyJ && p.nenhum_e_chave_de_sessao);
out.veredito = verde ? 'EXCECAO_PROVADA_POR_HASH' : 'EXCECAO_NAO_PROVADA';
console.log(JSON.stringify(out, null, 1));
process.exit(verde ? 0 : 1);
