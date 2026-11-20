// BU-8 — as quatro listas (funcionando / com erros / incompletas / ausentes), derivadas dos estados, nunca dactilografadas
import fs from 'node:fs';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = process.env.BU8_SUF || '';
const le = (c) => JSON.parse(fs.readFileSync(`${DIR}/${c}`, 'utf8'));
const bu5 = le('evidence/bu5-unidades-do-roadmap-20-11.json');
const bu7 = le('evidence/bu7-inventarios-20-11.json');
const p73 = le('evidence/p73-cobertura-m5-por-ar-20-11.json');

const L = [];
const verds = [];
const gate = (nome, ok, detalhe) => { verds.push({ nome, verde: ok, detalhe }); L.push(`${ok ? 'V' : 'X'} ${nome} :: ${detalhe}`); };

// A única autoridade de classificação é o estado derivado pela BU-5. Trocar uma linha à mão é exactamente o
// defeito que o briefing aponta («não considere concluído porque aparece na interface»).
const LISTA_PARA_ESTADO = {
  funcionando: ['IMPLEMENTADO E TESTADO'],
  com_erros: ['IMPLEMENTADO COM ERROS'],
  incompletas: ['PARCIALMENTE IMPLEMENTADO', 'IMPLEMENTADO, MAS NÃO TESTADO'],
  ausentes: ['SOMENTE INTERFACE', 'NÃO IMPLEMENTADO', 'NÃO FOI POSSÍVEL VERIFICAR'],
};
const listaDe = (estado) => Object.entries(LISTA_PARA_ESTADO).find(([, es]) => es.includes(estado))?.[0] || null;

const unidades = bu5.unidades;
const saidos = {};
const semLista = [];
for (const u of unidades) {
  const l = listaDe(u.estado_derivado);
  if (!l) { semLista.push(`${u.grupo}=${u.estado_derivado}`); continue; }
  (saidos[l] ||= []).push({ grupo: u.grupo, rotulo: u.rotulo, estado: u.estado_derivado, regua: u.regua_de_prova, prova_bateu: !!u.prova_bateu, causas: (u.contradicoes || []).filter((c) => c.tipo === 'defeito').length });
}
const contras = unidades.flatMap((u) => (u.contradicoes || []).map((c) => ({ ...c, grupo: u.grupo, estado: u.estado_derivado })));
const defeitos = contras.filter((c) => c.tipo === 'defeito');
const provasAusentes = contras.filter((c) => c.tipo === 'prova_ausente');
const numerosDesactualizados = contras.filter((c) => c.tipo === 'numero_desactualizado');

// ---- faltas de prova (nem erro, nem incompleto: não sei) -----------------
const mobilePorMedir = bu7.mobile.por_medir;
const lacunasCenso = bu7.mobile.sem_contagem_de_portas;
const webFaltas = bu7.faltas;
const AUSENCIAS_DE_PROVA = [
  ...webFaltas.map((f) =>({ id: f.id, onde: 'web', afirma: f.afirma, medido: f.medido, exige: f.exige })),
  ...mobilePorMedir.map((c) =>({ id: `MED-POR-${c}`, onde: 'mobile', afirma: `célula ${c} sem medida`, medido: `estado lido do p73: ${p73.tabela[c.split('@')[0]][c.split('@')[1]]}`, exige: 'lançar browser nessa célula' })),
  ...lacunasCenso.map((s) =>({ id: `CENSO-${s.celula}`, onde: 'mobile', afirma: `censo de portas não tem o que contar em ${s.celula}`, medido: `estado ${s.estado}`, exige: 'chegar a shell montado (mesmo defeito/estado já listado)' })),
];

// ---- erros de produto vs estado de produto --------------------------------
const CAUSA_BARRA = 'módulo de apresentação mobile não montou a barra';
const CAUSA_PENDENCIA = 'barreira de pendência';
const causas = Object.entries(p73.causas_de_trava);
const deBarra = causas.filter(([, v]) => v.includes(CAUSA_BARRA)).map(([k]) => k);
const dePendencia = causas.filter(([, v]) => v.includes(CAUSA_PENDENCIA)).map(([k]) => k);
const deOutras = causas.filter(([, v]) => !v.includes(CAUSA_BARRA) && !v.includes(CAUSA_PENDENCIA)).map(([k]) => k);

// ---- portões --------------------------------------------------------------
const nomesListas = ['funcionando', 'com_erros', 'incompletas', 'ausentes'];
const emListas = nomesListas.reduce((a, l) => a + (saidos[l] || []).length, 0);
const duplicados = unidades.map((u) => u.grupo).filter((g, i, arr) => arr.indexOf(g) !== i);
const FIX_DUPLICADO = unidades.map((u) => u.grupo).concat([unidades[0].grupo]).filter((g, i, arr) => arr.indexOf(g) !== i);
gate('as_quatro_listas_particionam_as_unidades_sem_duplicar_nem_esquecer',
  emListas === unidades.length && duplicados.length === 0 && semLista.length === 0 && FIX_DUPLICADO.join(',') === unidades[0].grupo,
  `unidades=${unidades.length} nas_listas=${emListas} ${nomesListas.map((l) => `${l}=${(saidos[l] || []).length}`).join(' ')} sem_lista=${semLista.join(',') || 'nenhuma'} duplicados=${duplicados.join(',') || 'nenhum'} fixture_acrescentar_uma_copia_de_${unidades[0].grupo}=${FIX_DUPLICADO.join(',')}`);

const estadosForaDoMapa = [...new Set(unidades.map((u) => u.estado_derivado))].filter((e) => !listaDe(e));
const FIX_ESTADO_NOVO = ['IMPLEMENTADO E TESTADO', 'ESTADO_QUE_A_BU5_NUNCA_PRODUZ'].filter((e) => !listaDe(e));
const ROTULOS_DO_BRIEFING = ['IMPLEMENTADO E TESTADO', 'IMPLEMENTADO, MAS NÃO TESTADO', 'IMPLEMENTADO COM ERROS', 'PARCIALMENTE IMPLEMENTADO', 'SOMENTE INTERFACE', 'NÃO IMPLEMENTADO', 'NÃO FOI POSSÍVEL VERIFICAR'];
const estadosDoMapa = Object.values(LISTA_PARA_ESTADO).flat();
const foraDosSete = estadosDoMapa.filter((e) => !ROTULOS_DO_BRIEFING.includes(e));
const repetidosNoMapa = estadosDoMapa.filter((e, i, arr) => arr.indexOf(e) !== i);
const FIX_OITAVO = [...ROTULOS_DO_BRIEFING, 'IMPLEMENTADO MAIS OU MENOS'].filter((e) => !ROTULOS_DO_BRIEFING.slice(0, 7).includes(e));
gate('a_lista_e_funcao_do_estado_derivado_e_recusa_estado_desconhecido',
  estadosForaDoMapa.length === 0 && foraDosSete.length === 0 && repetidosNoMapa.length === 0
  && FIX_ESTADO_NOVO.join(',') === 'ESTADO_QUE_A_BU5_NUNCA_PRODUZ' && FIX_OITAVO.join(',') === 'IMPLEMENTADO MAIS OU MENOS',
  `estados_lidos=${[...new Set(unidades.map((u) => u.estado_derivado))].join(' | ')} rotulos_no_mapa=${estadosDoMapa.length} rotulos_do_briefing=${ROTULOS_DO_BRIEFING.length} fora_dos_sete=${foraDosSete.join(',') || 'nenhum'} repetidos_no_mapa=${repetidosNoMapa.join(',') || 'nenhum'} fixture_estado_inedito_fica_fora=[${FIX_ESTADO_NOVO.join(',')}]`);

const defeitoSemCausa = defeitos.filter((d) => !d.medido || d.medido.length < 10);
const artefactosEmFalta = contras.filter((c) => c.artefacto && !fs.existsSync(`${DIR}/${c.artefacto}`)).map((c) => `${c.grupo}:${c.artefacto}`);
gate('cada_saida_tem_causa_textual_e_o_artefacto_que_a_nomeia_existe_em_disco',
  defeitoSemCausa.length === 0 && artefactosEmFalta.length === 0 && contras.length === 12 && defeitos.length === 8 && provasAusentes.length === 3 && numerosDesactualizados.length === 1,
  `contradicoes=${contras.length} defeito=${defeitos.length} prova_ausente=${provasAusentes.length} numero_desactualizado=${numerosDesactualizados.length} sem_causa=${defeitoSemCausa.map((d) => d.grupo).join(',') || 'nenhum'} artefactos_em_falta=${artefactosEmFalta.join(',') || 'nenhum'}`);

// Uma régua por classe de prova, porque as duas classes não vivem no mesmo universo: a prova de `conteudo` é
// uma sessão de browser e tem de citar o byte servido; a prova de `banco` é uma leitura de catálogo e é
// independente do byte por natureza. Exigir `no_ar_servido` a uma unidade de régua `banco` era a forma
// agregada do mesmo defeito (a minha 1.ª versão deste portão chumbou 5.16 por isso, e o motivo está no vermelho).
const unidadeComProvaNaRegua = (u) => {
  const arr = (u.corridas || {})[u.regua_de_prova] || [];
  if (u.regua_de_prova === 'conteudo') return arr.some((c) => c.existe && c.classe === 'no_ar_servido');
  if (u.regua_de_prova === 'banco') return arr.some((c) => c.existe);
  return false;
};
const FUNCIONANDO = (saidos.funcionando || []).map((s) => ({ ...s, unidade: unidades.find((u) => u.grupo === s.grupo) }));
const funcionandoSemProva = FUNCIONANDO.filter((s) => !s.unidade.prova_bateu || !unidadeComProvaNaRegua(s.unidade)).map((s) => s.grupo);
const FIX_CONTEUDO_OUTRO_AR = unidadeComProvaNaRegua({ regua_de_prova: 'conteudo', corridas: { conteudo: [{ existe: true, classe: 'noutro_ar' }] } });
const FIX_BANCO_SEM_PEGADA = unidadeComProvaNaRegua({ regua_de_prova: 'banco', corridas: { banco: [{ existe: true, classe: 'sem_pegada_de_ar' }] } });
const FIX_BANCO_FICHEIRO_EM_FALTA = unidadeComProvaNaRegua({ regua_de_prova: 'banco', corridas: { banco: [{ existe: false, classe: 'sem_pegada_de_ar' }] } });
const FIX_REGUA_DESCONHECIDA = unidadeComProvaNaRegua({ regua_de_prova: 'interface', corridas: { interface: [{ existe: true, classe: 'no_ar_servido' }] } });
gate('toda_saida_de_funcionando_tem_prova_que_bateu_na_sua_propria_regua',
  funcionandoSemProva.length === 0 && FUNCIONANDO.length === 3
  && FIX_CONTEUDO_OUTRO_AR === false && FIX_BANCO_SEM_PEGADA === true && FIX_BANCO_FICHEIRO_EM_FALTA === false && FIX_REGUA_DESCONHECIDA === false,
  `funcionando=${FUNCIONANDO.map((s) => `${s.grupo}(${s.unidade.regua_de_prova},${unidadeComProvaNaRegua(s.unidade) ? 'bate' : 'NAO_BATE'})`).join(',')} sem_prova=${funcionandoSemProva.join(',') || 'nenhuma'} fixture_conteudo_so_noutro_ar=${FIX_CONTEUDO_OUTRO_AR} fixture_banco_sem_pegada=${FIX_BANCO_SEM_PEGADA} fixture_banco_ficheiro_em_falta=${FIX_BANCO_FICHEIRO_EM_FALTA} fixture_regua_desconhecida=${FIX_REGUA_DESCONHECIDA}`);

const semProvaNaPropriaRegua = unidades.filter((u) => !u.prova_bateu || !unidadeComProvaNaRegua(u)).map((u) => `${u.grupo}:${u.regua_de_prova}`);
L.push(`LACUNA_DE_PROVA_POR_REGUA ${semProvaNaPropriaRegua.length} de ${unidades.length} :: ${semProvaNaPropriaRegua.join(',')} | contagem da falta, nao um portao`);

const funcionandoComDefeito = (saidos.funcionando || []).filter((u) => u.causas > 0).map((u) => u.grupo);
gate('uma_saida_de_funcionando_nao_pode_ao_mesmo_tempo_ter_saida_de_defeito',
  funcionandoComDefeito.length === 0 && (saidos.ausentes || []).length === 1,
  `funcionando_com_defeito=${funcionandoComDefeito.join(',') || 'nenhum'} ausentes=${(saidos.ausentes || []).map((u) => `${u.grupo}:${u.estado}`).join(',') || 'nenhuma'}`);

gate('os_erros_de_produto_separam_se_dos_estados_de_produto_por_causa_textual',
  deBarra.length + dePendencia.length + deOutras.length === causas.length && deBarra.length > 0 && dePendencia.length > 0 && deOutras.length === 0,
  `causas=${causas.length} barra_defeito=${deBarra.length}[${deBarra.join(',')}] pendencia_estado_de_produto=${dePendencia.length}[${dePendencia.join(',')}] outras=${deOutras.join(',') || 'nenhuma'}`);

const idsDuplicados = AUSENCIAS_DE_PROVA.map((f) => f.id).filter((x, i, arr) => arr.indexOf(x) !== i);
gate('as_ausencias_de_prova_sao_numeradas_e_cada_uma_tem_o_medido_que_a_nomeia',
  AUSENCIAS_DE_PROVA.length === webFaltas.length + mobilePorMedir.length + lacunasCenso.length && idsDuplicados.length === 0
  && AUSENCIAS_DE_PROVA.every((f) => f.medido.includes('=') || /estado lido|estado /.test(f.medido)) && webFaltas.map((f) => f.id).join(',') === 'FALTA-W1,FALTA-W2,FALTA-W3',
  `ausencias=${AUSENCIAS_DE_PROVA.length} web=${webFaltas.length} mobile_por_medir=${mobilePorMedir.length} lacunas_de_censo=${lacunasCenso.length} ids_duplicados=${idsDuplicados.join(',') || 'nenhum'}`);

const saidosDaIncompleta = (saidos.incompletas || []).map((u) => `${u.grupo}=${u.estado}`);
gate('as_incompletas_dividem_se_entre_parciais_e_sem_teste',
  saidosDaIncompleta.filter((s) => s.endsWith('=PARCIALMENTE IMPLEMENTADO')).length === 2 && saidosDaIncompleta.filter((s) => s.endsWith('=IMPLEMENTADO, MAS NÃO TESTADO')).length === 2,
  `incompletas=${saidosDaIncompleta.join(' | ')} | um PARCIAL e um MAS NAO TESTADO sao coisas diferentes: o primeiro tem funcionalidade que falta, o segundo tem funcionalidade sem prova`);

// ---- tabelas --------------------------------------------------------------
const md = (linhas) => linhas.join('\n');
const tabelaLista = (nome, titulo) => {
  const linhas = (saidos[nome] || []).map((u) => `| ${u.grupo} | ${u.rotulo} | ${u.estado} | ${u.regua} | ${u.prova_bateu ? 'sim' : 'NAO'} | ${u.causas} |`);
  return md([
    `### ${titulo}`,
    '| Unidade | Rótulo | Estado derivado | Régua de prova | Prova bateu | Saídas de defeito |',
    '|---|---|---|---|---|---|',
    ...(linhas.length ? linhas : ['| — | (classe vazia nesta corrida) | — | — | — | — |']),
  ]);
};
const tabelaSaidas = md([
  '## Saídas registradas pela BU-5 (12)',
  '| Tipo | Unidade | Registro citado | Medido | Artefacto |',
  '|---|---|---|---|---|',
  ...contras.map((c) => `| ${c.tipo} | ${c.grupo} | ${c.registro} | ${String(c.medido).replace(/\|/g, '\\|')} | ${c.artefacto || '—'} |`),
]);
const tabelaAusencias = md([
  '## Ausências de prova (numeradas)',
  '| ID | Onde | O que falta | Medido que o nomeia | O que exige |',
  '|---|---|---|---|---|',
  ...AUSENCIAS_DE_PROVA.map((f) => `| ${f.id} | ${f.onde} | ${String(f.afirma).replace(/\|/g, '\\|')} | ${String(f.medido).replace(/\|/g, '\\|')} | ${String(f.exige).replace(/\|/g, '\\|')} |`),
]);
const tabelaSaidasDeProduto = md([
  '## Estado de produto (não é erro, não é ausência)',
  '| Célula | Causa |',
  '|---|---|',
  ...dePendencia.map((k) => `| ${k} | ${p73.causas_de_trava[k]} |`),
]);

// Contar uma tabela é função da grelha: se o emissor partir uma linha, a contagem por `split('|')` passa a
// inventar rótulos. O fixture com uma linha de seis colunas prova que a régua dispara.
const colunasDe = (linha) => linha.split('|').length;
const FIX_LINHA_PARTIDA = colunasDe('| a | b | c | d | e |') !== colunasDe('| 5.8 | Secretaria Escolar | IMPLEMENTADO E TESTADO | conteudo | sim | 0 |');
const grelhasDasTabelas = [tabelaLista('funcionando', 'x'), tabelaLista('com_erros', 'x'), tabelaLista('incompletas', 'x'), tabelaLista('ausentes', 'x'), tabelaSaidas, tabelaAusencias, tabelaSaidasDeProduto];
const linhasMalformadas = grelhasDasTabelas.flatMap((t) => t.split('\n').filter((l) => l.startsWith('|') && !l.startsWith('|---')).filter((l) => colunasDe(l) !== colunasDe(t.split('\n').find((x) => x.startsWith('| ')))));
gate('nenhuma_linha_de_tabela_emitada_fica_fora_da_grelha_do_seu_cabecalho',
  linhasMalformadas.length === 0 && FIX_LINHA_PARTIDA === true,
  `tabelas=${grelhasDasTabelas.length} linhas_de_tabela=${grelhasDasTabelas.reduce((a, t) => a + t.split('\n').filter((l) => l.startsWith('|')).length, 0)} fora_da_grelha=${linhasMalformadas.length ? linhasMalformadas.slice(0, 3).join(' ~~ ').slice(0, 300) : 'nenhuma'} fixture_cinco_colunas_na_grelha_de_seis_dispara=${FIX_LINHA_PARTIDA}`);

const OUT = {
  em: new Date().toISOString(), instrumento: 'scripts/bu8-listas-20-11.mjs', modo: 'read-only',
  ar: bu5.ar, origem: { bu5: 'evidence/bu5-unidades-do-roadmap-20-11.json', bu7: 'evidence/bu7-inventarios-20-11.json', p73: 'evidence/p73-cobertura-m5-por-ar-20-11.json' },
  regra_de_classificacao: LISTA_PARA_ESTADO,
  listas: Object.fromEntries(nomesListas.map((l) => [l, saidos[l] || []])),
  saidas: contras, ausencias_de_prova: AUSENCIAS_DE_PROVA,
  saidas_de_produto: dePendencia, defeitos_de_interface: deBarra,
  distribuicao: Object.fromEntries(nomesListas.map((l) => [l, (saidos[l] || []).length])),
};
OUT.veredito_final = `BU8_${verds.every((v) => v.verde) ? 'VERDE' : 'VERMELHO'} ${verds.filter((v) => v.verde).length}/${verds.filter((v) => !v.verde).length}`;

L.push(OUT.veredito_final);
L.push(`distribuicao=${JSON.stringify(OUT.distribuicao)} contradicoes=${contras.length} ausencias_de_prova=${AUSENCIAS_DE_PROVA.length}`);
L.push(tabelaLista('funcionando', '## 1. A FUNCIONAR (IMPLEMENTADO E TESTADO)'));
L.push(tabelaLista('com_erros', '## 2. COM ERROS'));
L.push(tabelaLista('incompletas', '## 3. INCOMPLETAS'));
L.push(tabelaLista('ausentes', '## 4. AUSENTES'));
L.push(tabelaSaidas);
L.push(tabelaAusencias);
L.push(tabelaSaidasDeProduto);

fs.writeFileSync(`${DIR}/evidence/bu8-listas-20-11${SUF}.json`, JSON.stringify(OUT, null, 1));
fs.writeFileSync(`${DIR}/evidence/bu8-listas-20-11${SUF}.txt`, `# bu8-listas  em=${OUT.em}\n` + L.join('\n') + '\n');
console.log(L.join('\n'));
process.exit(verds.every((v) => v.verde) ? 0 : 1);
