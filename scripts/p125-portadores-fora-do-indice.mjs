#!/usr/bin/env node
// P125 — os portadores de credencial que vivem FORA do índice têm de estar protegidos por decisão, não por hábito.
//
// Existe porque `portao-indice.mjs` só vê o que está no índice (`git show :caminho`): um ficheiro com a forma de
// credencial que nunca foi `add` é invisível para ele, e fica à distância de um `git add -A` de ser publicado.
// Foi assim que o batch `1800682` levou um stdout de sessão para dentro. Este portão varre o conjunto que um add
// amplo levaria (não-versionados não ignorados + modificados) com OS MESMOS padrões do emissor, e exige que cada
// casamento ou (a) continue fora do índice e esteja declarado no runbook com a frase da razão, ou (b) já tenha
// entrado e esteja assinado na lista de exceções do próprio portão do índice.
//
// Nunca imprime um valor: só rótulos, contagens e comprimentos — a mesma régua de saída do emissor. Zero escrita
// no banco, zero rede, zero deploy; o único ficheiro que escreve é o seu registo.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const EMISSOR = 'scripts/portao-indice.mjs';
const RUNBOOK = 'docs/bu-20-11/10-runbook-municipal.md';
const SUF = process.env.P125_SUF ? '-' + process.env.P125_SUF : '';
const OUT = join(REPO, `evidence/p125-portadores-fora-do-indice-21-11${SUF}.json`);
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com P125_SUF=novo, não por cima');

// A outra rota: ler a linha do emissor e extrair `source` e `flags` dela, sem reimprimir nada.
const fonte = readFileSync(join(REPO, EMISSOR), 'utf8');
const padraoDoEmissor = (nome) => {
  const linha = new RegExp(`^const ${nome} = /(.*)/([a-z]+);$`, 'm').exec(fonte);
  if (!linha) throw new Error('EMISSOR_SEM_PADRAO ' + nome);
  return { source: linha[1], flags: linha[2] };
};
// Os padrões estão escritos aqui duas vezes, por desenho: uma vez como literal meu, outra vez extraído da fonte
// do emissor, e o portão 1 compara as duas rotas `source` a `source` e `flags` a `flags`. Um portão que só lê o
// regex do irmão é verde por construção; assim, se o emissor mudar de régua, este portão chumba e obriga a
// re-ler a classe. Os literais não tornam este ficheiro portador: nenhum `senha=` com valor entre aspas aparece
// aqui, e o fixture que dispara compõe-se em tempo de execução, mais abaixo.
const RE_SENHA = /(senha|password|passwd|chave)\s*["']?\s*[:=]\s*["']([^"'`${}]{6,24})["']/gi;
const RE_JWT = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]*/g;
const RE_URLTOK = /[?&]token=([A-Za-z0-9_-]{20,})/g;
const P = { senha: { RE: RE_SENHA, ...padraoDoEmissor('SENHA') }, jwt: { RE: RE_JWT, ...padraoDoEmissor('JWT') },
  url_token: { RE: RE_URLTOK, ...padraoDoEmissor('URLTOK') }, bin: { RE: /\.(pdf|png|jpe?g|gif|ico|webp|woff2?|ttf|zip|7z|jar|node)$/i, ...padraoDoEmissor('BIN') } };

// As nomes das classes de casamento são as do emissor; o rótulo do campo não é credencial, e é por isso que a
// classe dos sete abaixo se declara por razão medida e não por medo do padrão.
const DECLARADOS = [
  { arquivo: 'evidence/ah2-home-papel-a-papel-v1.json', a_prosa_diz: 'tem decisão assinada em `26e220d`' },
  { arquivo: 'evidence/.sm7-sup1366j.txt', a_prosa_diz: 'a série r substituiu as corridas j e k do 1366' },
  { arquivo: 'evidence/.sm7-sup1366k.txt', a_prosa_diz: 'a série r substituiu as corridas j e k do 1366' },
  { arquivo: 'evidence/sm7-municipal-education_supervisor-1366-sup1366j.json', a_prosa_diz: 'a série r substituiu as corridas j e k do 1366' },
  { arquivo: 'evidence/sm7-municipal-education_supervisor-1366-sup1366k.json', a_prosa_diz: 'a série r substituiu as corridas j e k do 1366' },
  { arquivo: 'evidence/ANTERIOR-p73-corpos-de-artefactos-20-11d-corpus-so-html.json', a_prosa_diz: 'o dump ANTERIOR ficou fora porque o sucessor do dia está no índice' },
  { arquivo: 'evidence/sm7-municipal-education_supervisor-390-sm8bar390.run.log', a_prosa_diz: 'o stdout de célula fica fora quando o registo json da mesma célula está no índice' },
];

const git = (args) => execFileSync('git', args, { cwd: REPO, encoding: 'utf8' });
const noIndice = new Set(git(['-c', 'core.quotePath=false', 'ls-files']).split(/\r?\n/).filter(Boolean));
// O conjunto que um `git add -A` levaria: não-versionados que nenhuma regra ignora, mais os versionados com
// conteúdo diferente do índice. Os ignorados ficam de fora por definição — é para isso que a regra serve.
const naoVersionados = git(['-c', 'core.quotePath=false', 'ls-files', '--others', '--exclude-standard']).split(/\r?\n/).filter(Boolean);
const modificados = git(['-c', 'core.quotePath=false', 'diff', '--name-only']).split(/\r?\n/).filter(Boolean);
const varridos = [...new Set([...naoVersionados, ...modificados])].sort();

const md5 = (b) => createHash('md5').update(b).digest('hex');
const casa = (t) => {
  const s = [...t.matchAll(P.senha.RE)].map((m) => m[2].length);
  const j = [...t.matchAll(P.jwt.RE)].map((m) => m[0].length);
  const jIndex = [...t.matchAll(P.jwt.RE)].map((m) => m.index);
  const u = [...t.matchAll(P.url_token.RE)].filter((m) => !jIndex.some((i) => i >= m.index && i < m.index + m[0].length)).map((m) => m[1].length);
  return { senha: s, jwt: j, url_token: u };
};
const portadores = [];
const lidos = [];
for (const rel of varridos) {
  if (P.bin.RE.test(rel)) continue;
  let t;
  try { t = readFileSync(join(REPO, rel), 'utf8'); } catch { continue; }
  lidos.push(rel);
  const o = casa(t);
  const classes = Object.entries(o).filter(([, v]) => v.length > 0);
  if (classes.length) portadores.push({ arquivo: rel, bytes: Buffer.byteLength(t), md5: md5(Buffer.from(t)),
    classes: classes.map(([c, v]) => ({ classe: c, n: v.length, comprimentos: v.join(',') })) });
}
const fraseNoRunbook = (frase) => readFileSync(join(REPO, RUNBOOK), 'utf8').replace(/\s+/g, ' ').includes(frase.replace(/\s+/g, ' '));
const excecoesDoEmissor = [...fonte.matchAll(/arquivo: '([^']+)'/g)].map((m) => m[1]);

const semDeclaracao = portadores.filter((p) => !DECLARADOS.some((d) => d.arquivo === p.arquivo));
// Os dois sentidos do apodrecimento: um declarado que deixa de ser varrido (apagado, ou entrado no índice sem
// estar assinado no emissor), e um declarado cuja frase saiu do runbook. O segundo é o que já usei para o
// fantasma do `bu4` e para as decisões de índice — sem a frase, o nome volta a contar como esquecimento.
const fichasDeclaradas = DECLARADOS.map((d) => {
  const p = portadores.find((x) => x.arquivo === d.arquivo);
  const noIndiceAinda = !noIndice.has(d.arquivo);
  return { arquivo: d.arquivo, existe_em_disco: existsSync(join(REPO, d.arquivo)), continua_fora_do_indice: noIndiceAinda,
    continua_no_sweep: !!p, assinado_no_emissor_se_entrou: excecoesDoEmissor.includes(d.arquivo), frase_no_corpus: fraseNoRunbook(d.a_prosa_diz) };
});
const declaradosRuins = fichasDeclaradas.filter((f) => !f.existe_em_disco || !f.frase_no_corpus
  || (!(f.continua_fora_do_indice) && !f.assinado_no_emissor_se_entrou) || (f.continua_fora_do_indice && !f.continua_no_sweep));

// O fixture compõe-se em tempo de execução: escrever o literal no próprio instrumento faria do verificador o
// ofensor que ele procura (a varredura do índice e esta varredura leem este ficheiro).
const ROTULO = String.fromCharCode(0x73, 0x65, 0x6e, 0x68, 0x61);
const VALOR = 'x'.repeat(12);
const FIX_POSITIVO = ROTULO + '=' + '"' + VALOR + '"';
const FIX_NEGATIVO = 'contagem_de_linhas=' + '"' + VALOR + '"';
const FIX_JWT = 'eyJ' + 'A'.repeat(12) + '.' + 'B'.repeat(12) + '.' + 'C'.repeat(8);

const falhas = [];
const portoes = [];
const gate = (nome, obtido, esperado) => {
  portoes.push(nome);
  const o = JSON.stringify(obtido), e = JSON.stringify(esperado);
  if (o !== e) falhas.push({ portao: nome, obtido: o, esperado: e });
};
gate('os_quatro_padroes_sao_os_do_emissor_source_e_flags',
  Object.entries(P).map(([c, v]) => [c, v.RE.source === v.source, v.RE.flags === v.flags]),
  [['senha', true, true], ['jwt', true, true], ['url_token', true, true], ['bin', true, true]]);
gate('a_sonda_de_credencial_dispara_no_fixture_e_chumba_no_contrario',
  [new RegExp(P.senha.RE.source, 'g').test(FIX_POSITIVO), new RegExp(P.senha.RE.source, 'g').test(FIX_NEGATIVO),
    new RegExp(P.jwt.RE.source, 'g').test(FIX_JWT), varridos.length > 0],
  [true, false, true, true]);
gate('nenhum_portador_do_sweep_fica_sem_declaracao', semDeclaracao.map((p) => p.arquivo), []);
gate('cada_declarado_continua_em_disco_fora_do_indice_e_com_a_frase', declaradosRuins.map((f) => f.arquivo), []);
// A régua de conjunto, não a da soma: um portador pode esconder-se se o sweep só vir uma das duas fontes, por
// isso o conjunto tem de ser exactamente a união, sem duplicado e sem nome que não venha de lá. Contar os
// casamentos contra si próprio seria a tautologia que já chumbei noutro portão.
const interseccao = naoVersionados.filter((c) => modificados.includes(c));
gate('a_varredura_e_a_uniao_das_duas_fontes_do_add_amplo',
  [varridos.length, varridos.every((c) => naoVersionados.includes(c) || modificados.includes(c)),
    [...new Set(varridos)].length === varridos.length, naoVersionados.length + modificados.length - interseccao.length === varridos.length],
  [new Set([...naoVersionados, ...modificados]).size, true, true, true]);
// Dentes do portão principal, sem tocar no mundo: tirar uma declaração da lista tem de produzir um não-declarado.
gate('o_portao_tem_dentes_se_a_declaracao_for_apagada',
  [DECLARADOS.filter((d) => !portadores.some((p) => p.arquivo === d.arquivo)).length,
    portadores.filter((p) => !DECLARADOS.slice(1).some((d) => d.arquivo === p.arquivo)).length > 0,
    DECLARADOS.length >= 1], [0, true, true]);

const saida = {
  programa: 'scripts/p125-portadores-fora-do-indice.mjs', em: new Date().toISOString(),
  metodo: 'sweep = git ls-files --others --exclude-standard + git diff --name-only; padroes lidos da fonte do emissor; valores nunca impressos',
  emissor: { arquivo: EMISSOR, bytes: Buffer.byteLength(fonte), md5: md5(Buffer.from(fonte)), runbook: RUNBOOK },
  contagens: { varridos: varridos.length, lidos: lidos.length, portadores: portadores.length,
    casamentos: portadores.reduce((a, p) => a + p.classes.reduce((b, c) => b + c.n, 0), 0), declarados: DECLARADOS.length,
    nao_versionados: naoVersionados.length, modificados: modificados.length, no_indice: noIndice.size },
  portadores, declarados: fichasDeclaradas, nao_declarados: semDeclaracao.map((p) => p.arquivo),
  o_que_este_verde_nao_autoriza: 'nada: é leitura. Publicar, escrever no banco, rodar DDL e git push continuam a pedir cada um a sua frase literal.',
  portoes, falhas,
};
saida.veredito = falhas.length === 0
  ? `P125_PORTADORES_FORA_DO_INDICE_OK ${portoes.length}/0 · ${portadores.length} portadores declarados de ${saida.contagens.varridos} varridos`
  : `P125_PORTADORES_FORA_DO_INDICE_VERMELHO ${falhas.length} de ${portoes.length} portoes`;
writeFileSync(OUT, JSON.stringify(saida, null, 2) + '\n');
console.log(`VARREDURA ${saida.contagens.varridos} candidatos (${naoVersionados.length} nao-versionados + ${modificados.length} modificados) · ${saida.contagens.lidos} lidos · ${saida.contagens.casamentos} casamentos em ${portadores.length} ficheiros`);
for (const p of portadores) console.log(`  PORTADOR ${p.arquivo} ${JSON.stringify(p.classes)}`);
for (const f of fichasDeclaradas) console.log(`  DECLARADO ${f.arquivo} disco=${f.existe_em_disco} fora=${f.continua_fora_do_indice} no_sweep=${f.continua_no_sweep} frase=${f.frase_no_corpus} assinado_no_emissor=${f.assinado_no_emissor_se_entrou}`);
if (semDeclaracao.length) console.log(`  SEM_DECLARACAO ${JSON.stringify(semDeclaracao.map((p) => p.arquivo))}`);
if (falhas.length) console.log(`FALHAS ${JSON.stringify(falhas)}`);
console.log(`${saida.veredito} · registo ${OUT}`);
process.exit(falhas.length === 0 ? 0 : 1);
