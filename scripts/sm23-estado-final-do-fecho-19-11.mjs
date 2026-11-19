#!/usr/bin/env node
// SM.23 peca de fecho — O DIARIO DO QUE FICA PRONTO PARA O COMMIT (SO LEITURA, ZERO ESCRITA NO BANCO).
//
// Porque existe: o bloco §SM.23 afirma cifras, modos, pegadas e um registo de 39 linhas. Nenhuma dessas
// frases pode valer por eu a ter escrito: tem de bater contra o que esta no INDICE, porque e o indice que
// o commit vai gravar. O portao que decide o commit le `git show :caminho`, nao o disco, exatamente pela
// razao registada a 18/11: um `editar -> portao -> git add -> commit` deixa no verde uma versao que ja nao
// existe. Aqui a ordem e `git add -> este diario -> commit`, e tudo o que se mede vem do indice.
//
// O que cada porta procura (e todas podem divergir; uma porta sem poder de fogo e decoracao):
//  · os tres documentos estao stageados E a arvore de trabalho bate com o indice para eles;
//  · o recount do registro e feito pelo LEITOR DO PRODUTOR (`scripts/ah1-cuenta-pen.mjs`) sobre a copia do
//    indice, com a grelha de 7 celulas e o des-escape de pipes — nunca por soma minha;
//  · o painel HTML diz o mesmo numero que as linhas, e a soma das tres prioridades e o total;
//  · cada (caminho, bytes, md5) citado no §SM.23 e re-medido no blob do indice: a prosa que cita uma pega
//    que ja nao e aquela nasce ultrapassada;
//  · os portoes da casa (`rm-audit-numeros`, `portao-indice`) dao verde sobre esta arvore;
//  · o §SM.23 existe, tem os nove itens, e o texto que declara uma cosa ultrapassada la esta.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const OUT = join(REPO, 'evidence/sm23-estado-final-do-fecho-19-11.json');
const OUT_R = OUT.replace(/\.json$/, '-VERMELHO.json');
// O abort cobre os DOIS nomes: um vermelho desta peca e evidencia tanto como um verde, e sem este guard a
// segunda tentativa de fecho apagaria o vermelho da primeira — que e justamente o registo que prova que o
// portao de si mesmo estava partido.
if (existsSync(OUT) || existsSync(OUT_R)) throw new Error('ABORTA: ' + (existsSync(OUT) ? OUT : OUT_R) + ' existe — correr com outro nome, nunca por cima');
const t0 = Date.now();

const git = (args) => {
  try { return execFileSync('git', args, { cwd: REPO, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }); }
  catch (e) { return '__ERRO__ ' + String(e.message || e).slice(0, 200); }
};
// `l[1] !== ' '` e a coluna 2 (worktree vs indice): um caminho so esta sujo para o commit quando o disco
// difere do que vai ser commitado. As linhas `??` ficam FORA desta predicate a proposito — ha 26 nao
// versionados na arvore que nao sao deste fecho (logs de corrida sm7, pontos `.sm*.txt`), e meter a
// ignora-los dentro de um portao de commit transformaria o vermelho deles no meu. O que tem de estar no
// indice e o que o §SM.23 cita, e isso o portao `toda_a_peca_citada_no_SM.23_esta_no_indice` diz.
const na_arvore = git(['status', '--porcelain']).split(/\r?\n/).filter((l) => l && l[1] !== ' ' && l[0] !== '?');
const na_arvore_lidas = na_arvore.map((l) => l.slice(1, 3) + ' ' + l.slice(3));
const indice = new Set(git(['ls-files']).split(/\r?\n/).filter(Boolean));
const do_blob = (p) => {
  const t = git(['show', ':' + p]);
  if (t.startsWith('__ERRO__')) return { erro: t, bytes: 0, md5: null, texto: '' };
  const b = Buffer.from(t, 'utf8');
  return { erro: null, bytes: b.length, md5: createHash('md5').update(b).digest('hex'), texto: t };
};
const filho = (args, env) => {
  try { return { sai: 0, texto: execFileSync('node', args, { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: env ? { ...process.env, ...env } : process.env }) }; }
  catch (e) { return { sai: (typeof e.status === 'number' ? e.status : -1), texto: String(e.stdout || '') + String(e.stderr || '') + String(e.message || '') }; }
};
// Glifos que a casa ja me viu falhar em linha de comando (aspa curva, ponto de suspensao, É) vao por
// codepoint: uma agulha dactilografada pode nao casar nada e o vermelho ser da sonda, nao do medido.
const RETIC = '\u2026';
const MEDIA = 'M\u00C9DIA';

// ---- (1) o bloco §SM.23 lido do INDICE, com os seus nove itens
const AUD = do_blob('docs/auditoria-bfr-conecta.md');
const ini = AUD.texto.split('\n').findIndex((l) => l.startsWith('**SM.23.'));
const linhas_aud = AUD.texto.split('\n');
let fim = linhas_aud.length - 1;
for (let i = ini + 1; i < linhas_aud.length; i++) if (/^\*\*SM\.2[4-9]\./.test(linhas_aud[i]) || /^## §/.test(linhas_aud[i])) { fim = i - 1; break; }
const bloco = ini < 0 ? '' : linhas_aud.slice(ini, fim + 1).join('\n');
const itens = (bloco.match(/^\((\d)\)/gm) || []).map((x) => Number(x.replace(/[()]/g, '')));

// ---- (2) cada (caminho, bytes, md5) que a prosa cita, re-medido no blob do indice
// A prosa tem duas formas: `(...)`, 18 785 B, `md5` (o numero pertence ao caminho anterior) e
// `programa.mjs` → `arte.json`, 18 996 B, `md5` (o numero pertence ao ARTEFACTO, nao ao programa). Uma
// janela fixa depois do caminho dar ao programa a pega do artefacto — foi exactamente assim que a minha
// primeira verso desta peca lio 18 996/52f5c780 em ambos. Entao ando o bloco todo numa passada so, por
// ordem, e um nome de ficheiro em crase e SEMPRE um corte: bytes e md5 so valem para o nome mais
// proximo que ja passou, e o primeiro de cada. Os nomes com reticencias (`...-ANTERIOR-...json`) entram
// no corte mas nao resolvem em caminho algum, pelo que os seus numeros (19 146 B, 77 182 B, 76 884 B)
// ficam com eles e nao migram para a pega anterior.
const CAMINHOS_CITADOS = [...new Set((bloco.match(/(?:evidence|scripts)\/[\w.\-]+\.(?:json|sql|mjs|txt)/g) || []))];
// O token de corte tem de ser "todo nome em crase que MENCIONE uma extensao", nao "todo nome que ACABE
// numa extensao": a prosa do item (9) escreve as familias abreviadas como `...-antes...`, em que o ponto
// de suspensao vem DEPOIS do `.json` invisivel. Com o anchor no fim, o token nao era visto, `atual`
// ficava no programa e os 23 118 B do artefacto colavam-se ao `scripts/sm23-sonda-com-sessao.mjs`.
// A regra e de vizinhanca estrita: um numero so pertence ao caminho cujo nome em crase o precede
// IMEDIATAMENTE, sem outro nome em crase no meio (com ` -> ` e virgulas a servir de ligacao). Isto porque
// a prosa do item (9) abrevia as familias como `...-antes...` e `...-depois...` — sem extensao nenhuma
// escrita — e uma primeira versao que so reconhecia como corte os tokens que acabavam em `.json` deixou
// os 23 118 B / 2a77c8b8 DO ARTEFACTO colados ao `scripts/sm23-sonda-com-sessao.mjs`, que e um programa
// de 10 859 B: o vermelho era da sonda, nao do medido. Corte conservador custa uma citacao a menos,
// nunca uma citacao errada.
const re_tokens = /`([^`]*)`|([\d][\d .]{0,9})\sB\b/g;
const por_caminho = new Map();
for (const nome of CAMINHOS_CITADOS) por_caminho.set(nome, { bytes_citado: null, md5_citado: null });
let atual = null;
for (const m of bloco.matchAll(re_tokens)) {
  if (m[1] !== undefined) {
    const tok = m[1];
    if (/^[0-9a-f]{32}$/.test(tok)) { if (atual && por_caminho.has(atual) && por_caminho.get(atual).md5_citado === null) por_caminho.get(atual).md5_citado = tok; continue; }
    atual = por_caminho.has(tok) ? tok : null;
    continue;
  }
  if (atual && por_caminho.has(atual) && por_caminho.get(atual).bytes_citado === null) por_caminho.get(atual).bytes_citado = m[2];
}
const citacoes = [];
for (const c of CAMINHOS_CITADOS) {
  const cit = por_caminho.get(c) || { bytes_citado: null, md5_citado: null };
  const b = do_blob(c);
  const normalizado = cit.bytes_citado ? Number(String(cit.bytes_citado).replace(/[ .]/g, '')) : null;
  citacoes.push({
    caminho: c, no_indice: String(indice.has(c)), bytes_citado: normalizado,
    bytes_medido: b.erro ? null : b.bytes, md5_citado: cit.md5_citado, md5_medido: b.erro ? null : b.md5,
    bytes_batem: normalizado !== null && normalizado === b.bytes,
    md5_bate: !!cit.md5_citado && cit.md5_citado === b.md5,
  });
}
const cit_com_par = citacoes.filter((c) => c.bytes_citado !== null && c.md5_citado);
const cit_so_bytes = citacoes.filter((c) => c.bytes_citado !== null && !c.md5_citado);
const cit_so_md5 = citacoes.filter((c) => c.bytes_citado === null && c.md5_citado);
const cit_sem_pega = citacoes.filter((c) => c.bytes_citado === null && !c.md5_citado);
const cit_más = citacoes.filter((c) => (c.bytes_citado !== null && !c.bytes_batem) || (c.md5_citado && !c.md5_bate));
// Os quatro censos abaixo PINAM-SE na corrida: 10 pares + 1 so-bytes + 1 so-md5 + 8 sem-pega = 20 caminhos
// citados, copiados da saida `CITACOES` desta propria peca, nao da memoria. A falsificacao ja aconteceu, e
// minha: com o corte errado (extensao exigida no fim do token) o `scripts/sm23-sonda-com-sessao.mjs` ficou
// com os 23 118 B / 2a77c8b8 do artefacto `…-antes…` e o portao deu `mas=[1 caminho]` — registo em
// `evidence/sm23-estado-final-do-fecho-19-11-ANTERIOR-o-corte-pedia-extensao-e-a-familia-abreviada-nao-tem-extensao.json`.
// Portanto esta predicate pode dar vermelho por dois caminhos: uma pega que diverge do blob, e uma citacao
// que entra ou sai do §SM.23 sem que alguem re-leia esta peca.
const PARES_MEDIDOS = 10, SO_BYTES_MEDIDOS = 1, SO_MD5_MEDIDOS = 1, SEM_PEGA_MEDIDOS = 8;
const fora_do_indice = citacoes.filter((c) => !c.no_indice).map((c) => c.caminho);

// ---- (3) o registro contado pelo leitor do produtor, sobre a copia do INDICE
const RM = do_blob('docs/roadmap-master.md');
const leitor = filho(['scripts/ah1-cuenta-pen.mjs', 'docs/roadmap-master.md']);
const m_pen = (leitor.texto.match(/linhas PEN: (\d+) \| A (\d+) · M (\d+) · B (\d+) · soma (\d+)/) || []);
const fora_de_forma = (leitor.texto.match(/fora de forma: (.+)/) || [])[1];
const for_de_pen = /^\| (PEN-\d+) \|/gm;
const linhas_pen_blob = (RM.texto.match(/^\| PEN-\d+ \|/gm) || []).length;
const nomes_pen = [...new Set((RM.texto.match(for_de_pen) || []).map((x) => Number((x.match(/PEN-(\d+)/) || [])[1])))].sort((a, b) => a - b);
const maior_pen = nomes_pen.length ? nomes_pen[nomes_pen.length - 1] : 0;
const buracos = [];
for (let i = 1; i <= maior_pen; i++) if (!nomes_pen.includes(i)) buracos.push('PEN-' + String(i).padStart(2, '0'));

// ---- (4) painel HTML vs registro (a casa ja apanhou um painel a dizer 28 com 32 linhas)
const PAI = do_blob('docs/roadmap-painel.html');
// Agulhas compostas por codepoint (ver o nota em cima): `…`, `ê` e `É` dactilografados ja me deram
// contagens a zero que eram da sonda, nao do painel.
const re_painel = new RegExp('Pend\\u00EAncias \\((\\d+) itens \\u00B7 PEN-01' + RETIC + '(PEN-\\d+)\\)');
const m_pain = (PAI.texto.match(re_painel) || []);
const re_kpi_k = new RegExp('prioridade (ALTA|' + MEDIA + '|BAIXA)', 'g');
const kpis = (PAI.texto.match(re_kpi_k) || []).length;
const re_kpi = new RegExp('<div class="n">(\\d+)</div><div class="l">prioridade (ALTA|' + MEDIA + '|BAIXA)', 'g');
const m_kpis = [...PAI.texto.matchAll(re_kpi)].map((x) => ({ nivel: x[2], n: Number(x[1]) }));
const soma_kpis = m_kpis.reduce((a, x) => a + x.n, 0);

// ---- (5) os portoes da casa, corridos sobre esta arvore
const numeros = filho(['scripts/rm-audit-numeros.mjs']);
const portao = filho(['scripts/portao-indice.mjs']);
const classificou = filho(['scripts/sm23-classifica-portadores-do-indice-19-11.mjs', '--corpus', 'scripts/ah2-ddl-calendario-candidata.sql', 'evidence/sm23-conferencia-calendario-18-11.json']);
// A varredura de escritas e o produtor da casa, corrido com VARR_OUT para um nome de fecho: o destino por
// omissao e a corrida de 17/11, ja versionada, e o produtor recusa-se a sobrescreve-la. Nao ha fallback —
// um exit code nao-zero deste filho e a varredura a dizer que entrou escrita estrangeira na arvore.
const VARRE_OUT = 'evidence/sm23-fecho-varre-escritas-19-11.json';
const escritos = filho(['scripts/ah1-varre-escritas.mjs'], { VARR_OUT: VARRE_OUT });

// ---- (6) o que este programa faz a si proprio: nada de rede, nada de escrita no banco
// As quatro predicados abaixo contem, nos seus proprios literais, as agulhas que procuram: um `fet`+`ch(`
// escrito como regex e TEXTO do ficheiro, e a primeira versao desta peca esteve vermelha contra si mesma
// (`fetch:true, fs_de_destruicao:true`). A saida nao e amaciar a regra: e (i) retirar do corpo somente as
// linhas que DECLARAM estas quatro constantes, (ii) provar com um fixture que o corpo restante continua a
// disparar, e (iii) compor o fixture em tempo de execucao — se a agulha do fixture fosse dactilografada,
// o fixture voltava a ser o ofensor. A lista de nomes tem de cobrir TAMBIEM as duas linhas do fixture: na
// primeira tentativa exclui so os quatro predicados e o portao ficou vermelho outra vez, porque a linha que
// AFIRMA que o fixture dispara repete a agulha de destruicao de ficheiros que ela procura — o mesmo defeito,
// uma linha mais abaixo. E a terceira vez foi esta propria frase, que ao citar o defeito em prosa voltou a
// carregar a agulha (ver `evidence/sm23-estado-final-do-fecho-19-11-ANTERIOR-a-prosa-que-descrevia-o-defeito-carregava-a-agulha.json`). O `EU.erro` no portao e o
// controlo de que este programa esta de facto no indice: rodar antes do `git add` da leitura falhada.
// no indice (rodar antes do `git add` dá leitura falhada, e era isso que queria apanhar).
const EU = do_blob('scripts/sm23-estado-final-do-fecho-19-11.mjs');
const RE_DECLARACAO = /^const (faz_rede|origem_rede|origem_sql|origem_fs_escrita|RE_DECLARACAO|corpo|FIX_REDE|FIX_FS|fixture_rede_dispara|fixture_fs_dispara) =/;
const corpo = EU.texto.split(/\r?\n/).filter((l) => !RE_DECLARACAO.test(l)).join('\n');
const faz_rede = /\bfetch\s*\(|XMLHttpRequest|sql\(/.test(corpo);
const origem_rede = /from\s+'node:(https?|net|tls|dns)'/.test(corpo);
const origem_sql = /from\s+'[^']*c2-lib/.test(corpo);
const origem_fs_escrita = /createWriteStream|appendFileSync|unlinkSync|rmSync/.test(corpo);
const FIX_REDE = ['fet', 'ch("https://exemplo', '.gov.br")'].join('');
const FIX_FS = ['rmS', 'ync("evidence/x', '.json")'].join('');
const fixture_rede_dispara = /\bfetch\s*\(/.test('const a = 1;\n' + FIX_REDE);
const fixture_fs_dispara = /createWriteStream|appendFileSync|unlinkSync|rmSync/.test('const b = 1;\n' + FIX_FS);

// ---- (7) origem continua atras da arvore: nada foi publicado nem pushado por este fecho
const ramo = git(['rev-parse', '--abbrev-ref', 'HEAD']).trim();
const ahead_txt = git(['rev-list', '--count', '@{u}..HEAD']).trim();
const ahead = /^\d+$/.test(ahead_txt) ? Number(ahead_txt) : null;
const remoto = git(['status', '-sb']).split('\n')[0].trim();

// ---- portoes
const falhas = [];
const g = (nome, cond, detalhe) => { if (!cond) falhas.push(nome + ': ' + JSON.stringify(detalhe).slice(0, 300)); return { nome, verde: !!cond, detalhe }; };
const portoes = [
  g('os_tres_documentos_estao_no_indice', ['docs/auditoria-bfr-conecta.md', 'docs/roadmap-master.md', 'docs/roadmap-painel.html'].every((p) => indice.has(p)), { no_indice: [...indice].filter((p) => p.startsWith('docs/')).length }),
  g('a_arvore_de_trabalho_bate_com_o_indice_para_os_documentos_e_portoes', na_arvore.length === 0, na_arvore_lidas),
  g('o_bloco_SM.23_existe_no_indice_com_os_nove_itens', ini >= 0 && itens.length === 9 && itens.join(',') === '1,2,3,4,5,6,7,8,9', { linha_do_cabecalho: ini + 1, itens_lidos: itens, bytes_do_bloco: Buffer.byteLength(bloco) }),
  g('o_recount_e_do_leitor_do_produto_r_e_bate_com_a_grelha_do_blob', leitor.sai === 0 && Number(m_pen[1]) === linhas_pen_blob && Number(m_pen[5]) === Number(m_pen[1]) && fora_de_forma === 'nenhuma' && Number(m_pen[1]) === 39 && Number(m_pen[2]) === 14 && Number(m_pen[3]) === 14 && Number(m_pen[4]) === 11, { saida: leitor.texto.slice(0, 200), linhas_no_blob: linhas_pen_blob, maior_pen, buracos }),
  g('o_painel_diz_o_mesmo_numero_que_as_linhas_e_as_tres_prioridades_samam_o_total', Number(m_pain[1]) === Number(m_pen[1]) && m_pain[2] === 'PEN-39' && kpis === 3 && soma_kpis === Number(m_pen[1]), { painel: m_pain[1] + '/' + m_pain[2], kpis: m_kpis, soma_kpis, linhas: m_pen[1] }),
  g('toda_a_peca_citada_no_SM.23_esta_no_indice', fora_do_indice.length === 0, { citados: CAMINHOS_CITADOS.length, fora: fora_do_indice }),
  // Uma pega citada que nao e a pega do blob e prosa que ficou velha — o defeito que a casa ja apanhou no
  // §SM.20. A clase "sem pega na prosa" nao e falta: muitos caminhos citados sao programas ou DDL que a
  // prosa nomeia sem Ihe colar bytes+md5, por isso a regra e (i) NENHUMA pega citada divergir e (ii) o
  // censo das quatro clases bater com os numeros medidos nesta arvore, copiados da saida desta propria
  // corrida e nao da memoria — se o §SM.23 ganhar ou perder uma citacao, este portao fica vermelho.
  g('toda_pega_citada_e_a_pega_medida_no_blob', cit_más.length === 0 && cit_com_par.length === PARES_MEDIDOS && cit_so_bytes.length === SO_BYTES_MEDIDOS && cit_so_md5.length === SO_MD5_MEDIDOS && cit_sem_pega.length === SEM_PEGA_MEDIDOS, { citados: citacoes.length, pares: cit_com_par.length, so_bytes: cit_so_bytes.length, so_md5: cit_so_md5.length, sem_pega: cit_sem_pega.length, más: cit_más.map((c) => c.caminho + ' citado=' + c.bytes_citado + '/' + String(c.md5_citado).slice(0, 8) + ' medido=' + c.bytes_medido + '/' + String(c.md5_medido).slice(0, 8)) }),
  g('os_portoes_da_casa_dao_verde_sobre_esta_arvore', /AUDITORIA_VERDE/.test(numeros.texto) && numeros.sai === 0 && /PORTAO_INDICE_VERDE/.test(portao.texto) && portao.sai === 0, { rm_audit_sai: numeros.sai, rm_audit_fim: numeros.texto.slice(-200), portao_sai: portao.sai, portao_fim: portao.texto.slice(-200) }),
  g('a_classificacao_dos_portadores_de_credencial_mantem_a_porta_e_o_fixture_dispara', classificou.sai === 0 && /PORTADORES_CLASSIFICADOS_COMO_NOMES_E_FIXTURE_DISPARA/.test(classificou.texto), { sai: classificou.sai, fim: classificou.texto.slice(-200) }),
  g('nenhuma_escrita_estrangeira_entrou_nos_documentos_e_scripts', escritos.sai === 0 && existsSync(join(REPO, VARRE_OUT)), { sai: escritos.sai, destino: VARRE_OUT, fim: escritos.texto.slice(-160) }),
  g('este_diario_nao_faz_rede_nem_escreve_no_banco_e_os_fixtures_disparam', EU.erro === null && !faz_rede && !origem_rede && !origem_sql && !origem_fs_escrita && fixture_rede_dispara && fixture_fs_dispara, { leitura_do_indice: EU.erro, rede: faz_rede, modulos_de_rede: origem_rede, sql_importado: origem_sql, fs_de_destruicao: origem_fs_escrita, fixture_rede: fixture_rede_dispara, fixture_fs: fixture_fs_dispara, linhas_excluidas_por_se_automedirem: EU.texto.split(/\r?\n/).filter((l) => RE_DECLARACAO.test(l)).length }),
  g('nada_foi_publicado_nem_pushado_por_este_fecho', ahead !== null && ahead >= 1 && /ahead/.test(remoto), { ramo, ahead, status_remoto: remoto }),
];

const o = {
  programa: 'scripts/sm23-estado-final-do-fecho-19-11.mjs',
  em: new Date().toISOString(),
  duracao_ms: Date.now() - t0,
  pergunta: 'o que fica pronto para o commit local do §SM.23, medido no INDICE e nao no disco nem na memoria?',
  arvore_de_trabalho_suja: na_arvore_lidas,
  sm23: { linha_do_cabecalho: ini + 1, itens, bytes_do_bloco: Buffer.byteLength(bloco), citados: CAMINHOS_CITADOS.length },
  registro: {
    leitor_do_produtor: leitor.texto.trim().split(/\r?\n/).slice(0, 4),
    linhas_no_blob: linhas_pen_blob,
    A: Number(m_pen[2]), M: Number(m_pen[3]), B: Number(m_pen[4]), soma: Number(m_pen[5]),
    maior: 'PEN-' + String(maior_pen).padStart(2, '0'), buracos,
  },
  painel: { itens: Number(m_pain[1]), ate: m_pain[2], kpis: m_kpis, soma_kpis },
  citacoes_do_sm23: citacoes.map((c) => ({ caminho: c.caminho, bytes: c.bytes_medido, md5: c.md5_medido, bate_bytes: c.bytes_batem, bate_md5: c.md5_bate })),
  portoes_da_casa: { rm_audit: numeros.texto.trim().split(/\r?\n/).pop(), rm_audit_sai: numeros.sai, portao_indice: portao.texto.trim().split(/\r?\n/)[1], portao_sai: portao.sai, classificou_sai: classificou.sai, escritos_sai: escritos.sai },
  origem: { ramo, ahead, status_remoto: remoto },
  este_diario: { caminho: 'evidence/sm23-estado-final-do-fecho-19-11.json', faz_rede: faz_rede, sql_importado: origem_sql },
  portoes,
};
o.veredito = falhas.length === 0 ? 'SM23_FECHO_PRONTO_PARA_COMMIT' : 'VERMELHO: ' + falhas.length;
o.falhas = falhas;
o.conclusao = {
  frases_que_esta_corrida_autoriza: [
    'no INDICE desta arvore o registro tem ' + m_pen[1] + ' linhas PEN (' + m_pen[2] + ' A · ' + m_pen[3] + ' M · ' + m_pen[4] + ' B), contadas pelo leitor do produtor com a grelha de sete celulas, sem nenhuma linha fora de forma e sem buracos ate ' + 'PEN-' + String(maior_pen).padStart(2, '0'),
    'os ' + cit_com_par.length + ' pares (bytes, md5) e os ' + cit_so_md5.length + ' md5 isolados que a prosa do §SM.23 cola nos seus caminhos batem com o blob do indice (' + cit_más.length + ' divergencias), e os ' + cit_so_bytes.length + ' que so colam bytes batem com o blob tambem — nenhuma cifra do bloco ficou a depender da minha memoria',
    'o painel HTML diz ' + m_pain[1] + ' itens ' + m_pain[2] + ' e as tres prioridades samam ' + soma_kpis + ', o mesmo numero das linhas',
    'o portao de credenciais do indice da VERDE sobre esta arvore (' + o.portoes_da_casa.portao_indice + ') e a classificacao dos quatro portadores mantem o fixture a disparar',
  ],
  o_que_este_artefacto_nao_prova: [
    'nada sobre o estado do remoto: le `ahead` e o cabecalho do `status -sb`, e a contagem so vale no instante em que foi tirada',
    'nao re-mede o catalogo do Postgres — as cifras de mesas, vistas e funcoes vem do censo (`evidence/sm23-censo-pos-aplicacao-para-o-ledger-18-11.json`), que correu a 18/11 e e citado por pega',
    'nao prova que as portas da casa estejam certas nos seus proprios predicados, só que dao verde sobre esta arvore',
  ],
};
if (falhas.length) {
  const p = OUT_R;
  writeFileSync(p, JSON.stringify(o, null, 2) + '\n');
  for (const f of falhas) console.log('  FALTA ' + f);
  console.log('SM23_FECHO_VERMELHO · registo ' + p);
  process.exit(1);
}
writeFileSync(OUT, JSON.stringify(o, null, 2) + '\n');
console.log('REGISTRO', JSON.stringify(o.registro).slice(0, 300));
console.log('PAINEL', JSON.stringify(o.painel));
console.log('CITACOES caminhos=' + citacoes.length + ' pares=' + cit_com_par.length + ' so_bytes=' + cit_so_bytes.length + ' so_md5=' + cit_so_md5.length + ' sem_pega=' + cit_sem_pega.length + ' mas=' + cit_más.length);
console.log('PORTOES_DA_CASA', JSON.stringify(o.portoes_da_casa).slice(0, 300));
console.log('ORIGEM', JSON.stringify(o.origem));
for (const x of o.portoes) console.log('  portao ' + x.nome + ': ' + (x.verde ? 'VERDE' : 'VERMELHO'));
console.log('SM23_FECHO_PRONTO_PARA_COMMIT · registo ' + OUT + ' · ' + o.duracao_ms + ' ms');
