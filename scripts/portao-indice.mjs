#!/usr/bin/env node
// Portao do INDICE: varre o conteudo que esta no index (git show :caminho), nao o disco,
// porque os ficheiros des-rastreados continuam em disco de proposito.
// Imprime apenas comprimentos, formas mascara e chaves de claim. Nunca um valor.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const JWT = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]*/g;
const SENHA = /(senha|password|passwd|chave)\s*["']?\s*[:=]\s*["']([^"'`${}]{6,24})["']/gi;
const URLTOK = /[?&]token=([A-Za-z0-9_-]{20,})/g;
const BIN = /\.(pdf|png|jpe?g|gif|ico|webp|woff2?|ttf|zip|7z|jar|node)$/i;

// Excepcoes medidas uma a uma, cada uma com a prova da sua classe. O padrao do
// portao nao distingue "chave" de senha de "chave" de nome-de-coluna, entao a
// lista e explicita e o portao FALHA se a medida mudar (comprimento ou numero)
// ou se uma excepcao deixar de casar — assim a lista nao apodrece em silencio.
const EXCECOES = [
  {
    arquivo: 'evidence/e2e4-biblioteca.json', classe: 'jwt', n: 2, comprimentos: '427,427',
    motivo: 'URL assinada de storage (mesma cadeia em ?token=): claims = exp,iat,scope,url, sem role nem email; iat 2026-10-22T23:02Z / exp 23:17Z, validade 15 min, expirada ha 3 semanas.',
  },
  {
    arquivo: 'evidence/pf-throttle-hunks.json', classe: 'senha', n: 1, comprimentos: '10',
    motivo: 'chave e irma de quando/janela/origem/escrita_da_posicao e tem o mesmo comprimento de hunks[].nome: e rotulo do hunk SQL, nao credencial.',
  },
  {
    arquivo: 'scripts/pf-throttle-gera.mjs', classe: 'senha', n: 1, comprimentos: '10',
    motivo: 'chave: nome de coluna da tabela (student_id), escrito pelo gerador — nao senha de conta.',
  },
  {
    arquivo: 'scripts/ah2-sonda-rest.mjs', classe: 'senha', n: 1, comprimentos: '14',
    motivo: 'o casado e o literal «bytes servidos» no campo origem_chave: e a etiqueta de procedencia da anon key (de onde o programa a leu), nao a chave. Provado por comparacao de hash com as candidaturas de rotulo, e o valor nao contem pontos nem e JWT. O padrao apanhou-o so porque o nome do campo acaba em «chave».',
  },
  // As duas entradas abaixo sao o mesmo casamento medido nos artefactos que o programa escreve, e a
  // classificacao nao vem da memoria: vem de `scripts/ah2-prova-classe-sonda-rest.mjs` (igualdade de hash
  // com o literal, sem imprimir valor). Os comprimentos copiam-se da saida `medido` do proprio portao.
  // O caso analogo do artefacto do Home NAO esta aqui de proposito: esse campo tinha o nome ambiguo
  // `chave`, e a decisao registada em 26e220d foi renomear para `rota_home` e re-gerar (v3), nao excepcionar.
  {
    arquivo: 'evidence/ah2-sonda-rest-17-11.json', classe: 'senha', n: 1, comprimentos: '14',
    motivo: 'campo origem_chave do artefacto escrito por scripts/ah2-sonda-rest.mjs: hash igual ao do mesmo literal ja excepcionado no programa — etiqueta de procedencia, nao credencial.',
  },
  {
    arquivo: 'evidence/ah2-sonda-rest-17-11b.json', classe: 'senha', n: 1, comprimentos: '14',
    motivo: 'segunda corrida do mesmo programa: origem_chave com hash igual ao mesmo literal — mesma classe, mesma medida. Re-gerar o artefacto custaria uma corrida de browser, e o programa que o escreve ja tem esta excecao assinada: e a mesma classe em dois sitios.',
  },
];

const lista = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);

// --control: relemos um ficheiro do DISCO com os mesmos padroes. Serve de
// controle negativo: prova que o portao nao esta verde porque ficou cego.
const controle = process.argv.slice(2);
if (controle.length) {
  const raiz = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  for (const f of controle) {
    const t = readFileSync(`${raiz}/${f}`, 'utf8');
    const s = [...t.matchAll(SENHA)].map((m) => m[2].length);
    console.log(`CONTROLE ${f} senha=[${s.join(',')}]`);
  }
  process.exit(0);
}

let pulados = 0, lidos = 0;
const medido = new Map();

function registrar(arquivo, classe, valores) {
  if (!valores.length) return;
  medido.set(`${arquivo}|${classe}`, { n: valores.length, comprimentos: valores.join(',') });
}

for (const f of lista) {
  if (BIN.test(f)) { pulados++; continue; }
  let t;
  try { t = execFileSync('git', ['show', `:${f}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); }
  catch { pulados++; continue; }
  lidos++;
  const j = [...t.matchAll(JWT)];
  // "?token=eyJ..." e o mesmo JWT contado por dois padroes: o JWT comeca dentro
  // do casamento de URL, entao fica na classe jwt e nao conta duas vezes.
  const portadoPorUrl = (m) => j.some((k) => k.index >= m.index && k.index < m.index + m[0].length);
  registrar(f, 'senha', [...t.matchAll(SENHA)].map((m) => m[2].length));
  registrar(f, 'jwt', j.map((m) => m[0].length));
  registrar(f, 'token_de_url', [...t.matchAll(URLTOK)].filter((m) => !portadoPorUrl(m)).map((m) => m[1].length));
}

const cobre = (e) => medido.get(`${e.arquivo}|${e.classe}`);
const naoCobertas = [...medido].filter(([k]) => !EXCECOES.some((e) => `${e.arquivo}|${e.classe}` === k));
const malCobertas = EXCECOES.filter((e) => {
  const m = cobre(e);
  return m === undefined || m.n !== e.n || m.comprimentos !== e.comprimentos;
});

let totais = { senha: 0, jwt: 0, token_de_url: 0 };
for (const [k, m] of medido) { const c = k.split('|')[1]; if (totais[c] !== undefined) totais[c] += m.n; }
console.log(`indice_arquivos=${lista.length} lidos=${lidos} pulados_bin_ou_grande=${pulados}`);
console.log(`senha_literal=${totais.senha} jwt=${totais.jwt} token_de_url=${totais.token_de_url} portadores=${medido.size}`);
for (const [k, m] of medido) console.log(`  medido ${k} n=${m.n} comprimentos=${m.comprimentos}`);
for (const e of EXCECOES) console.log(`  excecao ${e.arquivo}|${e.classe} :: ${e.motivo}`);
for (const [k, m] of naoCobertas) console.log(`  NAO_COBERTA ${k} n=${m.n} comprimentos=${m.comprimentos}`);
for (const e of malCobertas) console.log(`  EXCECAO_VELHA ${e.arquivo}|${e.classe}`);
const verde = naoCobertas.length === 0 && malCobertas.length === 0;
console.log(verde ? 'PORTAO_INDICE_VERDE' : 'PORTAO_INDICE_VERMELHO');
// O veredito tem de se ver no código de saída: um portão que imprime VERMELHO e sai 0 é lido como verde por
// qualquer `&&` ou CI, e é exactamente assim que um índice com credencial passa. A saída 0 fica reservada
// ao caminho `--control`, que é uma pergunta de leitura, não um veredicto.
process.exit(verde ? 0 : 1);
