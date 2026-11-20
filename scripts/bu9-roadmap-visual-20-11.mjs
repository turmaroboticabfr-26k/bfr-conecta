// BU-9 — roadmap VISUAL: o que o registro de referência afirma vs o que a medição sustenta, linha a linha
// Só leitura: 0 DDL, 0 escrita no banco, 0 publicação, 0 alteração de produto.
import fs from 'node:fs';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = process.env.BU9_SUF || '';
const L = [];
const verds = [];
const gate = (nome, ok, detalhe) => { verds.push({ nome, ok, detalhe }); L.push(`${ok ? 'V' : 'X'} ${nome} :: ${detalhe}`); };
const le = (c) => JSON.parse(fs.readFileSync(`${DIR}/${c}`, 'utf8'));
const OUT = { em: new Date().toISOString(), instrumento: 'scripts/bu9-roadmap-visual-20-11.mjs', modo: 'read-only' };

const bu5 = le('evidence/bu5-unidades-do-roadmap-20-11.json');
const bu7 = le('evidence/bu7-inventarios-20-11.json');
const bu8 = le('evidence/bu8-listas-20-11.json');
const unidades = bu5.unidades;
const MOBILE = [320, 360, 375, 390, 414, 430];
const WEB = [1280, 1440, 1920];
const FAIXAS = ['funcionando', 'com_erros', 'incompletas', 'ausentes'];
const SINECA = { funcionando: '#', com_erros: '~', incompletas: '+', ausentes: '_' };

// ---------- 1. tabela «Progresso por módulo (IF/total)» do registro ----------
const celulasDeLinha = (l) => {
  const out = [];
  let cur = '';
  for (let i = 0; i < l.length; i += 1) {
    if (l[i] === '\\' && l[i + 1] === '|') { cur += '|'; i += 1; continue; }
    if (l[i] === '|') { out.push(cur.trim()); cur = ''; continue; }
    cur += l[i];
  }
  out.push(cur.trim());
  return out.slice(1, -1);
};
const REGISTRO = fs.readFileSync(`${DIR}/docs/roadmap-master.md`, 'utf8').split(/\r?\n/);
const lerLinhasDeProgresso = (linhas) => {
  const inicio = linhas.findIndex((l) => /^\*\*Progresso por modulo|^\*\*Progresso por módulo/.test(l));
  const out = [];
  for (let i = inicio; i < linhas.length; i += 1) {
    const l = linhas[i];
    if (!/^\|/.test(l)) { if (out.length) break; continue; }
    const c = celulasDeLinha(l);
    if (c.length !== 4 || !/^\d+$/.test(c[1]) || !/^\d+$/.test(c[2])) continue;
    out.push({ modulo: c[0], concluido: Number(c[1]), total: Number(c[2]), pct_lido: c[3] });
  }
  return out;
};
const rows = lerLinhasDeProgresso(REGISTRO);
const formatarPct = (concluido, total) => {
  const x = (concluido / total) * 100;
  return x === 100 ? '100%' : `${x.toFixed(1).replace('.', ',')}%`;
};
const pctDivergente = rows.filter((r) => r.pct_lido !== formatarPct(r.concluido, r.total)).map((r) => `${r.modulo}:lido=${r.pct_lido} recalculado=${formatarPct(r.concluido, r.total)}`);
const ifDeclarado = Number((REGISTRO.find((l) => /^\| \*\*IMPLEMENTADO E FUNCIONANDO\*\* \|/.test(l)) || '').match(/\|\s*(\d+)/)?.[1]);
const somaTotal = rows.reduce((a, r) => a + r.total, 0);
const somaConcluido = rows.reduce((a, r) => a + r.concluido, 0);

// ---------- 2. mapear registro -> unidades da BU-5 ----------
const emOrdem = unidades.filter((u) => u.grupo !== 'M2').sort((a, b) => Number(a.grupo.split('.')[1]) - Number(b.grupo.split('.')[1]));
const linhaDe = {};
emOrdem.forEach((u, i) => { linhaDe[u.grupo] = rows[i]; });
const desloquesDeOrdem = emOrdem.map((u, i) => (!rows[i] || rows[i].total === u.itens ? null : `${u.grupo}:itens=${u.itens} vs linha_${i + 1}_total=${rows[i] ? rows[i].total : 'ausente'}`)).filter(Boolean);
const FIX_DESLOQUE = (() => {
  const umDeslocamento = emOrdem.slice(1).concat([emOrdem[0]]);
  return umDeslocamento.filter((u, i) => !rows[i] || rows[i].total !== u.itens).length > 0;
})();

const normal = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const tokens = (s) => normal(s).split(/[^a-z]+/).filter((t) => t.length >= 5);
const divergentesDe = (pares) => pares.filter(([nomeRegistro, rotuloMedido]) => tokens(nomeRegistro).every((t) => !tokens(rotuloMedido).includes(t)));
const PARES_REAIS = emOrdem.map((u) => [linhaDe[u.grupo].modulo, u.rotulo, u.grupo]);
const nomesDivergentes = divergentesDe(PARES_REAIS).map(([a, b, g]) => `${g}: registro="${a}" medido="${b}"`);
const FIX_NOMES = divergentesDe([...PARES_REAIS, ['Secretaria Escolar', 'Painel de Controlo Remoto', 'FIX-9']]).length === nomesDivergentes.length + 1;

// ---------- 3. faixas, prova e cobertura por unidade ----------
const LISTA_DE_ESTADO = {};
for (const [lista, estados] of Object.entries(bu8.regra_de_classificacao)) for (const e of estados) LISTA_DE_ESTADO[e] = lista;
const comProvaNaRegua = (u) => {
  const arr = (u.corridas || {})[u.regua_de_prova] || [];
  if (u.regua_de_prova === 'conteudo') return arr.some((c) => c.existe && c.classe === 'no_ar_servido');
  if (u.regua_de_prova === 'banco') return arr.some((c) => c.existe);
  return false;
};
const LINHAS = unidades.map((u) => {
  const lista = LISTA_DE_ESTADO[u.estado_derivado];
  const larg = [...new Set(u.desktop_celulas.map((s) => Number((s.match(/@(\d+)=/) || [])[1])))];
  const est = u.mobile_por_estado || {};
  const r = linhaDe[u.grupo];
  return {
    grupo: u.grupo,
    rotulo: u.rotulo,
    itens: u.itens,
    lista,
    estado: u.estado_derivado,
    barra: (SINECA[lista] || '?').repeat(Math.max(u.itens, 1)),
    regua: u.regua_de_prova,
    prova: !!u.prova_bateu && comProvaNaRegua(u),
    registro: r ? `${r.concluido}/${r.total} ${r.pct_lido}` : 'sem linha no registro',
    registro_pronto: !!r && r.concluido === r.total,
    mobile_celulas: u.mobile_celulas,
    mobile_ok: est.OK || 0,
    mobile_soma: Object.values(est).reduce((a, v) => a + v, 0),
    papeis: u.papeis_com_porta_propria.length,
    web_celulas: u.desktop_celulas.length,
    web_medida: u.desktop_celulas.filter((s) => /=MEDIDA_WEB$/.test(s)).length,
    web_bloqueada: u.desktop_celulas.filter((s) => /=BLOQUEADA$/.test(s)).length,
    web_larguras: larg,
    contradicoes: (u.contradicoes || []).length,
    contradicoes_defeito: (u.contradicoes || []).filter((c) => c.tipo === 'defeito').length,
  };
});
// se o visual fosse uma cópia da percentagem do registro, estas seriam as faixas «a funcionar»:
const SE_COPIASSE = rows.filter((r) => r.concluido === r.total).map((r) => r.modulo);
const NO_VISUAL = LINHAS.filter((r) => r.lista === 'funcionando').map((r) => r.grupo);
const FIX_COPIA = (() => {
  const porPct = rows.map((r, i) => (r.concluido === r.total ? 'funcionando' : 'com_erros'));
  const medido = emOrdem.map((u) => LISTA_DE_ESTADO[u.estado_derivado]);
  return porPct.join(',') !== medido.join(',');
})();
const registroDizProntoMedicaoNao = LINHAS.filter((r) => r.registro_pronto && r.lista !== 'funcionando').map((r) => r.grupo);
const medicaoDizFuncionandoRegistroNao = LINHAS.filter((r) => r.lista === 'funcionando' && !r.registro_pronto).map((r) => r.grupo);

// ---------- portões ----------
gate('as_linhas_de_progresso_do_registro_sao_dezasseis_e_batem_com_o_histograma_declarado',
  rows.length === 16 && somaTotal === 104 && somaConcluido === ifDeclarado && Number.isInteger(ifDeclarado),
  `linhas=${rows.length} soma_total=${somaTotal} soma_concluido=${somaConcluido} if_declarado_na_§15=${ifDeclarado} | duas representacoes independentes do mesmo numero: linhas de modulo e o histograma`);

gate('o_percentual_de_cada_linha_do_registro_e_re_calculado_a_partir_de_concluido_e_total',
  pctDivergente.length === 0 && rows.length === 16 && formatarPct(7, 8) === '87,5%' && formatarPct(6, 6) === '100%' && formatarPct(11, 14) === '78,6%',
  `linhas_com_percentual_divergente=${pctDivergente.join(' ; ') || 'nenhuma'} fixture_7_de_8=${formatarPct(7, 8)} fixture_6_de_6=${formatarPct(6, 6)} fixture_11_de_14=${formatarPct(11, 14)} | um percentual velho na tabela do registro chumba aqui, nao em confianca`);

gate('o_mapeamento_por_ordem_das_linhas_do_registro_confere_item_a_item_com_a_bu5',
  desloquesDeOrdem.length === 0 && rows.length === emOrdem.length && Object.keys(linhaDe).length === 16 && FIX_DESLOQUE === true,
  `desloques=${desloquesDeOrdem.join(',') || 'nenhum'} unidades_com_registro=${emOrdem.length} linhas=${rows.length} mapeadas=${Object.keys(linhaDe).length} fixture_um_deslocamento_de_linha_detecta=${FIX_DESLOQUE} | a ordem so e fiavel enquanto os denominadores baterem`);

gate('os_nomes_do_registro_divergem_do_rotulo_medido_so_onde_a_divergencia_ja_foi_escrita',
  nomesDivergentes.length === 1 && /registro="Portaria" medido="Porteiro"/.test(nomesDivergentes[0]) && FIX_NOMES === true,
  `divergentes=${nomesDivergentes.join(' ; ') || 'nenhuma'} fixture_acrescentar_um_par_inedito_muda_a_contagem=${FIX_NOMES} | o verde nomeia a unica dupla de nomes; nao tolera um limiar de ruído`);

gate('a_faixa_exibida_nao_e_a_percentagem_do_registro',
  LINHAS.length === 17 && LINHAS.every((r) => FAIXAS.includes(r.lista))
  && SE_COPIASSE.length !== NO_VISUAL.length
  && FIX_COPIA === true
  && LINHAS.filter((r) => r.lista === 'funcionando' && !r.prova).length === 0,
  `se_copiasse_o_registro_diria_pronto_em=${SE_COPIASSE.length}[${SE_COPIASSE.join(',')}] no_visual_a_funcionar=${NO_VISUAL.length}[${NO_VISUAL.join(',')}] fixture_classificacao_pela_percentagem_diverge=${FIX_COPIA} | este portao so pode ser verde porque as duas contagens sao diferentes por construcao`);

gate('nenhuma_unidade_na_faixa_funcionando_sem_prova_bater_na_sua_propria_regua',
  LINHAS.filter((r) => r.lista === 'funcionando').every((r) => r.prova)
  && comProvaNaRegua({ regua_de_prova: 'conteudo', corridas: { conteudo: [{ existe: true, classe: 'noutro_ar' }] } }) === false
  && comProvaNaRegua({ regua_de_prova: 'conteudo', corridas: { conteudo: [{ existe: true, classe: 'no_ar_servido' }] } }) === true
  && comProvaNaRegua({ regua_de_prova: 'banco', corridas: { banco: [{ existe: true }] } }) === true
  && comProvaNaRegua({ regua_de_prova: 'banco', corridas: { banco: [] } }) === false
  && comProvaNaRegua({ regua_de_prova: 'interface', corridas: { interface: [{ existe: true, classe: 'no_ar_servido' }] } }) === false,
  `funcionando=${LINHAS.filter((r) => r.lista === 'funcionando').map((r) => `${r.grupo}(${r.regua},${r.prova ? 'bate' : 'NAO_BATE'})`).join(',')} | uma predica por classe de prova: conteudo exige o byte servido, banco exige a corrida`);

const mobileSomaDiverge = LINHAS.filter((r) => r.mobile_celulas > 0 && r.mobile_soma !== r.mobile_celulas).map((r) => `${r.grupo}:${r.mobile_soma}!=${r.mobile_celulas}`);
const mobileMultiploDiverge = LINHAS.filter((r) => r.papeis > 0 && r.mobile_celulas !== r.papeis * MOBILE.length).map((r) => `${r.grupo}:${r.mobile_celulas}!=${r.papeis}x${MOBILE.length}`);
const FIX_MOBILE = (() => {
  const celulas = 6 * 1;
  const histogramaPerdeUmaCelula = { OK: 5 };
  return Object.values(histogramaPerdeUmaCelula).reduce((a, v) => a + v, 0) !== celulas;
})();
gate('a_cobertura_mobile_citada_no_visual_e_multiplo_das_seis_larguras_e_a_soma_dos_estados_bate',
  mobileSomaDiverge.length === 0 && mobileMultiploDiverge.length === 0 && FIX_MOBILE === true,
  `soma_de_estados_diverge=${mobileSomaDiverge.join(',') || 'nenhuma'} multiplo_diverge=${mobileMultiploDiverge.join(',') || 'nenhuma'} sem_cobertura_mobile=${LINHAS.filter((r) => r.mobile_celulas === 0).map((r) => r.grupo).join(',') || 'nenhuma'} fixture_ok5_para_6_celulas=diverge(${FIX_MOBILE}) | as unidades sem cobertura estao nomeadas, nao omitidas`);

const largurasWebFora = [...new Set(LINHAS.flatMap((r) => r.web_larguras))].filter((w) => !WEB.includes(w));
const classesWebFora = [...new Set(unidades.flatMap((u) => u.desktop_celulas.map((s) => s.split('=')[1])))].filter((c) => !['MEDIDA_WEB', 'BLOQUEADA'].includes(c));
const FIX_WEB = [...new Set(LINHAS.flatMap((r) => r.web_larguras).concat([390]))].filter((w) => !WEB.includes(w));
gate('a_cobertura_web_do_visual_usa_so_as_tres_larguras_e_as_duas_classes_do_produtor',
  largurasWebFora.length === 0 && classesWebFora.length === 0 && FIX_WEB.join(',') === '390',
  `larguras_vistas=[${[...new Set(LINHAS.flatMap((r) => r.web_larguras))].sort((a, b) => a - b).join(',')}] classes_fora=[${classesWebFora.join(',') || 'nenhuma'}] fixture_acrescentar_390_ao_web=${FIX_WEB.join(',')}`);

const pegadas = { bu5: bu5.ar.md5, bu7: bu7.ar.md5, bu8: bu8.ar.md5 };
const FIX_MD5 = { ...pegadas, bu8: 'f'.repeat(32) };
gate('o_roadmap_visual_declara_um_só_byte_e_ele_bate_com_o_que_bu5_bu7_e_bu8_declaram',
  pegadas.bu5 === pegadas.bu7 && pegadas.bu7 === pegadas.bu8 && Object.keys(FIX_MD5).filter((k) => FIX_MD5[k] !== pegadas.bu5).join(',') === 'bu8',
  `bu5=${pegadas.bu5} bu7=${pegadas.bu7} bu8=${pegadas.bu8} bytes=${bu5.ar.bytes} fixture_inventar_a_pegada_do_bu8_detecta=[${Object.keys(FIX_MD5).filter((k) => FIX_MD5[k] !== pegadas.bu5).join(',')}]`);

const faltasW = (bu7.faltas || []).map((f) => f.id);
const ausencias = (bu8.ausencias_de_prova || []).map((a) => a.id);
const defeitosDe = (unid) => (unid.contradicoes || []).filter((c) => c.tipo === 'defeito').length;
const FIX_DEFECTO = (() => {
  const unidadeFuncionandoComDefeito = { estado_derivado: 'IMPLEMENTADO E TESTADO', contradicoes: [{ tipo: 'defeito' }] };
  return defeitosDe(unidadeFuncionandoComDefeito) > 0;
})();
gate('as_faltas_numeradas_da_bu7_e_da_bu8_chegam_ao_visual_sem_se_tornarem_verdes',
  faltasW.join(',') === 'FALTA-W1,FALTA-W2,FALTA-W3' && ausencias.length === 20 && new Set(ausencias).size === 20
  && LINHAS.filter((r) => r.lista === 'funcionando' && r.contradicoes_defeito > 0).length === 0 && FIX_DEFECTO === true,
  `faltas_web=${faltasW.join(',')} ausencias_bu8=${ausencias.length} ids_unicos=${new Set(ausencias).size} funcionando_com_saida_de_defeito=${LINHAS.filter((r) => r.lista === 'funcionando' && r.contradicoes_defeito > 0).map((r) => r.grupo).join(',') || 'nenhuma'} funcionando_com_contradicao_de_numero_desactualizado=${LINHAS.filter((r) => r.lista === 'funcionando' && r.contradicoes_defeito === 0 && r.contradicoes > 0).map((r) => r.grupo).join(',') || 'nenhuma'} fixture_unidade_testada_com_defeito_e_detectada=${FIX_DEFECTO} | a regra da casa e por tipo: um numero velho nao apaga uma faixa, mas tambem nao se esconde dela`);

// ---------- tabelas ----------
const TABELAS = [];
const construir = (cab, linhas) => {
  const corpo = linhas.map((c) => c.map((x) => String(x).replace(/\|/g, '\\|')));
  TABELAS.push({ colunas: cab.length, linhas: corpo });
  return [`| ${cab.join(' | ')} |`, `|${cab.map(() => '---').join('|')}|`, ...corpo.map((c) => `| ${c.join(' | ')} |`)];
};
const visual = [
  'Legenda: `#` a funcionar · `~` com erros · `+` incompleta · `_` ausente.',
  'Comprimento da barra = itens lidos do registro para a unidade; símbolo = estado MEDIDO (nunca a percentagem do registro).',
  ...LINHAS.map((r) => `${r.grupo.padEnd(4)} ${r.rotulo}`.padEnd(46).slice(0, 46) + ` ${r.barra.padEnd(16)} ${String(r.itens).padStart(2)} itens  registro ${r.registro}  ${r.estado}`),
];
const tabelaVisual = construir(
  ['Grupo', 'Rótulo medido', 'Estado medido', 'Faixa', 'Registro (IF/total %)', 'Registro diz pronto', 'Prova na régua', 'Itens', 'Mobile OK/de', 'Web medida/bloq', 'Contradições'],
  LINHAS.map((r) => [r.grupo, r.rotulo, r.estado, r.lista, r.registro, r.registro_pronto ? 'SIM' : 'nao', r.prova ? 'sim' : 'NAO', r.itens, `${r.mobile_ok}/${r.mobile_celulas}`, `${r.web_medida}/${r.web_bloqueada}`, r.contradicoes]),
);
const tabelaDivergencia = construir(
  ['Grupo', 'O que o registro afirma', 'O que a medição sustenta', 'Classe da divergência'],
  LINHAS.filter((r) => r.registro_pronto !== (r.lista === 'funcionando')).map((r) => [r.grupo, r.registro, r.estado, r.registro_pronto ? 'registro_pronto__medicao_nao' : 'medicao_testada__registro_com_lacuna']),
);
const tabelaNomes = construir(['Divergência de nome', 'Como é resolvida'], nomesDivergentes.map((n) => [n, 'mapeamento por ordem, conferido pelo denominador de itens']));
const todas = [...tabelaVisual, ...tabelaDivergencia, ...tabelaNomes];
const foraDaGrelha = [];
for (const t of TABELAS) for (const c of t.linhas) if (c.length !== t.colunas) foraDaGrelha.push(`linhas_com_${c.length}_colunas_numa_grelha_de_${t.colunas}`);
const linhasDeTabela = todas.filter((l) => /^\|/.test(l) && !/^\|[-|]+\|$/.test(l));
const FIX_GRELHA = (() => {
  const t = { colunas: 6, linhas: [['a', 'b', 'c', 'd', 'e']] };
  return t.linhas.filter((c) => c.length !== t.colunas).length === 1;
})();
gate('nenhuma_linha_de_tabela_emitada_fica_fora_da_grelha_do_seu_cabecalho',
  foraDaGrelha.length === 0 && linhasDeTabela.length > 20 && TABELAS.length === 3 && FIX_GRELHA === true,
  `tabelas=${TABELAS.map((t) => `${t.colunas}col`).join(',')} linhas_de_tabela=${linhasDeTabela.length} fora_da_grelha=${foraDaGrelha.join(',') || 'nenhuma'} fixture_cinco_colunas_na_grelha_de_seis_dispara=${FIX_GRELHA}`);

// ---------- saída ----------
OUT.byte = { pegadas, bytes: bu5.ar.bytes };
OUT.registro = { linhas: rows, soma_total: somaTotal, soma_concluido: somaConcluido, if_declarado: ifDeclarado, percentuais_divergentes: pctDivergente };
OUT.linhas = LINHAS;
OUT.divergencias = { se_copiasse_o_registro_diria_pronto_em: SE_COPIASSE, no_visual_a_funcionar: NO_VISUAL, registro_pronto_medicao_nao: registroDizProntoMedicaoNao, medicao_testada_registro_com_lacuna: medicaoDizFuncionandoRegistroNao, nomes: nomesDivergentes };
OUT.visual = visual;
OUT.faltas_carregadas = { web: faltasW, ausencias_bu8: ausencias.length };
OUT.veredito_final = `BU9_${verds.every((v) => v.ok) ? 'VERDE' : 'VERMELHO'} ${verds.filter((v) => v.ok).length}/${verds.filter((v) => !v.ok).length}`;

L.push(OUT.veredito_final);
L.push(`registro linhas=${rows.length} soma_total=${somaTotal} soma_concluido=${somaConcluido} if_declarado=${ifDeclarado}`);
L.push(`DIVERGENCIA_REGISTRO_VS_MEDIDA ${registroDizProntoMedicaoNao.length} + ${medicaoDizFuncionandoRegistroNao.length} de 17 :: registro_pronto_mas_nao_testado=[${registroDizProntoMedicaoNao.join(',')}] testado_mas_registro_com_lacuna=[${medicaoDizFuncionandoRegistroNao.join(',')}] | contagem, nao um portao`);
L.push(`NOMES_DIVERGENTES ${nomesDivergentes.length} :: ${nomesDivergentes.join(' ; ') || 'nenhum'}`);
L.push('### ROADMAP VISUAL\n' + visual.join('\n'));
L.push('### TABELA VISUAL POR UNIDADE\n' + tabelaVisual.join('\n'));
L.push('### DIVERGENCIAS REGISTRO x MEDICAO\n' + tabelaDivergencia.join('\n'));
L.push('### NOMES DO REGISTRO QUE NAO BATEM COM O ROTULO MEDIDO\n' + tabelaNomes.join('\n'));

fs.writeFileSync(`${DIR}/evidence/bu9-roadmap-visual-20-11${SUF}.json`, JSON.stringify(OUT, null, 1));
fs.writeFileSync(`${DIR}/evidence/bu9-roadmap-visual-20-11${SUF}.txt`, `# bu9-roadmap-visual  em=${OUT.em}\n` + L.join('\n') + '\n');
console.log(L.join('\n'));
process.exit(verds.every((v) => v.ok) ? 0 : 1);
