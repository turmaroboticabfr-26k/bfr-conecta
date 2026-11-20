// BU-7 — inventários mobile e web, medidos e emitidos SEPARADOS (briefing: não misturar as duas arquiteturas)
import fs from 'node:fs';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = process.env.BU7_SUF || '';
const L = [];
const OUT = { em: new Date().toISOString(), instrumento: 'scripts/bu7-inventarios-20-11.mjs', modo: 'read-only' };
const verds = [];
const gate = (nome, ok, detalhe) => { verds.push({ nome, ok, detalhe }); L.push(`${ok ? 'V' : 'X'} ${nome} :: ${detalhe}`); };

const le = (c) => JSON.parse(fs.readFileSync(`${DIR}/${c}`, 'utf8'));
const p73 = le('evidence/p73-cobertura-m5-por-ar-20-11.json');
const sm25 = le('evidence/sm25-cobertura-desktop-20-11.json');
const portas = le('evidence/bu5-portas-do-ar-20-11.json');
const bu5 = le('evidence/bu5-unidades-do-roadmap-20-11.json');
const AR = bu5.ar.md5;

const MOBILE = [320, 360, 375, 390, 414, 430];
const WEB = [1280, 1440, 1920];
const MOTIVOS = ['coerente', 'travada_com_causa', 'por_medir'];

const papeisMobile = Object.keys(p73.tabela);
const celulasMobile = [];
for (const p of papeisMobile) for (const w of MOBILE) celulasMobile.push({ papel: p, largura: w, estado: p73.tabela[p][w] || 'FALTA' });
const conta = {};
for (const c of celulasMobile) conta[c.estado] = (conta[c.estado] || 0) + 1;
const porLarguraMobile = MOBILE.map((w) => {
  const cs = celulasMobile.filter((c) => c.largura === w);
  return { largura: w, celulas: cs.length, OK: cs.filter((c) => c.estado === 'OK').length, TRAVADA: cs.filter((c) => c.estado === 'TRAVADA').length, por_medir: cs.filter((c) => c.estado === 'por_medir').length };
});
const porPapelMobile = papeisMobile.map((p) => {
  const cs = celulasMobile.filter((c) => c.papel === p);
  return { papel: p, celulas: cs.length, OK: cs.filter((c) => c.estado === 'OK').length, TRAVADA: cs.filter((c) => c.estado === 'TRAVADA').length, por_medir: cs.filter((c) => c.estado === 'por_medir').length, portas: portas.portas_por_papel[p] };
});

const causas = Object.entries(p73.causas_de_trava);
const travadas = celulasMobile.filter((c) => c.estado === 'TRAVADA').map((c) => `${c.papel}@${c.largura}`);
const semCausa = travadas.filter((k) => !p73.causas_de_trava[k]);
const causaSemCelula = causas.map(([k]) => k).filter((k) => !travadas.includes(k));
const porMedir = celulasMobile.filter((c) => c.estado === 'por_medir').map((c) => `${c.papel}@${c.largura}`);

const celulasWeb = sm25.celulas;
const bloqueadas = celulasWeb.filter((c) => c.classe === 'BLOQUEADA');
const semCausaWeb = bloqueadas.filter((c) => !c.causa_bloqueio);
const webNoAr = celulasWeb.filter((c) => c.md5_shell !== AR).map((c) => `${c.papel}@${c.largura}`);
const somaPorLargura = WEB.reduce((a, w) => a + sm25.porLargura[w].celulas, 0);

// ---- portões -------------------------------------------------------------
const grelhaDeclarada = p73.grelha.match(/(\d+) papeis × (\d+) larguras = (\d+) celulas/);
gate('a_grelha_mobile_confere_com_a_string_declarada_pelo_p73',
  !!grelhaDeclarada && Number(grelhaDeclarada[1]) === papeisMobile.length && Number(grelhaDeclarada[2]) === MOBILE.length
  && Number(grelhaDeclarada[3]) === celulasMobile.length && celulasMobile.every((c) => c.estado !== 'FALTA'),
  `declarado="${p73.grelha}" lido: papeis=${papeisMobile.length} larguras=${MOBILE.length} celulas=${celulasMobile.length} lacunas=${celulasMobile.filter((c) => c.estado === 'FALTA').length}`);

const foraMotivos = Object.keys(p73.motivos).filter((k) => !MOTIVOS.includes(k));
const FIX_MOTIVO = ['coerente', 'travada_com_causa', 'por_medir', 'estado_inventado'].filter((k) => !MOTIVOS.includes(k));
gate('os_motivos_do_p73_sao_os_tres_declarados_e_a_contagem_nao_e_vacua',
  foraMotivos.length === 0 && MOTIVOS.reduce((a, k) => a + (p73.motivos[k] || 0), 0) === celulasMobile.length && FIX_MOTIVO.join(',') === 'estado_inventado',
  `motivos=${JSON.stringify(p73.motivos)} soma=${MOTIVOS.reduce((a, k) => a + (p73.motivos[k] || 0), 0)} de ${celulasMobile.length} fixture_inedito_rejeita=[${FIX_MOTIVO.join(',')}]`);

gate('cada_causa_de_trava_aponta_para_uma_celula_TRAVADA_e_cada_TRAVADA_tem_causa',
  causaSemCelula.length === 0 && semCausa.length === 0 && causas.length === travadas.length && travadas.includes('monitor@320') && !travadas.includes('parent@320'),
  `causas=${causas.length} travadas=${travadas.length} sem_causa=${semCausa.join(',') || 'nenhuma'} causa_sem_celula=${causaSemCelula.join(',') || 'nenhuma'} fixture_parent@320_e_OK? ${p73.tabela.parent['320'] === 'OK'}`);

const largurasVistas = new Set(celulasMobile.map((c) => c.largura));
const inter = [...largurasVistas].filter((w) => WEB.includes(w));
const FIX_INTER = [...largurasVistas, 1280].filter((w) => WEB.includes(w));
gate('mobile_e_web_nao_partilham_uma_só_largura',
  inter.length === 0 && [...largurasVistas].sort().join(',') === MOBILE.join(',') && FIX_INTER.join(',') === '1280',
  `mobile=[${[...largurasVistas].sort((a, b) => a - b).join(',')}] web=[${WEB.join(',')}] interseccao=${inter.join(',') || 'vazia'} fixture_acrescentar_1280_ao_mobile=${FIX_INTER.join(',')}`);

const nomesUnicos = new Set(Object.values(portas.destinos_por_papel).flat().map((s) => String(s).split('«')[0]));
const somaRotulos = Object.values(portas.destinos_por_papel).flat().length;
const somaIndice = Object.values(portas.indice_invertido).reduce((a, v) => a + v.n, 0);
const somaPortasPorPapel = Object.values(portas.portas_por_papel).reduce((a, v) => a + v, 0);
gate('as_portas_por_papel_sao_re_contadas_sem_confundir_rotulo_com_destino',
  nomesUnicos.size === Object.keys(portas.indice_invertido).length && somaRotulos === somaPortasPorPapel && somaIndice === somaRotulos && nomesUnicos.size < somaRotulos,
  `destinos_distintos=${nomesUnicos.size} rotulos_somados=${somaRotulos} portas_por_papel=${somaPortasPorPapel} indice_invertido_n=${somaIndice} chaves_do_indice=${Object.keys(portas.indice_invertido).length}`);

const largurasVistasNoCenso = [...new Set(Object.values(portas.larguras_por_papel).flat().map((w) => Number(w)))];
const FIX_BANDA = [...new Set(largurasVistasNoCenso.concat([1280]))].filter((w) => !MOBILE.includes(w));
gate('o_censo_de_portas_por_papel_usa_so_larguras_da_banda_mobile_do_briefing',
  largurasVistasNoCenso.every((w) => MOBILE.includes(w))
  && Object.keys(portas.larguras_por_papel).length === portas.papeis && FIX_BANDA.join(',') === '1280',
  `larguras_vistas=[${largurasVistasNoCenso.sort((a, b) => a - b).join(',')}] papeis_no_censo=${Object.keys(portas.larguras_por_papel).length} de ${portas.papeis} fora_da_banda=${largurasVistasNoCenso.filter((w) => !MOBILE.includes(w)).join(',') || 'nenhuma'} fixture_acrescentar_1280_ao_censo=${FIX_BANDA.join(',')}`);

const semPorta = [];
for (const p of papeisMobile) for (const w of MOBILE) if (!(portas.larguras_por_papel[p] || []).map((x) => Number(x)).includes(w)) semPorta.push({ celula: `${p}@${w}`, estado: p73.tabela[p][w] });
const okSemPorta = semPorta.filter((s) => s.estado === 'OK').map((s) => s.celula);
const estadoFora = [...new Set(semPorta.map((s) => s.estado))].filter((e) => ['OK', 'COERENTE'].includes(e));
gate('os_lugares_sem_contagem_de_portas_sao_so_celulas_que_nao_chegaram_a_shell',
  okSemPorta.length === 0 && estadoFora.length === 0 && semPorta.length > 0 && semPorta.every((s) => ['TRAVADA', 'por_medir'].includes(s.estado)),
  `sem_contagem=${semPorta.length} de ${celulasMobile.length} estados=${[...new Set(semPorta.map((s) => s.estado))].join(',')} celulas=[${semPorta.map((s) => s.celula).join(',')}] ok_sem_porta=${okSemPorta.join(',') || 'nenhum'} | o verde nao apaga a lacuna: exige que toda lacuna seja uma celula Travada ou por medir`);


gate('o_total_web_tem_tres_representacoes_independentes_que_batem',
  sm25.total.celulas === somaPorLargura && sm25.total.celulas === celulasWeb.length && WEB.every((w) => sm25.porLargura[w].celulas === papeisMobile.length),
  `total.celulas=${sm25.total.celulas} soma_por_largura=${somaPorLargura} comprimento_celulas=${celulasWeb.length} papeis_por_largura=${WEB.map((w) => `${w}:${sm25.porLargura[w].celulas}`).join(',')}`);

gate('toda_celula_bloqueada_web_tem_causa_declarada',
  semCausaWeb.length === 0 && bloqueadas.length === sm25.total.bloqueada && FIX_MOTIVO.length === 1,
  `bloqueadas=${bloqueadas.length} de ${sm25.total.celulas} sem_causa=${semCausaWeb.map((c) => `${c.papel}@${c.largura}`).join(',') || 'nenhuma'}`);

gate('a_sessao_web_de_cada_celula_cita_o_byte_servido',
  webNoAr.length === 0 && celulasWeb.every((c) => !!c.artefacto && fs.existsSync(`${DIR}/${c.artefacto}`)),
  `celulas=${celulasWeb.length} md5_shell_diferente_do_ar=${webNoAr.join(',') || 'nenhuma'} artefactos_em_falta=${celulasWeb.filter((c) => !fs.existsSync(`${DIR}/${c.artefacto}`)).map((c) => c.artefacto).join(',') || 'nenhum'}`);

const sessoesM5 = { ficheiros: portas.m5_ficheiros, no_ar: portas.m5_no_ar, doutro_ar: portas.m5_doutro_ar };
gate('as_sessoes_m5_do_censo_de_portas_declarao_a_divisao_por_byte',
  sessoesM5.no_ar + sessoesM5.doutro_ar === sessoesM5.ficheiros && sessoesM5.doutro_ar > 0,
  `m5_ficheiros=${sessoesM5.ficheiros} no_ar=${sessoesM5.no_ar} doutro_ar=${sessoesM5.doutro_ar} | o verde nao exige zero sessoes velhas: exige que a divisao feche`);

// ---- faltas numeradas (falta de prova nao e régua verde) ----------------
const LER = fs.readFileSync(`${DIR}/scripts/ah2-mobile2.mjs`, 'utf8');
const barraComGeometria = [];
let abertasSoma = 0, rotulosBarraWeb = 0;
for (const c of celulasWeb) {
  const j = le(c.artefacto);
  for (const [w, b] of Object.entries(j.bandas || {})) {
    const ent = (b.censo && b.censo.barra) || [];
    const v = ent.filter((x) => x.w > 0 && x.h > 0).length;
    abertasSoma += (typeof b.abertas === 'number' ? b.abertas : 0);
    rotulosBarraWeb += ent.length;
    if (v > 0) barraComGeometria.push(`${c.papel}@${w}=${v}`);
  }
}
const SELETOR_DESKTOP = 'bfr-single-home-navigation';
const desktopNoLeitor = LER.includes(SELETOR_DESKTOP);
const FALTAS = [
  { id: 'FALTA-W1', afirma: 'nenhum painel foi aberto em nenhuma célula web', medido: `abertas_soma=${abertasSoma} em ${celulasWeb.length} celulas`, exige: 'passada autenticada com clique no container de navegação real do desktop' },
  { id: 'FALTA-W2', afirma: 'as entradas contadas na barra web não têm geometria', medido: `entradas_com_geometria=${barraComGeometria.length || 'nenhuma'} de ${rotulosBarraWeb} rotulos_lidos_das_${celulasWeb.length}_celulas`, exige: 'régua de hit-teste (elementFromPoint) sobre o alvo desktop, não sobre #bfrMobileBottomNav' },
  { id: 'FALTA-W3', afirma: `o instrumento de browser não conhece o container de navegação do desktop (\`${SELETOR_DESKTOP}\` presente no bundle servido)`, medido: `aparece_em_ah2-mobile2.mjs=${desktopNoLeitor}`, exige: 'novo selector lido do bundle, nunca dactilografado' },
];
OUT.faltas = FALTAS;
gate('as_faltas_do_web_sao_numeradas_e_tem_a_medida_que_las_origina',
  FALTAS.length === 3 && FALTAS.every((f) => /^FALTA-W\d$/.test(f.id) && f.medido.includes('=') && f.exige.length > 10)
  && FALTAS.map((f) => f.id).join(',') === 'FALTA-W1,FALTA-W2,FALTA-W3'
  && FALTAS.every((f) => !/TODO|XXX|inferido/.test(`${f.afirma}${f.medido}`)),
  `faltas=${FALTAS.map((f) => f.id).join(',')} abertas_soma=${abertasSoma} barra_com_geometria=${barraComGeometria.length} seletor_desktop_no_leitor=${desktopNoLeitor} | uma falta nao se converte em verde: o verde exige que cada falta traga a mediacao que a nomeia`);

// ---- tabelas para os dois documentos ------------------------------------
const md = (linhas) => linhas.join('\n');
const tabelaMobile = md([
  '| Papel | Portas no ar | Larguras com contagem | OK | TRAVADA | por medir | de |',
  '|---|---|---|---|---|---|---|',
  ...porPapelMobile.map((r) => `| ${r.papel} | ${r.portas} | ${(portas.larguras_por_papel[r.papel] || []).length}/6 | ${r.OK} | ${r.TRAVADA} | ${r.por_medir} | ${r.celulas} |`),
]);
const tabelaLacuna = md([
  '| Célula sem contagem de portas | Estado medido no p73 |',
  '|---|---|',
  ...semPorta.map((s) => `| ${s.celula} | ${s.estado} |`),
]);
const tabelaLarguraMobile = md([
  '| Largura | OK | TRAVADA | por medir | de |',
  '|---|---|---|---|---|',
  ...porLarguraMobile.map((r) => `| ${r.largura} | ${r.OK} | ${r.TRAVADA} | ${r.por_medir} | ${r.celulas} |`),
]);
const tabelaCausas = md(['| Célula | Causa medida |', '|---|---|', ...causas.map(([k, v]) => `| ${k} | ${v} |`)]);
const tabelaWeb = md([
  '| Papel | 1280 | 1440 | 1920 |',
  '|---|---|---|---|',
  ...papeisMobile.map((p) => `| ${p} | ${WEB.map((w) => (celulasWeb.find((c) => c.papel === p && String(c.largura) === String(w)) || { classe: 'FALTA' }).classe).join(' | ')} |`),
]);
const tabelaBloqueadas = md(['| Célula | Causa de bloqueio |', '|---|---|', ...bloqueadas.map((c) => `| ${c.papel}@${c.largura} | ${c.causa_bloqueio} |`)]);
const tabelaReguaWeb = md([
  '| Largura | células | MEDIDA_WEB | BLOQUEADA | estouro vermelho | shell diverge |',
  '|---|---|---|---|---|---|',
  ...WEB.map((w) => `| ${w} | ${sm25.porLargura[w].celulas} | ${sm25.porLargura[w].medida_web} | ${sm25.porLargura[w].bloqueada} | ${sm25.porLargura[w].estouro_vermelho} | ${sm25.porLargura[w].shell_diverge} |`),
]);

OUT.ar = { md5: AR, bytes: bu5.ar.bytes };
OUT.mobile = { grelha: p73.grelha, celulas: celulasMobile.length, conta, por_papel: porPapelMobile, por_largura: porLarguraMobile, causas: Object.fromEntries(causas), por_medir: porMedir, ar: p73.ar, motivos: p73.motivos, portas_por_papel: portas.portas_por_papel, larguras_por_papel: portas.larguras_por_papel, sessoes_m5: sessoesM5, excecoes_de_nav: ['more'], sem_contagem_de_portas: semPorta };
OUT.web = { total: sm25.total, por_largura: sm25.porLargura, bloqueadas, vereditos_por_celula: celulasWeb.reduce((a, c) => ({ ...a, [c.veredito]: (a[c.veredito] || 0) + 1 }), {}), artefactos_ok: celulasWeb.every((c) => fs.existsSync(`${DIR}/${c.artefacto}`)) };

const veredeitoFinal = verds.every((v) => v.ok) ? 'VERDE' : 'VERMELHO';
OUT.veredito_final = `BU7_${veredeitoFinal} ${verds.filter((v) => v.ok).length}/${verds.filter((v) => !v.ok).length}`;
L.push(OUT.veredito_final);
L.push(`mobile celulas=${celulasMobile.length} conta=${JSON.stringify(conta)} causas=${causas.length} por_medir=[${porMedir.join(',')}]`);
L.push(`web celulas=${celulasWeb.length} total=${JSON.stringify(sm25.total)}`);
L.push('### TABELA MOBILE POR PAPEL\n' + tabelaMobile);
L.push('### TABELA MOBILE POR LARGURA\n' + tabelaLarguraMobile);
L.push('### TABELA MOBILE SEM CONTAGEM DE PORTAS\n' + tabelaLacuna);
L.push('### TABELA CAUSAS DE TRAVA\n' + tabelaCausas);
L.push('### TABELA WEB POR PAPEL\n' + tabelaWeb);
L.push('### TABELA WEB BLOQUEADAS\n' + tabelaBloqueadas);
L.push('### TABELA WEB POR LARGURA\n' + tabelaReguaWeb);
L.push('### FALTAS DO WEB (falta de prova, nao régua)\n' + md(['| ID | O que falta | Medido que o nomeia | O que exige para fechar |', '|---|---|---|---|', ...FALTAS.map((f) => `| ${f.id} | ${f.afirma} | ${f.medido} | ${f.exige} |`)]));

fs.writeFileSync(`${DIR}/evidence/bu7-inventarios-20-11${SUF}.json`, JSON.stringify(OUT, null, 1));
fs.writeFileSync(`${DIR}/evidence/bu7-inventarios-20-11${SUF}.txt`, `# bu7-inventarios  em=${OUT.em}\n` + L.join('\n') + '\n');
console.log(L.join('\n'));
process.exit(verds.every((v) => v.ok) ? 0 : 1);
