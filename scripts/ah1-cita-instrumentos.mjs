// Todo caminho de instrumento ou artefacto citado em documento tem de existir no repositório.
// Só-leitura: não escreve nada além do próprio diário, e recusa-se a sobrescrever evidência existente.
//
// Duas faces, e durante um ciclo só medi a primeira:
//   (1) citação → ficheiro **em disco** (o que a versão de 17/11 prometia, e cumpria);
//   (2) citação → ficheiro **no índice**, que é o que faz uma prova sobreviver a um clone.
// A face (2) existe porque o batch `1800682` já levou um stdout de sessão para dentro e, do outro lado, porque
// citei 683 caminhos com `CITACAS_OK` enquanto 16 artefactos nomeados na prosa viviam só na minha árvore de
// trabalho. Um portão que filtra por `fs.existsSync` **não pode** dar esse vermelho — a prova é que a classe
// `EXISTE_SO_EM_DISCO_NAO_VERSIONADO` deste ficheiro era código morto: só era consultada para caminhos já
// excluídos por não estarem em disco. Foi removida, e a face (2) passou a ser medida por conjunto.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const RAIZ = path.resolve(import.meta.dirname, '..');
// O nome por omissão é a corrida de 17/11, congelada como evidência: um censo de fecho de ciclo não pode
// sobrescrevê-la nem apagar quem a produziu. `CITA_OUT` (absoluto ou relativo à raiz) permite nova corrida
// mantendo este script como produtor do artefacto.
const OUT = process.env.CITA_OUT
  ? path.isAbsolute(process.env.CITA_OUT) ? process.env.CITA_OUT : path.join(RAIZ, process.env.CITA_OUT)
  : path.join(RAIZ, 'evidence/ah1-cita-instrumentos-17-11.json');
if (fs.existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com outro nome');

const git = (args) => {
  try { return execFileSync('git', args, { cwd: RAIZ, encoding: 'utf8' }); } catch { return ''; }
};
const linhasGit = (args) => git(['-c', 'core.quotePath=false', ...args]).split(/\r?\n/).filter(Boolean);

// O corpus é derivado do índice, nunca dactilografado: prosa versionada = `docs/**` e `evidence/**` em
// markdown/html, mais o README. A lista de quatro documentos de 17/11 ficava dentro do script e era o motivo
// pelo qual as citações do runbook municipal (`docs/bu-20-11/…`) não eram medidas por portão nenhum.
const NUCLEO_17_11 = [
  'docs/auditoria-bfr-conecta.md',
  'docs/roadmap-master.md',
  'docs/roadmap-painel.html',
  'docs/relatorio-professor-v59-2026-10-22.md'
];
const DOCUMENTOS = [...new Set([...linhasGit(['ls-files', '--', 'docs', 'evidence', 'README.md'])
  .filter((p) => /\.(md|html)$/i.test(p)), ...NUCLEO_17_11])].sort();
// A extensão é **opcional** de propósito: uma primeira versão exigia `.mjs`/`.json` e por isso nunca
// apanhou citações no estilo `scripts/varre-escritas` (sem extensão), que é exactamente a forma de
// apontar para uma sonda de sessão. Nada de regex global com .test() em loop: conta a menos.
const PADROES = [
  ['script', /(?:^|[^A-Za-z0-9_./-])(scripts\/[A-Za-z0-9_.\-\u00C0-\u00FF]{3,}(?:\.(?:mjs|js|sql|sh))?)/],
  ['evidence', /(?:^|[^A-Za-z0-9_./-])(evidence\/[A-Za-z0-9_.\-\u00C0-\u00FF]{3,}(?:\.(?:json|txt|md|html|patch|csv))?)/],
  ['docs', /(?:^|[^A-Za-z0-9_./-])(docs\/[A-Za-z0-9_.\-\u00C0-\u00FF]{3,}(?:\.(?:md|html|json|txt))?)/]
];
const PADROES_G = PADROES.map(([t, re]) => [t, new RegExp(re.source, 'g')]);
const leituras = new Map();
const linhasDo = (doc) => {
  if (!leituras.has(doc)) leituras.set(doc, fs.readFileSync(path.join(RAIZ, doc), 'utf8').split('\n'));
  return leituras.get(doc);
};
const ocorr = [];
for (const doc of DOCUMENTOS) {
  linhasDo(doc).forEach((l, i) => {
    for (const [tipo, re] of PADROES_G) {
      // `matchAll`, não um `exec` por linha: a primeira versão apanhava **só a primeira** citação de cada tipo
      // em cada linha, e um ficheiro esquecido nomeado no segundo slot de uma frase dupla era invisível para a
      // face (2) — o falso verde que este portão existe para caçar. `matchAll` clona o regex, logo o `lastIndex`
      // partilhado do `.test()` em loop (a armadilha antiga) não regressa.
      for (const m of l.matchAll(re)) {
        const caminho = m[1];
        ocorr.push({ doc, linha: i + 1, tipo, caminho, antes: l.slice(Math.max(0, m.index), m.index + m[0].length - caminho.length), depois: l.slice(m.index + m[0].length, m.index + m[0].length + 2), existe: fs.existsSync(path.join(RAIZ, caminho)) });
      }
    }
  });
}
const presente = (o) => o.existe === true;
const unicas = [...new Set(ocorr.map((o) => o.caminho))];
// Primeira versão deste filtro lia `o.oexiste` (campo inexistente, logo `undefined` para sempre) e
// declarou **238 de 238** caminhos ausentes — incluindo o documento que estava a ser lido. Um
// vermelho do contador é a sonda sob juramento: confirmar a forma do objeto antes da prédica.
const ausentes = [...new Set(ocorr.filter((o) => !presente(o)).map((o) => o.caminho))].sort();

const versionados = linhasGit(['ls-files', 'scripts']);
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
// A declaração de MARCAS vive uma só vez, mais abaixo, como `MARCAS_AUSENCIA`: duas listas do mesmo vocabulário
// neste ficheiro eram a receita para uma delas envelhecer sozinha.
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
// Em 22/11 a classe teve de crescer com duas formas que o guard de 17/11 não previa, ambas medidas no corpus
// alargado: (i) a elipse **dentro** do token (`evidence/bu4-...json -> mesas_orfas…`, um JSON-pointer em prosa),
// e (ii) o prefixo anunciado pela própria frase («as três com o prefixo `evidence/…-20-11`»), em que o caractere
// seguinte é um backtick e não um marcador. As duas exigem >= 1 caminho versionado atrás da âncora, pelo que um
// nome inventado continua a dar ponta solta.
const MARCAS_AUSENCIA = ['apaguei', 'já não existe', 'renomead', 'ANTERIOR', 'Correção datada', 'fora do índice',
  'não foi commitad', 'não existe', 'passou a escrever', 'nascem do passo de publicação'];
const versionados_todos = linhasGit(['ls-files']);
const prefixo_de_familia = (caminho) => versionados_todos.filter((v) => v.startsWith(caminho));
// Âncora = o caminho cortado no primeiro marcador de placeholder (elipse, `XX`, `<nome>`). Se não há marcador,
// a âncora é o próprio caminho e a classe não pode ser «modelo de forma».
const MARCADOR = /(\.\.\.|…|XX|[<]{1}[a-z])/;
const ancora_de_placeholder = (caminho) => {
  const base = path.basename(caminho);
  const m = MARCADOR.exec(base);
  if (!m) return caminho;
  const dirLen = caminho.length - base.length;
  return caminho.slice(0, dirLen + m.index);
};
// Um produtor versionado pode escrever um nome **composto** (`evidence/p73-municipal-${modo}-${peca}-${stamp}.json`),
// e então a prosa que cita a *forma* não alega um ficheiro. A prova é o código do produtor, não a minha memória.
const codigoVersionado = versionados.filter((v) => /\.(mjs|js|sql|sh)$/i.test(v));
const produtor_menciona = (prefixo) => codigoVersionado.some((v) => textoDo(v).includes(prefixo));
// O guard anti-degenerado: uma âncora curta (`evidence/`) aparece em qualquer script do repo, logo nunca pode
// provar uma forma. Só conta âncora com nome comprido e sem barra final.
const ancora_ok = (a) => path.basename(a).length >= 12 && !/\/$/.test(a);
const eh_padrao_de_grep_puro = (antes, nMembros) => /\^\s*$/.test(antes) && nMembros > 0;
// As duas predicates de abaixo, puras, para terem fixtures: uma prosa enrolada em linhas não se mede por linha,
// e «prefixo» só vale quando anuncia **este** token.
const janela_texto = (o) => linhasDo(o.doc).slice(Math.max(0, o.linha - 4), o.linha + 3).join(' ').replace(/\s+/g, ' ');
const prosa_qualifica = (texto, caminho, marcas) => marcas.some((k) => texto.includes(k)) && texto.includes(caminho);
const prefixo_anuncia_o_token = (texto, token, caracteres = 60) => {
  let i = -1;
  while ((i = texto.indexOf(token, i + 1)) !== -1) {
    if (/(?:prefixo|padr[õo]o de nome|forma do nome|template|fam[íi]lia)/i.test(texto.slice(Math.max(0, i - caracteres), i))) return true;
  }
  return false;
};
const MARCA_FENCE = /^\s*(?:`{3,}|~{3,})/;
// Prosa **dentro** de bloco de código é sintaxe de comando, não alegação sobre o repositório: o operando de
// exemplo `node scripts/seg-gate-hit.mjs scripts/X.mjs` não promete que `scripts/X.mjs` exista. Conto os
// delimitadores antes da linha (único = dentro), e um bloco nunca fechado conta como dentro — o documento
// truncado é menos comum que o comando de exemplo, e a classe continua depois da suspeita de gralha.
const dentro_de_fence = (linhas, idx) => { let n = 0; for (let i = 0; i < idx; i++) if (MARCA_FENCE.test(linhas[i] || '')) n++; return n % 2 === 1; };
const classe = (caminho) => {
  const onde = ocorr.filter((o) => o.caminho === caminho);
  const log = git(['log', '--all', '--format=%h %s', '--', caminho]).trim();
  const commits = log ? log.split('\n').length : 0;
  const em_disco = fs.existsSync(path.join(RAIZ, caminho));
  const base = path.basename(caminho);
  // Vizinhos de nome medidos sobre **todo** o índice: `versionados` é só `scripts/`, e comparar um artefacto de
  // `evidence/` apenas contra scripts nunca daria a gralha de um nome de evidência. Alargar esta régua só pode
  // aumentar as pontas soltas (a classe é de suspeita, não de absolvição) — o contrário seria branquear.
  const parecidos = versionados_todos.filter((v) => v !== caminho).map((v) => ({ v, s: dice(base, path.basename(v)) })).sort((x, y) => y.s - x.s).slice(0, 2);
  const familia = prefixo_de_familia(caminho);
  const ancora = ancora_de_placeholder(caminho);
  const familia_da_ancora = ancora === caminho ? [] : prefixo_de_familia(ancora);
  // A âncora pode ainda ser comprida demais para o produtor: `…-reversao-PEN-` não aparece literal em parte
  // alguma, mas `…-reversao-` tem seis membros versionados e `evidence/p73-municipal-` está no código que escreve
  // o nome. Os candidatos são o prefixo cortado em cada hífen **do basename**, da direita para a esquerda, e cada
  // um é medido por membros **e** por produtor — não por mim.
  // Até 22/11 os candidatos eram filtrados por `basename >= 12`, e isso cegava a rota de membros: `evidence/bu3-`
  // (10 versionados) e `evidence/bu2c-` (6) eram descartados antes de contados e caíam em SONDA. O comprimento só
  // interessa à rota do produtor — uma âncora curta pode ser a string do directorio noutro script — e esse guard
  // vive em `ancora_ok`, aplicado em `ancora_prova`. O limite estrutural aqui é outro: nunca recuar para dentro
  // do directorio, porque `evidence/` tem milhares de membros e provaria qualquer coisa.
  const candidatos_ancora = (a) => {
    const out = [a];
    const dirLen = a.lastIndexOf('/') + 1;
    let i = a.length;
    for (;;) {
      const j = a.lastIndexOf('-', i - 1);
      if (j < dirLen) break;
      const corte = a.slice(0, j + 1);
      if (corte !== a) out.push(corte);
      i = j;
    }
    return out;
  };
  const provas_ancora = ainda_marca => candidatos_ancora(ainda_marca).map((a) => ({
    ancora: a, membros: prefixo_de_familia(a).length, produtor: produtor_menciona(a)
  }));
  const textoJanelas = onde.map(janela_texto);
  const artefactos_na_mesma_linha = [...new Set(onde.flatMap((o) => {
    const l = linhasDo(o.doc)[o.linha - 1] || '';
    return [...l.matchAll(/evidence\/[A-Za-z0-9_.\-\u00C0-\u00FF]+\.(?:json|txt|md|html|patch|csv)/g)].map((m) => m[0]);
  }))];
  const espelhos = [...new Map(artefactos_na_mesma_linha.flatMap((a) =>
    versionados.filter((v) => v !== caminho).map((v) => [v + '|' + a, { script: v, artefacto: a, ...(escreve_o_artefacto(v, a) || {}) }]).filter(([, x]) => x.por)
  )).values()];
  const janela = textoJanelas.some((t) => MARCAS_AUSENCIA.some((k) => t.includes(k)));
  // Qualificação **nominal por linha diferente**: a prosa nomeia este mesmo caminho numa linha e a marca de
  // ausência noutra — a forma mais forte, e a que existia desde 17/11. Mantida como está porque é a única que
  // ainda deixa um espelho de saída ganhar: promover uma marca escrita ao lado do próprio nome teria apagado o
  // vermelho de uma gralha provada por escrita.
  const linha_de_citacao = (o) => linhasDo(o.doc)[o.linha - 1] || '';
  const janela_forte = onde.some((o) => {
    const ls = linhasDo(o.doc);
    return ls.slice(Math.max(0, o.linha - 4), o.linha + 3)
      .some((l) => l !== linha_de_citacao(o) && l.includes(caminho) && MARCAS_AUSENCIA.some((k) => l.includes(k)));
  });
  // Tier intermédio, acrescentado em 22/11: a marca e o nome estão ambos na **janela junta**, o que é o que
  // acontece quando a prosa está enrolada a meio da frase (`… e só\nnascem do passo de publicação`). Vem depois
  // do espelho de saída pela mesma razão: uma qualificação débil não pode derrotar uma prova de escrita.
  const janela_qualifica = textoJanelas.some((t) => prosa_qualifica(t, caminho, MARCAS_AUSENCIA));
  const sem_extensao = !path.basename(caminho).includes('.');
  // Guard contra o falso verde da classe: um nome **cortado** da prosa (`…-developer-1` quando a frase
  // queria `-1.json`) também é prefixo de ficheiros versionados, e contaria como família sem o ser.
  // Só há família quando (a) o caractere imediatamente a seguir ao token é um marcador (`*`, `{`, `<`, `…`,
  // `/`), ou (b) a elipse vive dentro do token, ou (c) a própria frase anuncia «prefixo» antes dele — e em
  // qualquer dos três casos o prefixo tem de bater em >= 1 caminho versionado.
  const tem_placeholder = onde.some((o) => /^[*{<…/]/.test(o.depois || ''));
  const tem_marcador_interno = ancora !== caminho;
  const provas = tem_marcador_interno ? provas_ancora(ancora) : [];
  const ancora_em_membros = tem_marcador_interno ? provas.some((x) => x.membros > 0) : familia.length > 0;
  // A prova da *forma* só conta quando nenhum candidato tem membros: se há ficheiros versionados sob a âncora, a
  // classe é família (mais forte, e já existia), não forma-de-produtor.
  const ancora_prova = tem_marcador_interno
    ? (provas.find((x) => x.membros > 0) || provas.find((x) => x.membros === 0 && ancora_ok(x.ancora) && x.produtor) || null)
    : null;
  const diz_prefixo = textoJanelas.some((t) => prefixo_anuncia_o_token(t, caminho));
  const eh_padrao_grep = onde.some((o) => eh_padrao_de_grep_puro(o.antes, familia.length));
  const eh_familia = ((sem_extensao && tem_placeholder) || tem_marcador_interno || (sem_extensao && diz_prefixo))
    && ancora_em_membros;
  const eh_forma_produtor = tem_marcador_interno && !ancora_em_membros && !!ancora_prova
    && ancora_prova.membros === 0 && !!ancora_prova.produtor;
  // Todas as ocorrências dentro de bloco de código: um operando de exemplo não alega existência. Vem **depois**
  // da suspeita de gralha no encadeamento — um nome partido dentro de um comando continua um comando partido.
  const so_em_bloco_de_codigo = onde.length > 0 && onde.every((o) => dentro_de_fence(linhasDo(o.doc), o.linha - 1));
  // O ramo `em_disco` que aqui esteve até 22/11 era código morto: `classe()` só é chamada sobre `ausentes`,
  // e `ausentes` filtra por `existe === false`, logo `em_disco` nunca era verdadeiro dentro desta função. A
  // classe que ela prometia medir («citado, existe em disco, não versionado») passou a ser medida por
  // conjunto na face (2) mais abaixo, contra `git ls-files` — não contra `fs.existsSync`.
  const classe_ = commits > 0 ? 'APAGADO_DA_HISTORIA'
    : eh_familia ? 'PREFIXO_DE_FAMILIA_COM_PLACEHOLDER'
    : eh_padrao_grep ? 'PADRAO_DE_GREP_EM_COMANDO_VERSIONADO'
    : eh_forma_produtor ? 'FORMA_DECLARADA_PELO_PRODUTOR'
    : janela_forte ? 'CITACAO_JA_QUALIFICADA_EM_PROSA'
    : espelhos.length ? 'GRALHA_DE_NOME_PROVADA_POR_ESPELHO_DE_SAIDA'
    : janela_qualifica || janela ? 'CITACAO_JA_QUALIFICADA_EM_PROSA'
    : parecidos[0] && parecidos[0].s >= 0.6 ? 'POSSIVEL_GRALHA_DE_NOME_SEM_PROVA'
    : so_em_bloco_de_codigo ? 'OPERANDO_DE_EXEMPLO_EM_BLOCO_DE_CODIGO'
    : 'SONDA_DE_SESSAO_JAMAIS_VERSIONADA';
  return { commits_no_git: commits, ultimo_commit: commits ? log.split('\n')[0].slice(0, 90) : null, em_disco,
    familia_versionada: familia.length, exemplos_de_familia: familia.slice(0, 3),
    ancora_de_placeholder: ancora, familia_da_ancora: familia_da_ancora.length,
    exemplos_da_ancora: familia_da_ancora.slice(0, 3), marcador_interno: tem_marcador_interno, prosa_diz_prefixo: diz_prefixo,
    so_em_bloco_de_codigo: so_em_bloco_de_codigo,
    artefactos_na_mesma_linha, produzidos_por: espelhos.map((x) => `${x.script}(${x.por}@${x.linha})`),
    espelhos: espelhos.map((x) => `${x.script} escreve ${x.artefacto} por ${x.por} na linha ${x.linha}`),
    parecidos: parecidos.map((x) => `${x.v}#${x.s.toFixed(2)}`), janela_qualificada: janela,
    qualificada_por_nome: janela_forte, qualificada_por_janela_junta: janela_qualifica, classe: classe_ };
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
// A lista de classes «soltas» era escrita em `||` dentro do filtro; passou a conjunto para que a classe removida
// acima não possa regressar por hábito de digitação.
const PONTAS_SOLTAS = new Set(['GRALHA_DE_NOME_PROVADA_POR_ESPELHO_DE_SAIDA', 'SONDA_DE_SESSAO_JAMAIS_VERSIONADA',
  'POSSIVEL_GRALHA_DE_NOME_SEM_PROVA', 'APAGADO_DA_HISTORIA']);
const soltas = classificadas.filter((a) => PONTAS_SOLTAS.has(a.classe));
const por_classe = Object.fromEntries(classificadas.reduce((m, a) => m.set(a.classe, (m.get(a.classe) || 0) + 1), new Map()));

// ---- FACE (2): citado em disco, mas fora do índice --------------------------------------------------
// Conjunto, não `existsSync`: o que faz uma prova sobreviver a um clone é estar no índice. As quatro saídas
// possíveis são as quatro faces declaradas da classe (esquecido / recusado-por-regra-versionada /
// portador-declarado-com-frase / já-no-índice), e a lista dos portadores é **lida da fonte do p125**, não
// lembrada por mim — se o p125 mudar de forma, o portão 3 abaixo chumba em vez de esvaziar a lista em silêncio.
const noIndice = new Set(versionados_todos);
const naoVersionadosNaoIgnorados = new Set(linhasGit(['ls-files', '--others', '--exclude-standard']));
const fonteP125 = fs.readFileSync(path.join(RAIZ, 'scripts/p125-portadores-fora-do-indice.mjs'), 'utf8');
const paresP125 = [...fonteP125.matchAll(/\{ arquivo: '([^']+)', a_prosa_diz: '(.*?)' \}/g)];
const portadoresDeclarados = new Set(paresP125.map((m) => m[1]));

const face_indice = (caminho, ctx) => {
  if (!ctx.emDisco(caminho)) return null;
  if (ctx.noIndice.has(caminho)) return 'JA_NO_INDICE';
  if (ctx.declarados.has(caminho)) return 'PORTADOR_DECLARADO_FORA_POR_DECISAO';
  if (ctx.naoVersionadosNaoIgnorados.has(caminho)) return 'FORA_DO_INDICE_SEM_DECLARACAO';
  return 'IGNORADO_POR_REGRA_VERSIONADA';
};
const ctxReal = { emDisco: (c) => fs.existsSync(path.join(RAIZ, c)), noIndice, declarados: portadoresDeclarados, naoVersionadosNaoIgnorados };
// Um caminho só entra na face (2) se estiver **inteiro** na prosa: um token cortado num placeholder não é um
// ficheiro que falte no índice, é uma família descrita em prosa — por isso não uso `startsWith` aqui.
const citadosEmDisco = unicas.filter((c) => ctxReal.emDisco(c));
const faceIndice = citadosEmDisco.map((c) => ({ caminho: c, face: face_indice(c, ctxReal),
  citado_em: ocorr.filter((o) => o.caminho === c).map((o) => `${o.doc}:${o.linha}`) }));
const facePorClasse = faceIndice.reduce((m, x) => m.set(x.face, (m.get(x.face) || 0) + 1), new Map());
const esquecidos = faceIndice.filter((x) => x.face === 'FORA_DO_INDICE_SEM_DECLARACAO');

// Os dentes, sem tocar no mundo: as cinco saídas da classifier têm de ser atingíveis por input sintético.
// Escrever um ficheiro falso no repo para provar isto seria fabricar um candidato a portador; os conjuntos são
// passados à função, como o p125 faz com o fixture de credencial.
const fixtureCtx = (o) => ({ emDisco: (c) => (o.emDisco || []).includes(c), noIndice: new Set(o.noIndice || []),
  declarados: new Set(o.declarados || []), naoVersionadosNaoIgnorados: new Set(o.naoVersionados || []) });
const FIXTURES_INDICE = [
  ['ja_no_indice', 'evidence/a.json', { emDisco: ['evidence/a.json'], noIndice: ['evidence/a.json'] }, 'JA_NO_INDICE'],
  ['portador_declarado', 'evidence/b.json', { emDisco: ['evidence/b.json'], declarados: ['evidence/b.json'], naoVersionados: ['evidence/b.json'] }, 'PORTADOR_DECLARADO_FORA_POR_DECISAO'],
  ['esquecido', 'evidence/c.json', { emDisco: ['evidence/c.json'], naoVersionados: ['evidence/c.json'] }, 'FORA_DO_INDICE_SEM_DECLARACAO'],
  ['ignorado_por_regra', 'evidence/d.json', { emDisco: ['evidence/d.json'] }, 'IGNORADO_POR_REGRA_VERSIONADA'],
  ['nao_esta_em_disco', 'evidence/e.json', {}, null],
];
const falhas = [];
const portoes = [];
const gate = (nome, obtido, esperado) => {
  portoes.push(nome);
  const o = JSON.stringify(obtido), e = JSON.stringify(esperado);
  if (o !== e) falhas.push({ portao: nome, obtido: o, esperado: e });
};
gate('a_classifier_de_indice_cobre_as_cinco_saidas',
  FIXTURES_INDICE.map(([nome, caminho, opts, esperado]) => [nome, face_indice(caminho, fixtureCtx(opts)) === esperado]),
  FIXTURES_INDICE.map(([nome]) => [nome, true]));
gate('o_esquecido_do_fixture_nao_se_confunde_com_o_declarado',
  [face_indice('evidence/c.json', fixtureCtx({ emDisco: ['evidence/c.json'], naoVersionados: ['evidence/c.json'] })) === 'FORA_DO_INDICE_SEM_DECLARACAO',
    face_indice('evidence/c.json', fixtureCtx({ emDisco: ['evidence/c.json'], declarados: ['evidence/c.json'], naoVersionados: ['evidence/c.json'] })) === 'PORTADOR_DECLARADO_FORA_POR_DECISAO',
    face_indice('evidence/c.json', fixtureCtx({ emDisco: ['evidence/c.json'], noIndice: ['evidence/c.json'], naoVersionados: ['evidence/c.json'] })) === 'JA_NO_INDICE'],
  [true, true, true]);
// Duas rotas independentes sobre a mesma fonte, à maneira do p125 com os padrões do emissor: uma regex de par
// completo e outra restrita ao bloco `const DECLARADOS = [ … ];`. Comparar o conjunto consigo mesmo seria
// tautologia; se a forma do p125 mudar, as duas rotas separam-se e este portão chumba em vez de esvaziar a
// lista de declarados em silêncio — que é exactamente o modo como um falso verde nascaria um esquecido.
const blocoDeclarados = (/const DECLARADOS = \[([\s\S]*?)\n\];/.exec(fonteP125) || [, ''])[1];
const rotaBloco = new Set([...blocoDeclarados.matchAll(/arquivo: '([^']+)'/g)].map((m) => m[1]));
gate('as_duas_rotas_de_lectura_dos_declados_do_p125_batem',
  [[...portadoresDeclarados].sort(), [...rotaBloco].sort(), portadoresDeclarados.size > 0, rotaBloco.size > 0],
  [[...rotaBloco].sort(), [...rotaBloco].sort(), true, true]);
gate('nenhum_caminho_em_disco_citado_na_prosa_fica_fora_do_indice_sem_declaracao', esquecidos.map((x) => x.caminho), []);
gate('o_conjunto_de_indice_e_o_de_nao_ignorado_sao_disjuntos',
  [...noIndice].filter((c) => naoVersionadosNaoIgnorados.has(c)).length, 0);
// Os três predicados novos da face (1) são puros, portanto testáveis com strings sintéticas: sem isto, as
// classes «prefixo anunciado», «qualificação por janela junta» e «âncora de placeholder» seriam alegações sobre
// a prosa, e a única prova de um vermelho seria eu agridar a lista até ele bater.
const TOK = 'evidence/xx-20-11';
const FIX_PREFIXO_SIM = 'as três com o prefixo `' + TOK + '`. canónico re-emitido';
const FIX_PREFIXO_NAO = 'o ficheiro `' + TOK + '` falta no índice e ninguém o anunciou';
const MARCA_FIX = 'não existe';
const TOK2 = 'evidence/yy-20-11.txt';
const FIX_QUAL_SIM = 'as três exigidas são `' + TOK2 + '` e só ' + MARCA_FIX + ' depois do passo';
const FIX_QUAL_SEM_MARCA = 'as três exigidas são `' + TOK2 + '` e as outras duas';
const FIX_QUAL_SEM_NOME = 'as três exigidas são outras e ' + MARCA_FIX + ' depois do passo';
gate('o_predicado_de_prefixo_anunciado_tem_positivo_e_negativo',
  [prefixo_anuncia_o_token(FIX_PREFIXO_SIM, TOK), prefixo_anuncia_o_token(FIX_PREFIXO_NAO, TOK)], [true, false]);
gate('o_predicado_de_qualificacao_exige_marca_e_nome',
  [prosa_qualifica(FIX_QUAL_SIM, TOK2, [MARCA_FIX]), prosa_qualifica(FIX_QUAL_SEM_MARCA, TOK2, [MARCA_FIX]),
    prosa_qualifica(FIX_QUAL_SEM_NOME, TOK2, [MARCA_FIX])], [true, false, false]);
gate('a_ancora_corta_no_primeiro_marcador_e_nao_inventa_ancora',
  [ancora_de_placeholder('evidence/bu4-...json'), ancora_de_placeholder('evidence/x-PEN-XX-<stamp>.json'),
    ancora_de_placeholder('evidence/normal-20-11.json'), ancora_de_placeholder('evidence/sem-extensao')],
  ['evidence/bu4-', 'evidence/x-PEN-', 'evidence/normal-20-11.json', 'evidence/sem-extensao']);
// Dentes do extractor corrigido: uma linha com duas citações do mesmo tipo tem de dar duas ocorrências, uma com
// uma só continua uma, e um portão que só mede o caso de uma linha não tem positivo para o defeito que era real.
const extrai = (linha) => PADROES_G.flatMap(([, re]) => [...linha.matchAll(re)].map((m) => m[1]));
gate('o_extractor_apanha_todas_as_citacoes_da_linha',
  [extrai('de `evidence/a-1.json` e `evidence/a-2.json` no mesmo fôlego'), extrai('só `evidence/a-1.json` aqui'),
    extrai('entre `scripts/x.mjs` e `scripts/y.mjs` e `docs/z.md`'), extrai('prosa sem caminho nenhum')],
  [['evidence/a-1.json', 'evidence/a-2.json'], ['evidence/a-1.json'],
    ['scripts/x.mjs', 'scripts/y.mjs', 'docs/z.md'], []]);
// O guard da âncora é o que separa «o produtor escreve este nome» de «a string `evidence/` vive em qualquer
// script»: sem negativo aqui, a classe FORMA_DECLARADA_PELO_PRODUTOR aceita qualquer citação com marcador.
gate('o_guard_da_ancora_chumba_o_prefixo_de_directorio',
  [ancora_ok('evidence/p73-municipal-reversao-PEN-'), ancora_ok('evidence/abc.json'),
    ancora_ok('evidence/p73-municipal-reversao/'), ancora_ok('evidence/')],
  [true, false, false, false]);
// A absolvição por bloco de código tem de ter negativo: o mesmo operando escrito em prosa, fora de fence, é
// alegação sobre o repositório e continua ponta solta. Sem este fixture, «está num bloco` ``` `" passaria a
// limpar qualquer citação de ficheiro inexistente.
gate('o_fence_absolve_o_operando_e_acusa_a_prosa',
  [dentro_de_fence(['prosa', '```', 'node scripts/seg-gate-hit.mjs scripts/X.mjs', '```', 'prosa'], 2),
    dentro_de_fence(['prosa', '```', 'cmd', '```', 'scripts/X.mjs citado aqui'], 4),
    dentro_de_fence(['prosa', '```', 'cmd'], 2), dentro_de_fence(['prosa sem fence'], 0),
    dentro_de_fence(['```', 'cmd', '```', '```', 'cmd2'], 4)],
  [true, false, true, false, true]);
// Vocabulário morto imprime-se, não se gateia: uma marca pode perder uso sem que isso seja um defeito do mundo.
const janelas_do = (caminho) => ocorr.filter((o) => o.caminho === caminho).map(janela_texto);
const marcas_no_corpus = MARCAS_AUSENCIA.map((k) => [k, ausentes.filter((c) => janelas_do(c).some((t) => t.includes(k))).length]);
const veredito = {
  citacoes: ocorr.length,
  documentos_medidos: DOCUMENTOS.length,
  caminhos_distintos: unicas.length,
  ausentes_distintos: ausentes.length,
  por_classe,
  ausentes_ja_qualificadas_em_prosa: classificadas.filter((a) => a.classe === 'CITACAO_JA_QUALIFICADA_EM_PROSA').length,
  prefixos_de_familia: classificadas.filter((a) => a.classe === 'PREFIXO_DE_FAMILIA_COM_PLACEHOLDER').length,
  pontas_soltas: soltas.length,
  aproximadas_instrumento_equivalente: aproximadas.length,
  face_indice: { citados_em_disco: citadosEmDisco.length, por_face: Object.fromEntries(facePorClasse),
    portadores_declarados_lidos_do_p125: portadoresDeclarados.size, esquecidos: esquecidos.map((x) => x.caminho) },
  marcas_de_ausencia_no_corpus: Object.fromEntries(marcas_no_corpus),
  portoes: portoes.length,
  falhas: falhas.map((f) => f.portao),
  estado: (soltas.length === 0 && aproximadas.length === 0 && falhas.length === 0) ? 'CITACAS_OK' : 'CITACAS_COM_PONTA_SOLTA'
};
const diario = {
  programa: 'scripts/ah1-cita-instrumentos.mjs',
  em: new Date().toISOString(),
  o_que_prova: 'duas faces de cada caminho scripts/… , evidence/… e docs/… citado na prosa versionada: (1) aponta para um ficheiro que existe em disco, com os ausentes classificados por causa medida (história no git, espelho de saída, qualificação prévia em prosa); (2) os que estão em disco estão ou no índice, ou recusados por regra de .gitignore versionada, ou declarados como portadores no `scripts/p125-portadores-fora-do-indice.mjs`. Conta também as citações que apontam para uma sonda de sessão com a palavra «equivalente».',
  o_que_NAO_prova: 'que o instrumento citado produza o que a frase diz além da existência do caminho (o espelho de saída prova que um script versionado escreve o artefacto citado na mesma linha, não que os números da frase saíram dele). As contagens são por **ocorrência**: cada linha é varrida com `matchAll` sobre a versão global de cada padrão, pelo que duas citações na mesma linha contam duas (até 21/11 o extrator era `exec` de um golpe por padrão por linha e contava de menos — §SM.31(3)). POSSIVEL_GRALHA_DE_NOME_SEM_PROVA é semelhança de bigramos (Dice >= 0.6), não identidade. PREFIXO_DE_FAMILIA_COM_PLACEHOLDER prova que existe >= 1 caminho versionado começando pelo prefixo capturado, não que o ficheiro concreto que a frase tinha em mente exista — a capturadora corta no placeholder (`…-<largura>.json`) e por isso a classe depende de o token não ter extensão. IGNORADO_POR_REGRA_VERSIONADA prova que nenhuma regra do índice o deixaria entrar; **não** prova que a regra foi assinada por uma frase — para isso há `.gitignore` em `git log`. A face (2) só olha para caminhos **inteiros**: um nome partido por placeholder fica fora desta contagem por construção. O corpus é a prosa versionada em markdown e html (`docs/**`, `evidence/**`, `README.md`); relatórios `.json` e código `.mjs` não são corpus, pelo que um caminho citado dentro de um artefacto ou de um script não é medido por este portão.',
  documentos: DOCUMENTOS,
  por_documento: DOCUMENTOS.map((d) => {
    const doDoc = ocorr.filter((o) => o.doc === d);
    return { doc: d, citacoes: doDoc.length, ausentes: [...new Set(doDoc.filter((o) => !presente(o)).map((o) => o.caminho))].length };
  }),
  veredito,
  face_indice_completa: faceIndice,
  esquecidos,
  portoes,
  falhas,
  ausentes: classificadas,
  aproximadas
};
fs.writeFileSync(OUT, JSON.stringify(diario, null, 1) + '\n');
console.log(JSON.stringify(veredito));
console.log('por_documento', JSON.stringify(diario.por_documento));
for (const a of diario.ausentes) console.log('AUSENTE', a.caminho, '|', a.classe, '| git', a.commits_no_git, '| espelho', JSON.stringify(a.produzidos_por), '|', a.citado_em.join(' '));
for (const x of esquecidos) console.log('FORA_DO_INDICE', x.caminho, '|', x.citado_em.join(' '));
for (const f of falhas) console.log('FALHA', f.portao, '| obtido', JSON.stringify(f.obtido).slice(0, 400), '| esperado', JSON.stringify(f.esperado).slice(0, 140));
for (const p of aproximadas) console.log('EQUIVALENTE', p.doc + ':' + p.linha, '|', p.recorte.slice(0, 120));
process.exit(veredito.estado === 'CITACAS_OK' ? 0 : 1);
