#!/usr/bin/env node
// P202 - FASE 15: remocao das contas de teste, com backup, reversao documentada, pre-voo fresco e portoes.
//
// Porque esta peca existe: o §SM.91 transformou a FASE 15 de contagem em plano (cinco degraus, 0 de escrita
// manual), mas um plano lido e nao um mecanismo. Sem esta peca o apagar ficaria a meu cargo de memoria, e um
// DELETE sobre 19 contas nao tem reversao nem pre-voo. Duas regras mandam aqui: (i) o alvo e a classe medida no
// banco neste instante, nunca uma lista lembrada; (ii) nada e apagado sem que as linhas em causa estejam primeiro
// num ficheiro FORA do repo, porque conteudo de linha de utilizador - mesmo de teste - nao entra no git.
//
// Uso:
//   node scripts/p202-fase15-remocao-das-contas-de-teste.mjs --selfteste
//   node scripts/p202-fase15-remocao-das-contas-de-teste.mjs --censo <registo-p201> --backup <pasta-fora-do-repo>
//        (simulacro por omissao: le, confere, escreve backup e reversao, 0 DELETE)
//   node scripts/p202-fase15-remocao-das-contas-de-teste.mjs --censo <registo> --backup <pasta> --aplica --ok "<frase do dono>"
//   node scripts/p202-fase15-remocao-das-contas-de-teste.mjs --so-reversao --censo <registo> --de-backup <backup.json>
//        (re-escreve SO o .sql a partir dum backup ja em disco: 0 DELETE, 0 contas no banco; os portoes da familia
//         `estado` saem FORA_DO_MODO porque o estado vivo ja nao e o do apagar, e o veredicto julga `backup`+`reversao`)
//   P202_SUF=novo distingue corridas; a guarda de sobrescrita aborta contra um registo ja escrito.
//
// O que esta peca NAO prova: que apagar seja o desejavel para cada uma das contas - a classe e por dominio de
// e-mail, medida, e a decisao de exclusao e do dono; o efeito de triggers sobre auth.users (le pg_constraint, nao
// pg_trigger); que a reversao reponha as contas como estavam - a palavra-passe nunca e gravada por esta peca, logo
// uma conta recriada e uma conta nova com o mesmo e-mail e os mesmos metadados; que o produto funcione depois do
// apagar - isso e a corrida seguinte, nao esta. E o .sql e TEXTO gerado e relido, nao um replay executado: a
// dependencia medida no censo (profiles_id_fkey, de profiles para auth.users, classe cascade) poe a recriacao das
// contas por API como degrau obrigatoriamente ANTES do primeiro insert, pelo que correr o ficheiro sozinho falla.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { admin, sql } from './c2-lib.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const REPO = dirname(AQUI);
const EU = readFileSync(fileURLToPath(import.meta.url), 'utf8');
const EMISSOR = { bytes: Buffer.byteLength(EU, 'utf8'), md5: createHash('md5').update(EU).digest('hex') };
const PRODUTOR_CENSO = 'scripts/p201-fks-por-conta-de-teste.mjs';
const PRODUTOR_CLASSE = 'scripts/ah2-inventario-contas.mjs';
const SUF = process.env.P202_SUF ? '-' + process.env.P202_SUF : '-27-11';
const OUT = join(REPO, 'evidence/p202-fase15-remocao-das-contas-de-teste' + SUF + '.json');
const FRASE_DO_DONO = 'Tudo, incluindo a FASE 15';
const AGULHA = '/\\.test$/';
const DELTYPE = { a: 'no_action', c: 'cascade', n: 'set_null', r: 'restrict' };

const argv = process.argv.slice(2);
const tem = (f) => argv.some((a) => a === f);
const val = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : null; };

// ---------------- helpers ----------------
function listaCenso(caminho) {
  if (!caminho) throw new Error('ABORTA: falta --censo <registo-p201> - um caminho lembrado e justo o que esta peca nao pode ser');
  if (!existsSync(caminho)) throw new Error('ABORTA: o censo nao existe em ' + caminho);
  return JSON.parse(readFileSync(caminho, 'utf8'));
}
function classeDeTeste(email) { return /\.test$/.test(String(email || '')); }
function literal(v) {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return "'{" + v.map((x) => '"' + String(x).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"').join(',') + "}'";
  return "'" + String(v).replace(/'/g, "''") + "'";
}
function insertDe(tabela, linha) {
  const chaves = Object.keys(linha);
  return 'insert into ' + tabela + ' (' + chaves.map((k) => '"' + k + '"').join(', ') + ') values ('
    + chaves.map((k) => literal(linha[k])).join(', ') + ');';
}
function updateDe(tabela, coluna, linha, pk) {
  const onde = pk.map((c) => '"' + c + '" = ' + literal(linha[c])).join(' and ');
  return 'update ' + tabela + ' set ' + coluna + ' = ' + literal(linha[coluna]) + ' where ' + onde + ';';
}

// ---------------- classes de reposicao: a fronteira e medida no deltype, nao lembrada ----------------
// `anula` (set null): a linha CONTINUA na tabela, so o valor do vinculo passou a null. A reposicao e um UPDATE.
// As outras (no_action, cascade, restrict): a linha SUMIU. A reposicao e um INSERT dela propria.
// Um INSERT duma linha que sobreviveu embate na chave primaria dela, e era isso que o ficheiro sm95f tinha:
// o `bfr_teacher_directory.profile_id` de deltype n revertido por insert. Somado a isso, a mesma linha de
// grants era alcancada por dois vinculos (granted_by, profile_id) e pela lista de bloqueantes e saia uma vez
// por ocorrencia - medido no texto: 15 inserts para 5 chaves unicas. A unidade de agora e o par
// (tabela, chave primaria), nunca a ocorrencia que a encontrou.
const CLASSE_ANULA = 'set_null';
function nomeSql(tabela) { return tabela === 'profiles' ? 'public.profiles' : tabela; }
function chaveDe(tabela, linha, pkDe) {
  const pk = pkDe[tabela];
  if (!Array.isArray(pk) || pk.length === 0) throw new Error('ABORTA: falta-me a chave primaria medida de ' + tabela + ' - sem chave nao ha frase que identifique a linha a reponer');
  const faltam = pk.filter((c) => linha[c] === undefined);
  if (faltam.length) throw new Error('ABORTA: a linha capturada de ' + tabela + ' nao traz a coluna de chave ' + faltam.join(',') + ' - nao invento por que coluna agrupar');
  // a chave e o LITERAL tal como sai para o ficheiro, nao o valor cru: `leReversao` so tem o texto, e as duas
  // formas de contar a mesma linha ten de ser a mesma string, senao a comparacao falha em silencio e foi o que o
  // selfteste acabou de medir - com o valor cru, 0 frases de update bateam com 0 linhas esperadas e dava verde
  return pk.map((c) => literal(linha[c])).join('|');
}
// Uma frase por par (tabela, chave). O apagar ganha do anular: se a linha sumiu, o insert ja a traz com o
// valor original do vinculo, e o update seria um nao-op sobre uma linha recem-criada.
function frasesDeReversao(lig, backup, pkDe, bloqueantes, tabelaBloqueantes) {
  const mapa = new Map();
  const encontra = (tabela, linha, classe, origem) => {
    const k = tabela + '#' + chaveDe(tabela, linha, pkDe);
    const x = mapa.get(k) || { tabela, chave: k, linha, apaga: false, anula: false, origens: [] };
    if (classe === CLASSE_ANULA) x.anula = true; else x.apaga = true;
    x.origens.push(origem);
    mapa.set(k, x);
  };
  for (const v of lig) {
    if (v.tabela.indexOf('auth.') === 0) continue;
    const rs = backup.linhas_por_vinculo[v.tabela + '.' + v.coluna];
    if (!Array.isArray(rs)) continue;
    for (const r of rs) encontra(v.tabela, r, v.classe, v.tabela + '.' + v.coluna);
  }
  for (const r of bloqueantes || []) encontra(tabelaBloqueantes, r, 'no_action', tabelaBloqueantes + '.bloqueante');
  const insercoes = [], anulos = [], ambas = [];
  for (const x of mapa.values()) {
    if (x.apaga && x.anula) ambas.push(x.chave);
    if (x.apaga) { insercoes.push({ tabela: x.tabela, chave: x.chave, sql: insertDe(nomeSql(x.tabela), x.linha) }); continue; }
    for (const origem of new Set(x.origens)) {
      const coluna = origem.split('.')[1];
      anulos.push({ tabela: x.tabela, chave: x.chave, coluna, sql: updateDe(nomeSql(x.tabela), coluna, x.linha, pkDe[x.tabela]) });
    }
  }
  const comChave = (a, b) => (a.tabela === b.tabela ? String(a.chave).localeCompare(String(b.chave)) : a.tabela.localeCompare(b.tabela));
  return { perfis: insercoes.filter((s) => s.tabela === 'profiles').sort(comChave), outras: insercoes.filter((s) => s.tabela !== 'profiles').sort(comChave), anulos: anulos.sort(comChave), ambas };
}

// ---------------- o texto escrito de volta: a medida e do artefacto, nao do meu ciclo ----------------
// Ler as frases que eu proprio construi seria contar o meu laco. O que este leitor faz e abrir o .sql que esta
// no disco e extrair, de cada linha, a tabela e os valores das colunas de chave. Foi provado contra o ficheiro
// sm95f, que e o caso partido: 15 inserts e 5 chaves unicas em grants, e um insert onde devia haver um update.
function divideValores(s) {
  const out = []; let atual = ''; let em = null; let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (em === "'") {
      if (ch === "'" && s[i + 1] === "'") { atual += "''"; i += 2; continue; }
      if (ch === "'") { em = null; atual += ch; i++; continue; }
      atual += ch; i++; continue;
    }
    if (em === '"') { atual += ch; if (ch === '"') em = null; i++; continue; }
    if (em === '{') { atual += ch; if (ch === '}') em = null; i++; continue; }
    if (ch === "'") { em = "'"; atual += ch; i++; continue; }
    if (ch === '"') { em = '"'; atual += ch; i++; continue; }
    if (ch === '{') { em = '{'; atual += ch; i++; continue; }
    if (ch === ',') { out.push(atual.trim()); atual = ''; i++; continue; }
    atual += ch; i++;
  }
  out.push(atual.trim());
  return out;
}
function leReversao(caminho, pkDe) {
  const linhas = readFileSync(caminho, 'utf8').split('\n');
  const ins = [], upd = [], semChaveLida = [];
  for (const l of linhas) {
    const mi = /^insert into (\S+) \((.*?)\) values \((.*)\);$/.exec(l);
    if (mi) {
      const tabela = mi[1].replace(/^public\./, '');
      const cols = mi[2].split(', ').map((c) => c.replace(/"/g, ''));
      const vals = divideValores(mi[3]);
      const pk = pkDe[tabela];
      if (!Array.isArray(pk) || !pk.length || pk.some((c) => cols.indexOf(c) < 0)) { semChaveLida.push(tabela + ' cols=' + cols.length); ins.push({ tabela, chave: null }); continue; }
      ins.push({ tabela, chave: tabela + '#' + pk.map((c) => vals[cols.indexOf(c)]).join('|') });
      continue;
    }
    const mu = /^update (\S+) set ([A-Za-z0-9_]+) = (.*?) where .*;$/.exec(l);
    if (mu) upd.push({ tabela: mu[1].replace(/^public\./, ''), coluna: mu[2] });
  }
  const vistos = new Map();
  for (const x of ins) if (x.chave) vistos.set(x.chave, (vistos.get(x.chave) || 0) + 1);
  const chaves_repetidas = [...vistos.entries()].filter(([, n]) => n > 1).map(([k, n]) => k + ' vezes=' + n);
  const tabelas = new Set([...ins.map((x) => x.tabela), ...upd.map((x) => x.tabela)]);
  const por_vinculo = new Map();
  for (const u of upd) { const k = u.tabela + '.' + u.coluna; por_vinculo.set(k, (por_vinculo.get(k) || 0) + 1); }
  return {
    insercoes: ins.length, updates: upd.length, chaves_repetidas,
    chaves_de_insert: ins.filter((x) => x.chave).map((x) => x.chave),
    semChaveLida,
    tabelas_no_ficheiro: [...tabelas].sort(),
    tabelas_de_insert: [...new Set(ins.map((x) => x.tabela))].sort(),
    updates_por_vinculo: [...por_vinculo.entries()].map(([k, n]) => k + '=' + n).sort(),
  };
}
// A expectativa nao sai do texto: sai do backup (quais linhas existem la dentro) e do censo (quantas linhas de
// contas de teste cada vinculo de set null tinha). Assim o portao julga o artefacto contra a prova capturada,
// e nao contra o laco que o escreveu - que seria contar as proprias corridas.
function esperancaDeReversao(lig, backup, pkDe, bloqueantes, tabelaBloqueantes) {
  const apagar = new Set(), anularSo = new Set(), nomesSetNull = [];
  let updates_esperados = 0;
  for (const v of lig) {
    if (v.tabela.indexOf('auth.') === 0) continue;
    const rs = backup.linhas_por_vinculo[v.tabela + '.' + v.coluna];
    if (!Array.isArray(rs)) continue;
    const keys = rs.map((r) => v.tabela + '#' + chaveDe(v.tabela, r, pkDe));
    if (v.classe === CLASSE_ANULA) {
      nomesSetNull.push(v.tabela + '.' + v.coluna);
      updates_esperados += v.esperado;
      for (const k of keys) if (!apagar.has(k)) anularSo.add(k);
    } else {
      for (const k of keys) { apagar.add(k); anularSo.delete(k); }
    }
  }
  for (const r of bloqueantes || []) { const k = tabelaBloqueantes + '#' + chaveDe(tabelaBloqueantes, r, pkDe); apagar.add(k); anularSo.delete(k); }
  return { insercoes_esperadas: apagar.size, updates_esperados, anularSo: [...anularSo].sort(), nomesSetNull: nomesSetNull.sort() };
}
// A chave primaria de cada tabela em causa e medida no catalogo, porque o censo so declara a das bloqueantes e
// agrupar linhas por uma coluna lembrada e o genero do erro que deu as frases repetidas. So leitura.
async function chavesPrimarias(tabelas) {
  const nomes = [...new Set(tabelas)].filter((t) => t.indexOf('.') !== 0);
  if (!nomes.length) return {};
  const lista = nomes.map((t) => "'" + t.replace(/'/g, "''") + "'").join(',');
  const rs = await sql("select c.relname as tabela, a.attname as col, x.ord::int as ord from pg_index i"
    + " join pg_class c on c.oid = i.indrelid"
    + " join lateral generate_series(0, i.indnatts - 1) as x(ord) on true"
    + " join pg_attribute a on a.attrelid = c.oid and a.attnum = i.indkey[x.ord]"
    + " where i.indisprimary and c.relnamespace = 'public'::regnamespace and c.relname in (" + lista + ")"
    + ' order by c.relname, x.ord');
  const out = {};
  for (const r of rs) (out[r.tabela] = out[r.tabela] || []).push(r.col);
  const faltam = nomes.filter((t) => !out[t] || !out[t].length);
  if (faltam.length) throw new Error('ABORTA: o catalogo nao deu chave primaria para ' + JSON.stringify(faltam) + ' - sem chave medida nao agrupo linhas, e adivinhar a coluna e o que duplicou as frases');
  return out;
}
// Uma unica instancia do emissor: a corrida viva e o modo `--so-reversao` escrevem o ficheiro por aqui, senao a
// prova re-gerada nao seria a do artefacto que se aplicou, seria uma copia da minha boa vontade.
function corpoDaReversao(lig, backup, pkDe, tabelaBloqueantes, emBackup, emGeracao, nomeDoBackup) {
  const fr = frasesDeReversao(lig, backup, pkDe, backup.bloqueantes, tabelaBloqueantes);
  const RV = [];
  RV.push('-- Reversao da FASE 15, gerada por scripts/p202-fase15-remocao-das-contas-de-teste.mjs');
  RV.push('-- Dados capturados no backup em ' + emBackup + '; este texto gerado em ' + emGeracao + '.');
  RV.push('-- Leitura: este ficheiro repoe as LINHAS PUBLICAS em causa. As contas de auth.users recriam-se pelo');
  RV.push('-- Admin API com os payloads em ' + nomeDoBackup + ' (chave contas). Sem palavra-passe no disco,');
  RV.push('-- a conta recriada e uma conta nova com o mesmo e-mail e os mesmos metadados: isso e documentado, nao escondido.');
  RV.push('-- Ordem: (1) recriar contas via API; (2) insert de profiles; (3) insert das linhas que sumiram;');
  RV.push('-- (4) update das linhas que sobreviveram com o vinculo a null; (5) os vinculos em cascade que a API refaz sozinha.');
  RV.push('-- Uma frase por par (tabela, chave primaria): a mesma linha era alcancada por mais do que um vinculo e');
  RV.push('-- saia uma vez por ocorrencia, o que dava insert duplicado e embate na chave primaria numa reposicao.');
  RV.push('-- As tabelas do esquema auth NAO tem insert por desenho: identities e sessions recriam-se pelo Admin API');
  RV.push('-- e os refresh tokens sao material de credencial, que nunca vai para disco. Ficou so a contagem no backup.');
  if (fr.ambas.length) RV.push('-- ATENCAO: ' + fr.ambas.length + ' linhas alcancadas ao mesmo tempo por um vinculo que apaga e um que anula; ficou o insert, que traz o valor original do vinculo.');
  for (const v of lig.filter((x) => x.tabela !== 'profiles')) RV.push('-- === ' + v.tabela + '.' + v.coluna + ' (' + v.classe + ', esperado ' + v.esperado + ')' + (v.tabela.indexOf('auth.') === 0 ? ' - recriado pela API, sem insert' : '') + ' ===');
  RV.push('-- === profiles (' + fr.perfis.length + ' linhas unicas, 1 degrau antes das tabelas vinculadas) ===');
  for (const s of fr.perfis) RV.push(s.sql);
  RV.push('-- === linhas que sumiram: ' + fr.outras.length + ' inserts, cada um pela sua chave primaria ===');
  let atual = null;
  for (const s of fr.outras) {
    if (s.tabela !== atual) { atual = s.tabela; RV.push('-- --- ' + s.tabela + ' (' + fr.outras.filter((y) => y.tabela === s.tabela).length + ' linhas unicas) ---'); }
    RV.push(s.sql);
  }
  RV.push('-- === linhas que sobreviveram com o vinculo a null: ' + fr.anulos.length + ' updates, nunca insert ===');
  for (const s of fr.anulos) RV.push(s.sql);
  return { linhas: RV, ambas: fr.ambas };
}
function confereFicheiroDeReversao(caminho, lig, backup, pkDe, bloqueantes, tabelaBloqueantes, tabelasEmCausa) {
  const lido = leReversao(caminho, pkDe);
  const esp = esperancaDeReversao(lig, backup, pkDe, bloqueantes, tabelaBloqueantes);
  const set_null_sem_update = esp.nomesSetNull.filter((k) => !lido.updates_por_vinculo.some((u) => u.indexOf(k + '=') === 0));
  const insert_em_linha_que_sobrevive = esp.anularSo.filter((k) => lido.chaves_de_insert.indexOf(k) >= 0);
  const medidas = new Set(lido.tabelas_no_ficheiro);
  return {
    medida: Object.assign({}, lido, {
      bytes: statSync(caminho).size, chaves_sem_chave_lida: lido.semChaveLida.length,
      insercoes_esperadas: esp.insercoes_esperadas, updates_esperados: esp.updates_esperados,
      set_null_sem_update, insert_em_linha_que_sobrevive,
    }),
    tabelas_sem_reversao: tabelasEmCausa.filter((t) => !medidas.has(t)),
    esperanca: esp,
  };
}
// ---------------- a citacao do backup dentro do .sql ----------------
// O cabecalho do .sql e a unica coisa que alguem vai ler antes de correr seja o que for, e diz onde estao os
// payloads das contas. O nome NAO se constroi a partir do sufixo da corrida: no modo `--so-reversao` a corrida e
// nova e o backup e o do dia do apagar, e foi assim que o ficheiro saiu a apontar para um caminho inexistente
// (fase15-backup-sm95j.json quando o que existe e fase15-backup-sm95f.json). A citacao passa a ser lida do
// TEXTO ESCRITO e confrontada com o backup efetivamente lido e com o disco.
const MARCA_DA_CITACAO = 'payloads em ';
function caminhoCitadoNaReversao(texto) {
  const linha = texto.split('\n').find((l) => l.indexOf(MARCA_DA_CITACAO) >= 0);
  if (!linha) throw new Error('ABORTA: o cabecalho do .sql ja nao contem a frase da citacao - mudei o emissor sem mudar o leitor, e a citacao deixaria de ser medida');
  const m = linha.slice(linha.indexOf(MARCA_DA_CITACAO) + MARCA_DA_CITACAO.length).match(/^(\S+) \(chave contas\)/);
  if (!m) throw new Error('ABORTA: a citacao nao tem a forma "<caminho> (chave contas)" - veio ' + JSON.stringify(linha.replace(/^-- /, '').slice(0, 120)));
  return m[1];
}
// uma linha por eixo: resolve em disco? e o backup que esta corrida leu? Os dois sao perguntas diferentes, e
// misturados davam verde a um caminho que existe mas e outro, que e precisamente o defeito de sm95j.
function medidaDaCitacao(caminhoDoFicheiro, caminhoDoBackupLido) {
  const citado = caminhoCitadoNaReversao(readFileSync(caminhoDoFicheiro, 'utf8'));
  const naoResolve = existsSync(citado) ? [] : [citado];
  const normalizado = caminhoDoBackupLido.replace(/\\/g, '/');
  return { caminho_citado: citado, citada_nao_resolve: naoResolve, citada_e_o_backup_medido: citado === normalizado, backup_caminho: normalizado };
}
function ligaCenso(c) {
  const linhas = new Map((c.linhas_por_vinculo || []).map((x) => [x.conname, x]));
  const alvo = [];
  for (const v of c.vinculos || []) {
    const l = linhas.get(v.conname);
    if (l && l.linhas_de_contas_teste > 0) alvo.push({ conname: v.conname, tabela: v.tabela, coluna: v.colunas_locais, deltype: v.deltype, classe: DELTYPE[v.deltype] || v.deltype, esperado: l.linhas_de_contas_teste, linhas_da_tabela: l.linhas_da_tabela });
  }
  return alvo;
}

// ---------------- contagem dos campos que o censo emite ----------------
// A forma destes campos NAO e lembrada: foi lida do fonte do produtor. p201 linha 99 emite
// `so_no_sql`/`so_no_admin` como NUMERO (o `.length` ja esta aplicado la dentro), p201 linha 303 emite
// `degraus_que_exigem_escrita_manual` como NUMERO e p201 linha 343 emite `linhas_bloqueantes` como ARRAY.
// Chamar `.length` sobre um numero da `undefined`, e `undefined === 0` e falso para sempre: o portao
// passa a vermelho eterno sem nenhum estado ter mudado. Foi medido no simulacro sm95c — as duas rotas
// batiam (teste=19 e teste_por_admin=19) e `exigem_escrita_manual` era 0, e os dois portoes sairam
// VERMELHO. O `baseVerde()` antigo tinha arrays nestes tres campos, por isso o selfteste verde nunca
// encontrou o defeito: a forma do fixture tem de ser a forma do produtor, senao o simulacro prova outra
// coisa. `conta` so aceita as duas formas emitidas e ABORTA numa terceira, para que uma mudanca do
// emissor apareca como corrida nova que nomeia a forma, e nunca como veredicto silencioso.
const conta = (v, nome) => {
  if (typeof v === 'number') return v;
  if (Array.isArray(v)) return v.length;
  throw new Error('ABORTA: o campo ' + nome + ' do censo nao e numero nem array (forma medida: ' + (v === null ? 'null' : typeof v) + ') - nao conto uma forma que o produtor nao emite');
};
const forma = (v) => (Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v);

// ---------------- portoes: funcoes puras sobre o objecto de medida ----------------
// Cada portao traz a familia a que pertence. O modo `--so-reversao` reescreve o ficheiro a partir dum backup ja
// escrito, num banco onde as contas de teste ja nao existem: ai os portoes de `estado` medem um banco que mudou
// e por isso nao sao julgados - saem `FORA_DO_MODO`, com os valores lidos no registo. Um portao que nao e julgado
// tem de se nomear como tal, nunca desaparecer da lista.
const PORTOES = [
  ['o_censo_declarasomente_leitura_e_estado_medido', (m) => String(m.censo.autorizacao).includes('somente leitura') && m.censo.estado === 'MEDIDO', 'somente leitura + MEDIDO', 'estado'],
  ['a_classe_de_conta_de_teste_e_lida_do_produtor', (m) => m.agulha_no_produtor === true && m.censo.origem_dos_predicados.some((o) => o.produtor === 'scripts/ah2-inventario-contas.mjs' && o.agulha === AGULHA && o.aparece_no_produtor === true), 'agulha presente no produtor e declarada no censo', 'estado'],
  ['o_universo_do_banco_bate_com_o_censo', (m) => m.vivo.total === m.censo.universo.contas_no_banco && m.vivo.teste === m.censo.universo.contas_de_teste_por_sql && m.alvos_lidos === m.censo.plano_por_conta.length, 'banco == censo', 'estado'],
  ['as_duas_rotas_de_contagem_batem', (m) => m.vivo.teste === m.vivo.teste_por_admin && conta(m.censo.universo.so_no_sql, 'universo.so_no_sql') === 0 && conta(m.censo.universo.so_no_admin, 'universo.so_no_admin') === 0, 'sql == admin, 0 so de uma rota (contagem do campo, numero ou array)', 'estado'],
  ['nenhuma_conta_real_entra_no_conjunto', (m) => m.fora_da_classe.length === 0 && m.alvos_lidos > 0, '0 alvos fora da classe', 'estado'],
  ['a_ponte_profiles_nao_deixa_conta_sem_perfil', (m) => m.censo.ponte_profiles_auth_users.contas_sem_perfil.length === 0 && m.perfis_dos_alvos === m.alvos_lidos, '0 sem perfil, perfis == alvos', 'estado'],
  ['as_linhas_bloqueantes_estao_no_sitio_do_censo', (m) => m.bloqueantes_vivas === conta(m.censo.ordem_de_remocao.linhas_bloqueantes, 'ordem_de_remocao.linhas_bloqueantes') && m.bloqueantes_sem_chave.length === 0 && m.bloqueantes_apontando_para_real.length === 0, 'contadas e todas apontando para alvos', 'estado'],
  ['a_ordem_nao_deixa_nada_para_escrita_manual', (m) => conta(m.censo.ordem_de_remocao.degraus_que_exigem_escrita_manual, 'ordem_de_remocao.degraus_que_exigem_escrita_manual') === 0 && m.censo.ordem_de_remocao.degraus_resolvidos_pela_ordem === conta(m.censo.ordem_de_remocao.linhas_bloqueantes, 'ordem_de_remocao.linhas_bloqueantes'), '0 manuais (numero ou array), resolvidos == linhas', 'estado'],
  ['o_backup_escre_fora_do_repo_e_confere', (m) => m.backup.fora_do_repo === true && m.backup.bytes > 0 && m.backup.md5_confere === true, 'fora do repo, nao vazio, md5 relido', 'backup'],
  ['o_backup_cobre_as_linhas_de_cada_vinculo', (m) => m.vinculo_sem_backup.length === 0 && m.vinculo_com_contagem_diferente.length === 0, 'cada vinculo com linhas de teste tem backup com a mesma contagem', 'backup'],
  ['a_reversao_nomeia_cada_tabela_em_causa', (m) => m.reversao.bytes > 0 && m.tabelas_sem_reversao.length === 0, 'ficheiro de reversao cobre todas as tabelas', 'reversao'],
  ['a_reversao_repoe_cada_linha_uma_soa_vez', (m) => m.reversao.chaves_repetidas.length === 0 && m.reversao.chaves_sem_chave_lida === 0 && m.reversao.insercoes === m.reversao.insercoes_esperadas, 'lido no texto: 0 chaves repetidas e inserts == linhas unicas do backup', 'reversao'],
  ['a_reversao_repone_os_vinculos_que_sobrevivem_por_update', (m) => m.reversao.updates === m.reversao.updates_esperados && m.reversao.set_null_sem_update.length === 0 && m.reversao.insert_em_linha_que_sobrevive.length === 0, 'updates == linhas set null do censo, cada vinculo desses reposto por update, 0 insert dessas linhas', 'reversao'],
  ['a_reversao_cita_o_backup_que_existe', (m) => !!m.reversao.caminho_citado, 'o cabecalho do .sql tem uma citacao lida do texto escrito', 'reversao'],
  ['a_citacao_do_backup_resolve_em_disco', (m) => m.reversao.citada_nao_resolve.length === 0, 'o caminho citado existe em disco', 'reversao'],
  ['a_citacao_do_backup_e_a_que_esta_corrida_leu', (m) => m.reversao.citada_e_o_backup_medido === true, 'o caminho citado e o mesmo ficheiro de backup que esta corrida leu', 'reversao'],
  ['pos_apagar_nada_resta_das_contas_de_teste', (m) => m.aplica !== true ? 'NAO_APLICADO' : (m.pos.vivo_teste === 0 && m.pos.admin_teste === 0 && m.pos.bloqueantes_restam === 0 && m.pos.restantes_por_vinculo.length === 0), '0 contas, 0 vinculos, 0 linhas da ordem', 'pos'],
  ['pos_apagar_as_contas_reais_estao_intactas', (m) => m.aplica !== true ? 'NAO_APLICADO' : (m.pos.real_antes === m.pos.real_depois && m.pos.reais_que_faltam.length === 0 && m.pos.reais_novas.length === 0), 'conjunto de reais identico', 'pos'],
];

function julga(m) {
  const liberadas = m.familias || null;
  const out = [];
  for (const [nome, fn, esperado, familia] of PORTOES) {
    if (liberadas && !liberadas.includes(familia)) { out.push({ nome, veredicto: 'FORA_DO_MODO', esperado, familia }); continue; }
    let r, nota = '';
    try { r = fn(m); } catch (e) { r = false; nota = ' | erro=' + e.message.slice(0, 70); }
    const veredicto = r === true ? 'OK' : (typeof r === 'string' ? r : 'VERMELHO');
    out.push({ nome, veredicto, esperado, familia });
    if (veredicto === 'VERMELHO') out[out.length - 1].obt = nota.replace(' | erro=', 'erro: ');
  }
  return out;
}

// ---------------- fixtures: um caso de verde inteiro e uma quebra por portao ----------------
function baseVerde() {
  const alvos = [{ id: 'u1', email: 'a@x.test' }, { id: 'u2', email: 'b@x.test' }];
  return {
    aplica: true,
    censo: {
      autorizacao: 'somente leitura: 0 DDL, 0 DML, 0 grants, 0 escrita, 0 mint, 0 DELETE', estado: 'MEDIDO',
      origem_dos_predicados: [{ produtor: PRODUTOR_CLASSE, agulha: AGULHA, aparece_no_produtor: true }],
      universo: { contas_no_banco: 7, contas_de_teste_por_sql: 2, contas_de_teste_por_admin: 2, so_no_sql: 0, so_no_admin: 0 },
      plano_por_conta: alvos.map((a) => ({ email: a.email })),
      ponte_profiles_auth_users: { contas_sem_perfil: [], perfis_das_contas_lidos: 2 },
      ordem_de_remocao: { linhas_bloqueantes: [{ registo: 'r1' }, { registo: 'r2' }], degraus_que_exigem_escrita_manual: 0, degraus_resolvidos_pela_ordem: 2 },
      vinculos: [{ conname: 'v1', tabela: 't1', colunas_locais: 'c1', deltype: 'c' }, { conname: 'v2', tabela: 't2', colunas_locais: 'c2', deltype: 'n' }],
      linhas_por_vinculo: [{ conname: 'v1', linhas_da_tabela: 9, linhas_de_contas_teste: 2 }, { conname: 'v2', linhas_da_tabela: 4, linhas_de_contas_teste: 1 }],
      chaves_primarias_das_tabelas_bloqueantes: { t1: ['id'] },
    },
    agulha_no_produtor: true,
    vivo: { total: 7, teste: 2, real: 5, teste_por_admin: 2 },
    alvos_lidos: 2, fora_da_classe: [], perfis_dos_alvos: 2,
    bloqueantes_vivas: 2, bloqueantes_sem_chave: [], bloqueantes_apontando_para_real: [],
    backup: { fora_do_repo: true, bytes: 1234, md5_confere: true },
    vinculo_sem_backup: [], vinculo_com_contagem_diferente: [],
    // o reversao e o que `leReversao` devolve lido do texto, e o que `esperancaDeReversao` devolve do backup:
    // 2 inserts para 2 chaves unicas de t1, 1 update para a linha de t2 que sobrevive com o vinculo a null
    reversao: {
      bytes: 400, insercoes: 2, updates: 1, chaves_repetidas: [], chaves_de_insert: ["t1#'1'", "t1#'2'"], chaves_sem_chave_lida: 0,
      semChaveLida: [], tabelas_no_ficheiro: ['t1', 't2'], tabelas_de_insert: ['t1'], updates_por_vinculo: ['t2.c2=1'],
      insercoes_esperadas: 2, updates_esperados: 1, set_null_sem_update: [], insert_em_linha_que_sobrevive: [],
      // os tres campos da citacao sao medidos por `medidaDaCitacao` sobre o texto escrito; o caso E do selfteste
      // corre o emissor inteiro sobre um backup de verdade em tmpdir, porque aqui o caminho e sintetico
      caminho_citado: '/fora/do/repo/fase15-backup-smX.json', citada_nao_resolve: [], citada_e_o_backup_medido: true,
    },
    tabelas_sem_reversao: [],
    pos: { vivo_teste: 0, admin_teste: 0, bloqueantes_restam: 0, restantes_por_vinculo: [], real_antes: 5, real_depois: 5, reais_que_faltam: [], reais_novas: [] },
  };
}
const QUEBRAS = {
  o_censo_declarasomente_leitura_e_estado_medido: (m) => { m.censo.autorizacao = 'aplicacao: escreveu no banco'; },
  a_classe_de_conta_de_teste_e_lida_do_produtor: (m) => { m.censo.origem_dos_predicados[0].aparece_no_produtor = false; },
  o_universo_do_banco_bate_com_o_censo: (m) => { m.vivo.total = 8; },
  as_duas_rotas_de_contagem_batem: (m) => { m.censo.universo.so_no_sql = 2; },
  nenhuma_conta_real_entra_no_conjunto: (m) => { m.fora_da_classe = ['diretora@escola.gov.br']; },
  a_ponte_profiles_nao_deixa_conta_sem_perfil: (m) => { m.censo.ponte_profiles_auth_users.contas_sem_perfil = ['u2']; },
  as_linhas_bloqueantes_estao_no_sitio_do_censo: (m) => { m.bloqueantes_vivas = 1; },
  a_ordem_nao_deixa_nada_para_escrita_manual: (m) => { m.censo.ordem_de_remocao.degraus_que_exigem_escrita_manual = 1; },
  o_backup_escre_fora_do_repo_e_confere: (m) => { m.backup.fora_do_repo = false; },
  o_backup_cobre_as_linhas_de_cada_vinculo: (m) => { m.vinculo_com_contagem_diferente = ['t1.c1 esperado=2 obtido=1']; },
  a_reversao_nomeia_cada_tabela_em_causa: (m) => { m.tabelas_sem_reversao = ['t2']; },
  a_reversao_repoe_cada_linha_uma_soa_vez: (m) => { m.reversao.chaves_repetidas = ["t1#'1' vezes=3"]; },
  a_reversao_repone_os_vinculos_que_sobrevivem_por_update: (m) => { m.reversao.set_null_sem_update = ['t2.c2']; },
  a_reversao_cita_o_backup_que_existe: (m) => { m.reversao.caminho_citado = ''; },
  a_citacao_do_backup_resolve_em_disco: (m) => { m.reversao.citada_nao_resolve = ['/fora/do/repo/fase15-backup-lembrado.json']; },
  a_citacao_do_backup_e_a_que_esta_corrida_leu: (m) => { m.reversao.citada_e_o_backup_medido = false; },
  pos_apagar_nada_resta_das_contas_de_teste: (m) => { m.pos.vivo_teste = 1; },
  pos_apagar_as_contas_reais_estao_intactas: (m) => { m.pos.reais_que_faltam = ['professora@escola.gov.br']; },
};

if (tem('--selfteste')) {
  const falhas = [];
  const verde = julga(baseVerde());
  const ruinsVerde = verde.filter((p) => p.veredicto !== 'OK');
  if (ruinsVerde.length) falhas.push('verde_quebrado=' + JSON.stringify(ruinsVerde.map((p) => p.nome)));
  for (const [nome, mut] of Object.entries(QUEBRAS)) {
    const m = baseVerde(); mut(m);
    const ruins = julga(m).filter((p) => p.veredicto !== 'OK').map((p) => p.nome);
    if (ruins.length !== 1 || ruins[0] !== nome) falhas.push(nome + ' -> ' + JSON.stringify(ruins));
    else console.log('PARTIU  ' + nome);
  }
  const semFixture = PORTOES.map((p) => p[0]).filter((n) => !QUEBRAS[n]);
  if (semFixture.length) falhas.push('portao_sem_fixture=' + JSON.stringify(semFixture));
  // equivalencia das duas formas que o produtor emite: numero (p201 linha 99/303) e array (p201 linha 343
  // para linhas_bloqueantes; so_no_* so e array noutra variante do emissor). Nao vazio -> VERMELHO nas duas
  // formas; vazio -> OK nas duas. Sem o par numero/array o fixture verde em array nunca apanharia o `.length`
  // sobre numero que deu os dois falsos VERMELHO do simulacro sm95c.
  const sodo = (mut, nome) => { const m = baseVerde(); mut(m); const p = julga(m).find((x) => x.nome === nome); return p ? p.veredicto : 'NAO_LIDO'; };
  const NOME_ROTAS = 'as_duas_rotas_de_contagem_batem', NOME_ORDEM = 'a_ordem_nao_deixa_nada_para_escrita_manual';
  const rotNum = sodo((m) => { m.censo.universo.so_no_sql = 3; }, NOME_ROTAS);
  const rotArr = sodo((m) => { m.censo.universo.so_no_sql = ['u9']; }, NOME_ROTAS);
  const rotNumOk = sodo((m) => { m.censo.universo.so_no_sql = 0; }, NOME_ROTAS);
  const rotArrOk = sodo((m) => { m.censo.universo.so_no_sql = []; }, NOME_ROTAS);
  const ordNum = sodo((m) => { m.censo.ordem_de_remocao.degraus_que_exigem_escrita_manual = 2; }, NOME_ORDEM);
  const ordArr = sodo((m) => { m.censo.ordem_de_remocao.degraus_que_exigem_escrita_manual = ['p1', 'p2']; }, NOME_ORDEM);
  if (rotNum !== 'VERMELHO' || rotArr !== 'VERMELHO') falhas.push('rotas_formas_nao_vazias=' + rotNum + '/' + rotArr);
  if (rotNumOk !== 'OK' || rotArrOk !== 'OK') falhas.push('rotas_formas_vazias=' + rotNumOk + '/' + rotArrOk);
  if (ordNum !== 'VERMELHO' || ordArr !== 'VERMELHO') falhas.push('ordem_formas=' + ordNum + '/' + ordArr);
  console.log('EQUIVALENCIA_FORMAS rotas_nao_vazia=' + rotNum + '=' + rotArr + ' rotas_vazia=' + rotNumOk + '=' + rotArrOk + ' ordem_nao_vazia=' + ordNum + '=' + ordArr);
  // a terceira forma (nem numero nem array) nao pode dar verde silencioso nem vermelho-de-estado: tem de
  // rebentar com a nota ABORTA que nomeia a forma medida, porque e uma mudanca do emissor, nao do banco
  const m3 = baseVerde(); m3.censo.universo.so_no_sql = 'zero';
  const p3 = julga(m3).find((x) => x.nome === NOME_ROTAS);
  if (p3.veredicto !== 'VERMELHO' || String(p3.obt).indexOf('ABORTA') < 0) falhas.push('terceira_forma=' + p3.veredicto + ' obt=' + JSON.stringify(p3.obt));
  else console.log('ABORTA_NOTA  terceira_forma=' + JSON.stringify(String(p3.obt).slice(0, 64)));
  // o ramo do simulacro e uma classe legitima e precisa do seu caso positivo: sem ele, os dois portoes pos
  // dariam VERMELHO em cada corrida seca, e um vermelho que nunca muda nao mede nada
  const sim = baseVerde(); sim.aplica = false;
  const posSim = julga(sim).filter((p) => p.nome.indexOf('pos_apagar_') === 0);
  if (posSim.length !== 2 || posSim.some((p) => p.veredicto !== 'NAO_APLICADO')) falhas.push('ramo_do_simulacro=' + JSON.stringify(posSim.map((p) => p.nome + '=' + p.veredicto)));
  else console.log('NAO_APLICADO  os_dois_portoes_pos_no_simulacro');
  // as familias de portao: no modo `--so-reversao` o banco ja nao tem as contas, por isso os portoes de `estado`
  // nao podem ser julgados. Mas um portao que nunca e julgado no modo que usa o ficheiro e um portao morto, e o
  // vermelho que me interessava - o do texto duplicado - tem de sair tambem la. Os dois casos abaixo provam isso.
  const so = ['reversao', 'backup'];
  const mSoEstadoRuim = baseVerde(); mSoEstadoRuim.familias = so; QUEBRAS.o_universo_do_banco_bate_com_o_censo(mSoEstadoRuim);
  const ruinsSo = julga(mSoEstadoRuim).filter((p) => p.veredicto === 'VERMELHO');
  const foraSo = julga(mSoEstadoRuim).filter((p) => p.veredicto === 'FORA_DO_MODO').length;
  const esperadosFora = PORTOES.filter((p) => !so.includes(p[3])).length;
  if (ruinsSo.length !== 0 || foraSo !== esperadosFora) falhas.push('familias_fora_do_modo=' + ruinsSo.length + '/' + foraSo + ' esperado 0/' + esperadosFora);
  const mSoRevRuim = baseVerde(); mSoRevRuim.familias = so; QUEBRAS.a_reversao_repoe_cada_linha_uma_soa_vez(mSoRevRuim);
  const ruinsRev = julga(mSoRevRuim).filter((p) => p.veredicto === 'VERMELHO').map((p) => p.nome);
  if (ruinsRev.length !== 1 || ruinsRev[0] !== 'a_reversao_repoe_cada_linha_uma_soa_vez') falhas.push('familias_reversao_viva=' + JSON.stringify(ruinsRev));
  else console.log('FORA_DO_MODO  estado_fora=' + foraSo + ' e a reversao continua viva no mesmo modo');
  // ---------------- fixtures das proprias frases: o texto vai ao disco e e lido de volta ----------------
  // Contar o meu laco nao mede o artefacto. Aqui as frases sao escritas num ficheiro de verdade e o que entra
  // na assercao e o que `leReversao` extrai do disco - incluindo os valores com virgula e aspas la dentro, que e
  // onde um separador ingenuo partia a linha e o numero saía bonito e errado.
  const pasta = mkdtempSync(join(tmpdir(), 'p202rev-'));
  try {
    const pkF = { t1: ['id'], t2: ['id'] };
    const linA = { nome: 'Silva, Ana "maria"', id: 'a', c1: 'u1' };
    const linB = { nome: 'B, C', id: 'b', c1: 'u2' };
    const linC = { id: 'c', nome: 'y, z', c2: 'u1' };
    const bkF = { linhas_por_vinculo: { 't1.c1': [linA, linB], 't1.g1': [linA, linB], 't2.c2': [linC] }, bloqueantes: [linA, linB] };
    const ligF = [
      { tabela: 't1', coluna: 'c1', classe: 'no_action', esperado: 2 },
      { tabela: 't1', coluna: 'g1', classe: 'no_action', esperado: 2 },
      { tabela: 't2', coluna: 'c2', classe: 'set_null', esperado: 1 },
    ];
    const fr = frasesDeReversao(ligF, bkF, pkF, bkF.bloqueantes, 't1');
    // a chave com que as duas rotas se encontram e o literal tal como sai para o ficheiro (aspas incluidas),
    // porque e isso que `leReversao` pode reconstruir a partir do texto - as assercoes abaixo estao na mesma forma
    const K = (t, v) => t + "#'" + v + "'";
    const okTxt = join(pasta, 'ok.sql');
    writeFileSync(okTxt, [...fr.perfis, ...fr.outras, ...fr.anulos].map((s) => s.sql).join('\n') + '\n');
    const lidoOk = leReversao(okTxt, pkF);
    const espOk = esperancaDeReversao(ligF, bkF, pkF, bkF.bloqueantes, 't1');
    if (fr.ambas.length !== 0) falhas.push('ambas_classes=' + JSON.stringify(fr.ambas));
    if (lidoOk.insercoes !== 2 || lidoOk.updates !== 1) falhas.push('frases_contagem=' + lidoOk.insercoes + '/' + lidoOk.updates);
    if (lidoOk.chaves_repetidas.length !== 0) falhas.push('frases_repetidas=' + JSON.stringify(lidoOk.chaves_repetidas));
    if (JSON.stringify(lidoOk.chaves_de_insert.slice().sort()) !== JSON.stringify([K('t1', 'a'), K('t1', 'b')].sort())) falhas.push('leitor_chaves=' + JSON.stringify(lidoOk.chaves_de_insert));
    if (espOk.insercoes_esperadas !== 2 || espOk.updates_esperados !== 1) falhas.push('esperanca=' + espOk.insercoes_esperadas + '/' + espOk.updates_esperados);
    if (JSON.stringify(espOk.anularSo) !== JSON.stringify([K('t2', 'c')])) falhas.push('esperanca_anularSo=' + JSON.stringify(espOk.anularSo));
    if (JSON.stringify(espOk.nomesSetNull) !== JSON.stringify(['t2.c2'])) falhas.push('esperanca_nomes=' + JSON.stringify(espOk.nomesSetNull));
    const txtAnulo = readFileSync(okTxt, 'utf8');
    if (txtAnulo.indexOf('update t2 set c2 = \'u1\' where "id" = \'c\';') < 0) falhas.push('frase_update=' + JSON.stringify(txtAnulo.split('\n').filter((l) => l.indexOf('update') === 0)));
    if (txtAnulo.indexOf('insert into t2') >= 0) falhas.push('ainda_ha_insert_onde_sobrevive');
    else console.log('FRASES_OK  inserts=' + lidoOk.insercoes + ' updates=' + lidoOk.updates + ' duplicadas=0 com 3 rotas sobre 2 linhas');
    // a familia do delimitador dentro da string: um valor que imita o separador da frase nao pode partir a linha,
    // e se partir tem de aparecer como `semChaveLida` (vermelho), nunca como contagem bonita
    const dTxt = join(pasta, 'delimitador.sql');
    const linD = { nome: 'A") values ("B', id: 'd', c1: 'u9' };
    writeFileSync(dTxt, insertDe('t1', linD) + '\n');
    const lidoD = leReversao(dTxt, pkF);
    if (lidoD.chaves_de_insert.length !== 1 || lidoD.chaves_de_insert[0] !== K('t1', 'd') || lidoD.semChaveLida.length) falhas.push('delimitador_na_string=' + JSON.stringify(lidoD));
    else console.log('DELIMITADOR  valor que imita o separador da por chave ' + K('t1', 'd') + ' e 0 frases sem chave');
    // o negativo e a forma antiga, medida no ficheiro sm95f: a mesma linha impressa por cada rota e o set null
    // revertido por insert. Se o leitor nao a apanhar, o portao verde e uma ficcao do meu construtor.
    const mauTxt = join(pasta, 'mau.sql');
    writeFileSync(mauTxt, [insertDe('t1', linA), insertDe('t1', linA), insertDe('t1', linA), insertDe('t2', linC)].join('\n') + '\n');
    const lidoMau = leReversao(mauTxt, pkF);
    const semUpd = espOk.nomesSetNull.filter((k) => !lidoMau.updates_por_vinculo.some((u) => u.indexOf(k + '=') === 0));
    const sobrev = espOk.anularSo.filter((k) => lidoMau.chaves_de_insert.indexOf(k) >= 0);
    if (lidoMau.chaves_repetidas.length !== 1 || lidoMau.chaves_repetidas[0] !== K('t1', 'a') + ' vezes=3') falhas.push('negativo_repetidas=' + JSON.stringify(lidoMau.chaves_repetidas));
    if (semUpd.length !== 1 || sobrev.length !== 1) falhas.push('negativo_set_null=' + JSON.stringify(semUpd) + '/' + JSON.stringify(sobrev));
    else console.log('NEGATIVO_PARTE  a forma antiga do sm95f da ' + JSON.stringify(lidoMau.chaves_repetidas) + ' + update_em_falta=' + JSON.stringify(semUpd) + ' + insert_onde_sobrevive=' + JSON.stringify(sobrev));
    // ---------------- caso E: o emissor inteiro, cabecalho incluido ----------------
    // Os casos acima colam as frases a mao, por isso nunca passaram pelo `corpoDaReversao` - e foi la dentro que
    // o caminho do backup se escreveu a partir do sufixo da corrida, o que no modo `--so-reversao` deu um .sql a
    // apontar para fase15-backup-sm95j.json quando o ficheiro em disco e fase15-backup-sm95f.json. Aqui corre o
    // emissor de verdade, o texto vai ao disco, e o que se julga e o que o disco devolve.
    const backupF = join(pasta, 'fase15-backup-smF.json');
    writeFileSync(backupF, JSON.stringify(bkF, null, 2) + '\n');
    const emF = join(pasta, 'emissor.sql');
    const gF = corpoDaReversao(ligF, bkF, pkF, 't1', '2026-11-27T00:00:00.000Z', '2026-11-27T00:00:01.000Z', backupF.replace(/\\/g, '/'));
    writeFileSync(emF, gF.linhas.join('\n') + '\n');
    const citF = medidaDaCitacao(emF, backupF);
    if (citF.citada_nao_resolve.length !== 0 || citF.citada_e_o_backup_medido !== true) falhas.push('emissor_citacao=' + JSON.stringify(citF));
    const provaF = confereFicheiroDeReversao(emF, ligF, bkF, pkF, bkF.bloqueantes, 't1', ['t1', 't2']);
    if (provaF.medida.insercoes !== provaF.esperanca.insercoes_esperadas || provaF.medida.updates !== provaF.esperanca.updates_esperados) falhas.push('emissor_contagem=' + provaF.medida.insercoes + '/' + provaF.medida.updates + ' esperado=' + provaF.esperanca.insercoes_esperadas + '/' + provaF.esperanca.updates_esperados);
    if (provaF.tabelas_sem_reversao.length !== 0) falhas.push('emissor_tabelas_sem_reversao=' + JSON.stringify(provaF.tabelas_sem_reversao));
    else console.log('EMISSOR_OK  ' + gF.linhas.length + ' linhas, ' + provaF.medida.insercoes + ' inserts + ' + provaF.medida.updates + ' updates, citacao que resolve e e a deste backup');
    // o negativo e a forma do sm95j: o citado constrói-se do sufixo da corrida enquanto o lido e o backup do dia.
    // Se este caso der verde, os dois portoes da citacao nao medem nada.
    const emMau = join(pasta, 'emissor-mau.sql');
    const gMau = corpoDaReversao(ligF, bkF, pkF, 't1', 'x', 'y', join(pasta, 'fase15-backup-sm95l.json').replace(/\\/g, '/'));
    writeFileSync(emMau, gMau.linhas.join('\n') + '\n');
    const citMau = medidaDaCitacao(emMau, backupF);
    if (citMau.citada_nao_resolve.length !== 1 || citMau.citada_e_o_backup_medido !== false) falhas.push('emissor_negativo=' + JSON.stringify(citMau));
    else console.log('EMISSOR_PARTE  o nome do sufixo da corrida ' + JSON.stringify(citMau.citada_nao_resolve) + ' e nao e o backup lido');
  } finally { rmSync(pasta, { recursive: true, force: true }); }
  if (falhas.length) { console.log('P202_SELFTESTE_VERMELHO ' + JSON.stringify(falhas)); process.exit(1); }
  console.log('P202_SELFTESTE_OK portoes=' + PORTOES.length + ' casos=' + (PORTOES.length + 3));
  process.exit(0);
}

// ---------------- modo `--so-reversao`: o .sql re-escrito a partir dum backup ja capturado, 0 escrita ----------------
// Porque este modo existe: as 19 contas ja foram apagadas, e um procedimento de reversao com dois defeitos
// medidos (frases repetidas e insert onde a linha sobreviveu) so pode ser corrigido sobre o queesta em disco -
// o backup sm95f. Nada aqui escreve no banco: le o censo, le o backup, mede as chaves primarias no catalogo,
// re-escreve o .sql pelo mesmo emissor da corrida viva e julga-o. Os portoes de `estado` nao sao julgados neste
// modo porque o banco que eles comparam ja nao tem as contas - saem `FORA_DO_MODO`, com os numeros lidos no registo.
if (tem('--so-reversao')) {
  const CAMINHO_BACKUP_VELHO = val('--de-backup');
  if (!CAMINHO_BACKUP_VELHO || !existsSync(CAMINHO_BACKUP_VELHO)) { console.log('ABORTA: --so-reversao exige --de-backup <caminho> de um backup ja escrito - e dele que as linhas vem, e um caminho lembrado nao e um caminho lido'); process.exit(1); }
  const censo2 = listaCenso(val('--censo'));
  const bruto2 = readFileSync(CAMINHO_BACKUP_VELHO);
  const backup2 = JSON.parse(bruto2.toString('utf8'));
  const corpo2 = JSON.stringify(backup2, null, 2) + '\n';
  const md5Disco2 = createHash('md5').update(bruto2).digest('hex');
  const md5Objeto2 = createHash('md5').update(corpo2).digest('hex');
  const DIR2 = dirname(CAMINHO_BACKUP_VELHO).replace(/\\/g, '/');
  if (DIR2.startsWith(REPO.replace(/\\/g, '/'))) { console.log('ABORTA: o backup de onde vou ler esta dentro do repo: ' + DIR2 + ' (tem de estar fora)'); process.exit(1); }
  const marca2 = SUF.replace(/^-/, '');
  const saida2 = DIR2 + '/fase15-reversao-' + marca2 + '-corrigida.sql';
  const OUT2 = join(REPO, 'evidence/p202-fase15-so-reversao' + SUF + '.json');
  for (const p of [saida2, OUT2]) if (existsSync(p)) { console.log('ABORTA: ' + p + ' ja existe - re-corra com P202_SUF=novo, nao por cima'); process.exit(1); }
  const lig2 = ligaCenso(censo2);
  const tabelaBloq2 = Object.keys(censo2.chaves_primarias_das_tabelas_bloqueantes || {});
  if (tabelaBloq2.length !== 1) throw new Error('ABORTA: esta peca trata uma tabela bloqueante de cada vez, veio ' + JSON.stringify(tabelaBloq2));
  const TABELA_GRANTS2 = tabelaBloq2[0];
  const pkDe2 = await chavesPrimarias(Array.from(new Set(lig2.filter((v) => v.tabela.indexOf('auth.') !== 0).map((v) => v.tabela).concat([TABELA_GRANTS2]))));
  if (String(pkDe2[TABELA_GRANTS2]) !== String((censo2.chaves_primarias_das_tabelas_bloqueantes || {})[TABELA_GRANTS2])) throw new Error('ABORTA: a chave primaria medida de ' + TABELA_GRANTS2 + ' e ' + JSON.stringify(pkDe2[TABELA_GRANTS2]) + ' e o censo declara ' + JSON.stringify((censo2.chaves_primarias_das_tabelas_bloqueantes || {})[TABELA_GRANTS2]));
  const chaves2 = (censo2.ordem_de_remocao.linhas_bloqueantes || []).map((o) => o.registo);
  const m2 = {
    aplica: false, familias: ['backup', 'reversao'], censo: censo2,
    vivo_medido_fora_do_modo: null,
    backup: { fora_do_repo: true, bytes: bruto2.length, md5: md5Disco2, md5_confere: md5Objeto2 === md5Disco2 },
    reversao: {}, tabelas_sem_reversao: [], vinculo_sem_backup: [], vinculo_com_contagem_diferente: [],
  };
  for (const v of lig2) {
    const k = v.tabela + '.' + v.coluna;
    if (v.tabela.indexOf('auth.') === 0) continue;
    const rs = backup2.linhas_por_vinculo[k];
    if (!Array.isArray(rs)) { m2.vinculo_sem_backup.push(k); continue; }
    if (v.esperado !== rs.length) m2.vinculo_com_contagem_diferente.push(k + ' esperado=' + v.esperado + ' obtido=' + rs.length);
  }
  if (!Array.isArray(backup2.bloqueantes)) m2.vinculo_sem_backup.push(TABELA_GRANTS2 + '.bloqueantes');
  else if (chaves2.length !== backup2.bloqueantes.length) m2.vinculo_com_contagem_diferente.push(TABELA_GRANTS2 + ' esperado=' + chaves2.length + ' obtido=' + backup2.bloqueantes.length);
  const gerado2 = corpoDaReversao(lig2, backup2, pkDe2, TABELA_GRANTS2, backup2.em, new Date().toISOString(), DIR2 + '/' + basename(CAMINHO_BACKUP_VELHO));
  writeFileSync(saida2, gerado2.linhas.join('\n') + '\n');
  const prova2 = confereFicheiroDeReversao(saida2, lig2, backup2, pkDe2, backup2.bloqueantes || [], TABELA_GRANTS2, Array.from(new Set(lig2.map((v) => v.tabela))).filter((t) => t.indexOf('auth.') !== 0));
  m2.reversao = Object.assign(prova2.medida, { linhas_alcancadas_por_apagar_e_anular: gerado2.ambas.length }, medidaDaCitacao(saida2, CAMINHO_BACKUP_VELHO));
  m2.tabelas_sem_reversao = prova2.tabelas_sem_reversao;
  const veredictos2 = julga(m2);
  const ruins2 = veredictos2.filter((p) => p.veredicto === 'VERMELHO');
  const vivoSql2 = await sql("select count(*)::int as total, count(*) filter (where email ~ '\\.test$')::int as teste from auth.users");
  const reg2 = {
    peca: 'scripts/p202-fase15-remocao-das-contas-de-teste.mjs', emissor: EMISSOR, em: new Date().toISOString(),
    modo: 'so-reversao', escreveu_no_banco: false,
    entrada: { censo: String(val('--censo') || '').replace(/\\/g, '/'), backup: CAMINHO_BACKUP_VELHO.replace(/\\/g, '/'), backup_bytes: bruto2.length, backup_md5: md5Disco2, backup_md5_do_objeto: md5Objeto2 },
    saida: { reversao: saida2, reversao_bytes: statSync(saida2).size },
    chaves_primarias_medidas: pkDe2,
    estado_vivo_fora_do_modo: { contas_no_banco: vivoSql2[0].total, contas_de_teste: vivoSql2[0].teste, porque: 'os portoes de estado comparam o banco com o censo do dia da captura; as contas ja foram apagadas nesta serie, por isso a familia estado sai FORA_DO_MODO e nao como OK emprestado' },
    medida: m2.reversao, esperanca: prova2.esperanca, tabelas_sem_reversao: m2.tabelas_sem_reversao,
    vinculo_sem_backup: m2.vinculo_sem_backup, vinculo_com_contagem_diferente: m2.vinculo_com_contagem_diferente,
    portoes: veredictos2,
    falhas: ruins2.map((p) => p.nome + ' ' + String(p.obt || '')),
    o_que_prova: 'que o ficheiro de reversao agora escrito tem uma frase por (tabela, chave primaria) para as linhas que sumiram, que as linhas de vinculo set null sao repostas por UPDATE com o valor original lido do backup, e que o backup do dia continua a cobrir cada vinculo com a contagem do censo. Lido do disco, nao do laco. A outra face: o caminho do backup citado no cabecalho do .sql e lido do TEXTO escrito, resolvido em disco, e confrontado com o ficheiro que esta corrida efetivamente leu - tres portoes, um por eixo.',
    o_que_NAO_prova: 'que a reposicao funcione contra um banco de verdade - isto e texto gerado e relido, nao um replay executado; que as contas de auth.users voltem (a palavra-passe nunca esteve no backup, e profiles.id tem FK em cascade para auth.users, logo as contas recriam-se pela API ANTES do primeiro insert do ficheiro); que o produto funcione depois de repôr.',
  };
  writeFileSync(OUT2, JSON.stringify(reg2, null, 2) + '\n');
  console.log('P202_SO_REVERSAO ' + (ruins2.length ? 'VERMELHO' : 'OK') + ' portoes=' + veredictos2.filter((p) => p.veredicto !== 'FORA_DO_MODO').length + ' fora_do_modo=' + veredictos2.filter((p) => p.veredicto === 'FORA_DO_MODO').length);
  console.log('REVERSAO inserts=' + m2.reversao.insercoes + '/' + m2.reversao.insercoes_esperadas + ' updates=' + m2.reversao.updates + '/' + m2.reversao.updates_esperados + ' duplicadas=' + m2.reversao.chaves_repetidas.length + ' set_null_sem_update=' + m2.reversao.set_null_sem_update.length + ' insert_onde_sobrevive=' + m2.reversao.insert_em_linha_que_sobrevive.length + ' tabelas_sem_reversao=' + m2.tabelas_sem_reversao.length);
  console.log('CITACAO resolves=' + (m2.reversao.citada_nao_resolve.length === 0) + ' e_a_lida=' + m2.reversao.citada_e_o_backup_medido + ' em=' + JSON.stringify(m2.reversao.caminho_citado));
  console.log('FICHEIRO ' + saida2);
  if (ruins2.length) { console.log('FALHAS ' + JSON.stringify(reg2.falhas)); process.exit(1); }
  process.exit(0);
}

// ---------------- corrida viva ----------------
const CAMINHO_CENSO = val('--censo');
const CAMINHO_BACKUP = val('--backup');
const APLICA = tem('--aplica');
const OK = val('--ok');
const censo = listaCenso(CAMINHO_CENSO);
if (!APLICA || OK !== FRASE_DO_DONO) {
  if (APLICA) { console.log('ABORTA: o modo --aplica exige --ok com exatamente a frase do dono, veio ' + JSON.stringify(OK) + ' (sem --ok valido)'); process.exit(1); }
}
const BACKUP_DIR = String(CAMINHO_BACKUP || '').replace(/\\/g, '/');
if (!BACKUP_DIR) { console.log('ABORTA: falta --backup <pasta-fora-do-repo> - conteudo de linha de utilizador nunca entra no git (sem --backup)'); process.exit(1); }
if (BACKUP_DIR.startsWith(REPO.replace(/\\/g, '/'))) { console.log('ABORTA: o backup esta dentro do repo: ' + BACKUP_DIR + ' (fora do repo)'); process.exit(1); }
if (existsSync(OUT)) { console.log('ABORTA: ' + OUT + ' ja existe - re-corra com P202_SUF=novo, nao por cima'); process.exit(1); }

mkdirSync(BACKUP_DIR, { recursive: true });
const marca = SUF.replace(/^-/, '');
const caminhoBackup = join(BACKUP_DIR, 'fase15-backup-' + marca + '.json');
const caminhoReversao = join(BACKUP_DIR, 'fase15-reversao-' + marca + '.sql');
const agulhaNoProdutor = readFileSync(join(REPO, PRODUTOR_CLASSE), 'utf8').includes(AGULHA);
const lig = ligaCenso(censo);
const ordem = censo.ordem_de_remocao.linhas_bloqueantes;
const tabelaBloq = Object.keys(censo.chaves_primarias_das_tabelas_bloqueantes || {});
if (tabelaBloq.length !== 1) throw new Error('ABORTA: esta peca trata uma tabela bloqueante de cada vez, veio ' + JSON.stringify(tabelaBloq));
const TABELA_GRANTS = tabelaBloq[0];
const PK_GRANTS = (censo.chaves_primarias_das_tabelas_bloqueantes[TABELA_GRANTS] || [])[0];
if (!PK_GRANTS) throw new Error('ABORTA: a chave primaria de ' + TABELA_GRANTS + ' nao veio no censo');

const m = {
  aplica: APLICA,
  censo, agulha_no_produtor: agulhaNoProdutor,
  vivo: {}, alvos_lidos: 0, fora_da_classe: [], perfis_dos_alvos: 0,
  bloqueantes_vivas: 0, bloqueantes_sem_chave: [], bloqueantes_apontando_para_real: [],
  backup: {}, reversao: {}, vinculo_sem_backup: [], vinculo_com_contagem_diferente: [], tabelas_sem_reversao: [], pos: {},
};

// rotas de contagem: SQL e Admin API, lidas as duas
const vivoSql = await sql("select count(*)::int as total, count(*) filter (where email ~ '\\.test$')::int as teste, count(*) filter (where email !~ '\\.test$')::int as real from auth.users");
const listaAdmin = await admin('/auth/v1/admin/users?page=1&per_page=1000');
if (listaAdmin.status !== 200) throw new Error('ABORTA: a rota de listagem do Admin API deu HTTP ' + listaAdmin.status);
const usersAdmin = (listaAdmin.j && listaAdmin.j.users) || [];
const emailsAdmin = usersAdmin.map((u) => String(u.email || '').toLowerCase());
m.vivo = { total: vivoSql[0].total, teste: vivoSql[0].teste, real: vivoSql[0].real, teste_por_admin: emailsAdmin.filter((e) => classeDeTeste(e)).length };
const alvos = usersAdmin.filter((u) => classeDeTeste(u.email));
m.alvos_lidos = alvos.length;
m.fora_da_classe = alvos.map((u) => String(u.email)).filter((e) => !classeDeTeste(e));
const idsAlvo = alvos.map((u) => u.id);
const arrayIds = 'array[' + idsAlvo.map((i) => "'" + i + "'::uuid").join(',') + ']';
const perfis = await sql('select count(*)::int as n from profiles where id = any(' + arrayIds + ')');
m.perfis_dos_alvos = perfis[0].n;

// as linhas bloqueantes, conferidas chave a chave contra o banco vivo
const chaves = ordem.map((o) => o.registo);
const vivasBloq = await sql('select ' + PK_GRANTS + '::text as chave, granted_by::text as granted_by, profile_id::text as profile_id from ' + TABELA_GRANTS + ' where ' + PK_GRANTS + '::text = any(array[' + chaves.map((c) => "'" + c + "'").join(',') + '])');
const conjuntoAlvo = new Set(idsAlvo);
m.bloqueantes_vivas = vivasBloq.length;
m.bloqueantes_sem_chave = chaves.filter((c) => !vivasBloq.some((r) => r.chave === c));
m.bloqueantes_apontando_para_real = vivasBloq.filter((r) => (r.granted_by && !conjuntoAlvo.has(r.granted_by)) || (r.profile_id && !conjuntoAlvo.has(r.profile_id))).map((r) => r.chave);

// ---------------- backup: tudo o que vai sumir, primeiro para o ficheiro ----------------
const backup = { peca: 'scripts/p202-fase15-remocao-das-contas-de-teste.mjs', emissor_md5: EMISSOR.md5, em: new Date().toISOString(), modo: APLICA ? 'aplicacao' : 'simulacro', censo: CAMINHO_CENSO.replace(/\\/g, '/'), autorizacao_declara_no_censo: censo.autorizacao, notas: {}, contas: [], auth_relacoes_contas: {}, linhas_por_vinculo: {}, bloqueantes: [] };
for (const u of alvos) backup.contas.push({ id: u.id, email: u.email, role: u.role, criado_em: u.created_at, ultimo_acesso: u.last_sign_in_at, confirmado_em: u.email_confirmed_at, app_metadata: u.app_metadata, user_metadata: u.user_metadata });
backup.notas.recriacao = 'recriar pelo Admin API POST /auth/v1/admin/users com {email, app_metadata, user_metadata, email_confirm:true}; a palavra-passe nao esta aqui e nunca estara - uma conta recriada e uma conta nova com o mesmo e-mail';
backup.notas.esquema_auth = 'as relacoes de auth.users (identities, sessions, refresh tokens, mfa) nao sao copiadas por conteudo: refresh token e material de credencial e nao vai para disco, e o Admin API recria identity e session quando a conta e recriada. Fica a contagem medida.';
const authTab = [['auth.identities', 'user_id'], ['auth.sessions', 'user_id'], ['auth.refresh_tokens', 'session_id'], ['auth.mfa_factors', 'user_id']];
for (const [t, col] of authTab) {
  const onde = t === 'auth.refresh_tokens'
    ? 'where session_id in (select id from auth.sessions where user_id = any(' + arrayIds + '))'
    : 'where ' + col + ' = any(' + arrayIds + ')';
  try { const rs = await sql('select count(*)::int as n from ' + t + ' ' + onde); backup.auth_relacoes_contas[t] = rs[0].n; }
  catch (e) { backup.auth_relacoes_contas[t] = { ignorado: e.message.slice(0, 90) }; }
}
const contagemBackup = {};
for (const v of lig) {
  const k = v.tabela + '.' + v.coluna;
  const doAuth = v.tabela.indexOf('auth.') === 0;
  try {
    if (doAuth) {
      const rs = await sql('select count(*)::int as n from ' + v.tabela + ' where ' + v.coluna + '::uuid = any(' + arrayIds + ')');
      contagemBackup[k] = rs[0].n;
    } else {
      const rs = await sql('select * from ' + v.tabela + ' where ' + v.coluna + '::uuid = any(' + arrayIds + ')');
      backup.linhas_por_vinculo[k] = rs; contagemBackup[k] = rs.length;
    }
  } catch (e) {
    backup.linhas_por_vinculo[k] = { falha: e.message.slice(0, 90) };
    m.vinculo_sem_backup.push(k);
  }
}
backup.bloqueantes = await sql('select * from ' + TABELA_GRANTS + ' where ' + PK_GRANTS + '::text = any(array[' + chaves.map((c) => "'" + c + "'").join(',') + '])');
for (const [k, n] of Object.entries(contagemBackup)) {
  const esperado = lig.find((v) => v.tabela + '.' + v.coluna === k);
  if (esperado && esperado.esperado !== n) m.vinculo_com_contagem_diferente.push(k + ' esperado=' + esperado.esperado + ' obtido=' + n);
}
if (backup.bloqueantes.length !== chaves.length) m.vinculo_com_contagem_diferente.push(TABELA_GRANTS + ' esperado=' + chaves.length + ' obtido=' + backup.bloqueantes.length);

const pkDeCenso = (censo.chaves_primarias_das_tabelas_bloqueantes || {})[TABELA_GRANTS];
const pkDe = await chavesPrimarias(Array.from(new Set(lig.filter((v) => v.tabela.indexOf('auth.') !== 0).map((v) => v.tabela).concat([TABELA_GRANTS]))));
if (String(pkDe[TABELA_GRANTS]) !== String(pkDeCenso)) throw new Error('ABORTA: a chave primaria medida de ' + TABELA_GRANTS + ' e ' + JSON.stringify(pkDe[TABELA_GRANTS]) + ' e o censo declara ' + JSON.stringify(pkDeCenso) + ' - duas fontes, duas respostas, nenhuma das duas e a medida');
const gerado = corpoDaReversao(lig, backup, pkDe, TABELA_GRANTS, backup.em, new Date().toISOString(), caminhoBackup.replace(/\\/g, '/'));
const RV = gerado.linhas;
const tabelasPublicasEmCausa = Array.from(new Set(lig.map((v) => v.tabela))).filter((t) => t.indexOf('auth.') !== 0);
const corpoBackup = JSON.stringify(backup, null, 2) + '\n';
const md5Backup = createHash('md5').update(corpoBackup).digest('hex');
writeFileSync(caminhoBackup, corpoBackup);
writeFileSync(caminhoReversao, RV.join('\n') + '\n');
const stB = statSync(caminhoBackup), stR = statSync(caminhoReversao);
// ida e volta: o md5 do que escrevi contra o md5 do que o disco devolve - comparar um buffer consigo mesmo nao e medida
m.backup = { fora_do_repo: true, bytes: stB.size, bytes_no_objeto: Buffer.byteLength(corpoBackup, 'utf8'), md5: md5Backup, md5_confere: createHash('md5').update(readFileSync(caminhoBackup)).digest('hex') === md5Backup };
const prova = confereFicheiroDeReversao(caminhoReversao, lig, backup, pkDe, backup.bloqueantes, TABELA_GRANTS, tabelasPublicasEmCausa);
m.reversao = Object.assign(prova.medida, { bytes: stR.size, linhas_alcancadas_por_apagar_e_anular: gerado.ambas.length }, medidaDaCitacao(caminhoReversao, caminhoBackup));
m.tabelas_sem_reversao = prova.tabelas_sem_reversao;

// ---------------- portoes de pre-voo ----------------
const antes = julga(m);
const ruinsAntes = antes.filter((p) => p.veredicto !== 'OK' && p.nome.indexOf('pos_apagar_') !== 0);
const reg = {
  peca: 'scripts/p202-fase15-remocao-das-contas-de-teste.mjs', emissor: EMISSOR, em: new Date().toISOString(),
  modo: APLICA ? 'aplicacao' : 'simulacro', ok_literal_usado: APLICA ? OK : null, frase_do_dono: FRASE_DO_DONO,
  censo: { caminho: CAMINHO_CENSO.replace(/\\/g, '/'), em: censo.em, emissor_md5: censo.emissor_md5, estado: censo.estado, autorizacao: censo.autorizacao },
  classe: { lida_em: PRODUTOR_CLASSE, agulha: AGULHA, no_produtor: agulhaNoProdutor },
  universo_vivo: m.vivo, alvos: idsAlvo.length, emails_alvo: alvos.map((u) => String(u.email).toLowerCase()),
  reais_antes: usersAdmin.filter((u) => !classeDeTeste(u.email)).map((u) => String(u.email).toLowerCase()),
  ordem: { linhas: chaves.length, tabela: TABELA_GRANTS, pk: PK_GRANTS, chaves },
  backup: { caminho: caminhoBackup.replace(/\\/g, '/'), bytes: m.backup.bytes, bytes_no_objeto: m.backup.bytes_no_objeto, md5: m.backup.md5, md5_confere: m.backup.md5_confere, reversao: caminhoReversao.replace(/\\/g, '/'), reversao_bytes: m.reversao.bytes, contas: backup.contas.length, auth_contas: backup.auth_relacoes_contas, linhas_por_vinculo: contagemBackup, bloqueantes: backup.bloqueantes.length },
  // um portao vermelho e julgado por eixo, e todos os escalares que os eixos leem estao aqui: sem isto o veredicto
  // vermelho nao diria qual das duas grandezas se moveu, que e o defeito da cifra sem régua
  eixo_medido: {
    autorizacao_censo: censo.autorizacao, estado_censo: censo.estado, agulha_no_produtor: agulhaNoProdutor,
    origem_dos_predicados: censo.origem_dos_predicados,
    vivo: m.vivo, alvos_lidos: m.alvos_lidos, fora_da_classe: m.fora_da_classe, perfis_dos_alvos: m.perfis_dos_alvos,
    bloqueantes_vivas: m.bloqueantes_vivas, bloqueantes_sem_chave: m.bloqueantes_sem_chave, bloqueantes_apontando_para_real: m.bloqueantes_apontando_para_real,
    ordem_exigem_escrita_manual: censo.ordem_de_remocao.degraus_que_exigem_escrita_manual, ordem_resolvidos_pela_ordem: censo.ordem_de_remocao.degraus_resolvidos_pela_ordem,
    ponte: censo.ponte_profiles_auth_users, vinculo_sem_backup: m.vinculo_sem_backup,
    vinculo_com_contagem_diferente: m.vinculo_com_contagem_diferente, tabelas_sem_reversao: m.tabelas_sem_reversao,
  },
  portoes_antes: antes,
};

// o vermelho de pre-voo aborta nas duas modos: um simulacro que so imprime verde sem sair com codigo de falha
// seria o verde vazio da corrida sm66, e aqui o que esta em jogo e um DELETE irreversivel
if (ruinsAntes.length) {
  reg.veredicto = APLICA ? 'P202_FASE15_ABORTADA_ANTES_DE_TOCAR' : 'P202_FASE15_SIMULACAO_PREVOO_VERMELHO';
  reg.escreveu_no_banco = false;
  reg.falhas = ruinsAntes.map((p) => p.nome + (p.obt ? ' ' + p.obt : ''));
  writeFileSync(OUT, JSON.stringify(reg, null, 2) + '\n');
  console.log(reg.veredicto + ' falhas=' + JSON.stringify(reg.falhas));
  console.log('FICHEIRO ' + OUT);
  process.exit(1);
}

// ---------------- execucao, so com pre-voo verde e a frase do dono ----------------
if (APLICA) {
  const inChaves = chaves.map((c) => "'" + c + "'").join(',');
  const d0 = await sql('delete from ' + TABELA_GRANTS + ' where ' + PK_GRANTS + '::text = any(array[' + inChaves + ']) returning ' + PK_GRANTS);
  reg.deletes = { [TABELA_GRANTS]: d0.length };
  const porConta = [];
  for (const u of alvos) {
    const r = await admin('/auth/v1/admin/users/' + u.id, { method: 'DELETE' });
    porConta.push({ id: u.id, email: String(u.email).toLowerCase(), status: r.status });
  }
  reg.deletes.por_conta = porConta;
  reg.deletes.contas_pedidas = porConta.length;
  reg.deletes.contas_com_sucesso = porConta.filter((p) => p.status === 200).length;
}

// ---------------- pos-medicao, sempre lida do banco ----------------
const depoisSql = await sql("select count(*)::int as total, count(*) filter (where email ~ '\\.test$')::int as teste, count(*) filter (where email !~ '\\.test$')::int as real from auth.users");
const depoisAdmin = await admin('/auth/v1/admin/users?page=1&per_page=1000');
const emailsDepois = ((depoisAdmin.j && depoisAdmin.j.users) || []).map((u) => String(u.email || '').toLowerCase());
const restamBloq = await sql('select count(*)::int as n from ' + TABELA_GRANTS + ' where ' + PK_GRANTS + '::text = any(array[' + chaves.map((c) => "'" + c + "'").join(',') + '])');
const restantes = [];
for (const v of lig) {
  try { const r = await sql('select count(*)::int as n from ' + v.tabela + ' where ' + v.coluna + '::uuid = any(' + arrayIds + ')'); if (r[0].n > 0) restantes.push(v.tabela + '.' + v.coluna + '=' + r[0].n); }
  catch (e) { restantes.push(v.tabela + '.' + v.coluna + ': ' + e.message.slice(0, 60)); }
}
const reaisA = reg.reais_antes.slice().sort(), reaisD = emailsDepois.filter((e) => !classeDeTeste(e)).sort();
m.pos = {
  vivo_teste: depoisSql[0].teste, admin_teste: emailsDepois.filter((e) => classeDeTeste(e)).length,
  bloqueantes_restam: restamBloq[0].n, restantes_por_vinculo: restantes,
  real_antes: reaisA.length, real_depois: reaisD.length,
  reais_que_faltam: reaisA.filter((e) => !reaisD.includes(e)), reais_novas: reaisD.filter((e) => !reaisA.includes(e)),
};
reg.pos_medido = { total_depois: depoisSql[0].total, ...m.pos };
const depois = julga(m);
reg.portoes_depois = depois.filter((p) => p.nome.indexOf('pos_apagar_') === 0);
const ruinsDepois = reg.portoes_depois.filter((p) => p.veredicto === 'VERMELHO');
const ruinsTotais = ruinsAntes.map((p) => p.nome).concat(ruinsDepois.map((p) => p.nome));
reg.veredicto = APLICA ? (ruinsTotais.length ? 'P202_FASE15_VERMELHO' : 'P202_FASE15_VERDE') : (ruinsTotais.length ? 'P202_FASE15_SIMULACAO_PREVOO_VERMELHO' : 'P202_FASE15_SIMULACAO_PREVOO_VERDE');
reg.escreveu_no_banco = !!APLICA;
reg.falhas = ruinsTotais.concat(ruinsAntes.map((p) => p.obt || '').filter(Boolean));
reg.o_que_prova = [
  'que o conjunto apagado (ou simulado) foi medido no banco pela classe de e-mail lida do produtor: ' + idsAlvo.length + ' alvos, com as duas rotas (sql e admin) a baterem',
  'que as ' + chaves.length + ' linhas bloqueantes existiam com exatamente as chaves primarias do censo e apontavam todas para alvos da classe',
  'que ha um backup fora do repo com ' + m.backup.bytes + ' B (md5 ' + reg.backup.md5.slice(0, 8) + ') e reversao de ' + m.reversao.bytes + ' B cobrindo ' + tabelasPublicasEmCausa.length + ' tabelas',
  'que a reversao tem UMA frase por par (tabela, chave primaria) medida no texto escrito: ' + m.reversao.insercoes + '/' + m.reversao.insercoes_esperadas + ' inserts e ' + m.reversao.updates + '/' + m.reversao.updates_esperados + ' updates, com ' + m.reversao.chaves_repetidas.length + ' chaves repetidas e ' + m.reversao.insert_em_linha_que_sobrevive.length + ' inserts onde a linha sobreviveu',
  'que o cabecalho do .sql cita o backup que esta corrida escreveu, lido do proprio texto e resolvido em disco: ' + m.reversao.caminho_citado,
];
reg.o_que_NAO_prova = [
  'que apagar fosse o desejavel: a classe e medida, a decisao de exclusao e do dono',
  'que a reversao reponha as contas byte a byte - a palavra-passe nunca e gravada por esta peca',
  'que o .sql se basta: profiles.id tem FK em cascade para auth.users (medida no censo), logo as contas recriam-se primeiro pela API e so depois corre o ficheiro',
  'que a reversao funcione contra um banco de verdade - e texto gerado e relido, nunca um replay executado',
  'o efeito de triggers sobre auth.users: le pg_constraint no censo, nao pg_trigger',
  'que o produto funcione depois do apagar: isso e a corrida de verificacao seguinte, nao esta',
];
writeFileSync(OUT, JSON.stringify(reg, null, 2) + '\n');
console.log('MODO ' + reg.modo + ' · portoes_antes=' + antes.filter((p) => p.nome.indexOf('pos_apagar_') !== 0).length + ' · ruina_antes=' + ruinsAntes.length);
console.log('portoes_depois=' + reg.portoes_depois.length + ' · ruina_depois=' + ruinsDepois.length + ' · escreveu_no_banco=' + reg.escreveu_no_banco);
console.log('alvos=' + idsAlvo.length + ' · reais=' + m.pos.real_depois + ' · bloqueantes_restam=' + m.pos.bloqueantes_restam + ' · restantes_por_vinculo=' + JSON.stringify(m.pos.restantes_por_vinculo));
console.log('VEREDICTO ' + reg.veredicto + ' · FICHEIRO ' + OUT);
process.exit(ruinsTotais.length ? 1 : 0);
