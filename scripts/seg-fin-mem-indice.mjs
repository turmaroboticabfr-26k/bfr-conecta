// Portao de INTEGRIDADE da memoria do projecto (fora do repo, por isso nao passa pelo pre-commit).
// Nao procura segredos — isso e o seg-fin-mem-varredura.mjs. Aqui o que se prova e que o indice nao
// mente: cada topic file tem de ter uma linha no MEMORY.md e cada linha do MEMORY.md um ficheiro.
// Em 09/11 o indice tinha 96 linhas para 96 ficheiros; um link partido apaga a memoria util porque
// nenhuma conversa seguinte a le, e um ficheiro sem linha e uma memoria que ninguem vai buscar.
// O tecto de 25 000 bytes do MEMORY.md vem do loader: acima disso o indice e cortado e as linhas
// do fim deixam de ser lidas. Nunca imprime valores, so caminhos, contagens e comprimentos.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const REPO = new URL('..', import.meta.url).pathname.replace(/^\//, '').replace(/\/$/, '');
const argDir = process.argv.find((a) => a.startsWith('--mem-dir='));
const MEM = argDir
  ? argDir.slice('--mem-dir='.length)
  : path.join(os.homedir(), '.qoder', 'projects', path.dirname(REPO).replace(/[:\\/]/g, '-'), 'memory');
const TECTO = 25000;

if (!fs.existsSync(MEM)) { console.log(`INSTRUMENTO CEGO: nao ha registos em ${MEM}`); process.exit(1); }
const INDEX = path.join(MEM, 'MEMORY.md');
if (!fs.existsSync(INDEX)) { console.log(`INSTRUMENTO CEGO: nao ha indice em ${MEM}`); process.exit(1); }

const texto = fs.readFileSync(INDEX, 'utf8');
const linhas = texto.split('\n');
const links = [...texto.matchAll(/^- \[[^\]]*\]\(([^)]+)\)/gm)].map((m) => m[1]);
const files = fs.readdirSync(MEM).filter((f) => f.endsWith('.md') && f !== 'MEMORY.md');
if (!links.length || !files.length) { console.log('INSTRUMENTO CEGO: indice ou topic files vazios'); process.exit(1); }

const orfos = files.filter((f) => !links.includes(f));
const partidos = links.filter((f) => !fs.existsSync(path.join(MEM, f)));
const duplicados = links.filter((f, i) => links.indexOf(f) !== i);
const semFront = files.filter((f) => {
  const t = fs.readFileSync(path.join(MEM, f), 'utf8');
  const m = t.match(/^---\n([\s\S]*?)\n---\n/);
  return !m || !/^name:\s*\S/m.test(m[1]) || !/^description:\s*\S/m.test(m[1]) || !/^metadata:\s*$/m.test(m[1]);
});

console.log(`diretorio: ${MEM}`);
console.log(`entradas no indice: ${links.length} | topic files: ${files.length}`);
console.log(`MEMORY.md: ${Buffer.byteLength(texto)} bytes (tecto ${TECTO}) | ${linhas.length} linhas`);
console.log(`orfos (ficheiro sem linha no indice): ${orfos.length}${orfos.length ? ' -> ' + orfos.join(', ') : ''}`);
console.log(`links partidos (linha sem ficheiro): ${partidos.length}${partidos.length ? ' -> ' + partidos.join(', ') : ''}`);
console.log(`links duplicados: ${duplicados.length}${duplicados.length ? ' -> ' + duplicados.join(', ') : ''}`);
console.log(`frontmatter incompleto (name/description/metadata): ${semFront.length}${semFront.length ? ' -> ' + semFront.join(', ') : ''}`);

const falha =
  links.length !== files.length ||
  orfos.length > 0 ||
  partidos.length > 0 ||
  semFront.length > 0 ||
  Buffer.byteLength(texto) > TECTO;
console.log(falha ? 'PORTAO DO INDICE FALHA' : 'PORTAO DO INDICE OK — indice e ficheiros batem certo e o MEMORY.md cabe no loader');
process.exit(falha ? 1 : 0);
