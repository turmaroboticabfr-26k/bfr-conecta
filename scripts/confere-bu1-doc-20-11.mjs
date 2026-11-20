// Verificador do documento 09: cada linha de diário embutida é byte-a-byte do .txt canónico,
// cada número citado resolve num campo do artefacto, e a grelha das tabelas é a do produtor.
// Escreve a captura FORA do repo (stagear a captura faria o portão do índice varrer-se a si mesmo).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const DOC = `${REPO}/docs/bu-20-11/09-mapa-estrutural-componentes-e-regras.md`;
const TXT = `${REPO}/evidence/bu1-mapa-estrutural-componentes-e-regras-20-11.txt`;
const JSONF = `${REPO}/evidence/bu1-mapa-estrutural-componentes-e-regras-20-11.json`;
const BASE = `${REPO}/evidence/bu1-mapa-estrutural-componentes-e-regras-20-11-BASE_PARA_O_DOCUMENTO.json`;
const OUT = process.argv[2] || 'C:/Users/pcmac/Documents/Qoder/2026-11-15/2e9c4296/confere-bu1-captura.txt';
if (!existsSync(DOC) || !existsSync(TXT) || !existsSync(JSONF)) throw new Error('falta documento ou evidência canónica');

const doc = readFileSync(DOC, 'utf8');
const txt = readFileSync(TXT, 'utf8');
const art = JSON.parse(readFileSync(JSONF, 'utf8'));
const linhas = [];
const L = (nome, ok, detalhe) => linhas.push(`${ok ? 'VERDE' : 'VERMELHO'} ${nome}${detalhe === undefined ? '' : ' :: ' + detalhe}`);
const caminho = (obj, p) => p.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

// A. cada linha de diário embutida é exacta, cada prefixo declarado aparece uma vez, e nenhuma
//    linha de diário vive fora de bloco de código (fora de bloco seria cópia datilografada)
const DIARIO = ['byte=', 'segmentacao=', 'componentes=', 'mais_usados=', 'colisoes=', 'classes_css=', 'vocab=',
  'origens=', 'politicas=', 'mecanismos=', 'helpers=', 'cliente=', 'cruzamento_por_papel='];
const docLinhas = doc.split('\n');
const dentroDeBloco = (() => {
  const flags = new Array(docLinhas.length).fill(false);
  let aberto = false;
  docLinhas.forEach((l, i) => {
    if (l.startsWith('```')) { aberto = !aberto; return; }
    if (aberto) flags[i] = true;
  });
  return flags;
})();
const deDiario = (l) => /^[a-z_]+=[^\n]/.test(l) && /[=,]/.test(l) && l.length > 40;
const embutidas = docLinhas.filter((l, i) => dentroDeBloco[i] && deDiario(l));
const ausentes = embutidas.filter((x) => !txt.includes(x));
const foraDeBloco = docLinhas.filter((l, i) => !dentroDeBloco[i] && DIARIO.some((p) => l.startsWith(p)));
const contagemPorPrefixo = DIARIO.map((p) => [p, embutidas.filter((x) => x.startsWith(p)).length]).filter(([, n]) => n !== 1);
L('A_cada_linha_de_diario_no_documento_e_exacta_e_esta_em_bloco_de_codigo',
  embutidas.length === DIARIO.length && ausentes.length === 0 && foraDeBloco.length === 0 && contagemPorPrefixo.length === 0,
  `embutidas=${embutidas.length} declaradas=${DIARIO.length} nao_no_diario=${ausentes.map((x) => x.split('=')[0]).join(',')} fora_de_bloco=${foraDeBloco.map((x) => x.split('=')[0]).join(',')} contagens=${contagemPorPrefixo.map(([p, n]) => p.slice(0, -1) + ':' + n).join(',')}`);

// B. o veredicto citado no documento é o veredicto medido
const citaVeredito = /BU1_MAPA_VERDE \d+\/\d+/.exec(doc);
const medido = /^veredito=(\S+ \d+\/\d+)/m.exec(txt);
L('B_o_veredito_citado_e_o_veredito_medido', !!citaVeredito && !!medido && citaVeredito[0] === medido[1],
  `documento=${citaVeredito ? citaVeredito[0] : 'nenhum'} diario=${medido ? medido[1] : 'nenhum'}`);

// C. números citados resolvidos em campos do artefacto
const AFIRMACOES = [
  ['1 720 nomes declarados', 'componentes.nomes_declarados_distintos'],
  ['2 483', 'componentes.declaracoes_no_total'],
  ['62', 'componentes.por_classe.sem_chamada_no_byte'],
  ['1 361', 'componentes.por_classe.chamada_em_um_corpo'],
  ['297', 'componentes.por_classe.compartilhada_em_dois_ou_mais_corpos'],
  ['276', 'componentes.colisoes_de_nome.length'],
  ['320', 'componentes.ids.ocorrencias'],
  ['299', 'componentes.ids.distintos'],
  ['6 851', 'componentes.classes_css.ocorrencias'],
  ['1 787', 'componentes.classes_css.distintas'],
  ['1 066', 'componentes.classes_css.usadas_uma_sozinha'],
  ['1 645', 'regras_de_negocio.do_cliente.comparacoes_de_papel'],
  ['495', 'regras_de_negocio.do_banco.politicas.total'],
  ['112', 'regras_de_negocio.do_banco.politicas.estrela_tudo'],
  ['952', 'regras_de_negocio.do_banco.soma_de_marcas'],
  ['63', 'regras_de_negocio.do_banco.helpers_no_total'],
  ['50', 'regras_de_negocio.do_banco.helpers_com_cargo'],
  ['13', 'regras_de_negocio.do_banco.helpers_sem_cargo.length'],
  ['3 049 476', 'segmentacao.chars_soma_dos_corpos'],
  ['874 166', 'segmentacao.do_produtor.bytes_sem_identidade'],
  ['2 175 310', 'segmentacao.do_produtor.bytes_dos_corpos'],
];
const fora = [];
for (const [cita, p] of AFIRMACOES) {
  const v = caminho(art, p);
  if (v === undefined) { fora.push(`${p}=NAO_EXISTE`); continue; }
  const alvo = String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  if (!doc.includes(alvo) && !doc.includes(String(v))) fora.push(`${p}=${v} nao_citado`);
}
L('C_cada_numero_citado_resolve_num_campo_do_artefacto', fora.length === 0, `fora=${fora.length}:${fora.join(',').slice(0, 300)}`);

// D. grelha: todas as linhas de tabela têm o mesmo número de pipes não escapados que o seu cabeçalho
const linhasDoc = doc.split('\n');
const pipes = (l) => l.replace(/\\\|/g, '').split('|').length - 1;
const grelhasRuins = [];
for (let i = 0; i < linhasDoc.length - 1; i++) {
  if (!/^\|\s*[^-|]/.test(linhasDoc[i]) || !/^\|\s*-{3}/.test(linhasDoc[i + 1])) continue;
  const n = pipes(linhasDoc[i]);
  for (let j = i + 1; j < linhasDoc.length && linhasDoc[j].startsWith('|'); j++) {
    if (pipes(linhasDoc[j]) !== n) grelhasRuins.push(`linha${j + 1}:espera ${n} tem ${pipes(linhasDoc[j])}`);
  }
}
L('D_a_grelha_de_todas_as_tabelas_e_constante', grelhasRuins.length === 0, `ruins=${grelhasRuins.length}:${grelhasRuins.slice(0, 4).join(' ')}`);

// E. escrita: nenhum codepoint Han, nenhum prefixo de JWT, nenhuma string de ligação de base de dados
const han = [...doc].map((c) => c.codePointAt(0)).filter((cp) => cp >= 0x4e00 && cp <= 0x9fff);
const jwt = [...doc.matchAll(/eyJ[A-Za-z0-9_-]{8,}/g)].map((m) => m[0].slice(0, 12));
const dsn = [...doc.matchAll(/postgres(ql)?:\/\/[^\s`]+/g)].map((m) => m[0]);
L('E_o_documento_nao_carrega_escrita_proibida_nem_cadeia_de_ligacao', han.length === 0 && jwt.length === 0 && dsn.length === 0,
  `han=${han.length} jwt=${jwt.length} dsn=${dsn.length}`);

// F. cada caminho de evidência citado no documento existe em disco
//    (a classe de caracteres tem de levar as letras com acento: os nomes das corridas levam Ó e Ã)
const limpa = (s) => s.replace(/[.,;:)]+$/, '');
const citados = [...new Set([...doc.matchAll(/evidence\/[^\s`)'"<>,]+/g)].map((m) => limpa(m[0])))];
const faltam = citados.filter((c) => !existsSync(`${REPO}/${c}`));
const families = citados.filter((c) => c.includes('*') || c.includes('…'));
L('F_todos_os_caminhos_nomeados_existem_em_disco', faltam.length === 0, `citados=${citados.length} familias=${families.length} faltam=${faltam.join(',')}`);

// G. BASE_PARA_O_DOCUMENTO vs canónico: corpo idêntico fora dos campos de corrida e da secção de cobertura
const base = JSON.parse(readFileSync(BASE, 'utf8'));
const EXCLUIDOS = new Set(['em', 'msd', 'veredictos', 'veredito_final', 'cobertura_do_briefing', 'instrumento']);
const semExcluidos = (o) => JSON.stringify(Object.fromEntries(Object.entries(o).filter(([k]) => !EXCLUIDOS.has(k))));
const corpoIgual = semExcluidos(base) === semExcluidos(art);
L('G_a_corrida_base_do_documento_igual_a_canonica_fora_dos_campos_de_corrida', corpoIgual,
  `chars_base=${semExcluidos(base).length} chars_canon=${semExcluidos(art).length}`);

// H. a tabela de cobertura do §7 é o array `cobertura_do_briefing` linha a linha, e o controlo
//    negativo da mesma corrida não encontrou nada
const celulas = (l) => l.replace(/^\||\|$/g, '').replace(/\\\|/g, '').split('|').map((c) => c.trim());
const tabelaCov = docLinhas.filter((l) => /^\|/.test(l) && !/^\|\s*-/.test(l) && /COBERTO/.test(l)).map(celulas);
const artCov = (art.cobertura_do_briefing || []).map((r) => [r.ponto_do_briefing, r.documentos_onde_se_espera.join(', '), r.documentos_onde_a_palavra_aparece.join(', '), r.estado]);
const covDiverge = [];
if (tabelaCov.length !== artCov.length) covDiverge.push(`linhas_documento=${tabelaCov.length} linhas_artefacto=${artCov.length}`);
artCov.forEach((a, i) => {
  const t = tabelaCov[i];
  if (!t) { covDiverge.push(`falta_linha_${a[0]}`); return; }
  if (t.join('§') !== a.join('§')) covDiverge.push(`linha${i}:${t.join('/')} vs ${a.join('/')}`);
});
const controlo = art.controlo_negativo_da_cobertura;
const controloVazio = !!controlo && Array.isArray(controlo.encontrados) && controlo.encontrados.length === 0;
L('H_a_tabela_de_cobertura_e_o_artefacto_e_o_ponto_inventado_e_chumbado', covDiverge.length === 0 && controloVazio,
  `divergencias=${covDiverge.length}:${covDiverge.slice(0, 3).join(' ').slice(0, 200)} controlo_negativo=${controlo ? JSON.stringify(controlo.encontrados) : 'NAO_EXISTE'}`);

// I. as quatro corridas vermelhas preservadas têm na tabela o veredito, os bytes e o md5 do ficheiro em disco
const linhasTabela = docLinhas.filter((l) => /^\|\s*`bu1-mapa/.test(l)).map(celulas);
const medidasRuim = [];
for (const c of linhasTabela) {
  const nome = (c[0].match(/bu1-[A-Za-z0-9._-]+/) || [''])[0];
  const p = `${REPO}/evidence/${nome}`;
  if (!existsSync(p)) { medidasRuim.push(`${nome || c[0]}:NAO_EXISTE`); continue; }
  const txtF = readFileSync(p, 'utf8');
  const ver = /^veredito=(\S+)\s+(\d+\/\d+)/m.exec(txtF);
  const bytesCit = ((c[1] || '').match(/[\d][\d\s]{2,}/) || [''])[0].replace(/\s/g, '');
  const md5Cit = ((c[1] || '').match(/[0-9a-f]{32}/) || [''])[0];
  const bytesReal = String(Buffer.byteLength(txtF, 'utf8'));
  const md5Real = createHash('md5').update(txtF).digest('hex');
  const verCit = (c[2] || '').match(/\d+\/\d+/);
  if (!ver) medidasRuim.push(`${nome}:sem_veredito_no_ficheiro`);
  if (verCit && ver && ver[2] !== verCit[0]) medidasRuim.push(`${nome}:citado=${verCit[0]} medido=${ver[2]}`);
  if (bytesCit && bytesCit !== bytesReal) medidasRuim.push(`${nome}:citado=${bytesCit} medidos=${bytesReal}`);
  if (md5Cit !== md5Real) medidasRuim.push(`${nome}:citado=${md5Cit || 'nenhum'} medido=${md5Real}`);
}
L('I_as_corridas_preservadas_tem_na_tabela_a_medicao_do_ficheiro_em_disco', linhasTabela.length === 5 && medidasRuim.length === 0,
  `linhas=${linhasTabela.length} divergem=${medidasRuim.length}:${medidasRuim.slice(0, 4).join(' ').slice(0, 240)}`);

const vermelhas = linhas.filter((l) => l.startsWith('VERMELHO')).length;
const md5 = (p) => createHash('md5').update(readFileSync(p)).digest('hex');
const saida = [`veredito=${vermelhas === 0 ? 'CONF_BU1_VERDE' : 'CONF_BU1_VERMELHO'} ${linhas.length - vermelhas}/${vermelhas}`,
  `doc=${DOC.replace(REPO + '/', '')} bytes=${Buffer.byteLength(doc, 'utf8')} md5=${md5(DOC)}`,
  `diario=${TXT.replace(REPO + '/', '')} md5=${md5(TXT)}`,
  ...linhas, 'node_exit=0'].join('\n') + '\n';
writeFileSync(OUT, saida);
console.log(saida);
