// RM-6.8 — analisador partilhado da candidata.
// O DRY-RUN, a APLICAÇÃO e a REVERSÃO têem de sair do MESMO parser sobre o MESMO ficheiro: se o ensaio
// montar o texto à parte, aprova um SQL diferente do que vai para o banco.
// Somente leitura: este módulo não abre ligação nenhuma.
//
// Porque é preciso um parser e não um `split(';')`: a candidata de 12/11 foi escrita para leitura humana
// e 22 dos seus `ALTER POLICY` não têem `;` — enviados como estão, os 11 do dry-run + vereditos formam UM
// statement e o canal aborta. As regras abaixo só cortam onde um statement começa mesmo (início de linha,
// profundidade 0, fora de strings e de blocos $tag$), nunca dentro do corpo de uma função.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

export const TABELAS = ["grades", "attendance", "access_requests", "occurrences"];
export const WRAPPERS = ["bfr_rls_session_role", "bfr_rls_is_developer", "bfr_rls_director_manages_student"];

// Chamada privilegiada — a fronteira importa: `is_developer()` também ocorre dentro de
// public.bfr_rls_is_developer(), por isso o lookbehind não é cosmético. O ponto NÃO entra na classe
// porque o texto vivo qualificado (`public."current_role"()`) é precisamente o que se quer apanhar.
export const CHAMADAS_PRIVILEGIADAS = [
  { nome: "current_role", rx: /(?<![A-Za-z0-9_])"?current_role"?\s*\(\s*\)/ },
  { nome: "is_developer", rx: /(?<![A-Za-z0-9_])is_developer\s*\(\s*\)/ },
  { nome: "staff_schools", rx: /(?<![A-Za-z0-9_])staff_schools\b/ },
];

// ARMADILHA MEDIDA 15/11-c — o contador da sonda estava escrito com `not like '%is_developer%'` e o
// LIKE não conhece fronteiras: o texto NOVO chama `public.bfr_rls_is_developer()` e o próprio nome da
// função contém a substring, pelo que 3 dos 14 predicados (access_requests_manage USING + WITH CHECK e
// access_requests_staff_insert WITH CHECK) foram contados como privilegiados e o portão deu 9 em vez
// de 11. O erro era do instrumento, não do banco. Esta é a mesma fronteira dos três regex JS acima,
// escrita em ARE do Postgres: sem lookbehind, por isso `(^|[^A-Za-z0-9_])`; sem escapes, por isso
// `[(]`/`[)]` e `[[:space:]]`. Provada por acordo triplo (LIKE × ARE × JS) nos 14 predicados novos e
// nas 11 policies PUBLIC vivas: `scripts/_scratch-rm68-contador.mjs` → CONTADOR_VERDE 6 portões, com
// `vivo_as_11_concordam_nas_tres_medidas = [11,11,11]` (o ARE não é um instrumento mais mole).
export const RX_CHAMADA_PRIVILEGIADA =
  '(^|[^A-Za-z0-9_])"?current_role"?[[:space:]]*[(][[:space:]]*[)]' +
  '|(^|[^A-Za-z0-9_])is_developer[[:space:]]*[(][[:space:]]*[)]' +
  '|(^|[^A-Za-z0-9_])staff_schools([^A-Za-z0-9_]|$)';

// ARMADILHA MEDIDA 15/11-d — comparar o TEXTO DE AUTOR (o `USING (…)` do ficheiro) com o DEPARSE do
// catálogo (`pg_get_expr`) não é comparar a mesma coisa, e o portão `depois_14_predicados_batem_com_o_
// ficheiro` rebentou por causa disso com o banco certo: 0/14 cláusulas coincidem byte a byte. O deparse
// faz duas coisas que o autor não faz: (1) tira qualificadores que se resolvem sozinhos — o de esquema
// (`public.bfr_rls_session_role()` → `bfr_rls_session_role()`) e o da própria relação
// (`occurrences.student_id` → `student_id`); e (2) nem sempre devolve o par de parênteses EXTERNO que o
// `WITH CHECK (…)` do autor tinha (ou o contrário, no `polqual`).
// A resposta NÃO é normalizar à vontade: apagar todos os parênteses apagava o AGRUPAMENTO, que é
// justamente o que uma policy pode ter errado. Então classifico a diferença em causas nomeadas e exijo
// que nenhuma caiba fora das duas medidas. `classeDeparse` devolve "OUTRO" ao primeiro byte que não
// pertença a uma causa conhecida — parênteses interiores incluídos. Medido nas 14 cláusulas aplicadas:
// 11 «so_qualificador», 3 «so_parenteses_externos», 0 «OUTRO» — e o controlo de não-vacuidade abaixo com
// 42 perturbações todas detectadas: `scripts/rm68-conferencia-15-11.mjs`.
const RE_LIAME_DEPARSE = /\b(?:public|grades|attendance|access_requests|occurrences)\./g;
export const semLiameDeparse = (t) => normaliza((t || "").replace(RE_LIAME_DEPARSE, ""));
export function classeDeparse(textoDoFicheiro, textoDoCatalogo) {
  const a = semLiameDeparse(textoDoFicheiro);
  const b = semLiameDeparse(textoDoCatalogo);
  if (a === b) return "so_qualificador";
  if (a === `(${b})`) return "so_parenteses_externos";
  if (b === `(${a})`) return "so_parenteses_externos_inverso";
  return "OUTRO";
}
// Controlo de não-vacuidade: um portão que compara duas strings depois de lhes mexer tem de provar que
// ainda sabe distinguir. Estas perturbações mudam LÓGICA e têem de sobreviver ao `semLiameDeparse`; se
// alguma passar despercebida, o instrumento é mole e o verde não vale.
export function perturbaClaustra(t) {
  const x = semLiameDeparse(t);
  const saida = [];
  // Cada perturbação tem de MUDAR a string: um `replace` que não encontra o alvo devolve a mesma
  // string e o controlo diria «vacuo» onde é só um substituto que não existia.
  const trocave = x.includes("<>") ? ["<>_por_=", x.replace("<>", "=")]
    : x.includes("=") ? ["=_por_<>", x.replace("=", "<>")]
    : ["adiciona_AND_false", `${x} AND false`];
  saida.push(trocave[1] === x ? ["adiciona_AND_false", `${x} AND false`] : trocave);
  const parts = x.split(/ /);
  const semUltimo = parts.slice(0, -1).join(" ");
  saida.push(semUltimo === x ? ["acrescenta_token", `${x} extra`] : ["ultimo_token_fora", semUltimo]);
  const comLiteral = /'[^']+'/.test(x) ? x.replace(/'([^']+)'/, "'$1_x'") : `${x} AND false`;
  saida.push(comLiteral === x ? ["acrescenta_token", `${x} extra`] : ["literal_trocada", comLiteral]);
  return saida;
}

// ARMADILHA MEDIDA 15/11-e — a sonda lê `p.polcmd::text`, e `polcmd` é do tipo "char": o `::text` devolve
// a LETRA (`*`, `r`, `a`, `w`, `d`), não o nome. O censo de 15/11 agrega por `pg_policies`, que já devolve
// `ALL`/`SELECT`/… . Conferir os dois sem decodificar dava 11 falsos vermelhos. Decodifico aqui em vez de
// mudar a sonda: o texto de `sondaSql()` é o que o ensaio e a aplicação trocaram portão a portão, e
// alterá-lo agora desfazia a comparabilidade dos artefactos já gravados.
export const CMD_DE_POLCMD = { "*": "ALL", r: "SELECT", a: "INSERT", w: "UPDATE", d: "DELETE" };
export const cmdVivo = (p) => CMD_DE_POLCMD[p.cmd] ?? p.cmd;

// Âncoras de início de statement usadas para recortar os blocos sem `;`. `SET` e `WITH` estão fora da
// lista de propósito: `SET search_path` vive dentro do `CREATE FUNCTION` e `WITH CHECK` dentro do
// `ALTER POLICY` — cortá-los produzia SQL órfão (a armadilha de 12/11 com a regex preguiçosa).
const ANCORAS = [/^alter\s+policy\b/i, /^select\b/i, /^rollback\b/i, /^commit\b/i, /^drop\s+function\b/i];

export const md5 = (buf) => createHash("md5").update(buf).digest("hex");
export const ler = (p) => readFileSync(p, "utf8");
const normal = (t) => t.replace(/\s+/g, " ").trim();

// Varre o texto devolvendo `limpo` (comentários → espaços, quebras preservadas), os cortes por `;` e as
// âncoras. Strings '…' e blocos $tag$…$tag$ são opacos: os comentários dentro do corpo $fn$ são TEXTO da
// função, não comentário, e apagá-los mudava os bytes da candidata.
export function varrer(src) {
  let limpo = "";
  const semi = [];
  const ancoras = [];
  let inicio = 0;
  let profundidade = 0;
  let i = 0;
  const n = src.length;
  while (i < n) {
    if (src[i] === "-" && src[i + 1] === "-") {
      while (i < n && src[i] !== "\n") { limpo += " "; i++; }
      continue;
    }
    if (src[i] === "/" && src[i + 1] === "*") {
      let nivel = 1;
      limpo += "  ";
      i += 2;
      while (i < n && nivel > 0) {
        if (src[i] === "/" && src[i + 1] === "*") { nivel++; limpo += "  "; i += 2; continue; }
        if (src[i] === "*" && src[i + 1] === "/") { nivel--; limpo += "  "; i += 2; continue; }
        limpo += src[i] === "\n" ? "\n" : " ";
        i++;
      }
      continue;
    }
    if (src[i] === "'") {
      limpo += "'";
      i++;
      while (i < n) {
        limpo += src[i];
        if (src[i] === "'") {
          if (src[i + 1] === "'") { limpo += src[++i]; i += 2; continue; }
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    if (src[i] === "$") {
      const tag = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(src.slice(i));
      if (tag) {
        const achado = src.indexOf(tag[0], i + tag[0].length);
        const fim = achado === -1 ? n : achado + tag[0].length;
        while (i < fim) { limpo += src[i]; i++; }
        continue;
      }
    }
    const c = src[i];
    if (profundidade === 0 && c.trim() !== "" && noInicioDeLinha(src, i) && ANCORAS.some((rx) => rx.test(src.slice(i, i + 40)))) {
      ancoras.push(i);
    }
    if (c === "(") profundidade++;
    else if (c === ")") profundidade--;
    else if (c === ";" && profundidade === 0) {
      semi.push({ inicio, fim: i + 1 });
      i++;
      inicio = i;
      limpo += ";";
      continue;
    }
    limpo += c;
    i++;
  }
  if (src.slice(inicio).trim()) semi.push({ inicio, fim: n });
  return { limpo, semi, ancoras };
}

const linhaEm = (src, offset) => src.slice(0, offset).split("\n").length;

// Primeiro carácter não em branco da linha? É isto que distingue «aqui começa um statement» de
// «palavra igual a meio de uma continuação».
const noInicioDeLinha = (src, i) => {
  let j = i - 1;
  while (j >= 0 && (src[j] === " " || src[j] === "\t")) j--;
  return j < 0 || src[j] === "\n";
};

// Corta pelos dois mecanismos e devolve [{raw, limpo, linhaIni, linhaFim, pontoEVirgula}].
export function statements(texto, baseLinha = 0) {
  const { limpo, semi, ancoras } = varrer(texto);
  const cortes = [];
  const junta = (a, b, comPonto) => { if (b > a && texto.slice(a, b).trim()) cortes.push({ a, b, comPonto }); };
  for (const s of semi) {
    const dentro = ancoras.filter((p) => p > s.inicio && p < s.fim);
    if (dentro.length === 0) { junta(s.inicio, s.fim, s.fim < texto.length && texto[s.fim - 1] === ";"); continue; }
    let anterior = s.inicio;
    for (const p of dentro) { junta(anterior, p, false); anterior = p; }
    junta(anterior, s.fim, texto[s.fim - 1] === ";");
  }
  return cortes.map((c) => {
    const raw = texto.slice(c.a, c.b);
    const limpoTrecho = limpo.slice(c.a, c.b);
    const ate = limpoTrecho.trimEnd().length; // mesmo comprimento que `raw`: branquear não apaga caracteres
    return {
      raw,
      miolo: raw.slice(0, ate),
      limpo: limpoTrecho.trim(),
      pontoEVirgula: raw.slice(0, ate).endsWith(";"),
      linhaIni: linhaEm(texto, c.a) + baseLinha,
      linhaFim: linhaEm(texto, c.a + ate) + baseLinha,
    };
  });
}

// Secções marcadas pelos títulos de régua (a linha decorada com ═, não qualquer menção no cabeçalho).
export function seccoes(src) {
  const fura = (titulo) => {
    const m = new RegExp(`^-- *═+ *${titulo}`, "m").exec(src);
    return m ? m.index : -1;
  };
  const inicioDry = fura("DRY-RUN");
  const inicioRev = fura("REVERSÃO");
  const inicioApl = fura("APLICAÇÃO");
  const linha = (off) => (off === -1 ? 0 : linhaEm(src, off) - 1);
  const corta = (a, b) => (a === -1 ? "" : src.slice(a, b > a ? b : src.length));
  return {
    inicioDry, inicioRev, inicioApl,
    linhaDry: linha(inicioDry), linhaRev: linha(inicioRev), linhaApl: linha(inicioApl),
    dry: corta(inicioDry, inicioRev),
    reversao: corta(inicioRev, inicioApl),
    aplicacao: corta(inicioApl, -1),
  };
}

// Grupo balanceado que começa no primeiro '(' depois de `pos`: contagem de parênteses, nunca regex
// preguiçoso — a lazy regex foi a armadilha que produziu SQL inválido com portões verdes a 12/11.
function grupo(txt, pos) {
  const i = txt.indexOf("(", pos);
  if (i === -1) return null;
  let profundidade = 0;
  for (let j = i; j < txt.length; j++) {
    const c = txt[j];
    if (c === "'") { j++; while (j < txt.length && txt[j] !== "'") j++; continue; }
    if (c === "(") profundidade++;
    else if (c === ")") {
      profundidade--;
      if (profundidade === 0) return { comParenteses: txt.slice(i, j + 1), conteudo: txt.slice(i + 1, j) };
    }
  }
  return null;
}

const estaEmZero = (txt, pos) => {
  let profundidade = 0;
  for (let j = 0; j < pos; j++) {
    const c = txt[j];
    if (c === "'") { j++; while (j < txt.length && txt[j] !== "'") j++; continue; }
    if (c === "(") profundidade++;
    else if (c === ")") profundidade--;
  }
  return profundidade === 0;
};

// Interpreta um `ALTER POLICY … ON …` (texto sem comentários): nome, tabela e os dois predicados.
export function lerAlterPolicy(limpo) {
  if (!/^\s*alter\s+policy\b/i.test(limpo)) return null;
  const semComentarios = limpo.replace(/^\s+/, "");
  const cab = /^(?:\s|--|\n)*alter\s+policy\s+(.+?)\s+on\s+([a-z_][a-z0-9_."]*)(\s|$)/im.exec(semComentarios);
  const corpo = cab ? semComentarios.slice(cab.index + cab[0].length) : semComentarios;
  const desloca = cab ? cab.index + cab[0].length : 0;
  const achado = (rx) => {
    const m = rx.exec(corpo);
    if (!m) return null;
    const g = grupo(corpo, m.index + m[0].length);
    return g ? { texto: g.conteudo, bruto: g.comParenteses, pos: desloca + m.index } : null;
  };
  return {
    alvo: cab ? cab[1].trim() : null,
    tabela: cab ? cab[2].replace(/"/g, "").split(".").pop() : null,
    using: achado(/\busing\b/gi),
    withCheck: achado(/\bwith\s+check\b/gi),
    temFor: /\bfor\s+(select|insert|update|delete|all)\b/i.test(corpo),
    temTo: /\bto\s+[a-z_]/i.test(corpo),
  };
}

export const chamadaEm = (txt) => CHAMADAS_PRIVILEGIADAS.filter((c) => c.rx.test(txt)).map((c) => c.nome);
export const eAlterPolicy = (st) => /^\s*alter\s+policy\b/i.test(st.limpo);
export const normaliza = normal;

// Pareia cada cláusula do FICHEIRO de aplicação com a sua gémea no CATÁLOGO, por nome de policy e tipo de
// cláusula — nunca por índice ordenado: ordenar duas listas de comprimentos iguais e comparar posição a
// posição era o que dava um portão capaz de dizer «batem» com as cláusulas baralhadas entre si.
// Devolve uma linha por cláusula escrita no ficheiro: {politica, clausula, ficheiro, catalogo, classe}.
export function pareiaClausulas(ficheiroDeAplicacao, polisticasVivas) {
  const publicas = polisticasVivas.filter((p) => p.roles_public);
  const linhas = [];
  for (const st of statements(ficheiroDeAplicacao).filter((s) => s.limpo && eAlterPolicy(s))) {
    const l = lerAlterPolicy(st.limpo);
    const nome = (l.alvo || "").replace(/"/g, "");
    const viva = publicas.find((p) => p.n === nome);
    for (const [clausula, doFicheiro, doVivo] of [
      ["USING", l.using && l.using.texto, viva && viva.qual],
      ["WITH CHECK", l.withCheck && l.withCheck.texto, viva && viva.with_check],
    ]) {
      if (!doFicheiro) continue;
      linhas.push({
        politica: nome, clausula,
        ficheiro: normaliza(doFicheiro), catalogo: doVivo ? normaliza(doVivo) : null,
        classe: viva ? classeDeparse(doFicheiro, doVivo || "") : "POLITICA_AUSENTE",
      });
    }
  }
  return linhas;
}

// ARMADILHA MEDIDA 15/11 (ensaio, 42601) — a gramática é `ALTER POLICY nome ON tabela`: o NOME da policy
// não aceita qualificação de esquema. Os 11 `ALTER POLICY public."x" ON public.y` da candidata de 12/11
// rebentam todos em `42601: syntax error at or near "."` — e o ficheiro de 12/11 dizia «faltam só os `;`».
// Por isso faltam DOIS defeitos, não um: o terminator e o qualificador. A derivación tem de des-qualificar
// o nome (o `ON public.<tabela>` fica: esse é que é qualificado por sintaxe). É a única diferença de texto
// além do `;`, e o portão de identidade confere-a ao contrário — reinsere o `public.` no texto lido do
// ficheiro derivado e exige igualdade byte a byte com a candidata. Se a remoção tivesse comido mais
// alguma coisa (o `public.` de um wrapper dentro do USING, por exemplo), a reinserção não batia.
export const NOME_QUALIFICADO = /^(\s*alter\s+policy\s+)public\./i;
export const desqualificar = (txt) => txt.replace(NOME_QUALIFICADO, "$1");
// O inverso exacto, ancorado no mesmo sítio: transforma o texto derivado de volta no texto da candidata.
export const requalificar = (txt) => txt.replace(/^(\s*alter\s+policy\s+)/i, "$1public.");

// [forma exacta, forma com um par de parênteses exteriores removido] — só quando esse par é balanceado.
export function formas(txt) {
  const saida = [txt];
  if (txt.startsWith("(") && txt.endsWith(")")) {
    let profundidade = 0;
    let fechaEm = -1;
    for (let j = 0; j < txt.length; j++) {
      if (txt[j] === "(") profundidade++;
      else if (txt[j] === ")") { profundidade--; if (profundidade === 0) { fechaEm = j; break; } }
    }
    if (fechaEm === txt.length - 1) saida.push(txt.slice(1, -1));
  }
  return saida;
}

// Uma única tacada com um único `select`: o canal devolve só o último result set com linhas, por isso
// o veredito inteiro sai de um json_build_object. Usada IGUAL no dry-run (dentro da transação) e na
// conferência pós-aplicação — mudar a sonda entre os dois passos era desfazer a comparação.
//
// ARMADILHA MEDIDA 15/11 — o papel PUBLIC numa policy NÃO é `polroles = '{}'`: é `polroles = '{0}'`,
// o oid 0, que tem cardinalidade 1. `cardinality(polroles) = 0` devolve 0 em todas as 23 e daria um
// portão verde pela razão errada. As três representações que convergem nas 11 do censo de 15/11:
// `0 = any (polroles)`, `'public' = any (pg_policies.roles)` e, no `rm68-recon-quals.mjs` que agrega
// por `pg_roles` (onde não há linha de oid 0), `roles is null`.
export const TABELAS_SQL = TABELAS.map((t) => `'${t}'`).join(",");
export const sondaSql = () => `
select json_build_object(
  'polisticas', (
    select json_agg(json_build_object(
             't', c.relname, 'n', p.polname, 'cmd', p.polcmd::text,
             'roles_public', (0 = any (p.polroles)),
             'qual', pg_get_expr(p.polqual, p.polrelid),
             'with_check', pg_get_expr(p.polwithcheck, p.polrelid)
           ) order by c.relname, p.polname)
      from pg_policy p
      join pg_class c on c.oid = p.polrelid
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relname in (${TABELAS_SQL})),
  'public_sem_chamada_privilegiada', (
    select count(*)::int
      from pg_policy p
      join pg_class c on c.oid = p.polrelid
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relname in (${TABELAS_SQL})
       and 0 = any (p.polroles)
       and coalesce(pg_get_expr(p.polqual, p.polrelid), '') !~ '${RX_CHAMADA_PRIVILEGIADA}'
       and coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '') !~ '${RX_CHAMADA_PRIVILEGIADA}'),
  'wrappers', (
    select json_agg(json_build_object(
             'nome', pr.proname, 'dono', pg_get_userbyid(pr.proowner), 'definer', pr.prosecdef,
             'args', pg_get_function_arguments(pr.oid), 'config', pr.proconfig,
             'anon_exec', has_function_privilege('anon', pr.oid, 'EXECUTE'),
             'auth_exec', has_function_privilege('authenticated', pr.oid, 'EXECUTE'),
             'publico_exec', exists (select 1 from aclexplode(coalesce(pr.proacl, '{}'::aclitem[])) a
                                      where a.grantee = 0 and a.privilege_type = 'EXECUTE')
           ) order by pr.proname)
      from pg_proc pr join pg_namespace n on n.oid = pr.pronamespace
     where n.nspname = 'public' and pr.proname in (${WRAPPERS.map((w) => `'${w}'`).join(",")})),
  'anon_legado_current_role', (select has_function_privilege('anon', 'public."current_role"()'::regprocedure, 'EXECUTE')),
  'anon_legado_is_developer', (select has_function_privilege('anon', 'public.is_developer()'::regprocedure, 'EXECUTE')),
  'anon_le_staff_schools', (select has_table_privilege('anon', 'public.staff_schools', 'SELECT')),
  'pegada', (
    select json_build_object('total', count(*)::int,
             'hash', md5(string_agg(n.nspname || '.' || c.relname || c.relkind::text, ',' order by n.nspname, c.relname)))
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r','v','m','p')),
  'contagens', (
    select json_object_agg(t, c) from (
      select 'grades' as t, count(*)::int as c from public.grades
      union all select 'attendance', count(*)::int from public.attendance
      union all select 'access_requests', count(*)::int from public.access_requests
      union all select 'occurrences', count(*)::int from public.occurrences) x)
) as veredito`;
