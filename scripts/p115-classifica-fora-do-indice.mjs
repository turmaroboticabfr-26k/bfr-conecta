#!/usr/bin/env node
// P115 — censos dos ficheiros que o índice NÃO contém, medidos por classe e não por lista lembrada.
// A régua de `git status --porcelain` colapsa um directório não-versionado numa linha, por isso o censo
// usa `git ls-files --others --exclude-standard`, que desdobra o conteúdo. Para cada ficheiro fora do
// índice classifica-se: (a) onde vive, (b) se é evidência com nome de vermelho/ANTERIOR (classe que deve
// entrar no índice), (c) se carrega credencial medida (classe que deve ficar fora), (d) se é scratch de
// corrida. Não apaga nada do disco: emite as três listas para eu decidir por classe.
// Zero escrita no banco, zero deploy, zero rede autenticada.
import { readFileSync } from 'node:fs';
import { writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = (process.argv[2] || '21-11').trim();
const OUT = `${REPO}/evidence/p115-fora-do-indice-por-classe-${SUF}.json`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — corra com sufixo novo');
const git = (c) => execSync(c, { cwd: REPO, encoding: 'utf8' });

const fora = git('git ls-files --others --exclude-standard').split(/\r?\n/).filter(Boolean);
const noAr = git('git ls-files').split(/\r?\n/).filter(Boolean);
const ignorados = git('git ls-files --others --ignored --exclude-standard --directory').split(/\r?\n/).filter(Boolean);

// As quatro classes fortes que o portão de índice usa, lidas do EMISSOR e não dactilografadas aqui.
// Colho o par (fonte, flags) por análise da linha declarante — sem `eval`, porque o corpo do regex
// pode conter `/` e o instrumento não tem de executar texto do repo para o medir.
const portaoSrc = readFileSync(`${REPO}/scripts/portao-indice.mjs`, 'utf8');
const padraoDe = (nome) => {
  const linha = (portaoSrc.split(/\r?\n/).find((s) => new RegExp('const ' + nome + '\\s*=').test(s)) || '');
  const m = /\/((?:\\.|[^\\/\r\n])*)\/([dgimsuy]*)/.exec(linha);
  if (!m) return null;
  try { new RegExp(m[1], m[2]); } catch { return null; }
  return { source: m[1], flags: m[2] };
};
const REPS = { jwt: padraoDe('JWT'), senha: padraoDe('SENHA'), url_token: padraoDe('URLTOK') };
if (!REPS.jwt || !REPS.senha) throw new Error('ABORTA: o emissor do portao nao declara JWT/SENHA como regex — a classificacao nao poderia ser a mesma');

const classe = (f) => {
  const t = (() => { try { return readFileSync(`${REPO}/${f}`, 'utf8'); } catch { return null; } })();
  const bin = t === null;
  const conta = (re) => (bin || !re.global ? 0 : (t.match(re) || []).length);
  const jwtRe = new RegExp(REPS.jwt.source, REPS.jwt.flags.includes('g') ? REPS.jwt.flags : REPS.jwt.flags + 'g');
  const senhaRe = new RegExp(REPS.senha.source, REPS.senha.flags.includes('g') ? REPS.senha.flags : REPS.senha.flags + 'g');
  const urlRe = REPS.url_token ? new RegExp(REPS.url_token.source, REPS.url_token.flags.includes('g') ? REPS.url_token.flags : REPS.url_token.flags + 'g') : null;
  const n = { jwt: conta(jwtRe), senha: conta(senhaRe), url_token: urlRe ? conta(urlRe) : 0 };
  const portador = n.jwt + n.senha + n.url_token > 0;
  const nome = /(-VERMELHO|ANTERIOR|_VERMELHO|ERRO-MEU|INTERROMPIDA)/.test(f);
  const scratchRaiz = !f.includes('/') && /^[.]/.test(f);
  const captura = /\.(txt|log|run\.log|stdout)$/i.test(f);
  const classeNome = portador ? 'PORTADOR_DE_CREDENCIAL' : nome ? 'VERMELHO_PRESERVADO' : scratchRaiz ? 'SCRATCH_DE_RAIZ' : captura ? 'CAPTURA_DE_STDOUT' : bin ? 'BINARIO' : 'EVIDENCIA_LIMPA';
  return { bytes: bin ? 0 : Buffer.byteLength(t), classe: classeNome, occ: n };
};

const linhas = fora.map((f) => ({ f, ...classe(f) }));
const porClasse = {};
for (const l of linhas) { porClasse[l.classe] = porClasse[l.classe] || { n: 0, bytes: 0, exemplos: [] }; porClasse[l.classe].n++; porClasse[l.classe].bytes += l.bytes; if (porClasse[l.classe].exemplos.length < 6) porClasse[l.classe].exemplos.push(l.f); }
const porDirectorio = {};
for (const l of linhas) { const d = l.f.includes('/') ? l.f.split('/').slice(0, l.f.startsWith('evidence/') || l.f.startsWith('docs/') ? 1 : 1).join('/') : '(raiz)'; porDirectorio[d] = (porDirectorio[d] || 0) + 1; }

// O par que impede o auto-engano: nenhum destes ficheiros pode casar com um caminho JÁ versionado, e a
// regra de ignore proposta tem de ser medida contra o índice antes de ser escrita.
const saida = {
  programa: 'scripts/p115-classifica-fora-do-indice.mjs', em: new Date().toISOString(), sufixo: SUF,
  metodo: 'git ls-files --others --exclude-standard desdobra directorios; as regex de credencial sao importadas por fonte e flags de scripts/portao-indice.mjs, nao copiadas a mao.',
  contagens: { fora_do_indice: fora.length, no_indice: noAr.length, ignorados_por_regra: ignorados.length },
  por_classe: porClasse, por_directorio: porDirectorio,
  portadores: linhas.filter((l) => l.classe === 'PORTADOR_DE_CREDENCIAL').map((l) => ({ f: l.f, bytes: l.bytes, occ: l.occ })),
  vermelhos_preservados: linhas.filter((l) => l.classe === 'VERMELHO_PRESERVADO').map((l) => l.f),
  evidencias_limpas: linhas.filter((l) => l.classe === 'EVIDENCIA_LIMPA').map((l) => ({ f: l.f, bytes: l.bytes })),
  o_que_nao_faz: 'Nao apaga, nao move, nao adiciona ao indice e nao escreve no .gitignore: entrega as tres listas para a decisao ser por classe medida.',
};
writeFileSync(OUT, JSON.stringify(saida, null, 2) + '\n');
const TXT = OUT.replace(/\.json$/, '.txt');
const c = porClasse;
writeFileSync(TXT, `P115_FORA_DO_INDICE_MEDIDO · fora=${fora.length} no_indice=${noAr.length} ignorados=${ignorados.length}\n` + Object.entries(c).map(([k, v]) => `${k}: n=${v.n} bytes=${v.bytes}`).sort().join('\n') + `\n`);
console.log(`fora_do_indice=${fora.length} no_indice=${noAr.length} ignorados_por_regra=${ignorados.length}`);
for (const [k, v] of Object.entries(c).sort((a, b) => b[1].n - a[1].n)) console.log(`  ${k}: n=${v.n} bytes=${v.bytes}`);
console.log(`P115_FORA_DO_INDICE_MEDIDO · registo ${OUT}`);
