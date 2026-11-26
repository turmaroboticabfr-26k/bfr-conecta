// Sonda de duas faces: aplica o padrao SENHA do portao-indice a um ficheiro e imprime, para cada casamento, a
// linha do ficheiro, o token que casa a palavra-chave e o valor capturado com o seu comprimento. Sem o valor na
// mao nao ha como classificar a grandeza; sem a linha nao ha como dizer onde re-escrever.
// O padrao NAO e re-dactilografado aqui: e lido da linha `const SENHA` do fonte do portao, e a peca aborta se nao
// o ler, porque uma sonda com o seu proprio regex pode dar zero enquanto o portao da vermelhos.
import { readFileSync } from 'node:fs';
const PORTAO = process.argv[3] || 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta/scripts/portao-indice.mjs';
const linhaDoPortao = readFileSync(PORTAO, 'utf8').split('\n').find((l) => /^\s*const SENHA\s*=/.test(l));
if (!linhaDoPortao) throw new Error('ABORTA: nao li a linha `const SENHA` do portao em ' + PORTAO);
const SENHA = new Function(linhaDoPortao + '; return SENHA;')();
if (!(SENHA instanceof RegExp)) throw new Error('ABORTA: a linha lida no fonte do portao nao resolve em RegExp');
const caminho = process.argv[2];
if (!caminho) throw new Error('ABORTA: uso = node p195-agulha-do-padrao-lido-do-portao.mjs <ficheiro> [caminho-do-portao]');
const texto = readFileSync(caminho, 'utf8');
const linhas = texto.split('\n');
let n = 0;
for (const m of texto.matchAll(SENHA)) {
  n += 1;
  const antes = texto.slice(0, m.index);
  const linhaDoFicheiro = antes.split('\n').length;
  console.log('CASO ' + n + ' linha=' + linhaDoFicheiro + ' chave=' + JSON.stringify(m[1]) + ' valor_len=' + m[2].length +
    ' valor=' + JSON.stringify(m[2]) + ' texto_da_linha=' + JSON.stringify((linhas[linhaDoFicheiro - 1] || '').slice(0, 120)));
}
console.log('padrao_lido_do_portao=' + JSON.stringify(String(SENHA)) + ' SONDA_ACHADOS=' + n);
