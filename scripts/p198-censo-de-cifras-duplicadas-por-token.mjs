// Censo das cifras duplicadas duma captura, agrupadas pelo TOKEN declarante da linha onde cada valor aparece.
// Existe porque o p191 disse FORA_DO_DOMINIO a sete corridas dos meus proprios produtores sem me dizer o que as
// fazia ficar fora: o dominio do p168 e uma linha alvo=, e dentro dela qualquer nome com dois valores e vermelho.
// Para tirar um produtor do dominio sem afrouxar a regua, a decisao e por linha: um token que se repete por construcao
// (cada fila e uma medida sua) declara-se como tabela; um nome que colide em linhas de medida e um defeito. Este
// censo separa as duas coisas e imprime os tokens envolvidos, por isso a escolha passa a ser medida e nao palpite.
// As sete regex da regua (chave de cifra, token de fila, declaracao de tabela, chave primeira, exclusao de portao,
// abertura e fecho de regiao) sao LIDAS do fonte do p168 e a peca aborta se nao as ler — re-dactilografar a janela
// do produtor e uma quarta instancia de mencion de origem nao ser origem.
// Uso: node scripts/p198-censo-de-cifras-duplicadas-por-token.mjs <captura1> [<captura2> ...]
// Captura do censo so com o ambiente P198_OUT; existe e aborta, porque sobrescrever a volta anterior apaga a medida.
import { readFileSync, writeFileSync, existsSync, statSync, mkdtempSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const EU = readFileSync(fileURLToPath(import.meta.url), 'utf8');
const P168_CAMINHO = join(REPO, 'scripts', 'p168-prova-de-edicao-sem-corte.mjs');
const P168 = readFileSync(P168_CAMINHO, 'utf8');
const SUFIXO = process.env.P198_SUF || '';
const OUT = process.env.P198_OUT || '';
const alvoDoAmbiente = [];
if (OUT) {
  if (!SUFIXO) throw new Error('ABORTA: P198_OUT pede P198_SUF para o nome dizer a corrida');
  if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' ja existe com ' + statSync(OUT).size + ' bytes — correr com outro nome, a volta anterior e medida');
}

const capturas = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (capturas.length === 0) throw new Error('ABORTA: zero capturas como argumentos — um tally de nada nao e medida');
for (const c of capturas) {
  if (!existsSync(c)) throw new Error('ABORTA: a captura nao existe em disco — ' + c);
  if (statSync(c).isDirectory()) throw new Error('ABORTA: ' + c + ' e um diretorio, esta peca quer ficheiros nomeados');
}

function leRegexDoProdutor(descricao, extratora) {
  const m = extratora.exec(P168);
  if (!m || !m[1]) throw new Error('ABORTA: nao li ' + descricao + ' do fonte do p168 — o censo nao pode re-dactilografar a janela do produtor');
  return m[1];
}
// O texto extraido do fonte e o corpo dum literal de string: onde o produtor escreve barra-barra-d, o RegExp dele
// recebe barra-d. Copiar o texto cru faria da regex uma regex de letras, que nao ve cifra nenhuma e da verde a tudo
// — o verde vazio. O des-escapamento e portanto medido: a pattern lida tem de casar um numero e nao casar a letra d
// precedida de barra, e isso e o portao C9, nao uma suposicao.
function desescapa(padrDoFonte) {
  return padrDoFonte.split('\\\\').join('\\');
}
const FTE_CHAVE = desescapa(leRegexDoProdutor('a regex da chave de cifra', /function duoDeCifras\(L\) \{\s*const vistas[\s\S]{0,400}?new RegExp\('([^']+)', 'g'\)/));
const FTE_TOKEN = leRegexDoProdutor('o token declarante da fila', /const token = \(l\.match\(\/(\^[^/]+)\/\)/);
const FTE_DECL = leRegexDoProdutor('a declaracao de tabelas', /\/(\^TABELAS_DECLARADAS [^/]+)\/\.exec/);
const FTE_ABRE = leRegexDoProdutor('a abertura da regiao de medida', /const i = L\.findIndex\(\(l\) => \/(\^[^/]+)\/\.test\(l\)\)/);
const FTE_FECHA = leRegexDoProdutor('o fecho da regiao de medida', /if \(\/(\^[^/]+)\/\.test\(L\[k\]\)/);
const FTE_PRIMEIRA = leRegexDoProdutor('a chave primeira da fila', /const primeira = \(l\.match\(\/([^/]+)\/\)/);
const FTE_PORTAO = leRegexDoProdutor('a exclusao das linhas de portao', /if \(\/(\^portao)\/\.test\(primeira\)\)/);
const FECHA_TRES_DIGITOS = FTE_FECHA.indexOf('^P') === 0 && FTE_FECHA.indexOf('\\d{3}') >= 0 ? true : (() => { throw new Error('ABORTA: o fecho lido nao e da familia P-tres-digitos, deu ' + FTE_FECHA); })();

const saidaCapt = [];
const say = (s) => { saidaCapt.push(s); console.log(s); };

function occurrences(L) {
  const abre = new RegExp(FTE_ABRE);
  const fecha = new RegExp(FTE_FECHA);
  const reToken = new RegExp(FTE_TOKEN);
  const reDecl = new RegExp(FTE_DECL);
  const reChave = new RegExp(FTE_CHAVE, 'g');
  const i = L.findIndex((l) => abre.test(l));
  if (i < 0) return { i, corpo: [], linhasForaDaRegiao: L.length };
  let j = -1;
  for (let k = i; k < L.length; k++) if (fecha.test(L[k])) { j = k; break; }
  const ate = j < 0 ? L.length : j + 1;
  const declaradas = new Set();
  for (const l of L.slice(i, ate)) {
    const m = reDecl.exec(l);
    if (m) for (const t of m[1].trim().split(/\s+/)) if (t) declaradas.add(t);
  }
  const usos = {};
  const occ = [];
  const rePrimeira = new RegExp(FTE_PRIMEIRA);
  const rePortao = new RegExp(FTE_PORTAO);
  let porPortao = 0;
  for (let r = i; r < ate; r++) {
    const texto = L[r];
    const primeira = (rePrimeira.exec(texto) || [null, ''])[1];
    if (rePortao.test(primeira)) { porPortao++; continue; }
    const token = (reToken.exec(texto) || [null, ''])[1];
    if (token && declaradas.has(token)) usos[token] = (usos[token] || 0) + 1;
    reChave.lastIndex = 0;
    let m;
    while ((m = reChave.exec(texto)) !== null) {
      occ.push({ chave: m[1], valor: m[2], linha: r + 1, coluna: m.index + 1, token, declarada: !!(token && declaradas.has(token)) });
    }
  }
  return { i, corpo: L.slice(i, ate), fecha_em: j < 0 ? 'fim_do_ficheiro' : (L[j].split(' ')[0] || ''), declaradas: Array.from(declaradas).sort(), usos, occ, porPortao };
}

function duplicadosDe(r) {
  const porChave = new Map();
  for (const o of r.occ) {
    if (!porChave.has(o.chave)) porChave.set(o.chave, []);
    porChave.get(o.chave).push(o);
  }
  const dup = [];
  for (const [chave, os] of Array.from(porChave.entries()).sort()) {
    const valores = new Set(os.map((o) => o.valor));
    if (valores.size > 1) dup.push({ chave, os, valores: Array.from(valores) });
  }
  return dup;
}
function classeDe(r) {
  if (r.i < 0) return 'sem_regiao';
  if (r.occ.length === 0) return 'regiao_sem_cifra_lida';
  const dup = duplicadosDe(r);
  if (dup.length === 0) return 'sem_duplicados';
  const emMedida = dup.filter((d) => d.os.some((o) => !o.declarada));
  return emMedida.length > 0 ? 'duplicados_em_linhas_de_medida' : 'duplicados_so_em_tabelas_declaradas';
}
// Cinco classes porque a quarta so existe para no me deixar voltar a dar verde a um conjunto varrido por uma regex
// cega: uma captura com regiao e zero ocorrencias lidas e ou um ficheiro sem cifras ou um defeito meu, e as duas
// caras se imprimem, nunca se fundem na classe dos limpos.
const CLASSES = ['sem_regiao', 'regiao_sem_cifra_lida', 'sem_duplicados', 'duplicados_so_em_tabelas_declaradas', 'duplicados_em_linhas_de_medida'];
const JULGADAS = ['duplicados_em_linhas_de_medida'];

// Fixtures compostos em tempo de execucao e FORA do repo: as cinco classes tenem de aparecer por construcao, senao
// o tally dum conjunto real pode ser um verde de regex cega. Cada fixture e escrito, lido, e a classe esperada
// confrontada; o par em_tabela / em_medida e o que prova que a regua distingue as duas caras — um duplicado so em
// filas de caso declaradas e legitimo, um duplicado entre linhas de medida e o defeito — e o fixture em_medida so
// passa se a chave lida do produtor casar digitos, porque com o padrao cru de barra-barra-d nada casa e tudo fica
// na classe cega.
const tmp = mkdtempSync(join(tmpdir(), 'p198-fix-'));
const FIX = [
  { nome: 'sem_regiao', espera: 'sem_regiao', texto: 'PROVA_FIXTURE casos=2\numa tabela sem linha de medida\nP198_FIM\n' },
  { nome: 'regiao_sem_cifra', espera: 'regiao_sem_cifra_lida', texto: 'alvo=scripts/x.mjs\nnenhuma cifra nesta regiao\nP198_FIM\n' },
  { nome: 'sem_duplicados', espera: 'sem_duplicados', texto: 'alvo=scripts/x.mjs\nvarridas=10 occ=3\nP198_FIM\n' },
  { nome: 'em_tabela', espera: 'duplicados_so_em_tabelas_declaradas', texto: 'alvo=scripts/x.mjs\nTABELAS_DECLARADAS [CASO]\nvarridas=10 occ=3\nCASO a ocorrencias=4\nCASO b ocorrencias=9\nP198_FIM\n' },
  { nome: 'em_medida', espera: 'duplicados_em_linhas_de_medida', texto: 'alvo=scripts/x.mjs\nvarridas=10 occ=3\nPORTAO varridas=12\nP198_FIM\n' },
];
let faltasFix = 0;
const obtidoFix = [];
for (const f of FIX) {
  const caminho = join(tmp, 'fixture-' + f.nome + '.txt');
  writeFileSync(caminho, f.texto);
  const r = occurrences(readFileSync(caminho, 'utf8').split('\n'));
  const classe = classeDe(r);
  const bate = classe === f.espera;
  if (!bate) faltasFix++;
  obtidoFix.push(f.nome + '=' + (bate ? classe : classe + '!esperava-' + f.espera));
}
say('PROVA_FIXURA_CENSO casos=' + FIX.length + ' faltas=' + faltasFix + ' obtido=' + JSON.stringify(obtidoFix));

const porClasse = {};
for (const c of CLASSES) porClasse[c] = [];
const membrosJulgados = {};
for (const c of JULGADAS) membrosJulgados[c] = [];
const tokensVistos = {};
const nomeDe = (c) => c.split(/[\\/]/).pop();
let occTotal = 0, chavesDistintas = 0, linhasPorPortao = 0;
for (const caminho of capturas) {
  const L = readFileSync(caminho, 'utf8').split('\n');
  const r = occurrences(L);
  const classe = classeDe(r);
  porClasse[classe].push(nomeDe(caminho));
  occTotal += r.i < 0 ? 0 : r.occ.length;
  linhasPorPortao += r.i < 0 ? 0 : r.porPortao;
  if (r.i >= 0) {
    const ch = new Set(r.occ.map((o) => o.chave));
    chavesDistintas += ch.size;
  }
  if (classe === 'duplicados_em_linhas_de_medida' || classe === 'duplicados_so_em_tabelas_declaradas') {
    for (const d of duplicadosDe(r)) {
      const nomesToken = Array.from(new Set(d.os.map((o) => o.token || '(sem token)'))).sort();
      for (const t of nomesToken) tokensVistos[t] = (tokensVistos[t] || 0) + 1;
      if (d.os.some((o) => !o.declarada)) {
        membrosJulgados.duplicados_em_linhas_de_medida.push({ caminho: nomeDe(caminho), chave: d.chave, os: d.os });
      }
    }
  }
}
say('regua_lida_de=' + relative(REPO, P168_CAMINHO).split('\\').join('/'));
say('producao_p168_bytes=' + Buffer.byteLength(P168, 'utf8') + ' producao_p168_md5=' + createHash('md5').update(P168).digest('hex'));
say('emissor_bytes=' + Buffer.byteLength(EU, 'utf8') + ' emissor_md5=' + createHash('md5').update(EU).digest('hex'));
say('fecho_lido=' + FTE_FECHA + ' tres_digitos=' + FECHA_TRES_DIGITOS + ' chave_lida=' + FTE_CHAVE + ' token_lido=' + FTE_TOKEN);
say('peca=' + relative(REPO, fileURLToPath(import.meta.url)).split(sep).join('/') + ' · quem emite esta saida, lido do proprio modulo e nao dactilografado');
say('alvo=' + relative(REPO, P168_CAMINHO).split(sep).join('/') + ' · o objecto medido e a regua do p168, porque este censo caracteriza o dominio dela; sem esta linha tambem esta peca ficava fora do que julga');
say('TABELAS_DECLARADAS [CLASSE MEMBRO JULGADA] · cada fila e uma medida sua, declaracao lida pela regua de cifras em duo do p168');
say('CONJUNTO capturas=' + capturas.length + ' ocorrencias_de_cifra_lidas=' + occTotal + ' chaves_distintas_por_ficheiro_somadas=' + chavesDistintas + ' linhas_de_portao_fora_da_varredura=' + linhasPorPortao);
for (const c of CLASSES) {
  say('CLASSE ' + c + ' total=' + porClasse[c].length + ' membros=' + JSON.stringify(porClasse[c]) + ' nada_houve_para_explicar=' + (porClasse[c].length === 0));
}
say('TOKENS_ENVOLVIDOS_NOS_DUPLICADOS ' + JSON.stringify(tokensVistos) + ' distintos=' + Object.keys(tokensVistos).length);
for (const c of JULGADAS) {
  const ms = membrosJulgados[c];
  say('JULGADA ' + c + ' total=' + ms.length + ' posicoes_impressas=' + ms.reduce((a, m) => a + m.os.length, 0));
  for (const m of ms) {
    for (const o of m.os) {
      say('MEMBRO ' + o.chave + '=' + o.valor + ' em=' + m.caminho + ' linha=' + o.linha + ' coluna=' + o.coluna + ' token=' + (o.token || '(sem token)') + ' declarada=' + o.declarada);
    }
  }
}
const somaClasses = CLASSES.reduce((a, c) => a + porClasse[c].length, 0);

const g = {};
const gate = (nome, ok, obtido) => { g[nome] = { ok, obtido }; };
gate('C1_as_cinco_classes_somam_o_conjunto', somaClasses === capturas.length, somaClasses + '/' + capturas.length);
gate('C2_todas_as_classes_se_imprimem_mesmo_vazias', CLASSES.every((c) => saidaCapt.some((l) => l.startsWith('CLASSE ' + c + ' '))), CLASSES.length);
gate('C3_fixture_das_cinco_classes_bate', faltasFix === 0, FIX.length + '/' + faltasFix);
// C4 e uma divisao, nao uma exigencia de que haja ofensores: o que tem de bater e o numero de posicoes que a classe
// julgada declara com o numero de linhas MEMBRO impressas. Dizer que a classe tem de ser nao-vazia seria o portao
// que proibe a cara legitima dum conjunto limpo.
gate('C4_posicoes_da_classe_julgada_batem_com_a_lista', membrosJulgados.duplicados_em_linhas_de_medida.reduce((a, m) => a + m.os.length, 0) === saidaCapt.filter((l) => l.startsWith('MEMBRO ')).length, saidaCapt.filter((l) => l.startsWith('MEMBRO ')).length);
gate('C5_quadro_das_linhas_declarado', saidaCapt.some((l) => l.startsWith('JULGADA ')) && saidaCapt.every((l) => !l.startsWith('MEMBRO ') || /linha=\d+ coluna=\d+/.test(l)), 'linha_e_do_ficheiro');
gate('C6_um_fixture_partido_aborta_a_feito', (() => { try { new RegExp(FTE_TOKEN); const r = occurrences(['alvo=x\nP198_FIM\n']); return typeof r.fecha_em === 'string'; } catch (e) { return false; } })(), 'ok');
gate('C7_as_regex_do_produtor_foram_lidas', [FTE_CHAVE, FTE_TOKEN, FTE_DECL, FTE_ABRE, FTE_FECHA, FTE_PRIMEIRA, FTE_PORTAO].every((s) => typeof s === 'string' && s.length > 0), 7);
// C9 e o portao contra o verde vazio que esta peca ia dar: a pattern lida do literal de string do produtor so vale
// depois de des-escapada, e prova-se que ve digitos e que nao ve a letra d precededa de barra. Sem este portao, uma
// regex cega classifica qualquer captura como limpa e o conjunto inteiro sorri.
gate('C9_a_chave_lida_casa_digitos_e_nao_casa_barra_letra_d', (() => {
  const re = new RegExp(FTE_CHAVE, 'g');
  re.lastIndex = 0;
  const veNumero = re.test('varridas=10 occ=3');
  re.lastIndex = 0;
  const naoVeBarraD = !re.test('varridas=\\dd');
  return veNumero && naoVeBarraD;
})(), FTE_CHAVE);
gate('C10_o_censo_le_algo_nas_capturas_com_regiao', (() => {
  const comRegiao = capturas.length - porClasse.sem_regiao.length;
  const cegas = porClasse.regiao_sem_cifra_lida.length;
  return comRegiao === 0 || cegas === 0 || cegas <= Math.floor(comRegiao / 2);
})(), (capturas.length - porClasse.sem_regiao.length) + ' com regiao, ' + porClasse.regiao_sem_cifra_lida.length + ' sem cifra lida');
// C11 da positivo a linha de declaracao desta propria peca: as suas filas CLASSE/MEMBRO/JULGADA repetem chaves com
// valores diferentes (total= e o caso obvio), logo sem a declaracao a minha saida seria duplicado em linhas de
// medida. Nao e contar as minhas corridas — e julgar a regua contra o artefacto que ela propria emite, e o vermelho
// existe: retire a linha TABELAS_DECLARADAS e esta classe passa a duplicados_em_linhas_de_medida.
const EU_SAIDA = classeDe(occurrences(saidaCapt));
gate('C11_a_minha_saida_nao_e_duplicado_em_medida', EU_SAIDA !== 'duplicados_em_linhas_de_medida' && EU_SAIDA !== 'sem_regiao', EU_SAIDA);
const vermelhos = Object.keys(g).filter((k) => !g[k].ok);
Object.keys(g).forEach((k) => say('portao_' + k + '=' + (g[k].ok ? 'OK' : 'VERMELHO') + ' obtido=' + JSON.stringify(g[k].obtido)));
const classeDoConjunto = porClasse.duplicados_em_linhas_de_medida.length > 0 ? 'P198_CENSO_ACHADO' : somaClasses === capturas.length ? 'P198_CENSO_VERDE' : 'P198_CENSO_INCOMPLETO';
say('P198_CENSO_DAS_DUPLICADAS ' + (Object.keys(g).length - vermelhos.length) + '/' + vermelhos.length + ' ' + SUFIXO + ' portoes=' + Object.keys(g).length + ' classes=' + CLASSES.length + ' capturas=' + capturas.length + ' julgadas=' + JSON.stringify(membrosJulgados.duplicados_em_linhas_de_medida.map((m) => m.chave)) + ' ' + classeDoConjunto);
if (OUT) writeFileSync(OUT, saidaCapt.join('\n') + '\n');
