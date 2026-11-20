#!/usr/bin/env node
// SM.24 peca de fecho — O ESTADO FINAL DO GRUPO AUTORIZADO A 18/11, MEDIDO NO INDICE (SO LEITURA, ZERO REDE, ZERO BANCO).
//
// Porque existe: o bloco §SM.24 afirma duas publicações encadeadas (v135, v136), quatro PEN fechadas por
// execução, uma grelha de 90 células, um registro de 40 linhas e 45 caminhos com bytes+md5 colados. Nenhuma
// dessas frases pode valer por eu a ter escrito, nem por eu as ter medido no disco de trabalho: o commit grava
// o INDICE, e a lição registada a 18/11 é que `editar -> portao -> git add -> commit` deixa no verde uma
// versão que já não existe. A ordem deste fecho é `git add -> esta peça -> commit`, e tudo o que aqui se lê
// vem de `git cat-file blob :caminho`.
//
// O que cada porta procura (e todas podem divergir; uma porta sem poder de fogo é decoração):
//  · o §SM.24 está no índice, com os treze itens e os bytes do bloco que esta corrida mede;
//  · cada (caminho, bytes, md5) que a prosa cola num nome em crase é re-medido no blob do índice — a regra de
//    vizinhança é de corte: um nome em crase que não está na lista, ou uma pega isolada separada por texto,
//    fecha a ligação e o número não migra (foi exatamente assim que a primeira versão deste varredor colou os
//    3 547 458 B da shell ao `.gitignore`);
//  · as pegas que a prosa cita SEM caminho ao lado (shell, worker, `_headers`, módulo mobile) são conferidas
//    uma a uma contra o blob;
//  · o recount do registro é feito pelo LEITOR DO PRODUTOR (`scripts/ah1-cuenta-pen.mjs`) sobre a cópia do
//    índice, com grelha de sete células e des-escape de pipes — nunca por soma minha;
//  · o painel HTML diz o mesmo número que as linhas e as três prioridades somam o total;
//  · os portões da casa (`rm-audit-numeros`, `portao-indice` sem argumentos) dão verde sobre esta árvore;
//  · esta peça não fala com a rede nem com o banco, e os fixtures do seu próprio predicado disparam.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const OUT = join(REPO, 'evidence/sm24-estado-final-do-fecho-19-11.json');
const OUT_R = OUT.replace(/\.json$/, '-VERMELHO.json');
// O aborta cobre os DOIS nomes: um vermelho desta peça é evidência tanto como um verde, e sem este guard a
// segunda tentativa de fecho apagaria o vermelho da primeira.
if (existsSync(OUT) || existsSync(OUT_R)) throw new Error('ABORTA: ' + (existsSync(OUT) ? OUT : OUT_R) + ' existe — correr com outro nome, nunca por cima');
const t0 = Date.now();

// Lê o blob do índice em BYTES. `execFileSync(..., {encoding:'utf8'})` destruiria os dois PNG citados, e um
// md5 de texto re-codificado não é a pega do artefacto — é a pega da minha leitura.
const gitBlob = (p) => {
  try { return { erro: null, b: execFileSync('git', ['cat-file', 'blob', ':' + p], { cwd: REPO, maxBuffer: 512 * 1024 * 1024 }) }; }
  catch (e) { return { erro: String(e.message || e).slice(0, 160), b: Buffer.alloc(0) }; }
};
const do_blob = (p) => {
  const r = gitBlob(p);
  const texto = r.b.toString('utf8');
  return { erro: r.erro, bytes: r.b.length, md5: r.erro ? null : createHash('md5').update(r.b).digest('hex'), texto };
};
const git = (args) => {
  try { return execFileSync('git', args, { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); }
  catch (e) { return '__ERRO__ ' + String(e.message || e).slice(0, 200); }
};
// `l[1] !== ' '` é a coluna 2 (worktree vs índice): um caminho só está sujo para o commit quando o disco
// difere do que vai ser gravado. As linhas `??` ficam FORA desta predicado a propósito — há não-versionados
// na árvore que não são deste fecho (incluindo o registo que ESTA corrida vai escrever, porque ela própria
// ainda não está no índice).
const na_arvore = git(['status', '--porcelain']).split(/\r?\n/).filter((l) => l && l[1] !== ' ' && l[0] !== '?');
const na_arvore_lidas = na_arvore.map((l) => l.slice(1, 3) + ' ' + l.slice(3));
const indice = new Set(git(['ls-files']).split(/\r?\n/).filter(Boolean));
const filho = (args) => {
  try { return { sai: 0, texto: execFileSync('node', args, { cwd: REPO, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }) }; }
  catch (e) { return { sai: (typeof e.status === 'number' ? e.status : -1), texto: String(e.stdout || '') + String(e.stderr || '') + String(e.message || '') }; }
};
// Glifos que a casa já me viu falhar em linha de comando (É, ê, ponto de suspensão) vão por codepoint.
const RETIC = '\u2026';
const MEDIA = 'M\u00C9DIA';

// ---- (1) o bloco §SM.24 lido do INDICE, com os seus treze itens
const AUD = do_blob('docs/auditoria-bfr-conecta.md');
const linhas_aud = AUD.texto.split('\n');
const ini = linhas_aud.findIndex((l) => l.startsWith('**SM.24.'));
let fim = linhas_aud.length - 1;
for (let i = ini + 1; i < linhas_aud.length; i++) if (/^\*\*SM\.2[5-9]\./.test(linhas_aud[i]) || /^## §/.test(linhas_aud[i])) { fim = i - 1; break; }
const bloco = ini < 0 ? '' : linhas_aud.slice(ini, fim + 1).join('\n');
const itens = (bloco.match(/^\((\d+)\)/gm) || []).map((x) => Number(x.replace(/[()]/g, '')));

// ---- (2) cada (caminho, bytes, md5) que a prosa cita, re-medido no blob do índice
// Reconhecimento de caminho por família de prefixo, mais os dois diretórios de deploy e o ficheiro de regras.
const RE_CIT = /`((?:evidence|scripts|docs|app)\/[\w.\-\/]+|worker-deploy-[\w.\-]+\/(?:public\/)?[\w.\-]+|bfr-candidata-[\w.\-]+\/[\w.\-]+|audit-publicacao-v\d+\.json|\.gitignore)`/g;
const CAMINHOS_CITADOS = [...new Set([...bloco.matchAll(RE_CIT)].map((m) => m[1]).filter((c) => /\.[a-z]{2,5}$/.test(c) || /_headers$/.test(c) || c === '.gitignore'))];
// Corte estrito: um número só pertence ao caminho cujo nome em crase o precede sem outro nome em crase nem
// palavra no meio (`ligacao` tem de ser só espaço, vírgula ou parêntesis). Uma pega isolada que vem depois de
// prosa — «Pegadas do publicado: shell `9e23…` 3 547 458 B» — fecha a ligação: o número fica com a pega, que
// é um rótulo sem caminho, e não migra para o `.gitignore` da frase anterior. Foi exatamente esta a primeira
// falsificação deste varredor, apanhada porque o `.gitignore` ficou com 3 547 458 B contra 11 076 B medidos.
const re_tokens = /`([^`]*)`|([\d][\d .]{0,9})\sB\b/g;
const por_caminho = new Map(CAMINHOS_CITADOS.map((c) => [c, { bytes_citado: null, md5_citado: null }]));
let atual = null, cauda = -1;
for (const m of bloco.matchAll(re_tokens)) {
  const ligacao = bloco.slice(cauda, m.index);
  const so_glue = /^[\s(,]*$/.test(ligacao);
  if (m[1] !== undefined) {
    const tok = m[1];
    if (/^[0-9a-f]{32}$/.test(tok)) {
      if (atual !== null && so_glue && por_caminho.get(atual).md5_citado === null) { por_caminho.get(atual).md5_citado = tok; cauda = m.index + m[0].length; }
      else atual = null;
      continue;
    }
    atual = por_caminho.has(tok) ? tok : null;
    if (atual !== null) cauda = m.index + m[0].length;
    continue;
  }
  if (atual !== null && so_glue && por_caminho.get(atual).bytes_citado === null) { por_caminho.get(atual).bytes_citado = m[2]; cauda = m.index + m[0].length; }
}
const citacoes = CAMINHOS_CITADOS.map((c) => {
  const cit = por_caminho.get(c), b = do_blob(c);
  const normalizado = cit.bytes_citado ? Number(String(cit.bytes_citado).replace(/[ .]/g, '')) : null;
  return {
    caminho: c, no_indice: !b.erro, bytes_citado: normalizado, bytes_medido: b.erro ? null : b.bytes,
    md5_citado: cit.md5_citado, md5_medido: b.erro ? null : b.md5,
    clase: normalizado !== null && cit.md5_citado ? 'par' : normalizado !== null ? 'so_bytes' : cit.md5_citado ? 'so_md5' : 'sem_pega',
    bytes_batem: normalizado !== null && normalizado === b.bytes, md5_bate: !!cit.md5_citado && cit.md5_citado === b.md5,
  };
});
const em_clase = (k) => citacoes.filter((c) => c.clase === k).length;
const cit_mas = citacoes.filter((c) => (c.bytes_citado !== null && !c.bytes_batem) || (c.md5_citado && !c.md5_bate));
const fora_do_indice = citacoes.filter((c) => !c.no_indice).map((c) => c.caminho);
// Os censos abaixo PINAM-SE na corrida: 47 pares + 0 so-bytes + 0 so-md5 + 1 sem-pega = 48 caminhos citados,
// copiados da saída `CITACOES` desta própria peça, não da memória. Se o §SM.24 ganhar ou perder uma citação,
// este portão fica vermelho — que é o único modo de uma regra de vizinhança não se tornar decoração.
const PARES_MEDIDOS = 47, SO_BYTES_MEDIDOS = 0, SO_MD5_MEDIDOS = 0, SEM_PEGA_MEDIDOS = 1, CAMINHOS_MEDIDOS = 48;
const BLOCO_BYTES_MEDIDOS = 25966;

// ---- (3) as pegas que a prosa cola SEM caminho ao lado, conferidas uma a uma contra o blob
// O §SM.24 escreve «shell `9e23…` 3 547 458 B, worker `f963…` 3 612 332 B», e escreve a pega mobile invertida
// («`a83f…`, 51 742 B em `app/…`»): nenhuma dessas formas é alcançável pelo varredor de cima, pelo que cada
// uma é verificada por nome próprio. A porta pode divergir por peça: se um byte divergir, o nome aparece.
const PIN = [
  ['bfr-candidata-v136-secretaria-de-educacao/index.html', 3547458, '9e236a23eed978cf7c2a2743d449b307'],
  ['worker-deploy-v136-secretaria-de-educacao/worker.mjs', 3612332, 'f963b932af5b296e00584ae636ab8397'],
  ['bfr-candidata-v134-sidebar-escondida/index.html', 3546846, 'b272fd4f3a737c518e888250ab8167f1'],
  ['worker-deploy-v134-sidebar/worker.mjs', 3611114, 'f0de99f6ab5584d10e3b4484663f5090'],
  ['app/bfr-responsive-presentation.js', 51742, 'a83f77baba7453851b287080686c7afb'],
  ['worker-deploy-v135-headers/public/_headers', 118, '6f1f82a390b0e6111e3b8aff7d6415b2'],
  ['worker-deploy-v136-secretaria-de-educacao/public/_headers', 118, '6f1f82a390b0e6111e3b8aff7d6415b2'],
];
const pins = PIN.map(([c, bytes, md5]) => {
  const b = do_blob(c);
  return { caminho: c, bytes_citado: bytes, md5_citado: md5, bytes_medido: b.erro ? null : b.bytes, md5_medido: b.erro ? null : b.md5, erro: b.erro, bate: !b.erro && b.bytes === bytes && b.md5 === md5 };
});
const pins_mas = pins.filter((p) => !p.bate);
// A prosa afirma ainda que os dois `_headers` são idênticos entre v135 e v136: é uma relação, e como relação
// tem de ser medida, não presumida pela igualdade dos comprimentos.
const headers_identicos = pins[5].md5_medido !== null && pins[5].md5_medido === pins[6].md5_medido;

// ---- (3b) TODA a pega de 32 hex escrita no §SM.24 tem de resolver para alguma coisa
// O varredor de cima só alcança pegas coladas a um nome em crase. O bloco escreve mais duas formas: pares
// «(N B, `md5`)» sem nome ao lado (os preflights, pós-deploys e diários, que a prosa rotula em português), e
// pegas do service worker que nunca foram ficheiros em disco — são o SW **servido**, gerado com a etiqueta
// `bfr-conecta-vNNN` interpolada, e por isso só existem escritas dentro dos `audit-publicacao-v*.json`. Uma
// pega fabricada ou velha tem de bater aqui: resolvo cada token (i) contra o md5 de um ficheiro do índice no
// corpus declarado, (ii) contra o texto dos três diários de publicação versionados; o que não resolver nem por
// um dos dois fica na lista que o portão recusa. O corpus é declarado por expressão regular, não por lista
// lembrada — uma régua mais estreita do que a pergunta daria «único» a coisas que só não foram olhadas. Por
// isso o item (13) entrou com as suas duas famílias: o portão de índice que ele cita por pega, e os artefactos
// sm24 deste fecho (a corrida vermelha preservada e a peça de prova), que vivem em `evidence/sm24-`.
const RE_CORPUS = /^(?:evidence\/(?:v13[56]|p36|p73|sm24-|ah2-classifica-dirs-espelhado)|audit-publicacao-v13[456]|worker-deploy-[\w.\-]+\/|bfr-candidata-[\w.\-]+\/|scripts\/(?:p36|p73|v13[56]|sm24-|portao-indice|ah2-(?:m5-driver|varredura|funde-sessoes|classifica-dirs-espelhado)|ah1-cuenta-pen)|docs\/(?:roadmap-master\.md|roadmap-painel\.html|auditoria-bfr-conecta\.md)|app\/bfr-responsive-presentation\.js|\.gitignore)/;
const corpus = [...indice].filter((p) => RE_CORPUS.test(p)).sort();
const pega_para_caminhos = new Map();
for (const p of corpus) {
  const b = do_blob(p);
  if (b.erro) continue;
  if (!pega_para_caminhos.has(b.md5)) pega_para_caminhos.set(b.md5, []);
  pega_para_caminhos.get(b.md5).push(p);
}
const DIARIOS = ['audit-publicacao-v134.json', 'audit-publicacao-v135.json', 'audit-publicacao-v135-ANTERIOR-g10-comparava-objeto-inteiro.json', 'audit-publicacao-v136.json'];
const texto_diarios = DIARIOS.map((p) => do_blob(p)).filter((b) => !b.erro).map((b) => b.texto).join('\n');
const tokens_pega = [...new Set(bloco.match(/[0-9a-f]{32}/g) || [])];
const resolucao = tokens_pega.map((t) => {
  const por_ficheiro = pega_para_caminhos.get(t) || [];
  const por_diario = texto_diarios.includes(t);
  return { pega: t, caminhos: por_ficheiro, no_diario_de_publicacao: por_diario, resolve: por_ficheiro.length > 0 || por_diario };
});
const sem_resolucao = resolucao.filter((r) => !r.resolve).map((r) => r.pega);
const so_por_diario = resolucao.filter((r) => r.resolve && r.caminhos.length === 0).map((r) => r.pega);
const com_multiplos = resolucao.filter((r) => r.caminhos.length > 1).map((r) => r.pega + ' x' + r.caminhos.length);
// Censo PINADO desta corrida (copiado da saída `PEGAS`, não da memória): se a prosa ganhar uma pega que não
// resolve, ou perder uma, o portão fica vermelho.
const TOKENS_MEDIDOS = 76, OCORRENCIAS_MEDIDAS = 78, SO_POR_DIARIO_MEDIDO = 3, MULTIPLOS_MEDIDOS = 2;

// ---- (4) o registro contado pelo leitor do produtor, sobre a cópia do ÍNDICE
const RM = do_blob('docs/roadmap-master.md');
const leitor = filho(['scripts/ah1-cuenta-pen.mjs', 'docs/roadmap-master.md']);
const m_pen = (leitor.texto.match(/linhas PEN: (\d+) \| A (\d+) · M (\d+) · B (\d+) · soma (\d+)/) || []);
const fora_de_forma = (leitor.texto.match(/fora de forma: (.+)/) || [])[1];
const linhas_pen_blob = (RM.texto.match(/^\| PEN-\d+ \|/gm) || []).length;
const nomes_pen = [...new Set((RM.texto.match(/^\| (PEN-\d+) \|/gm) || []).map((x) => Number((x.match(/PEN-(\d+)/) || [])[1])))].sort((a, b) => a - b);
const maior_pen = nomes_pen.length ? nomes_pen[nomes_pen.length - 1] : 0;
const buracos = [];
for (let i = 1; i <= maior_pen; i++) if (!nomes_pen.includes(i)) buracos.push('PEN-' + String(i).padStart(2, '0'));

// ---- (5) painel HTML vs registro (a casa já apanhou um painel a dizer 28 com 32 linhas)
const PAI = do_blob('docs/roadmap-painel.html');
const re_painel = new RegExp('Pend\\u00EAncias \\((\\d+) itens \\u00B7 PEN-01' + RETIC + '(PEN-\\d+)\\)');
const m_pain = (PAI.texto.match(re_painel) || []);
const re_kpi = new RegExp('<div class="n">(\\d+)</div><div class="l">prioridade (ALTA|' + MEDIA + '|BAIXA)', 'g');
const m_kpis = [...PAI.texto.matchAll(re_kpi)].map((x) => ({ nivel: x[2], n: Number(x[1]) }));
const soma_kpis = m_kpis.reduce((a, x) => a + x.n, 0);

// ---- (6) os portões da casa, corridos sobre esta árvore
const numeros = filho(['scripts/rm-audit-numeros.mjs']);
// `portao-indice.mjs` VARRE O ÍNDICE SEM ARGUMENTOS; com caminho é CONTROLE e sai 0 por construção — dar-lhe
// um argumento seria transformar o portão de credenciais num porta-sempre-verde.
const portao = filho(['scripts/portao-indice.mjs']);

// ---- (7) o que este programa faz a si próprio: nada de rede, nada de escrita no banco
// As predicados abaixo contêm, nos seus próprios literais, as agulhas que procuram, por isso o corpo é o
// ficheiro SEM as linhas que declaram estas constantes, e os fixtures são compostos em tempo de execução —
// um fixture dactilografado voltaria a ser o ofensor.
const EU = do_blob('scripts/sm24-estado-final-do-fecho-19-11.mjs');
const RE_DECLARACAO = /^const (faz_rede|origem_rede|origem_sql|origem_fs_escrita|RE_DECLARACAO|corpo|FIX_REDE|FIX_FS|fixture_rede_dispara|fixture_fs_dispara) =/;
const corpo = EU.texto.split(/\r?\n/).filter((l) => !RE_DECLARACAO.test(l)).join('\n');
const faz_rede = /\bfetch\s*\(|XMLHttpRequest/.test(corpo);
const origem_rede = /from\s+'node:(https?|net|tls|dns)'/.test(corpo);
const origem_sql = /from\s+'[^']*c2-lib/.test(corpo);
const origem_fs_escrita = /createWriteStream|appendFileSync|unlinkSync|rmSync/.test(corpo);
const FIX_REDE = ['fet', 'ch("https://exemplo', '.gov.br")'].join('');
const FIX_FS = ['rmS', 'ync("evidence/x', '.json")'].join('');
const fixture_rede_dispara = /\bfetch\s*\(|XMLHttpRequest/.test('const a = 1;\n' + FIX_REDE);
const fixture_fs_dispara = /createWriteStream|appendFileSync|unlinkSync|rmSync/.test('const b = 1;\n' + FIX_FS);

// ---- (8) origem continua atrás da árvore: nada foi publicado nem pushado por este fecho
const head_sha = git(['rev-parse', 'HEAD']).trim();
const head_assunto = git(['log', '-1', '--format=%s']).trim();
const ramo = git(['rev-parse', '--abbrev-ref', 'HEAD']).trim();
const ahead_txt = git(['rev-list', '--count', '@{u}..HEAD']).trim();
const ahead = /^\d+$/.test(ahead_txt) ? Number(ahead_txt) : null;
const remoto = git(['status', '-sb']).split('\n')[0].trim();

// ---- portões
const falhas = [];
const g = (nome, cond, detalhe) => { if (!cond) falhas.push(nome + ': ' + JSON.stringify(detalhe).slice(0, 320)); return { nome, verde: !!cond, detalhe }; };
const portoes = [
  g('o_bloco_SM.24_existe_no_indice_com_os_treze_itens_e_os_bytes_medidos', ini >= 0 && itens.join(',') === '1,2,3,4,5,6,7,8,9,10,11,12,13' && Buffer.byteLength(bloco) === BLOCO_BYTES_MEDIDOS, { linha_do_cabecalho: ini + 1, itens_lidos: itens, bytes_do_bloco: Buffer.byteLength(bloco), esperado: BLOCO_BYTES_MEDIDOS }),
  g('a_arvore_de_trabalho_bate_com_o_indice_para_o_que_o_SM.24_cita', na_arvore.length === 0, na_arvore_lidas),
  g('toda_a_peca_citada_no_SM.24_esta_no_indice', fora_do_indice.length === 0, { citados: CAMINHOS_CITADOS.length, fora: fora_do_indice }),
  g('toda_pega_citada_e_a_pega_medida_no_blob', cit_mas.length === 0 && em_clase('par') === PARES_MEDIDOS && em_clase('so_bytes') === SO_BYTES_MEDIDOS && em_clase('so_md5') === SO_MD5_MEDIDOS && em_clase('sem_pega') === SEM_PEGA_MEDIDOS && citacoes.length === CAMINHOS_MEDIDOS, { citados: citacoes.length, pares: em_clase('par'), so_bytes: em_clase('so_bytes'), so_md5: em_clase('so_md5'), sem_pega: em_clase('sem_pega'), mas: cit_mas.map((c) => c.caminho + ' citado=' + c.bytes_citado + '/' + String(c.md5_citado).slice(0, 8) + ' medido=' + c.bytes_medido + '/' + String(c.md5_medido).slice(0, 8)) }),
  g('as_pegas_sem_caminho_na_prosa_batem_com_o_blob_e_os_dois_headers_sao_o_mesmo_ficheiro', pins_mas.length === 0 && headers_identicos, { pins: pins.length, mas: pins_mas.map((p) => p.caminho + ' citado=' + p.bytes_citado + '/' + String(p.md5_citado).slice(0, 8) + ' medido=' + p.bytes_medido + '/' + String(p.md5_medido).slice(0, 8) + ' erro=' + String(p.erro).slice(0, 40)), headers_identicos }),
  g('toda_pega_de_32_hex_do_SM.24_resolve_a_um_ficheiro_do_indice_ou_ao_texto_de_um_diario_de_publicacao', sem_resolucao.length === 0 && resolucao.length === TOKENS_MEDIDOS && [...bloco.matchAll(/[0-9a-f]{32}/g)].length === OCORRENCIAS_MEDIDAS && so_por_diario.length === SO_POR_DIARIO_MEDIDO && com_multiplos.length === MULTIPLOS_MEDIDOS, { corpus: corpus.length, tokens: resolucao.length, ocorrencias: [...bloco.matchAll(/[0-9a-f]{32}/g)].length, sem_resolucao, so_por_diario, com_multiplos }),
  g('o_recount_e_do_leitor_do_produtor_e_bate_com_a_grelha_do_blob', leitor.sai === 0 && Number(m_pen[1]) === linhas_pen_blob && Number(m_pen[5]) === Number(m_pen[1]) && fora_de_forma === 'nenhuma' && Number(m_pen[1]) === 40 && Number(m_pen[2]) === 15 && Number(m_pen[3]) === 14 && Number(m_pen[4]) === 11 && buracos.length === 0, { saida: leitor.texto.trim().split(/\r?\n/).slice(0, 3), linhas_no_blob: linhas_pen_blob, maior_pen, buracos }),
  g('o_painel_diz_o_mesmo_numero_que_as_linhas_e_as_tres_prioridades_somam_o_total', Number(m_pain[1]) === Number(m_pen[1]) && m_pain[2] === 'PEN-40' && m_kpis.length === 3 && soma_kpis === Number(m_pen[1]), { painel: m_pain[1] + '/' + m_pain[2], kpis: m_kpis, soma_kpis, linhas: m_pen[1] }),
  g('os_portoes_da_casa_dao_verde_sobre_esta_arvore', /AUDITORIA_VERDE/.test(numeros.texto) && numeros.sai === 0 && /PORTAO_INDICE_VERDE/.test(portao.texto) && portao.sai === 0, { rm_audit_sai: numeros.sai, rm_audit_fim: numeros.texto.trim().split(/\r?\n/).slice(-1)[0], portao_sai: portao.sai, portao_fim: portao.texto.trim().split(/\r?\n/).slice(-1)[0] }),
  g('esta_peca_esta_no_indice_e_nao_faz_rede_nem_escreve_no_banco_e_os_fixtures_disparam', EU.erro === null && !faz_rede && !origem_rede && !origem_sql && !origem_fs_escrita && fixture_rede_dispara && fixture_fs_dispara, { leitura_do_indice: EU.erro, rede: faz_rede, modulos_de_rede: origem_rede, sql_importado: origem_sql, fs_de_destruicao: origem_fs_escrita, fixture_rede: fixture_rede_dispara, fixture_fs: fixture_fs_dispara, linhas_excluidas_por_se_automedirem: EU.texto.split(/\r?\n/).filter((l) => RE_DECLARACAO.test(l)).length }),
  g('nada_foi_publicado_nem_pushado_por_este_fecho', ahead !== null && ahead === 3 && /ahead 3/.test(remoto) && head_sha.startsWith('ca741dd'), { ramo, ahead, head_sha, head_assunto, status_remoto: remoto }),
];

const o = {
  programa: 'scripts/sm24-estado-final-do-fecho-19-11.mjs',
  em: new Date().toISOString(),
  duracao_ms: Date.now() - t0,
  pergunta: 'o grupo autorizado a 18/11 (v135, v136, PEN-24/30/35/36, grelha, registro) está de facto pronto para o commit local, medido no ÍNDICE e não no disco nem na memória?',
  arvore_de_trabalho_suja: na_arvore_lidas,
  sm24: { linha_do_cabecalho: ini + 1, itens, bytes_do_bloco: Buffer.byteLength(bloco), citados: CAMINHOS_CITADOS.length },
  registro: {
    leitor_do_produtor: leitor.texto.trim().split(/\r?\n/).slice(0, 3),
    linhas_no_blob: linhas_pen_blob,
    A: Number(m_pen[2]), M: Number(m_pen[3]), B: Number(m_pen[4]), soma: Number(m_pen[5]),
    maior: 'PEN-' + String(maior_pen).padStart(2, '0'), buracos,
  },
  painel: { itens: Number(m_pain[1]), ate: m_pain[2], kpis: m_kpis, soma_kpis },
  citacoes_do_sm24: citacoes.map((c) => ({ caminho: c.caminho, clase: c.clase, bytes: c.bytes_medido, md5: c.md5_medido, bate_bytes: c.bytes_batem, bate_md5: c.md5_bate })),
  pins_sem_caminho: pins,
  pegas_do_sm24: { corpus_no_indice: corpus.length, tokens_distintos: resolucao.length, ocorrencias: [...bloco.matchAll(/[0-9a-f]{32}/g)].length, sem_resolucao, so_por_diario, com_multiplos },
  portoes_da_casa: { rm_audit: numeros.texto.trim().split(/\r?\n/).pop(), rm_audit_sai: numeros.sai, portao_indice: portao.texto.trim().split(/\r?\n/).pop(), portao_sai: portao.sai },
  origem: { ramo, ahead, head_sha, head_assunto, status_remoto: remoto },
  esta_peca: { caminho: 'evidence/sm24-estado-final-do-fecho-19-11.json', faz_rede, sql_importado: origem_sql },
  portoes,
};
o.veredito = falhas.length === 0 ? 'SM24_FECHO_PRONTO_PARA_COMMIT' : 'VERMELHO: ' + falhas.length;
o.falhas = falhas;
o.conclusao = {
  frases_que_esta_corrida_autoriza: [
    'no ÍNDICE desta árvore o registro tem ' + m_pen[1] + ' linhas PEN (' + m_pen[2] + ' A · ' + m_pen[3] + ' M · ' + m_pen[4] + ' B), contadas pelo leitor do produtor, sem linhas fora de forma e sem buracos até PEN-' + String(maior_pen).padStart(2, '0'),
    'os ' + em_clase('par') + ' pares (bytes, md5) que a prosa do §SM.24 cola nos seus caminhos batem com o blob do índice (' + cit_mas.length + ' divergências), e mais ' + pins.length + ' pegas citadas sem caminho ao lado batem também, incluindo a igualdade byte-a-byte dos dois `_headers`',
    'o painel HTML diz ' + m_pain[1] + ' itens até ' + m_pain[2] + ' e as três prioridades somam ' + soma_kpis + ', o mesmo número das linhas',
    'o portão de credenciais do índice dá VERDE sobre esta árvore (' + o.portoes_da_casa.portao_indice + ') e o portão numérico da auditoria também (' + o.portoes_da_casa.rm_audit + ')',
    'a origem está ' + ahead + ' commits atrás do remoto por decisão literal de 18/11: nada foi publicado nem pushado por este fecho',
  ],
  o_que_este_artefacto_nao_prova: [
    'nada sobre o estado do remoto além do `ahead` lido no instante em que esta corrida correu',
    'não re-mediu o banco, o browser nem as bandas de resolução: as cifras da grelha de 90 células, dos preflights e dos pós-deploy vêm dos artefactos citados com pega, que foram medidos nas corridas que os escreveram',
    'não prova que os portões da casa estejam certos nos seus próprios predicados, só que dão verde sobre esta árvore',
    'não prova que o §SM.24 narre corretamente os factos: prova que nenhuma cifra com pega no bloco diverge do que o índice grava',
  ],
};
if (falhas.length) {
  writeFileSync(OUT_R, JSON.stringify(o, null, 2) + '\n');
  for (const f of falhas) console.log('  FALTA ' + f);
  console.log('SM24_FECHO_VERMELHO · registo ' + OUT_R);
  process.exit(1);
}
writeFileSync(OUT, JSON.stringify(o, null, 2) + '\n');
console.log('REGISTRO', JSON.stringify(o.registro).slice(0, 300));
console.log('PAINEL', JSON.stringify(o.painel));
console.log('CITACOES caminhos=' + citacoes.length + ' pares=' + em_clase('par') + ' so_bytes=' + em_clase('so_bytes') + ' so_md5=' + em_clase('so_md5') + ' sem_pega=' + em_clase('sem_pega') + ' mas=' + cit_mas.length);
console.log('PINS sem_caminho=' + pins.length + ' mas=' + pins_mas.length + ' headers_identicos=' + headers_identicos);
console.log('PEGAS corpus=' + corpus.length + ' tokens=' + resolucao.length + ' ocorrencias=' + [...bloco.matchAll(/[0-9a-f]{32}/g)].length + ' sem_resolucao=' + sem_resolucao.length + ' so_por_diario=' + so_por_diario.length + ' multiplos=' + com_multiplos.length + ' -> ' + com_multiplos.join(' '));
console.log('PORTOES_DA_CASA', JSON.stringify(o.portoes_da_casa).slice(0, 300));
console.log('ORIGEM', JSON.stringify(o.origem));
for (const x of o.portoes) console.log('  portao ' + x.nome + ': ' + (x.verde ? 'VERDE' : 'VERMELHO'));
console.log('SM24_FECHO_PRONTO_PARA_COMMIT · registo ' + OUT + ' · ' + o.duracao_ms + ' ms');
