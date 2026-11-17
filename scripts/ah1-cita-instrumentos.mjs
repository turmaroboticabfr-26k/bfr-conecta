// Todo caminho de instrumento ou artefacto citado em documento tem de existir no repositório.
// Só-leitura: não escreve nada além do próprio diário, e recusa-se a sobrescrever evidência existente.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const RAIZ = path.resolve(import.meta.dirname, '..');
const OUT = path.join(RAIZ, 'evidence/ah1-cita-instrumentos-17-11.json');
if (fs.existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com outro nome');

const DOCUMENTOS = [
  'docs/auditoria-bfr-conecta.md',
  'docs/roadmap-master.md',
  'docs/roadmap-painel.html',
  'docs/relatorio-professor-v59-2026-10-22.md'
];
// A extensão é **opcional** de propósito: uma primeira versão exigia `.mjs`/`.json` e por isso nunca
// apanhou citações no estilo `scripts/varre-escritas` (sem extensão), que é exactamente a forma de
// apontar para uma sonda de sessão. Nada de regex global com .test() em loop: conta a menos.
const PADROES = [
  ['script', /(?:^|[^A-Za-z0-9_./-])(scripts\/[A-Za-z0-9_.\-\u00C0-\u00FF]{3,}(?:\.(?:mjs|js|sql|sh))?)/],
  ['evidence', /(?:^|[^A-Za-z0-9_./-])(evidence\/[A-Za-z0-9_.\-\u00C0-\u00FF]{3,}(?:\.(?:json|txt|md|html|patch|csv))?)/],
  ['docs', /(?:^|[^A-Za-z0-9_./-])(docs\/[A-Za-z0-9_.\-\u00C0-\u00FF]{3,}(?:\.(?:md|html|json|txt))?)/]
];
const leituras = new Map();
const linhasDo = (doc) => {
  if (!leituras.has(doc)) leituras.set(doc, fs.readFileSync(path.join(RAIZ, doc), 'utf8').split('\n'));
  return leituras.get(doc);
};
const ocorr = [];
for (const doc of DOCUMENTOS) {
  linhasDo(doc).forEach((l, i) => {
    for (const [tipo, re] of PADROES) {
      const m = re.exec(l);
      if (!m) continue;
      const caminho = m[1];
      ocorr.push({ doc, linha: i + 1, tipo, caminho, depois: l.slice(m.index + m[0].length, m.index + m[0].length + 2), existe: fs.existsSync(path.join(RAIZ, caminho)) });
    }
  });
}
const presente = (o) => o.existe === true;
const unicas = [...new Set(ocorr.map((o) => o.caminho))];
// Primeira versão deste filtro lia `o.oexiste` (campo inexistente, logo `undefined` para sempre) e
// declarou **238 de 238** caminhos ausentes — incluindo o documento que estava a ser lido. Um
// vermelho do contador é a sonda sob juramento: confirmar a forma do objeto antes da prédica.
const ausentes = [...new Set(ocorr.filter((o) => !presente(o)).map((o) => o.caminho))].sort();

const git = (args) => {
  try { return execFileSync('git', args, { cwd: RAIZ, encoding: 'utf8' }); } catch { return ''; }
};
const versionados = git(['ls-files', 'scripts']).split('\n').filter(Boolean);
const bigramos = (s) => { const v = []; for (let i = 0; i < s.length - 1; i++) v.push(s.slice(i, i + 2)); return v; };
const dice = (a, b) => {
  const A = bigramos(a), B = new Set(bigramos(b));
  if (!A.length || !B.size) return 0;
  return (2 * A.filter((x) => B.has(x)).length) / (A.length + B.size);
};
// Identidade de produtor prova-se por **caminho espelhado**, nunca por semelhança de nome: se a
// linha que cita o script ausente cita também um artefacto, e há um script versionado cujo texto
// escreve esse artefacto, então a citação é gralha e o nome certo está medido.
const textoScript = new Map();
const textoDo = (v) => {
  if (!textoScript.has(v)) { try { textoScript.set(v, fs.readFileSync(path.join(RAIZ, v), 'utf8')); } catch { textoScript.set(v, ''); } }
  return textoScript.get(v);
};
const MARCAS = ['apaguei', 'já não existe', 'renomead', 'ANTERIOR', 'Correção datada', 'fora do índice', 'não foi commitad'];
// Espelho de saída com a prédica apertada (17/11, segunda passada do censo): a primeira versão bastava
// «o texto do script contém o caminho do artefacto», e isso contava **leitores** — `rm68-aplicar`,
// `rm68-conferencia`, `pdf-hor-5` e `pdf-hor-9` mencionam o diário do préflight sem o escreverem, pelo
// que um nome gralha era «provado» por três scripts errados. Agora exige escrita: literal dentro da
// chamada de escrita, ou identificador ligado por `const VAR = '<caminho>'` e passado a um `writeFileSync`.
const ESCRITA = /(?:\b(?:fs\.)?writeFileSync|\b(?:fs\.)?writeFile|appendFileSync|createWriteStream)\s*\(/;
const escreve_o_artefacto = (v, artefacto) => {
  const ls = textoDo(v).split(/\r?\n/);
  for (const [i, l] of ls.entries()) {
    if (l.includes(artefacto) && ESCRITA.test(l) && !/JSON\.parse|readFileSync|\bler\(/.test(l)) return { por: 'literal', linha: i + 1 };
  }
  const esc = artefacto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const lig = new RegExp(`(?:const|let)\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*[^;\\n]*['"\`]([^'"\`]*)${esc}[^'"\`]*['"\`]`);
  for (const [i, l] of ls.entries()) {
    const m = lig.exec(l);
    if (!m) continue;
    const usa = new RegExp(`(?:\\b(?:fs\\.)?writeFileSync|\\b(?:fs\\.)?writeFile|appendFileSync)\\s*\\((?:[^,()]*,\\s*)?${m[1]}\\b`);
    if (usa.test(ls.join('\n'))) return { por: 'variavel', linha: i + 1, var: m[1] };
  }
  return null;
};

// Uma prosa que cita uma **família** escreve o nome partido por um placeholder (`…-<largura>.json`,
// `…-m5-*.json`), e o capturador devolve o prefixo. Isso não é ficheiro em falta: a prova é que
// `git ls-files` tem caminhos a começar por esse prefixo. Sem esta classe o censo dava 6 falsos.
const versionados_todos = git(['ls-files']).split('\n').filter(Boolean);
const prefixo_de_familia = (caminho) => versionados_todos.filter((v) => v.startsWith(caminho));
const classe = (caminho) => {
  const onde = ocorr.filter((o) => o.caminho === caminho);
  const log = git(['log', '--all', '--format=%h %s', '--', caminho]).trim();
  const commits = log ? log.split('\n').length : 0;
  const em_disco = fs.existsSync(path.join(RAIZ, caminho));
  const base = path.basename(caminho);
  const parecidos = versionados.map((v) => ({ v, s: dice(base, path.basename(v)) })).sort((x, y) => y.s - x.s).slice(0, 2);
  const familia = prefixo_de_familia(caminho);
  const artefactos_na_mesma_linha = [...new Set(onde.flatMap((o) => {
    const l = linhasDo(o.doc)[o.linha - 1] || '';
    return [...l.matchAll(/evidence\/[A-Za-z0-9_.\-\u00C0-\u00FF]+\.(?:json|txt|md|html|patch|csv)/g)].map((m) => m[0]);
  }))];
  const espelhos = [...new Map(artefactos_na_mesma_linha.flatMap((a) =>
    versionados.filter((v) => v !== caminho).map((v) => [v + '|' + a, { script: v, artefacto: a, ...(escreve_o_artefacto(v, a) || {}) }]).filter(([, x]) => x.por)
  )).values()];
  const janela = onde.some((o) => {
    const ls = linhasDo(o.doc);
    return ls.slice(Math.max(0, o.linha - 4), o.linha + 3).some((l) => MARCAS.some((k) => l.includes(k)));
  });
  // Qualificação **nominal**: a prosa nomeia este mesmo caminho e diz que ele não vale — prova mais
  // forte que a janela (que apanha marca de qualquer parágrafo vizinho) e mais forte que o espelho.
  const janela_forte = onde.some((o) => {
    const ls = linhasDo(o.doc);
    return ls.slice(Math.max(0, o.linha - 4), o.linha + 3)
      .some((l) => l.includes(caminho) && l !== linhasDo(o.doc)[o.linha - 1] && MARCAS.some((k) => l.includes(k)));
  });
  const sem_extensao = !path.basename(caminho).includes('.');
  // Guard contra o falso verde da classe: um nome **cortado** da prosa (`…-developer-1` quando a frase
  // queria `-1.json`) também é prefixo de ficheiros versionados, e contaria como família sem o ser.
  // Só há família quando o caractere imediatamente a seguir ao token é um placeholder (`*`, `{`, `<`,
  // `…`, `/` de abreviatura) **e** o prefixo bate em >= 1 caminho versionado.
  const tem_placeholder = onde.some((o) => /^[*{<…/]/.test(o.depois || ''));
  const eh_familia = sem_extensao && tem_placeholder && familia.length > 0;
  const classe_ = commits > 0 ? 'APAGADO_DA_HISTORIA'
    : em_disco ? 'EXISTE_SO_EM_DISCO_NAO_VERSIONADO'
    : eh_familia ? 'PREFIXO_DE_FAMILIA_COM_PLACEHOLDER'
    : janela_forte ? 'CITACAO_JA_QUALIFICADA_EM_PROSA'
    : espelhos.length ? 'GRALHA_DE_NOME_PROVADA_POR_ESPELHO_DE_SAIDA'
    : janela ? 'CITACAO_JA_QUALIFICADA_EM_PROSA'
    : parecidos[0] && parecidos[0].s >= 0.6 ? 'POSSIVEL_GRALHA_DE_NOME_SEM_PROVA'
    : 'SONDA_DE_SESSAO_JAMAIS_VERSIONADA';
  return { commits_no_git: commits, ultimo_commit: commits ? log.split('\n')[0].slice(0, 90) : null, em_disco,
    familia_versionada: familia.length, exemplos_de_familia: familia.slice(0, 3),
    artefactos_na_mesma_linha, produzidos_por: espelhos.map((x) => `${x.script}(${x.por}@${x.linha})`),
    espelhos: espelhos.map((x) => `${x.script} escreve ${x.artefacto} por ${x.por} na linha ${x.linha}`),
    parecidos: parecidos.map((x) => `${x.v}#${x.s.toFixed(2)}`), janela_qualificada: janela, qualificada_por_nome: janela_forte, classe: classe_ };
};
// «equivalente» é palavra comum em português e contá-la sozinha deu falsos positivos (2 das 4
// batidas não apontavam para instrumento nenhum). Só conta quando está colada a um nome de
// instrumento: `scripts/X`-equivalente ou «o equivalente» do próprio backtick.
const APROX = /`scripts\/[A-Za-z0-9_.\-\u00C0-\u00FF]+`-equivalente|`[a-z0-9\-_.]+\.(?:mjs|js)`-equivalente/;
const aproximadas = [];
for (const doc of DOCUMENTOS) {
  linhasDo(doc).forEach((l, i) => { const m = APROX.exec(l); if (m) aproximadas.push({ doc, linha: i + 1, recorte: l.slice(Math.max(0, m.index - 40), m.index + 120) }); });
}
const classificadas = ausentes.map((c) => ({ caminho: c, citado_em: ocorr.filter((o) => o.caminho === c).map((o) => `${o.doc}:${o.linha}`), ...classe(c) }));
const soltas = classificadas.filter((a) => a.classe === 'GRALHA_DE_NOME_PROVADA_POR_ESPELHO_DE_SAIDA' || a.classe === 'SONDA_DE_SESSAO_JAMAIS_VERSIONADA' || a.classe === 'POSSIVEL_GRALHA_DE_NOME_SEM_PROVA' || a.classe === 'APAGADO_DA_HISTORIA' || a.classe === 'EXISTE_SO_EM_DISCO_NAO_VERSIONADO');
const por_classe = Object.fromEntries(classificadas.reduce((m, a) => m.set(a.classe, (m.get(a.classe) || 0) + 1), new Map()));
const veredito = {
  citacoes: ocorr.length,
  caminhos_distintos: unicas.length,
  ausentes_distintos: ausentes.length,
  por_classe,
  ausentes_ja_qualificadas_em_prosa: classificadas.filter((a) => a.classe === 'CITACAO_JA_QUALIFICADA_EM_PROSA').length,
  prefixos_de_familia: classificadas.filter((a) => a.classe === 'PREFIXO_DE_FAMILIA_COM_PLACEHOLDER').length,
  pontas_soltas: soltas.length,
  aproximadas_instrumento_equivalente: aproximadas.length,
  estado: soltas.length === 0 && aproximadas.length === 0 ? 'CITACAS_OK' : 'CITACAS_COM_PONTA_SOLTA'
};
const diario = {
  programa: 'scripts/ah1-cita-instrumentos.mjs',
  em: new Date().toISOString(),
  o_que_prova: 'cada caminho scripts/… , evidence/… e docs/… citado nos quatro documentos aponta para um ficheiro que existe no repositório; classifica os ausentes por causa medida (história no git, espelho de saída, qualificação prévia em prosa) e conta as citações que apontam para uma sonda de sessão com a palavra «equivalente»',
  o_que_NAO_prova: 'que o instrumento citado produza o que a frase diz além da existência do caminho (o espelho de saída prova que um script versionado escreve o artefacto citado na mesma linha, não que os números da frase saíram dele). As contagens são por **linha** (primeira batida por padrão), não por ocorrência. POSSIVEL_GRALHA_DE_NOME_SEM_PROVA é semelhança de bigramos (Dice >= 0.6), não identidade. PREFIXO_DE_FAMILIA_COM_PLACEHOLDER prova que existe >= 1 caminho versionado começando pelo prefixo capturado, não que o ficheiro concreto que a frase tinha em mente exista — a capturadora corta no placeholder (`…-<largura>.json`) e por isso a classe depende de o token não ter extensão.',
  documentos: DOCUMENTOS,
  por_documento: DOCUMENTOS.map((d) => {
    const doDoc = ocorr.filter((o) => o.doc === d);
    return { doc: d, citacoes: doDoc.length, ausentes: [...new Set(doDoc.filter((o) => !presente(o)).map((o) => o.caminho))].length };
  }),
  veredito,
  ausentes: classificadas,
  aproximadas
};
fs.writeFileSync(OUT, JSON.stringify(diario, null, 1) + '\n');
console.log(JSON.stringify(veredito));
console.log('por_documento', JSON.stringify(diario.por_documento));
for (const a of diario.ausentes) console.log('AUSENTE', a.caminho, '|', a.classe, '| git', a.commits_no_git, '| espelho', JSON.stringify(a.produzidos_por), '|', a.citado_em.join(' '));
for (const p of aproximadas) console.log('EQUIVALENTE', p.doc + ':' + p.linha, '|', p.recorte.slice(0, 120));
process.exit(veredito.estado === 'CITACAS_OK' ? 0 : 1);
