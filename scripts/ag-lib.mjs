// AG — parâmetros das candidatas. Não tem segredos: ficheiros de chave vivem fora do repositório e
// só são lidos onde é mesmo preciso pedir algo ao ar.
import { createHash } from 'node:crypto';

export const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';

const arg = (nome, padrao) => {
  const i = process.argv.indexOf('--' + nome);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : padrao;
};

export const baseDir = arg('base', 'worker-deploy-v123-pdfs');
export const saidaDir = arg('saida', 'bfr-candidata-v125-announcement-created-at');
export const diario = arg('diario', 'evidence/ag4-pen30-candidata-16-11.json');
export const runtime = arg('runtime', 'evidence/ag4-pen30-runtime-16-11.json');

export const md5 = (s) => createHash('md5').update(s).digest('hex');
export const conta = (t, sub) => t.split(sub).length - 1;
