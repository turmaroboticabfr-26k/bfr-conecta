#!/usr/bin/env node
// p165 (SO LEITURA, zero escrita no banco): censo em leitura das quatro PEN de catalogo que nao pedem OK.
//   PEN-08 — o conteudo do calendario/turno depois da semente RM-5.2 e do A1, e os RPC que a portaria chama;
//   PEN-12 — quantos perfis de professor ha, quais tem vinculo vivo e se o vinculo e de conta real ou de teste;
//   PEN-13 — o censo de perfis re-corrido pela peca propria (p138) e o que existe no catalogo para transicionar
//            `pending` -> papel;
//   PEN-17 — se ha mecanismo de notificacao ao responsavel por frequencia/nota, com o controlo positivo do
//            mecanismo de itinerario que ja se sabe existir.
// As frases SQL nao sao dactilografadas aqui: vao buscar-se ao ficheiro do produtor e o instrumento aborta se
// a agulha nao casar uma linha ou se o literal nao se resolver. Uma copia minha envelhece; a fonte nao.
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { sql } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const PECA = 'scripts/p165-censo-em-leitura-das-pen-de-catalogo.mjs';
const SUF = process.env.P165_SUF ? '-' + process.env.P165_SUF : '';
const OUT = join(REPO, 'evidence/p165-censo-em-leitura-das-pen-de-catalogo' + SUF + '.json');
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com P165_SUF=novo, nunca por cima');
const t0 = Date.now();

const P = {
  rm52: 'scripts/p73-rm52-estado-calendario.mjs',
  a1: 'scripts/p145-a1-confirmar-calendario-aplica.mjs',
  pen41: 'scripts/p73-pen41-preflight.mjs',
  bu2: 'scripts/bu2-censo-catalogo-20-11.mjs',
  p138: 'scripts/p138-censo-de-perfis-por-papel.mjs',
  elo: 'scripts/roadmap-rm11-elo.mjs',
  ag6s: 'scripts/ag6-recon-schema.mjs',
  ag6f: 'scripts/ag6-recon-fixture.mjs',
  ae5h: 'scripts/ae5h-rm68-state.mjs',
  ah2i: 'scripts/ah2-inventario.mjs',
  ae5i: 'scripts/ae5i-rm68-constraints.mjs',
  c2r: 'scripts/c2r-apply.mjs',
  rm68l: 'scripts/rm68-ruler3-limpeza.mjs',
  rm12: 'scripts/roadmap-rm12-recon.mjs',
};
const fonte = Object.fromEntries(Object.entries(P).map(([k, f]) => [k, readFileSync(join(REPO, f), 'utf8')]));
const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
const FONTES_LIDAS = Object.entries(P).map(([k, f]) => ({ chave: k, caminho: f, bytes: fonte[k].length,
  md5: createHash('md5').update(fonte[k], 'utf8').digest('hex') }));
//FIM

// ---- leitura da fonte dos produtores ------------------------------------------------------------------
const AGULHAS = [];
const numeroDaLinha = (texto, idx) => texto.slice(0, idx).split('\n').length;
function posDepoisDeAgulha(de, agulha) {
  const vezes = fonte[de].split(agulha).length - 1;
  if (vezes !== 1) throw new Error('ABORTA: a agulha [' + agulha + '] ocorre ' + vezes + ' vezes em ' + P[de] + ', espero 1');
  const idx = fonte[de].indexOf(agulha);
  AGULHAS.push({ de, peca: P[de], linha: numeroDaLinha(fonte[de], idx), agulha });
  return idx + agulha.length;
}
function saltaLiteral(texto, i) {
  const q = texto[i];
  let j = i + 1;
  if (q !== '`') {
    while (j < texto.length) {
      if (texto[j] === '\\') { j += 2; continue; }
      if (texto[j] === q) return j;
      j++;
    }
    throw new Error('ABORTA: literal (abre em ' + i + ') nao fecha no fonte');
  }
  let fundo = 0;
  while (j < texto.length) {
    const c = texto[j];
    if (c === '\\') { j += 2; continue; }
    if (fundo === 0) {
      if (c === '`') return j;
      if (c === '$' && texto[j + 1] === '{') { j += 2; fundo++; continue; }
      j++; continue;
    }
    if (c === '{') { fundo++; j++; continue; }
    if (c === '}') { fundo--; j++; continue; }
    if ("'\"`".includes(c)) { j = saltaLiteral(texto, j) + 1; continue; }
    j++;
  }
  throw new Error('ABORTA: template (abre em ' + i + ') nao fecha no fonte');
}
// O primeiro literal de string depois da agulha, avaliado com a semantica do proprio produtor.
function literalDe(de, agulha) {
  const desde = posDepoisDeAgulha(de, agulha);
  let k = desde;
  while (k < fonte[de].length && '`\'"'.indexOf(fonte[de][k]) < 0) k++;
  if (k >= fonte[de].length) throw new Error('ABORTA: nao ha literal depois de [' + agulha + '] em ' + P[de]);
  const q = fonte[de][k];
  if (fonte[de].slice(k, saltaLiteral(fonte[de], k)).includes('${')) throw new Error('ABORTA: o literal depois de [' + agulha + '] tem interpolacao — pedir como expressao');
  const bruto = fonte[de].slice(k, saltaLiteral(fonte[de], k) + 1);
  const texto = new Function('return ' + bruto)();
  if (!/^select\b/i.test(norm(texto)) && !/^with\b/i.test(norm(texto))) throw new Error('ABORTA: o literal de [' + agulha + '] em ' + P[de] + ' nao comeca por select/with: ' + norm(texto).slice(0, 60));
  return { texto, linha: numeroDaLinha(fonte[de], k) };
}
// O argumento inteiro de `sql(...)` da agulha, compilado com o ambiente que tambem vem do produtor:
// assim e o codigo dele que corre, nao uma transcricao minha.
// AVARIA MEDIDA na corrida sm54e: quando a agulha ja termina no proprio `sql(`, procurar o `sql(` SEGUINTE
// devolvia a frase da linha de baixo — o censo de linhas veio com as politicas RLS e o censo de RPC com a
// grade de tempos, e os dois portoes de PEN-08 cairam por isso. A agulha que contem o `sql(` e a sua frase.
function expressaoDe(de, agulha, env) {
  let desde = posDepoisDeAgulha(de, agulha);
  if (agulha.endsWith('sql(')) desde -= 'sql('.length;
  const i = fonte[de].indexOf('sql(', desde);
  if (i < 0) throw new Error('ABORTA: nao ha `sql(` depois de [' + agulha + '] em ' + P[de]);
  let d = 0, inicio = -1, j = i + 3;
  for (; j < fonte[de].length; j++) {
    const c = fonte[de][j];
    if ("`'\"".includes(c)) { j = saltaLiteral(fonte[de], j); continue; }
    if (c === '(') { d++; if (d === 1) inicio = j + 1; continue; }
    if (c === ')') { d--; if (d === 0) break; }
  }
  if (d !== 0) throw new Error('ABORTA: os parentesis do `sql(` de [' + agulha + '] nao fecham em ' + P[de]);
  const corpo = fonte[de].slice(inicio, j);
  const chaves = Object.keys(env || {});
  const texto = new Function(...chaves, 'return (' + corpo + ')')(...chaves.map((k) => env[k]));
  return { texto, linha: numeroDaLinha(fonte[de], i), corpo_norm: norm(corpo).slice(0, 48) + '…' };
}
function stringDe(de, agulha) {
  const desde = posDepoisDeAgulha(de, agulha);
  let k = desde;
  while (k < fonte[de].length && '`\'"'.indexOf(fonte[de][k]) < 0) k++;
  if (k >= fonte[de].length) throw new Error('ABORTA: nao ha literal depois de [' + agulha + '] em ' + P[de]);
  const bruto = fonte[de].slice(k, saltaLiteral(fonte[de], k) + 1);
  if (bruto.includes('${')) throw new Error('ABORTA: o literal depois de [' + agulha + '] tem interpolacao — pedir como expressao');
  return { texto: new Function('return ' + bruto)(), linha: numeroDaLinha(fonte[de], k) };
}
// AVARIA MEDIDA, duas vezes: um varredor que salta para o fim de cada literal perde-se quando o fonte tem
// apostrofo dentro de comentario ou aspas dentro de string — em scripts/p145-a1-...mjs, linha 300, o salto
// desde um apostrofo de comentario levava o ponteiro a aterrar DENTRO do literal real, que ficava por ler.
// O varredor por isso NAO salta: avalia cada posicao de aspa independentemente e deixa que o CONTEUDO do
// literal resolva a ambiguidade (procuraLiteralSQL so aceita o que comeca por select/with). Falso positivo
// e imposible de ficar silencioso: o portao exige exactamente um.
function literaisDoFonte(t) {
  const spans = [];
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (c !== '`' && c !== "'" && c !== '"') continue;
    try { spans.push({ desde: i, ate: saltaLiteral(t, i) }); } catch (e) { /* aspa de regex ou de prosa: fica */ }
  }
  return spans;
}
// Um literal do produtor escolhido pelo SEU CONTEUDO, nao pela posicao: os pontos de entrada mudam de linha
// e uma agulha de posicao envelhece. Exige exactamente um literal com o fragmento, senao aborta.
function procuraLiteralSQL(t, fragmento) {
  const achados = [];
  for (const sp of literaisDoFonte(t)) {
    const bruto = t.slice(sp.desde, sp.ate + 1);
    let val;
    try { val = bruto.includes('${') ? null : new Function('return ' + bruto)(); } catch (e) { val = null; }
    if (typeof val === 'string' && val.includes(fragmento)) achados.push({ texto: val, linha: numeroDaLinha(t, sp.desde) });
  }
  const sql = achados.filter((x) => /^select\b/i.test(norm(x.texto)) || /^with\b/i.test(norm(x.texto)));
  return { sql, outros: achados.length - sql.length };
}
function literalQueContem(de, fragmento) {
  const r = procuraLiteralSQL(fonte[de], fragmento);
  if (r.sql.length !== 1) throw new Error('ABORTA: o fragmento [' + fragmento + '] em ' + P[de] + ' resolve em ' + r.sql.length + ' literais SQL (outros ' + r.outros + '), espero 1');
  AGULHAS.push({ de, peca: P[de], linha: r.sql[0].linha, agulha: 'literalQueContem(' + fragmento + ')' });
  return r.sql[0];
}
function templateCompilado(de, agulha, env) {
  const hits = fonte[de].split('\n').map((l, i) => ({ l, n: i + 1 })).filter((x) => x.l.includes(agulha));
  if (hits.length !== 1) throw new Error('ABORTA: a linha [' + agulha + '] em ' + P[de] + ' casa ' + hits.length + ' linhas, espero 1');
  const i = hits[0].l.indexOf('`');
  if (i < 0) throw new Error('ABORTA: nao ha template na linha ' + hits[0].n + ' de ' + P[de]);
  const raw = hits[0].l.slice(i + 1, saltaLiteral(hits[0].l, i));
  const chaves = Object.keys(env || {});
  AGULHAS.push({ de, peca: P[de], linha: hits[0].n, agulha: 'templateCompilado(' + agulha + ')' });
  return new Function(...chaves, 'return `' + raw + '`')(...chaves.map((k) => env[k]));
}
// O lado direito de um `const X = ...` de uma unica linha, compilado com o ambiente lido do produtor.
function rhsDe(de, agulha, env) {
  const hits = fonte[de].split('\n').map((l, i) => ({ l, n: i + 1 })).filter((x) => x.l.includes(agulha));
  if (hits.length !== 1) throw new Error('ABORTA: a linha [' + agulha + '] em ' + P[de] + ' casa ' + hits.length + ' linhas, espero 1');
  const corpo = hits[0].l.slice(hits[0].l.indexOf('=') + 1).replace(/;\s*$/, '');
  const chaves = Object.keys(env || {});
  AGULHAS.push({ de, peca: P[de], linha: hits[0].n, agulha: 'rhsDe(' + agulha + ')' });
  return new Function(...chaves, 'return (' + corpo + ')')(...chaves.map((k) => env[k]));
}
function arrayDe(de, agulha, env) {
  const fim = posDepoisDeAgulha(de, agulha);
  let j = fim - agulha.length;
  while (j < fonte[de].length && fonte[de][j] !== '[') j++;
  let d = 0, k = j;
  for (; k < fonte[de].length; k++) {
    const c = fonte[de][k];
    if (c === '[') d++;
    else if (c === ']') { d--; if (d === 0) break; }
  }
  if (d !== 0) throw new Error('ABORTA: o array de [' + agulha + '] nao fecha em ' + P[de]);
  const chaves = Object.keys(env || {});
  return new Function(...chaves, 'return ' + fonte[de].slice(j, k + 1))(...chaves.map((x) => env[x]));
}

// ---- PEN-08: o conteudo semeado e os RPC que a portaria chama -----------------------------------------
const TABELAS_RM52 = arrayDe('rm52', 'const TABELAS = [');
const q08_linhas = expressaoDe('rm52', 'const linhas = await sql(', { TABELAS: TABELAS_RM52 });
const m08_linhas = await sql(q08_linhas.texto);
const q08_dias = literalQueContem('a1', 'as sem_at from public.bfr_school_calendar_days');
const m08_dias = await sql(q08_dias.texto);
const RPCS_FRONT = arrayDe('rm52', 'const RPCS_FRONT = [');
const RPC_CONTROLO = stringDe('rm52', 'const RPC_CONTROLO =').texto;
const NOMES_RPC_PROVADOS = arrayDe('rm52', 'const NOMES_RPC_PROVADOS = [', { RPCS_FRONT, RPC_CONTROLO });
const q08_rpc = expressaoDe('rm52', 'const rpcExiste = await sql(', { NOMES_RPC_PROVADOS });
const m08_rpc = await sql(q08_rpc.texto);
const q08_grade = literalQueContem('rm52', 'as estado_versao');
const m08_grade = await sql(q08_grade.texto);

// ---- PEN-12: quantos professores, quais com vinculo, e se a conta e real ou de teste -------------------
const q12_papeis = literalQueContem('p138', 'from public.profiles group by 1');
const m12_papeis = await sql(q12_papeis.texto);
const q12_total = literalQueContem('p138', 'select count(*)::int as linhas from public.profiles');
const m12_total = (await sql(q12_total.texto))[0].linhas;
const q12_links = literalQueContem('ag6s', 'from public.staff_schools group by 1');
const m12_links = await sql(q12_links.texto);
const q12_pop = literalQueContem('pen41', 'as tem_vinculo');
const m12_pop_controlo = await sql(q12_pop.texto);
const RE_FILTRA_PAPEIS = /\s+where p\.role::text in \(([^)]*)\)/;
const n_filtro = (q12_pop.texto.match(new RegExp(RE_FILTRA_PAPEIS.source, 'g')) || []).length;
if (n_filtro !== 1) throw new Error('ABORTA: a clausula de filtro de papeis do produtor nao e unica (' + n_filtro + ')');
const PAPEIS_QUE_O_PRODUTOR_FILTRA = RE_FILTRA_PAPEIS.exec(q12_pop.texto)[1];
const m12_pop_todos = await sql(q12_pop.texto.replace(RE_FILTRA_PAPEIS, ''));
const q12_dir = literalQueContem('ag6f', 'from public.bfr_teacher_directory');
const m12_dir = (await sql(q12_dir.texto))[0].n;
// As marcas de conta de teste leem-se dos produtores que as usam; uma lista minha envelheceria.
const MARCAS_POR_FICHEIRO = ['ae5h', 'rm68l'].map((k) => {
  const ps = [...new Set([...fonte[k].matchAll(/like '([^ '\t]+test)'/g)].map((x) => x[1]))];
  if (ps.length === 0) throw new Error('ABORTA: nao li nenhuma marca de conta de teste de ' + P[k]);
  return { peca: P[k], marcas: ps };
});
const MARCAS = [...new Set(MARCAS_POR_FICHEIRO.flatMap((x) => x.marcas))];
const IGUAIS = MARCAS.map((p) => "(email like '" + p + "')").join(' or ');
const DIFERENTES = MARCAS.map((p) => "not (email like '" + p + "')").join(' and ');
// O controlo negativo e a mesma predica com o dominio trocado: uma classe que so pode ter zero linhas.
const MARCAS_INVALIDAS = MARCAS.map((p) => p.replace(/@[a-z0-9.-]+$/, '@p165-controlo-invalido.test'));
const IGUAIS_NEG = MARCAS_INVALIDAS.map((p) => "(email like '" + p + "')").join(' or ');
const FIX_CASA = MARCAS[0].split('%').join('x');
const FIX_NAO_CASA = MARCAS_INVALIDAS[0].split('%').join('x');
// Tres classes mutuamente exclusivas: com marca, sem marca, sem email. A soma tem de bater com os perfis.
const q12_real = 'select role::text as papel, count(*)::int as perfis,'
  + ' count(*) filter (where ' + IGUAIS + ')::int as com_marca_de_teste,'
  + ' count(*) filter (where ' + DIFERENTES + ' and email is not null)::int as sem_marca_de_teste,'
  + ' count(*) filter (where email is null)::int as email_nulo,'
  + ' count(*) filter (where ' + IGUAIS_NEG + ')::int as controlo_negativo'
  + ' from public.profiles group by 1 order by 2 desc, 1';
const m12_real = await sql(q12_real);

// ---- PEN-13: o censo pela peca propria + o que existe no catalogo para transicionar `pending` ---------
const SUF138 = (process.env.P165_SUF || 'p165') + '-pen13';
const run138 = spawnSync(process.execPath, ['scripts/p138-censo-de-perfis-por-papel.mjs'], {
  cwd: REPO, encoding: 'utf8', env: { ...process.env, P138_SUF: SUF138 }, timeout: 300000 });
const saida138 = String(run138.stdout || '');
const erro138 = String(run138.stderr || '').split('\n').filter(Boolean).slice(-2).join(' | ');
const FICHA138 = join(REPO, 'evidence/p138-censo-de-perfis-por-papel-' + SUF138 + '.json');
const med138 = existsSync(FICHA138) ? JSON.parse(readFileSync(FICHA138, 'utf8')) : null;
const portoes138 = /portoes: (\d+)\/(\d+)/.exec(saida138);
const q13_funcao = literalQueContem('rm12', 'pg_get_functiondef(p.oid) def from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname=');
const m13_funcao = await sql(q13_funcao.texto);
const resumo13_funcao = m13_funcao.map((f) => {
  const corpo = String(f.def || '');
  const m = (corpo.match(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+([\s\S]*?)\s+RETURNS/i) || [, null]);
  // Os dois campos, cada um com a sua grandeza medida: o nome `bytes_corpo` prometia bytes e dava
  // `string.length`, que e comprimento em caracteres (regua ja corrigida no emissor do p166).
  return {
    corpo_chars: corpo.length, corpo_bytes: Buffer.byteLength(corpo, 'utf8'),
    escreve_em_profiles: corpo.includes('profiles'), assinatura: m[1],
  };
});
// O fixture que prova que as duas réguas sao de grandezas distintas: um so `ã` vale 1 caractere e 2 bytes.
const FIX_GRANDEZA_DO_CORPO = 'CREATE FUNCTION public.x() RETURNS text AS $$ ã $$ LANGUAGE sql';
const fix_grandeza = {
  chars: FIX_GRANDEZA_DO_CORPO.length, bytes: Buffer.byteLength(FIX_GRANDEZA_DO_CORPO, 'utf8'),
  bytes_sao_maior_que_chars: Buffer.byteLength(FIX_GRANDEZA_DO_CORPO, 'utf8') > FIX_GRANDEZA_DO_CORPO.length,
};
//FIM-PEN13
// ---- PEN-17: ha no catalogo caminho que avise o responsavel por frequencia ou nota? -------------------
const NUCLEARES = arrayDe('bu2', 'const nucleares = [');
const q17_tabelas = literalQueContem('bu2', 'relforcerowsecurity');
const nomes_no_catalogo = (await sql(q17_tabelas.texto)).map((t) => t.tabela);
// A interseccao e do produtor, pelo criterio dele: o proprio bu2 tolera nomes que ja nao estao no catalogo e
// registra-os como nucleares_nao_encontradas. Abortar aqui seria esconder essa diferenca; o que se exige e
// que o CONJUNTO ausente bata com o censo do produtor registado em disco, e nao com uma lista lembrada.
const existentes = NUCLEARES.filter((n) => nomes_no_catalogo.includes(n));
const ausentes_no_catalogo = NUCLEARES.filter((n) => !nomes_no_catalogo.includes(n));
const FICHA_BU2 = 'evidence/bu2-censo-catalogo-20-11-23-11-aud.json';
if (!existsSync(join(REPO, FICHA_BU2))) throw new Error('ABORTA: ' + FICHA_BU2 + ' nao esta em disco — nao ha com que comparar o conjunto de mesas ausentes');
const brutoBu2 = readFileSync(join(REPO, FICHA_BU2));
const velhoBu2 = JSON.parse(brutoBu2.toString('utf8'));
if (!Array.isArray(velhoBu2.nucleares_nao_encontradas)) throw new Error('ABORTA: ' + FICHA_BU2 + ' nao tem o campo nucleares_nao_encontradas — o comparador nao tem o que ler');
const sel17 = rhsDe('bu2', 'const sel = existentes.map', { existentes });
const q17_volumes = templateCompilado('bu2', 'res.volumes_exatos = sel', { sel: sel17 });
const volumes = (await sql(q17_volumes))[0];
// Os gatilhos das duas mesas de origem da PEN-17, pela consulta do produtor ae5i.
const q17_gatilhos = literalQueContem('ae5i', 'from pg_trigger where tgrelid in');
const m17_gatilhos = await sql(q17_gatilhos.texto);
const m17_ins_att = await sql(literalQueContem('elo', "p.prosrc ilike '%insert%attendance%'").texto);
const m17_cit_att = await sql(literalQueContem('elo', 'as cita_att').texto);
// As mesas que transportam um aviso escolho-as eu, mas o direito de estarem no debate vem do array do produtor.
const ALVOS = ['notifications', 'student_messages'];
if (!ALVOS.every((a) => NUCLEARES.includes(a))) throw new Error('ABORTA: uma mesa de aviso escolhida nao esta no array nuclear de ' + P.bu2);
const escreveEm = (a) => "p.prosrc ~* 'insert into (public\\.)?" + a + "'";
const q17_corpos = "select p.proname as nome, p.prosecdef::int as definer, length(p.prosrc)::int as corpo_chars, "
  + ALVOS.map((a) => "(" + escreveEm(a) + ")::int as escreve_" + a).join(', ')
  + " from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and ("
  + ALVOS.map(escreveEm).join(' or ') + ") order by 1";
const m17_corpos = await sql(q17_corpos);
// Controlo POSITIVO da predica: o elo incidente->responsavel existe e e medido pelos nomes que o produtor c2r usa.
const NOMES_GATILHO = [...new Set([...fonte.c2r.matchAll(/tgname='([a-z0-9_]+)'/g)].map((x) => x[1]))];
const NOMES_FUNCAO = [...new Set([...fonte.c2r.matchAll(/proname='([a-z0-9_]+)'/g)].map((x) => x[1]))];
if (NOMES_GATILHO.length !== 1 || NOMES_FUNCAO.length !== 1) throw new Error('ABORTA: esperava um nome de gatilho e um de funcao em ' + P.c2r + ', li ' + NOMES_GATILHO.length + '/' + NOMES_FUNCAO.length);
const m17_controlo = await sql("select (select count(*)::int from pg_trigger where tgname='" + NOMES_GATILHO[0]
  + "')::int as gatilho, (select count(*)::int from pg_proc where proname='" + NOMES_FUNCAO[0]
  + "')::int as funcao, (select count(*)::int from pg_trigger where tgname='p165_nao_existe_zz')::int as controlo_negativo");
// AVARIA MEDIDA na corrida sm54c: contar «que funcoes escrevem em notifications» so faz sentido depois de saber se a
// mesa existe. Ela nao existe no catalogo vivo, e quem ma diz e o censo do proprio produtor, registado em disco a 20/11.
// O que fica medido e por isso as duas coisas separadas: a existencia da mesa e a procura de corpo, com a ausencia
// conferida contra a ficha — nunca contra uma lista lembrada por mim.
const m17_alvos = ALVOS.map((a) => ({
  mesa: a,
  no_catalogo_vivo: nomes_no_catalogo.includes(a) ? 1 : 0,
  no_array_nuclear_do_produtor: NUCLEARES.includes(a) ? 1 : 0,
  ausente_na_ficha_de_bu2: velhoBu2.nucleares_nao_encontradas.includes(a) ? 1 : 0,
  funcoes_que_escrevem_nele: m17_corpos.filter((f) => f['escreve_' + a] === 1).length,
}));
//FIM-PEN17

// ---- portoes: duas medicoes independentes tem de bater, e cada regua tem fixture nos dois sentidos ----
const soma_real = m12_real.reduce((s, x) => s + x.perfis, 0);
const soma_marca = m12_real.reduce((s, x) => s + x.com_marca_de_teste, 0);
const soma_sem_marca = m12_real.reduce((s, x) => s + x.sem_marca_de_teste, 0);
const soma_controlo_neg = m12_real.reduce((s, x) => s + x.controlo_negativo, 0);
const por_papel_real = Object.fromEntries(m12_real.map((x) => [x.papel, x]));
const por_papel_produtor = Object.fromEntries(m12_papeis.map((x) => [x.papel, x.linhas]));
const controlo_por_papel = Object.fromEntries(m12_pop_controlo.map((x) => [x.papel, x.perfis]));
const todos_por_papel = Object.fromEntries(m12_pop_todos.map((x) => [x.papel, x.perfis]));
// Fixture da predica de marca: a predica tem de casar o que ela propria declara, e nao casar o invalido.
const m12_fixture_marca = (await sql("select (select count(*)::int from (values ('" + FIX_CASA + "')) v(email) where "
  + IGUAIS + ")::int as predica_casa_o_fixture, (select count(*)::int from (values ('" + FIX_CASA + "')) v(email) where "
  + DIFERENTES + " and email is not null)::int as negacao_casa_o_fixture, (select count(*)::int from (values ('"
  + FIX_NAO_CASA + "')) v(email) where " + IGUAIS + ")::int as predica_casa_o_invalido"))[0];
// A mesma contagem de gatilhos por dois caminhos distintos (join a pg_class, nao ao regclass do produtor).
const m17_gatilhos_meu = await sql("select count(*)::int as n from pg_trigger t join pg_class c on c.oid=t.tgrelid "
  + "where c.relname in ('grades','attendance') and not t.tgisinternal");
const nomes_ins_att_produtor = m17_ins_att.map((x) => x.proname).sort().join(',');
const nomes_ins_att_meu = (await sql("select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace "
  + "where n.nspname='public' and p.prosrc ilike '%insert%attendance%' order by 1")).map((x) => x.proname).join(',');
const rpc_por_nome = Object.fromEntries(m08_rpc.map((x) => [x.nome, x.no_catalogo]));
// A mesma mesa contada por dois produtores distintos: a frase do p73-rm52 e o censo do aplicador p145.
const linhas_dias = (m08_linhas.filter((x) => x.tabela === 'bfr_school_calendar_days')[0] || {}).linhas;
// O nome que o rm52 escolhe para o seu controlo existe no catalogo? Medido. E chamado pelo produto? Isso le-se nos
// bytes SERVIDOS, e a identidade deles prova-se antes de contar, contra a ficha do p164 — a peca que conferiu o shell
// do ar com o diario de publicacao. Contar no `app/index.html` seria contar a fonte, nao o que a gente real ve.
const FICHAS_P164 = readdirSync(join(REPO, 'evidence'))
  .filter((f) => /^p164-medicao-no-ar-das-pen-sem-ok-.*\.json$/.test(f))
  .map((f) => ({ f, m: statSync(join(REPO, 'evidence', f)).mtimeMs }))
  .sort((a, b) => b.m - a.m);
if (FICHAS_P164.length === 0) throw new Error('ABORTA: nenhuma ficha do p164 em evidence/ — nao ha pegada de ar conferida com que contar');
const FICHA_P164 = 'evidence/' + FICHAS_P164[0].f;
const brutoP164 = readFileSync(join(REPO, FICHA_P164));
const ficha164 = JSON.parse(brutoP164.toString('utf8'));
if (!/^P164_/.test(String(ficha164.veredito))) throw new Error('ABORTA: ' + FICHA_P164 + ' nao e uma ficha do p164 (veredito ' + ficha164.veredito + ')');
const PEGADA = (ficha164.identidade || {}).shell;
if (!PEGADA || !PEGADA.md5 || !PEGADA.bytes) throw new Error('ABORTA: ' + FICHA_P164 + ' nao traz a pegada do shell — nao conto no ar sem ela');
if (PEGADA.byte_identico_ao_registado !== true) throw new Error('ABORTA: ' + FICHA_P164 + ' regista o ar como nao identico ao diario — a contagem nao vale');
const CANDIDATAS = ficha164.candidatos_byte_identica_ao_ar || [];
if (CANDIDATAS.length !== 1) throw new Error('ABORTA: ' + FICHA_P164 + ' nomeia ' + CANDIDATAS.length + ' candidatas byte-identicas ao ar, espero 1');
const CAMINHO_AR = CANDIDATAS[0] + '/index.html';
if (!existsSync(join(REPO, CAMINHO_AR))) throw new Error('ABORTA: ' + CAMINHO_AR + ' nao esta em disco — a ficha do p164 aponta para um ar que nao tenho onde ler');
const brutoAr = readFileSync(join(REPO, CAMINHO_AR));
if (brutoAr.length !== PEGADA.bytes || createHash('md5').update(brutoAr).digest('hex') !== PEGADA.md5) {
  throw new Error('ABORTA: ' + CAMINHO_AR + ' nao bate com a pegada do ar da ficha — a contagem seria doutro ficheiro');
}
const textoAr = brutoAr.toString('utf8');
const contagem_de_chamada_no_ar = (n) => {
  if (!/^[a-z0-9_]+$/.test(n)) throw new Error('ABORTA: nome de rpc fora do alfabeto que sei contar: ' + n);
  return textoAr.split(".rpc('" + n + "'").length - 1;
};
const chamadas_por_ar = Object.fromEntries(NOMES_RPC_PROVADOS.map((n) => [n, contagem_de_chamada_no_ar(n)]));
const CHAMADAS_NO_AR = [...textoAr.matchAll(/\.rpc\(\s*'([a-z0-9_]+)'/g)].map((x) => x[1]);
const chamadas_por_extraccao = Object.fromEntries(NOMES_RPC_PROVADOS.map((n) => [n, CHAMADAS_NO_AR.filter((x) => x === n).length]));
// O mesmo achado por duas rotas sobre os mesmos dados: o dicionario do censo e as linhas do produtor com schema vazio.
const ausentes_chamados_pelo_ar_por_o_catalogo = NOMES_RPC_PROVADOS.filter((n) => rpc_por_nome[n] === 0 && chamadas_por_ar[n] > 0).sort().join(',');
const ausentes_chamados_pelo_ar_por_as_linhas = m08_rpc.filter((r) => r.no_catalogo === 0 && r.schemas === '' && chamadas_por_ar[r.nome] > 0).map((r) => r.nome).sort().join(',');
// AVARIA MEDIDA na corrida sm54f: `.length` duma STRING e o comprimento dela, nao o numero de nomes — o portao
// esperaba 1 e obteve 41. O nome do controlo negativo e um conjunto medido, e como conjunto se conta.
const NOMES_CONTROLO_NEGATIVO = NOMES_RPC_PROVADOS.filter((x) => /controlo_negativo/.test(x));
const AGULHAS_UNIQUE = new Set(AGULHAS.map((x) => x.de + '|' + x.agulha)).size;
// Fixture do extractor, nos dois sentidos: um literal com aspas por dentro tem de ser lido (e a forma exata
// do fonte de p145, linha 300), e um fragmento que so vive em comentario nao pode resolver em literal.
const FIX_EXTRAATOR_POS = "// o que a peca' faz aqui\nconst q = await sql(\"select 1 from t where a='x'\");";
const FIX_EXTRAATOR_NEG = "// select 1 from t onde o autor escreveu 'x'\nconst nada = 1;";
const fix_extraator = {
  texto_positivo: FIX_EXTRAATOR_POS, texto_negativo: FIX_EXTRAATOR_NEG,
  positivo: procuraLiteralSQL(FIX_EXTRAATOR_POS, 'select 1 from t'),
  negativo: procuraLiteralSQL(FIX_EXTRAATOR_NEG, 'select 1 from t'),
};
const PORTOES = [
  ['as_mesa_de_calendario_do_produtor_estao_todas_no_censo_de_linhas',
    TABELAS_RM52.slice().sort().join(','), m08_linhas.map((x) => x.tabela).slice().sort().join(',')],
  ['o_censo_de_rpc_devolve_uma_linha_por_nome_provado_pelo_produtor', NOMES_RPC_PROVADOS.length, m08_rpc.length],
  // Positivo possivel real e dos dois sentidos: sem a coluna `linhas` o segundo par trava (foi o que a corrida sm54e apanhou),
  // e com a coluna trocada por outra frase o primeiro par divergiria do censo do aplicador.
  ['a_contagem_de_linhas_do_rm52_para_a_mesa_de_dias_bate_com_o_censo_do_aplicador_a1',
    [String(linhas_dias), Number.isInteger(linhas_dias) ? 1 : 0], [String(m08_dias[0] ? m08_dias[0].total : null), 1]],
  ['o_nome_de_controlo_negativo_do_produtor_nao_existe_no_catalogo',
    [NOMES_CONTROLO_NEGATIVO.length, NOMES_CONTROLO_NEGATIVO.map((n) => rpc_por_nome[n]).join(',')], [1, '0']],
  ['a_grade_de_tempo_do_calendario_tem_linhas_no_catalogo', m08_grade.length >= 1, true],
  // Dois caminhos de contar a mesma chamada no ar tem de bater; e o controlo do produtor tem de ser chamado.
  ['as_duas_contagens_de_chamada_no_ar_batem_em_cada_nome_provado',
    NOMES_RPC_PROVADOS.filter((n) => chamadas_por_ar[n] !== chamadas_por_extraccao[n]).join(','), ''],
  ['o_nome_de_controlo_do_produtor_e_chamado_pelo_ar_e_nao_existe_no_catalogo',
    [chamadas_por_ar[RPC_CONTROLO] > 0 ? 1 : 0, rpc_por_nome[RPC_CONTROLO]], [1, 0]],
  ['as_das_rotas_de_contar_o_que_o_ar_chama_sem_ter_corpo_no_catalogo_batem',
    ausentes_chamados_pelo_ar_por_o_catalogo, ausentes_chamados_pelo_ar_por_as_linhas],
  ['as_duas_contagens_independentes_de_perfis_batem', m12_total, soma_real],
  ['o_censo_por_papel_do_produtor_bate_com_o_meu_em_cada_papel',
    Object.keys(por_papel_produtor).map((p) => p + ':' + por_papel_produtor[p]).sort().join(','),
    Object.keys(por_papel_real).map((p) => p + ':' + por_papel_real[p].perfis).sort().join(',')],
  ['marca_mais_sem_marca_mais_email_nulo_bate_com_perfis_em_cada_papel',
    m12_real.filter((x) => x.com_marca_de_teste + x.sem_marca_de_teste + x.email_nulo !== x.perfis).map((x) => x.papel).join(','), ''],
  ['a_agulha_negativa_de_marca_nao_inventa_nada', soma_controlo_neg, 0],
  ['a_predica_de_marca_tem_positivo_e_negativo_no_fixture',
    [m12_fixture_marca.predica_casa_o_fixture, m12_fixture_marca.negacao_casa_o_fixture, m12_fixture_marca.predica_casa_o_invalido], [1, 0, 0]],
  ['o_controlo_do_produtor_so_mostra_os_papeis_que_ele_filtra',
    Object.keys(controlo_por_papel).sort().join(','),
    PAPEIS_QUE_O_PRODUTOR_FILTRA.split(',').map((s) => s.trim().replace(/'/g, '')).sort().join(',')],
  ['a_derivacao_do_mesmo_texto_sem_o_filtro_alarga_o_censo_de_papeis',
    Object.keys(todos_por_papel).length > Object.keys(controlo_por_papel).length, true],
  ['os_papeis_que_a_derivacao_acrescenta_estao_no_censo_de_perfis',
    Object.keys(todos_por_papel).filter((p) => !(p in controlo_por_papel)).sort().join(','),
    Object.keys(por_papel_produtor).filter((p) => !(p in controlo_por_papel)).sort().join(',')],
  ['a_derivacao_preserva_as_linhas_do_controlo_nos_papeis_dele',
    Object.keys(controlo_por_papel).map((p) => controlo_por_papel[p] === todos_por_papel[p]).join(','),
    Object.keys(controlo_por_papel).map(() => 'true').join(',')],
  ['o_censo_de_professor_com_vinculo_vivo_tem_duas_fontes',
    [Number.isInteger(m12_dir), m12_links.length >= 1], [true, true]],
  ['a_peca_p138_corre_verde_e_o_seu_total_e_o_meu_total',
    [run138.status, portoes138 ? portoes138[2] : 'sem_saida', med138 ? med138.total_profiles : null], [0, '0', m12_total]],
  ['a_funcao_de_transicao_pending_lida_do_catalogo_escreve_em_profiles',
    resumo13_funcao.map((f) => String(f.escreve_em_profiles && f.corpo_bytes > 0)).join(','), 'true'],
  ['o_campo_de_bytes_do_corpo_e_medido_em_bytes_e_o_de_caracteres_em_caracteres_e_os_dois_divergem_no_fixture',
    [fix_grandeza.bytes_sao_maior_que_chars, fix_grandeza.bytes - fix_grandeza.chars], [true, 1]],
  ['cada_mesa_do_array_nuclear_que_ainda_existe_no_catalogo_tem_volume_medido', Object.keys(volumes).length, existentes.length],
  ['o_conjunto_ausente_do_catalogo_vivo_bate_com_o_que_o_produtor_registou_na_ficha',
    ausentes_no_catalogo.slice().sort().join(','), velhoBu2.nucleares_nao_encontradas.slice().sort().join(',')],
  ['os_dois_caminhos_de_contar_gatilhos_de_nota_e_frequencia_batem', m17_gatilhos.length, m17_gatilhos_meu[0].n],
  ['a_predica_de_escrita_em_aviso_tem_positivo_no_elo_de_itinerario_do_produtor',
    m17_corpos.filter((x) => x.nome === NOMES_FUNCAO[0]).map((x) => String(x.escreve_student_messages)).join(','), '1'],
  ['a_predica_de_escrita_em_aviso_nao_inventa_funcao_para_notifications',
    m17_corpos.filter((x) => x.escreve_notifications === 1).map((x) => x.nome).join(','), ''],
  // Positivo possivel real: um alvo que o catalogo vivo ja nao tem e a ficha de 20/11 nao regista como ausente.
  ['nenhum_alvo_de_aviso_ausente_do_catalogo_vivo_fica_sem_registo_de_ausencia_na_ficha_do_produtor',
    m17_alvos.filter((a) => a.no_catalogo_vivo === 0 && a.ausente_na_ficha_de_bu2 === 0).map((x) => x.mesa).join(','), ''],
  ['o_controlo_negativo_de_gatilho_nao_casa', m17_controlo[0].controlo_negativo, 0],
  ['a_leitura_do_censo_de_insercao_em_attendance_e_a_do_produtor_elo', nomes_ins_att_produtor, nomes_ins_att_meu],
  ['nenhuma_agulha_do_produtor_foi_resolvida_duas_vezes_por_acaso', AGULHAS.length, AGULHAS_UNIQUE],
  ['o_extractor_de_literal_le_o_que_tem_aspas_por_dentro_e_nao_inventa_o_que_so_vive_em_comentario',
    [fix_extraator.positivo.sql.length, fix_extraator.positivo.sql[0] ? fix_extraator.positivo.sql[0].texto : null, fix_extraator.negativo.sql.length],
    [1, "select 1 from t where a='x'", 0]],
];
const lista = PORTOES.map(([nome, obtido, esperado]) => ({ nome, obtido, esperado, ok: JSON.stringify(obtido) === JSON.stringify(esperado) }));
const falhas = lista.filter((p) => !p.ok).length;
//FIM-PORTOES

// ---- artefacto + captura --------------------------------------------------------------------------------
const emissor = readFileSync(join(REPO, PECA));
const out = {
  peca: PECA, em: new Date().toISOString(), modo: 'somente leitura, zero escrita no banco',
  emissor_bytes: emissor.length, emissor_md5: createHash('md5').update(emissor).digest('hex'),
  sufixo: SUF,
  produtores_lidos: FONTES_LIDAS,
  ancoras_resolvidas: AGULHAS,
  fixture_do_extractor: fix_extraator,
  perguntas: ['pen08_calendario_conteudo_e_rpc', 'pen12_professores_vinculo_e_conta_real',
    'pen13_censo_pela_peca_e_transicao_pending', 'pen17_caminho_de_aviso_ao_responsavel'],
  pen08: {
    tabelas_do_produtor: TABELAS_RM52,
    linhas_por_tabela: m08_linhas,
    rpc_nomes_provados_pelo_produtor: NOMES_RPC_PROVADOS,
    rpc_no_catalogo: m08_rpc,
    rpc_ausentes_do_catalogo: m08_rpc.filter((x) => x.no_catalogo === 0).map((x) => x.nome),
    chamadas_no_ar_dos_nomes_provados: { ficha_de_identidade: FICHA_P164, caminho_contado: CAMINHO_AR, por_nome: chamadas_por_ar, nomes_de_rpc_chamados_no_ar: new Set(CHAMADAS_NO_AR).size, ocorrencias_de_chamada: CHAMADAS_NO_AR.length },
    rpc_chamados_pelo_ar_sem_corpo_no_catalogo: ausentes_chamados_pelo_ar_por_o_catalogo,
    grade_de_tempos_por_estado_de_versao: m08_grade,
    dias_de_calendario: m08_dias,
  },
  pen12: {
    papeis_do_produtor_p138: m12_papeis,
    total_do_produtor_p138: m12_total,
    links_staff_schools_do_produtor_ag6s: m12_links,
    papeis_que_o_produtor_pen41_filtra: PAPEIS_QUE_O_PRODUTOR_FILTRA,
    populacao_pelo_texto_do_produtor: m12_pop_controlo,
    populacao_pelo_mesmo_texto_sem_o_filtro: m12_pop_todos,
    professor_no_directory_do_produtor_ag6f: m12_dir,
    marcas_de_conta_de_teste: MARCAS_POR_FICHEIRO,
    marcas_unicas: MARCAS,
    fixture_da_predica_de_marca: m12_fixture_marca,
    real_por_papel: m12_real,
    soma_de_perfis: soma_real,
    soma_com_marca: soma_marca,
    soma_sem_marca: soma_sem_marca,
    soma_email_nulo: m12_real.reduce((s, x) => s + x.email_nulo, 0),
  },
  pen13: {
    p138_corrido_com_sufixo: SUF138,
    p138_exit: run138.status,
    p138_portoes_na_saida: portoes138 ? portoes138[0] : null,
    p138_stderr: erro138,
    p138_artefacto: FICHA138.replace(REPO + '/', ''),
    p138_total_profiles: med138 ? med138.total_profiles : null,
    p138_linhas_em_pending: med138 ? med138.linhas_em_pending : null,
    p138_distribuicao: med138 ? med138.distribuicao_profiles : null,
    funcao_de_transicao_no_catalogo: resumo13_funcao,
  },
  pen17: {
    array_nuclear_do_produtor_bu2: NUCLEARES,
    ficha_de_bu2_conferida_em_disco: {
      caminho: FICHA_BU2, bytes: brutoBu2.length,
      md5: createHash('md5').update(brutoBu2).digest('hex'),
      nucleares_nao_encontradas: velhoBu2.nucleares_nao_encontradas,
    },
    mesas_ausentes_no_catalogo_vivo: ausentes_no_catalogo,
    alvos_de_aviso_por_mesa: m17_alvos,
    volumes_por_mesa: volumes,
    gatilhos_em_grades_e_attendance_pelo_produtor_ae5i: m17_gatilhos.map((g) => ({ tabela: g.tabela, tgname: g.tgname })),
    gatilhos_pelo_caminho_alternativo: m17_gatilhos_meu[0].n,
    funcoes_que_escrevem_em_mesa_de_aviso: m17_corpos,
    nomes_do_controlo_positivo_c2r: { gatilho: NOMES_GATILHO[0], funcao: NOMES_FUNCAO[0] },
    controlo_positivo_e_negativo: m17_controlo[0],
    funcoes_que_inserem_em_attendance_pelo_produtor_elo: m17_ins_att.map((x) => x.proname),
    funcoes_que_citam_attendance_pelo_produtor_elo: m17_cit_att.map((x) => ({ proname: x.proname, cita_att: x.cita_att })),
  },
  o_que_prova: [
    'o conteudo semeado do calendario letivo e dos turnos, contado pelas frases do produtor p73-rm52 e do aplicador p145',
    'se cada nome de RPC que o produtor declara existe no catalogo, com o nome de controlo negativo do proprio produtor',
    'quantas vezes cada nome de RPC e chamado nos bytes do ar, depois de a identidade do ar ser conferida contra a ficha do p164',
    'quantos perfis ha por papel, medidos pela frase do p138 e por uma frase composta aqui, e se as duas batem',
    'quantos dos perfis de professor tem vinculo em staff_schools, medido pelo texto do preflight da PEN-41 e pelo mesmo texto sem a clausula de filtro',
    'quantas contas de cada papel sao de teste e quantas nao sao, pela predica de marca lida dos produtores que a usam',
    'o que existe no catalogo para transicionar o estado pending, pelo censo re-corrido pela peca propria',
    'se ha gatilho ou funcao que escreva um aviso ao responsavel a partir de nota ou frequencia, com o controlo positivo do aviso de itinerario',
    'que o conjunto de mesa nuclear ja ausente do catalogo vivo bate, nome a nome, com o que o censo do produtor registou em disco, com bytes e md5 dessa ficha',
  ],
  o_que_NAO_prova: [
    'que o calendario semeado seja lido pela portaria no browser: isto e catalogo, nao render',
    'que uma conta real de professor consiga render completo: o vinculo medido e linhas em mesas, nao sessao',
    'que transicionar pending para papel funcione: nenhuma escrita foi tentada nesta corrida',
    'que o aviso automatico ao responsavel exista de ponta a ponta: prova a ausencia de mecanismo no catalogo, nao a presenca de outro caminho',
    'que a ficha de bu2 de 20/11 descreva o catalogo de hoje: e um instante velho, e o que o portao procura e a divergencia entre os dois, nao uma harmonia escrita a mao',
    'nada sobre senhas, tokens ou valores de linha: so contagens, nomes de coluna e nomes de objeto',
    'que uma chamada do ar funcione de ponta a ponta: conto o texto servido e a presenca no catalogo, e nenhuma chamada de RPC foi tentada nesta corrida',
  ],
  portoes: { total: lista.length, falhas, lista },
  estado: falhas > 0 ? 'PORTAO_VERMELHO — veredito nao emitido' : 'MEDIDO',
};
out.veredito_final = falhas === 0 ? 'P165_CENSO_MEDIDO ' + lista.length + '/0'
  : 'P165_CENSO_VERMELHO ' + (lista.length - falhas) + '/' + falhas + ' ' + lista.filter((p) => !p.ok).map((p) => p.nome).join(',');
const TXT = join(REPO, 'evidence/p165-censo-em-leitura-das-pen-de-catalogo' + SUF + '.txt');
if (existsSync(TXT)) throw new Error('ABORTA: ' + TXT + ' existe — correr com P165_SUF=novo, nunca por cima');
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
const linhasTxt = [
  'veredito=' + out.veredito_final,
  'produtores_lidos=' + FONTES_LIDAS.length + ' ancoras_resolvidas=' + AGULHAS.length,
  'pen08 tabelas=' + m08_linhas.map((x) => x.tabela + ':' + x.linhas).join(' '),
  'pen08 rpc_no_catalogo=' + m08_rpc.map((x) => x.nome + ':' + x.no_catalogo).join(' '),
  'pen08 ar_contado=' + CAMINHO_AR + ' bytes=' + brutoAr.length + ' md5=' + createHash('md5').update(brutoAr).digest('hex') + ' ficha=' + FICHA_P164,
  'pen08 chamadas_no_ar=' + NOMES_RPC_PROVADOS.map((n) => n + ':' + chamadas_por_ar[n]).join(' ') + ' sem_corpo_no_catalogo=' + (ausentes_chamados_pelo_ar_por_o_catalogo || 'nenhum'),
  'pen08 grade_estado_versao=' + m08_grade.map((x) => String(x.estado_versao) + ':' + x.entradas).join(' '),
  'pen08 dias=' + JSON.stringify(m08_dias),
  'pen12 papeis_p138=' + m12_papeis.map((x) => x.papel + '=' + x.linhas).join(' ') + ' total=' + m12_total,
  'pen12 real=' + m12_real.map((x) => x.papel + '=p' + x.perfis + '/t' + x.com_marca_de_teste + '/r' + x.sem_marca_de_teste + '/n' + x.email_nulo).join(' '),
  'pen12 marcas=' + MARCAS.join('|') + ' fixture=' + JSON.stringify(m12_fixture_marca),
  'pen12 populacao_controlo=' + JSON.stringify(m12_pop_controlo),
  'pen12 populacao_sem_filtro=' + JSON.stringify(m12_pop_todos),
  'pen12 links_staff_schools=' + JSON.stringify(m12_links) + ' directory=' + m12_dir,
  'pen13 p138_exit=' + run138.status + ' ' + (portoes138 ? portoes138[0] : 'sem_saida') + ' total=' + (med138 ? med138.total_profiles : 'sem_artefacto') + ' pending=' + (med138 ? med138.linhas_em_pending : '-'),
  'pen13 funcao_transicao=' + JSON.stringify(resumo13_funcao),
  'pen17 volumes=' + Object.entries(volumes).map(([k, v]) => k + '=' + v).join(' '),
  'pen17 nucleares=' + NUCLEARES.length + ' no_catalogo_vivo=' + existentes.length + ' ausentes=' + ausentes_no_catalogo.join(','),
  'pen17 ficha_bu2=' + FICHA_BU2 + ' bytes=' + brutoBu2.length + ' md5=' + createHash('md5').update(brutoBu2).digest('hex') + ' registradas=' + velhoBu2.nucleares_nao_encontradas.join(','),
  'pen17 alvos=' + JSON.stringify(m17_alvos),
  'pen17 gatilhos_grades_attendance=' + m17_gatilhos.length + ' caminho_alternativo=' + m17_gatilhos_meu[0].n,
  'pen17 funcoes_de_aviso=' + JSON.stringify(m17_corpos),
  'pen17 controlo=' + JSON.stringify(m17_controlo[0]) + ' nomes=' + NOMES_GATILHO[0] + '/' + NOMES_FUNCAO[0],
  'pen17 ins_att=' + m17_ins_att.map((x) => x.proname).join(',') + ' cit_att=' + m17_cit_att.length,
  'gates=' + lista.map((g) => g.nome + ':' + (g.ok ? 'VERDE' : 'VERMELHO')).join(' '),
  'node_exit=0 msd=' + (Date.now() - t0),
].join('\n') + '\n';
writeFileSync(TXT, linhasTxt);
console.log(linhasTxt);
if (falhas > 0) process.exit(1);
