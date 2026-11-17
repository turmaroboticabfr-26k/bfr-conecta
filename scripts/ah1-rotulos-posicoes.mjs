// Re-bate as posições (contagem + primeira linha) dos rótulos da Secretaria sobre a shell **em disco**,
// e confera cada número contra o diário `ah1-rotulos-secretaria` tirado da shell **servida**.
// Só-leitura: não escreve nada além do próprio diário e recusa-se a sobrescrever evidência existente.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const RAIZ = path.resolve(import.meta.dirname, '..');
const CANDIDATA = 'bfr-candidata-v121-rotulos-supervisor/index.html';
const DIARIO = 'evidence/ah1-rotulos-secretaria-17-11.json';
const OUT = path.join(RAIZ, 'evidence/ah1-rotulos-posicoes-17-11.json');
if (fs.existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com outro nome');

const esperado = JSON.parse(fs.readFileSync(path.join(RAIZ, DIARIO), 'utf8'));
const texto = fs.readFileSync(path.join(RAIZ, CANDIDATA), 'utf8');
const bytes = fs.statSync(path.join(RAIZ, CANDIDATA)).size;
const md5 = crypto.createHash('md5').update(fs.readFileSync(path.join(RAIZ, CANDIDATA))).digest('hex');
const linhas = texto.split('\n');

const portoes = [];
const portao = (nome, esperado_, medido) => {
  const igual = esperado_ === medido;
  portoes.push({ nome, esperado: esperado_, medido, igual });
  return igual;
};

// Portão 0: sem este, todo o resto é comparação de coisas diferentes — a shell do diário tem de ser a
// shell do disco, provada por bytes e md5 e não por «parece a mesma versão».
portao('candidata_byte_identica_a_servida__bytes', esperado.shell.bytes, bytes);
portao('candidata_byte_identica_a_servida__md5', esperado.shell.md5, md5);

// Contagem por `split` e não por `[...matchAll]`: a primeira versão do contador usou classe
// `[çã]`, que consome **um** caractere onde `Secretaria de Educação` precisa de dois, e devolveu um
// falso 0 para o rótulo que existia três vezes. `split` não tem este modo de falha.
const conta = (agulha) => {
  let n = 0;
  let primeira = null;
  linhas.forEach((l, i) => {
    const c = l.split(agulha).length - 1;
    if (c) { n += c; if (primeira === null) primeira = i + 1; }
  });
  return { n, primeira };
};
const medida = {};
for (const rotulo of Object.keys(esperado.rotulos)) {
  const m = conta(rotulo);
  medida[rotulo] = m;
  portao(`contagem__${rotulo}`, esperado.rotulos[rotulo].ocorrencias_no_shell, m.n);
  portao(`primeira_linha__${rotulo}`, esperado.rotulos[rotulo].primeira_linha, m.primeira);
}
// O atributo é **lido** do diário, nunca dactilografado aqui: a primeira versão fixou `data-sec-tab` e
// comparou os seus valores distintos com `subabas_workspace_rede.itens.length` (23), ou seja, misturou as
// duas barras de sub-abas. A segunda versão contava **todas as menções** do atributo e deu 33 contra 23:
// a unidade do produtor são botões **com rótulo prestado**, e as 10 restantes são seletores
// `[data-secretary-tab=…]` no JavaScript. Um leitor derivado segue as regras do produtor, por isso a
// `lista()` abaixo é a mesma prédica (rótulo nos 140 caracteres seguintes), não uma aproximação.
const cortes = [];
for (let k = 0; k < texto.length; k++) if (texto.charCodeAt(k) === 10) cortes.push(k);
const linhaDe = (pos) => { let a = 0, b = cortes.length; while (a < b) { const m = (a + b) >> 1; if (cortes[m] < pos) a = m + 1; else b = m; } return a + 1; };
const mencoes = (atributo) => { let p = -1, n = 0; while ((p = texto.indexOf(atributo + '="', p + 1)) !== -1) n++; return n; };
const lista = (atributo) => {
  const saida = [];
  const esc = atributo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let p = -1;
  while ((p = texto.indexOf(atributo + '="', p + 1)) !== -1) {
    const m = texto.slice(p, p + 140).match(new RegExp(esc + '="([^"]+)"[^>]*>([^<]{1,44})'));
    if (m) saida.push({ valor: m[1], rotulo: m[2].trim(), linha: linhaDe(p) });
  }
  return saida;
};
const unidades = {};
for (const [nome, bloco] of [['modulo_secretaria', esperado.subabas_modulo_secretaria], ['workspace_rede', esperado.subabas_workspace_rede]]) {
  const itens = lista(bloco.atributo);
  const menc = mencoes(bloco.atributo);
  portao(`${nome}__${bloco.atributo}__botoes_com_rotulo`, bloco.n, itens.length);
  portao(`${nome}__${bloco.atributo}__distintos`, new Set(bloco.itens.map((x) => x.valor)).size, new Set(itens.map((x) => x.valor)).size);
  portao(`${nome}__${bloco.atributo}__primeira_linha`, bloco.itens.length ? bloco.itens[0].linha : null, itens.length ? itens[0].linha : null);
  portao(`${nome}__${bloco.atributo}__valores_na_ordem`, bloco.itens.map((x) => x.valor).join(','), itens.map((x) => x.valor).join(','));
  unidades[bloco.atributo] = { ocorrencias_do_atributo: menc, botoes_com_rotulo: itens.length, mencoes_sem_rotulo: menc - itens.length, distintos: new Set(itens.map((x) => x.valor)).size };
}

const falhas = portoes.filter((p) => !p.igual);
const veredito = {
  portoes: portoes.length,
  vermelhos: falhas.length,
  estado: falhas.length === 0 ? 'POSICOES_REBATIDAS_OK' : 'POSICOES_DIVERGENTES'
};
const diario = {
  programa: 'scripts/ah1-rotulos-posicoes.mjs',
  em: new Date().toISOString(),
  o_que_prova: 'os números de posição citados em §AI.34 ponto 1 foram re-batidos nesta passada sobre `bfr-candidata-v121-rotulos-supervisor/index.html`, e esse ficheiro é byte-idêntico à shell servida que o diário `ah1-rotulos-secretaria-17-11.json` mediu (mesmo comprimento, mesmo md5); contagem e primeira linha de cada um dos sete rótulos, e as três contagens de cada uma das duas barras de sub-abas (ocorrências, distintos, primeira linha), batem com o diário linha a linha — com o **atributo lido do diário**, não dactilografado neste script',
  o_que_NAO_prova: 'que a shell servida continua esse bytes **agora** — a comparação é disco × diário, não disco × rede; correr este instrumento não substitui um GET. Não prova nada sobre cliques: a sub-aba Supervisão nunca foi exercida com sessão (PEN-36).',
  arquivos: { candidatas: CANDIDATA, diario_de_referencia: DIARIO, bytes, md5, linhas: linhas.length },
  esperado_de_referencia: esperado.rotulos,
  medido_agora: medida,
  unidades_das_duas_barras: unidades,
  portoes,
  veredito
};
fs.writeFileSync(OUT, JSON.stringify(diario, null, 1) + '\n');
console.log(JSON.stringify(veredito));
console.log('bytes', bytes, 'md5', md5, 'linhas', linhas.length);
for (const p of falhas) console.log('VERMELHO', p.nome, '| esperado', p.esperado, '| medido', p.medido);
process.exit(veredito.estado === 'POSICOES_REBATIDAS_OK' ? 0 : 1);
