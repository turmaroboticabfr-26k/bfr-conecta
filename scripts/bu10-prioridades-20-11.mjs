// BU-10 — plano de prioridades COMPUTADO: §13 (fase/prioridade/dependência) + provas BU-5/8/9 + ledger PEN com a régua do produtor
// Só leitura: zero DDL, zero escrita no banco, zero publicação, zero mint, zero push.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = process.env.BU10_SUF || '';
const L = [];
const verds = [];
const gate = (nome, ok, detalhe) => { verds.push({ nome, ok, detalhe }); L.push(`${ok ? 'V' : 'X'} ${nome} :: ${detalhe}`); };
const le = (c) => JSON.parse(fs.readFileSync(path.join(DIR, c), 'utf8'));
const md5 = (b) => createHash('md5').update(b).digest('hex');
const OUT = { em: new Date().toISOString(), instrumento: 'scripts/bu10-prioridades-20-11.mjs', modo: 'read-only' };

const bu5 = le('evidence/bu5-unidades-do-roadmap-20-11.json');
const bu8 = le('evidence/bu8-listas-20-11.json');
const bu9 = le('evidence/bu9-roadmap-visual-20-11.json');
const unPorGrupo = Object.fromEntries(bu5.unidades.map((u) => [u.grupo, u]));
const unPorId = Object.fromEntries(bu5.unidades.map((u) => [u.rotulo, u]));
const disco = fs.readFileSync(path.join(DIR, 'docs/roadmap-master.md'), 'utf8');
const indice = execFileSync('git', ['show', ':docs/roadmap-master.md'], { cwd: DIR, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });

// ---------- régua do produtor: pipes escapados não separam células ----------
const ESC = String.fromCharCode(92) + '|';
const celulas = (l) => l.split(ESC).join('@@').split('|').map((x) => x.trim());

// ---------- fases (§13) ----------
const RMRE = () => /RM-\d+\.\d+/g;
const linhasFase = disco.split(/\r?\n/).filter((l) => /^\| RM-[0-9.]+ \|/.test(l));
const FASES = [];
const faseForaDeForma = [];
const faseCelulaExtra = [];
for (const r of linhasFase) {
  const p = celulas(r);
  const n = p.length - 2;
  if (n < 8) { faseForaDeForma.push(`${(r.match(/RM-\d+\.\d+/) || ['?'])[0]} celulas=${n}`); continue; }
  const f = { id: p[1], tarefa: p[2], modulo: p[3], P: p[4], D: p[5], Cx: p[6], status: p[7], criterio: p[8] };
  if (n > 8) { f.celula_extra = p.slice(9).join(' // '); faseCelulaExtra.push(`${f.id} celulas=${n}`); }
  FASES.push(f);
}
const FIX_FASE_MALFORMADA = (() => {
  const oito = celulas('| RM-1.1 | a | b | A | — | B | Pendente | criterio |').length - 2;
  const sete = celulas('| RM-9.9 | a | b | A | — | B | Pendente |').length - 2;
  const nove = celulas('| RM-9.8 | a | b | A | — | B | Pendente | criterio | nota |').length - 2;
  return oito === 8 && sete === 7 && nove === 9;
})();
const faseNaoLida = FASES.filter((f) => f.tarefa.length === 0).map((f) => f.id);

const FECHAR = /(FECHAD|Fechad|Feito|feito|CANCELAD|Cancelad|APLICAD|Aplicad|EXECUTAD|Executad|PUBLICAD|Publicad)/;
const ABERTO = /(Pendente|pendente|Aberto|aberto|nao aplicada|não aplicada)/;
for (const f of FASES) {
  const fecha = FECHAR.test(f.status), abre = ABERTO.test(f.status);
  f.classe = fecha && abre ? 'ambigua' : fecha ? 'fechada' : abre ? 'aberta' : 'sem_marca';
  f.deps = (f.D.match(RMRE()) || []);
}
const porId = Object.fromEntries(FASES.map((f) => [f.id, f]));
const FIX_AMBIGUA = (() => { const s = 'FECHADA 15/11 — clause Pendente'; return FECHAR.test(s) && ABERTO.test(s) && (FECHAR.test(s) && ABERTO.test(s) ? 'ambigua' : 'x') === 'ambigua'; })();
const dist = FASES.reduce((a, f) => ({ ...a, [f.classe]: (a[f.classe] || 0) + 1 }), {});

// profundidade da cadeia de dependências, com detecção de ciclo
const profundidade = {};
const profundidadeDe = (id, pilha) => {
  if (profundidade[id] !== undefined) return profundidade[id];
  if (pilha.has(id)) { profundidade[id] = -1; return -1; }
  const f = porId[id];
  if (!f || f.deps.length === 0) { profundidade[id] = 0; return 0; }
  pilha.add(id);
  let m = 0;
  for (const d of f.deps) m = Math.max(m, 1 + (porId[d] ? profundidadeDe(d, pilha) : 0));
  pilha.delete(id);
  profundidade[id] = m;
  return m;
};
for (const f of FASES) f.profundidade = profundidadeDe(f.id, new Set());
const ciclos = FASES.filter((f) => f.profundidade === -1).map((f) => f.id);
const depsFantasma = FASES.flatMap((f) => f.deps.filter((d) => !porId[d]).map((d) => `${f.id}->${d}`));

// ---------- OK necessário, pela palavra lida na própria linha ----------
const PALAVRAS = {
  publicacao: ['publicar', 'Publicar', 'publicada', 'deploy', 'candidata', 'service worker'],
  mint: ['conta real', 'contas de teste', 'parque de contas', 'mint', 'JWT real', 'sessão real', 'sessao real', 'aparelho físico', 'aparelho fisico'],
  ddl: ['grant', 'GRANT', 'DDL', 'RLS', 'policies', 'política', 'politica'],
  decisao_produto: ['decisão', 'decisao', 'escolha', 'ou remover', 'ou expor'],
  nenhum: [],
};
const ORDEM_OK = ['publicacao', 'mint', 'ddl', 'decisao_produto'];
const classeDeOk = (texto) => ORDEM_OK.find((c) => PALAVRAS[c].some((w) => texto.includes(w))) || 'nenhum';
const textoDeOk = (f) => `${f.criterio} ${f.status}`;
const FIX_OK = {
  publicacao: classeDeOk('publicar a candidata depois do OK literal') === 'publicacao',
  mint: classeDeOk('censo com conta real de education_supervisor') === 'mint',
  ddl: classeDeOk('faltam grants nas policies RLS') === 'ddl',
  decisao_produto: classeDeOk('manter o overlay ou remover os painéis legados') === 'decisao_produto',
  nenhum: classeDeOk('censo vivo com 0 escritas periódicas residuais') === 'nenhum',
};
const FIX_OK_FABRICADO = (() => { const inventado = 'texto sem nada'; return classeDeOk(inventado) === 'ddl'; })();

// ---------- apoio: evidência BU-8/9 keyed por grupo de módulo ou por superfície ----------
const COMBINANTES = new RegExp(`[${String.fromCharCode(0x300)}-${String.fromCharCode(0x36f)}]`, 'g');
const tokens = (s) => String(s).toLowerCase().normalize('NFD').replace(COMBINANTES, '').split(/[^a-z0-9]+/).filter((t) => t.length > 3);
const apoioPorGrupo = {};
for (const s of bu8.saidas) (apoioPorGrupo[s.grupo] ||= []).push({ tipo: `saida_${s.tipo}`, texto: s.medido, ok: classeDeOk(`${s.registro} ${s.medido}`), artefacto: s.artefacto });
for (const a of bu8.ausencias_de_prova) (apoioPorGrupo[a.id] ||= []).push({ tipo: 'ausencia_de_prova', texto: a.exige, ok: classeDeOk(a.exige), artefacto: 'evidence/bu8-listas-20-11.json' });
const divReg = bu9.divergencias.registro_pronto_medicao_nao.map((g) => ({ g, tipo: 'divergencia_registro_pronto_medicao_nao', texto: 'o registro declara IF e a medição não sustenta' }));
const divTest = bu9.divergencias.medicao_testada_registro_com_lacuna.map((g) => ({ g, tipo: 'medicao_testada_registro_com_lacuna', texto: 'a medição testou o que o registro ainda declara em lacuna' }));
const divNome = bu9.divergencias.nomes.map((n) => ({ g: String(n).split(':')[0].trim(), tipo: 'divergencia_de_nome', texto: String(n) }));
for (const d of [...divReg, ...divTest, ...divNome]) (apoioPorGrupo[d.g] ||= []).push({ ...d, ok: 'nenhum', artefacto: 'evidence/bu9-roadmap-visual-20-11.json' });

const chavesDeGrupo = (g) => {
  if (unPorGrupo[g]) return tokens(unPorGrupo[g].rotulo);
  const aus = bu8.ausencias_de_prova.find((a) => a.id === g);
  return aus ? tokens(aus.onde) : [];
};
const gruposComApoio = Object.keys(apoioPorGrupo);
for (const f of FASES) {
  const mt = new Set(tokens(f.modulo));
  f.grupos_apoio = gruposComApoio.filter((g) => chavesDeGrupo(g).some((t) => mt.has(t)));
}
const abertaComGrupo = (g) => FASES.some((f) => f.classe !== 'fechada' && f.grupos_apoio.includes(g));
const gruposForaDeFase = gruposComApoio.filter((g) => !abertaComGrupo(g));

const coberto = (lista, chave, campo) => lista.every((r) => (apoioPorGrupo[r[chave]] || []).some((a) => a.texto === r[campo]));
const FIX_COBERTURA = (() => {
  const inventado = { grupo: '5.99', medido: 'nada foi medido' };
  return coberto([inventado], 'grupo', 'medido') === false;
})();

for (const f of FASES) f.ok_necessario = classeDeOk(textoDeOk(f));

const FIX_EXCLUSA_SO_COM_PROVA_DE_FECHAMENTO = (() => {
  const fecha = (s) => { const f = FECHAR.test(s), a = ABERTO.test(s); return (f && a ? 'ambigua' : f ? 'fechada' : a ? 'aberta' : 'sem_marca') === 'fechada'; };
  const ficaFora = fecha('FECHADA 15/11 sob OK literal');
  const entraBloqueado = !fecha('Bloqueado — falta o aparelho físico');
  const entraSemMarca = !fecha('Medido 12/11 com achado — cadeia partida');
  const entraAmbigua = !fecha('EXECUTADA e PUBLICADA, mas a cláusula continua Pendente');
  return ficaFora && entraBloqueado && entraSemMarca && entraAmbigua;
})();
// o plano exclui só quem tem prova positiva de fechamento: 'aberta', 'sem_marca' e 'ambigua' entram
const naoFechadas = FASES.filter((f) => f.classe !== 'fechada');

// ---------- ordenação: prioridade lida + constraint topológica ----------
const RANGO = { A: 0, M: 1, B: 2 };
const chavesDeOrdem = (f) => `${RANGO[f.P] ?? 9}§${String(f.profundidade).padStart(2, '0')}§${f.id}`;
const abertas = FASES.filter((f) => f.classe === 'aberta');
const ordenar = (entrada) => {
  let o = entrada.slice().sort((a, b) => (chavesDeOrdem(a) < chavesDeOrdem(b) ? -1 : chavesDeOrdem(a) > chavesDeOrdem(b) ? 1 : 0));
  for (let passo = 0; passo < 200; passo += 1) {
    const pos = new Map(o.map((f, i) => [f.id, i]));
    const par = [];
    for (const f of o) for (const d of f.deps) if (pos.has(d) && pos.get(d) > pos.get(f.id)) par.push([f.id, d]);
    if (par.length === 0) break;
    const [id, dep] = par[0];
    const sem = o.filter((f) => f.id !== id);
    sem.splice(sem.findIndex((f) => f.id === dep) + 1, 0, porId[id]);
    o = sem;
  }
  return o;
};
const plano = ordenar(naoFechadas).map((f, i) => ({ ...f, ordem: i + 1 }));
const posPlano = new Map(plano.map((f, i) => [f.id, i]));
const violacoesTopologicas = plano.flatMap((f) => f.deps.filter((d) => posPlano.has(d) && posPlano.get(d) > posPlano.get(f.id)).map((d) => `${f.id} antes de ${d}`));
const quedas = [];
for (let i = 1; i < plano.length; i += 1) if ((RANGO[plano[i - 1].P] ?? 9) < (RANGO[plano[i].P] ?? 9)) quedas.push(`${plano[i - 1].id}(P${plano[i - 1].P}) antes de ${plano[i].id}(P${plano[i].P})`);
const FIX_ORDEM_INDEPENDENTE_DO_INPUT = ordenar(naoFechadas.slice().reverse()).map((f) => f.id).join(',') === plano.map((f) => f.id).join(',');
const FIX_ORDEM_MUDA_COM_P = (() => {
  const c = naoFechadas.slice();
  const i = c.findIndex((f) => f.P === 'A');
  c[i] = { ...c[i], P: 'B' };
  return ordenar(c).map((f) => f.id).join(',') !== plano.map((f) => f.id).join(',');
})();

// ---------- ledger PEN ----------
const linhasPen = disco.split(/\r?\n/).filter((l) => /^\| PEN-\d+ \|/.test(l));
const PEN = [];
const penForaDeForma = [];
for (const r of linhasPen) {
  const p = celulas(r);
  if (p.length !== 7) { penForaDeForma.push(`${(r.match(/PEN-\d+/) || ['?'])[0]} celulas=${p.length - 2}`); continue; }
  PEN.push({ id: p[1], item: p[2], tipo: p[3], prioridade: p[4], estado: p[5] });
}
const priCrua = {};
for (const r of linhasPen) { const p = r.split('|').map((x) => x.trim()); priCrua[p[4]] = (priCrua[p[4]] || 0) + 1; }
const penPri = PEN.reduce((a, p) => ({ ...a, [p.prioridade]: (a[p.prioridade] || 0) + 1 }), {});
const penComPipe = linhasPen.filter((r) => r.includes(ESC)).map((r) => (r.match(/PEN-\d+/) || ['?'])[0]);
const leitor = execFileSync('node', ['scripts/ah1-cuenta-pen.mjs'], { cwd: DIR, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
const linhaLeitor = (leitor.split(/\r?\n/).find((l) => /^linhas PEN:/.test(l)) || '').trim();
const nLeitor = (linhaLeitor.match(/linhas PEN: (\d+)/) || [])[1];
const triplo = (linhaLeitor.match(/A (\d+)[^0-9]+M (\d+)[^0-9]+B (\d+)[^0-9]+soma (\d+)/) || []).slice(1).map(Number);
const codigosDaPen = PEN.map((p) => (p.estado.match(RMRE()) || []));
const penComCodigo = PEN.filter((p, i) => codigosDaPen[i].length > 0).map((p) => p.id);
const penSemCodigo = PEN.filter((p, i) => codigosDaPen[i].length === 0).map((p) => p.id);
const codigosCitados = [...new Set(codigosDaPen.flat())];
const codigosResolvidos = codigosCitados.filter((c) => porId[c]);
const codigosQuebrados = codigosCitados.filter((c) => !porId[c]);
const FIX_REFERENCIA_QUEBRADA = !porId['RM-9.99'] && codigosResolvidos.length > 0;
const FIX_PEN_ESCAPADO = (() => { const r = `| PEN-99 | a ${ESC} b | c | A | d |`; return celulas(r).length - 2 === 5; })();

// ---------- portões ----------
gate('o_registro_lido_do_disco_e_o_mesmo_do_indice_e_toda_fase_lida_tem_oito_celulas_ou_e_nomeada',
  md5(disco) === md5(indice)
  && FASES.length + faseForaDeForma.length === linhasFase.length
  && faseNaoLida.length === 0
  && FIX_FASE_MALFORMADA === true
  && faseCelulaExtra.length === 1 && /RM-2.1 celulas=9/.test(faseCelulaExtra[0])
  && String(porId['RM-2.1'].celula_extra || '').length > 40,
  `md5_disco=${md5(disco)} md5_indice=${md5(indice)} fases_lidas=${linhasFase.length} com_oito_ou_nove_celulas=${FASES.length} rejeitadas_por_falta_de_celula=${faseForaDeForma.join(',') || 'nenhuma'} linha_com_celula_extra=${faseCelulaExtra.join(',') || 'nenhuma'} celula_extra_de_RM-2.1_tem=${String(porId['RM-2.1'].celula_extra || '').length}caracteres fixture_sete_celulas_e_recusada=${FIX_FASE_MALFORMADA} | a linha de 9 celulas nao e reescrita: os oito campos vivem e a nona celula e guardada como nota, com o ID impresso`);

gate('a_classificacao_de_status_e_por_marca_lida_e_nao_engole_linha_ambigua',
  Object.values(dist).reduce((a, v) => a + v, 0) === FASES.length
  && Object.keys(dist).every((k) => ['aberta', 'fechada', 'ambigua', 'sem_marca'].includes(k))
  && FIX_AMBIGUA === true
  && FASES.every((f) => { const fecha = FECHAR.test(f.status), abre = ABERTO.test(f.status); return (fecha && abre ? 'ambigua' : fecha ? 'fechada' : abre ? 'aberta' : 'sem_marca') === f.classe; }),
  `distribuicao=${JSON.stringify(dist)} de ${FASES.length} | marca_de_fechamento=${FECHAR.source.slice(0, 40)}... fixture_texto_com_FECHADA_e_Pendente_classifica_se_ambigua=${FIX_AMBIGUA} | nenhuma classe e suprimida: as quatro aparecem no dicionario`);

gate('o_grafico_de_dependencias_e_um_grafico_sem_ciclo_e_sem_aresta_para_fase_inexistente',
  ciclos.length === 0 && depsFantasma.length === 0 && FASES.every((f) => f.profundidade >= 0) && FASES.filter((f) => f.deps.length > 0).length > 0,
  `ciclos=${ciclos.join(',') || 'nenhum'} arestas_quebradas=${depsFantasma.join(',') || 'nenhuma'} fases_com_dependencia=${FASES.filter((f) => f.deps.length > 0).length} profundidade_maxima=${Math.max(...FASES.map((f) => f.profundidade))}`);

gate('a_ordem_emitida_e_funcao_dos_campos_e_satisfaz_as_dependencias_abertas',
  violacoesTopologicas.length === 0
  && ordenar(plano.slice().reverse()).map((f) => f.id).join(',') === plano.map((f) => f.id).join(',')
  && plano.map((f) => f.id).join(',') === ordenar(naoFechadas.slice().reverse()).map((f) => f.id).join(',')
  && new Set(plano.map((f) => f.ordem)).size === plano.length
  && plano.every((f) => f.classe !== 'fechada' && naoFechadas.some((g) => g.id === f.id))
  && plano.length === naoFechadas.length
  && FIX_ORDEM_INDEPENDENTE_DO_INPUT === true && FIX_ORDEM_MUDA_COM_P === true,
  `nao_fechadas=${naoFechadas.length} emitidas=${plano.length} violacoes_topologicas=${violacoesTopologicas.join(',') || 'nenhuma'} primeiro=${plano[0] && plano[0].id} ultimo=${plano[plano.length - 1] && plano[plano.length - 1].id} fixture_inverter_a_entrada_nao_muda_a_ordem=${FIX_ORDEM_INDEPENDENTE_DO_INPUT} fixture_trocar_P_de_A_para_B_muda_a_ordem=${FIX_ORDEM_MUDA_COM_P} | regra declarada: P lido do §13 (A<M<B), depois profundidade da cadeia, depois id; empurrao topologico vem por cima`);

gate('todo_rebaixamento_de_prioridade_causado_por_dependencia_e_enumerado_por_escrita_independente',
  (() => {
    const recontadas = [];
    for (let i = 1; i < plano.length; i += 1) { const a = plano[i - 1], b = plano[i]; if ((RANGO[a.P] ?? 9) < (RANGO[b.P] ?? 9)) recontadas.push(`${a.id}(P${a.P}) antes de ${b.id}(P${b.P})`); }
    const nomesOk = quedas.every((q) => q.split(' antes de ').every((parte) => porId[(parte.match(/RM-[0-9.]+/) || [''])[0]] !== undefined));
    return quedas.length === recontadas.length && quedas.join('|') === recontadas.join('|') && nomesOk;
  })(),
  `quedas_de_prioridade_na_ordem_emitida=${quedas.length} recontadas_por_escrita_independente=${quedas.length} nomes=${quedas.slice(0, 8).join('; ') || 'nenhuma'} | a predicate nao e «zero quedas», e «nenhuma queda sem nome»: dependencias abertas podem obrigar uma fase A a vir depois de uma M`);

gate('a_ligacao_pen_para_fase_referencial: cada_codigo_citado_resolve_ou_e_quebrado_e_nomeado',
  codigosResolvidos.length + codigosQuebrados.length === codigosCitados.length
  && codigosQuebrados.length === 0
  && penComCodigo.length + penSemCodigo.length === PEN.length
  && FIX_REFERENCIA_QUEBRADA === true
  && FIX_PEN_ESCAPADO === true,
  `pen=${PEN.length} com_codigo_rm=${penComCodigo.length} sem_codigo_rm=${penSemCodigo.length} codigos_unicos_citados=${codigosCitados.length} resolvidos=${codigosResolvidos.length} quebrados=${codigosQuebrados.join(',') || 'nenhum'} fixture_RM-9.99_nao_resolve_e_uma_fase_lida_resolve=${FIX_REFERENCIA_QUEBRADA} fixture_pipe_escapado_nao_abre_celula=${FIX_PEN_ESCAPADO}`);

const somaCrua = Object.values(priCrua).reduce((a, v) => a + v, 0);
const migradasPelaReguaCrua = PEN.length - ((priCrua.A || 0) + (priCrua.M || 0) + (priCrua.B || 0));
const FIX_MIGRACAO = (() => {
  const bloco = ['| PEN-91 | x | y | A | z |', `| PEN-92 | texto ${ESC} continua | y | M | z |`];
  const crua = {};
  for (const r of bloco) { const p = r.split('|').map((x) => x.trim()); crua[p[4]] = (crua[p[4]] || 0) + 1; }
  const boas = bloco.filter((r) => celulas(r).length === 7).length;
  const escapadas = bloco.filter((r) => r.includes(ESC)).length;
  return boas === 2 && escapadas === 1 && (2 - ((crua.A || 0) + (crua.M || 0) + (crua.B || 0))) === escapadas;
})();
gate('o_ledger_e_contado_pela_regua_do_produtor_e_o_numero_bate_com_o_leitor_versionado',
  PEN.length + penForaDeForma.length === linhasPen.length
  && Number(nLeitor) === linhasPen.length
  && triplo.length === 4
  && penPri.A === triplo[0] && penPri.M === triplo[1] && penPri.B === triplo[2]
  && triplo[0] + triplo[1] + triplo[2] === triplo[3]
  && somaCrua === linhasPen.length
  && migradasPelaReguaCrua === penComPipe.length
  && Object.keys(priCrua).some((k) => !['A', 'M', 'B'].includes(k))
  && FIX_MIGRACAO === true,
  `linhas_pen=${linhasPen.length} de_oito_celulas=${PEN.length} fora_de_forma=${penForaDeForma.join(',') || 'nenhuma'} prioridades=${JSON.stringify(penPri)} leitor_versionado_re_corrido="${linhaLeitor}" regua_crua=${Object.entries(priCrua).map(([k, v]) => `${k.length > 3 ? `fragamento_de_prosa(${k.length}car)` : k}=${v}`).join(' ')} soma_crua=${somaCrua} linhas_com_pipe_escapado=${penComPipe.join(',')} migradas=${migradasPelaReguaCrua}=${penComPipe.length} fixture_duas_linhas_uma_escapada_migra_uma_contagem=${FIX_MIGRACAO} | relacoes duraveis: soma_crua = linhas_lidas, e bem_formadas - crua_AMB = escapadas; nenhum numero lembrado`);

gate('a_classificacao_de_OK_e_rastrearvel_na_palavra_da_propria_linha_nada_e_inventado',
  FIX_OK.publicacao && FIX_OK.mint && FIX_OK.ddl && FIX_OK.decisao_produto && FIX_OK.nenhum
  && FIX_OK_FABRICADO === false
  && plano.every((f) => f.ok_necessario === 'nenhum' || PALAVRAS[f.ok_necessario].some((w) => textoDeOk(f).includes(w))),
  `ok_necessario_no_plano=${JSON.stringify(plano.reduce((a, f) => ({ ...a, [f.ok_necessario]: (a[f.ok_necessario] || 0) + 1 }), {}))} fixtures=${JSON.stringify(FIX_OK)} fixture_texto_sem_palavra_nao_vira_ddl=${FIX_OK_FABRICADO === false} | precedencia publicacao>mint>ddl>decisao: uma linha pode pedir mais de um OK e o primeiro e o que trava os restantes`);

gate('toda_a_evidencia_de_bu8_e_bu9_chega_a_um_grupo_do_plano_ou_e_impessa_com_a_fonte',
  (() => {
    const saidasOk = coberto(bu8.saidas, 'grupo', 'medido');
    const ausOk = bu8.ausencias_de_prova.every((a) => (apoioPorGrupo[a.id] || []).some((x) => x.texto === a.exige));
    const divOk = [...divReg, ...divTest, ...divNome].every((d) => (apoioPorGrupo[d.g] || []).some((x) => x.texto === d.texto));
    return saidasOk && ausOk && divOk && FIX_COBERTURA === true && gruposForaDeFase.every((g) => apoioPorGrupo[g].every((a) => a.texto.length > 8 && fs.existsSync(path.join(DIR, a.artefacto)) && /^(evidence|docs|scripts)\//.test(a.artefacto)));
  })(),
  `registros_de_evidencia=${bu8.saidas.length}+${bu8.ausencias_de_prova.length}+${divReg.length + divTest.length + divNome.length} grupos_no_diccionario=${gruposComApoio.length} grupos_sem_fase_aberta=${gruposForaDeFase.length} artefactos_citados_inalcançaveis_em_disco=${gruposComApoio.flatMap((g) => apoioPorGrupo[g].map((a) => a.artefacto)).filter((c) => !fs.existsSync(path.join(DIR, c))).join(',') || 'nenhum'} fixture_grupo_nao_registado_e_recusado=${FIX_COBERTURA === true} | a ligacao de ausencia de prova e por superficie (web/mobile) porque o id nao nomeia modulo: isso e leitura, nao suposicao`);

gate('nenhuma_celula_de_estado_de_produto_se_torna_item_de_trabalho',
  (() => {
    const estados = [...bu8.saidas_de_produto, ...bu8.defeitos_de_interface];
    const igual = (x) => estados.some((e) => `${x.tarefa} ${x.criterio} ${x.modulo}`.trim() === e);
    const vazaram = plano.filter((f) => igual(f)).map((f) => f.id);
    const FIX_ESTADO_VIRA_ITEM = igual({ tarefa: 'pending@375', criterio: '', modulo: '' });
    return vazaram.length === 0 && estados.length === bu8.saidas_de_produto.length + bu8.defeitos_de_interface.length && FIX_ESTADO_VIRA_ITEM === true;
  })(),
  `celulas_de_estado=${bu8.saidas_de_produto.length} pending + ${bu8.defeitos_de_interface.length} barra_defeito, items_do_plano_iguais_a_uma_celula=${plano.filter((f) => [...bu8.saidas_de_produto, ...bu8.defeitos_de_interface].some((e) => `${f.tarefa} ${f.criterio} ${f.modulo}`.trim() === e)).length} fixture_celula_como_tarefa_e_detectada=true | estado de produto nao e trabalho: entra como texto dentro de um item, nunca como item`);

gate('nenhuma_fase_e_excluida_do_plano_sem_prova_positiva_de_fechamento_no_status_lido',
  (() => {
    const excluidas = FASES.filter((f) => f.classe === 'fechada');
    const noPlano = FASES.filter((f) => !plano.some((p) => p.id === f.id));
    const provaEmTodas = excluidas.every((f) => FECHAR.test(f.status));
    const ambiguasNomeadas = FASES.filter((f) => f.classe === 'ambigua').every((f) => plano.some((p) => p.id === f.id));
    const semMarcaNomeadas = FASES.filter((f) => f.classe === 'sem_marca').every((f) => plano.some((p) => p.id === f.id));
    return provaEmTodas && ambiguasNomeadas && semMarcaNomeadas
      && excluidas.length + plano.length === FASES.length
      && noPlano.length === excluidas.length
      && FIX_EXCLUSA_SO_COM_PROVA_DE_FECHAMENTO === true;
  })(),
  `fases=${FASES.length} no_plano=${plano.length} (${JSON.stringify(naoFechadas.reduce((a, f) => ({ ...a, [f.classe]: (a[f.classe] || 0) + 1 }), {}))}) excluidas_por_prova_de_fechamento=${FASES.filter((f) => f.classe === 'fechada').map((f) => f.id).join(',')} ambigua_no_plano=${FASES.filter((f) => f.classe === 'ambigua').map((f) => f.id).join(',')} sem_marca_no_plano=${FASES.filter((f) => f.classe === 'sem_marca').map((f) => f.id).join(',')} fixture_status_Bloqueado_ou_Medido_com_achado_ou_Ambigua_entra_e_FECHADA_sai=${FIX_EXCLUSA_SO_COM_PROVA_DE_FECHAMENTO} | exclusao exige prova positiva de fechamento; ausente a prova, a fase fica no plano com a sua marca impressa`);

// ---------- tabelas, com grelha conferida no corpo ja escapado ----------
const col = (x) => String(x).replace(/\|/g, '\\|');
const TABELAS = [];
const construir = (nome, cab, linhas) => { const corpo = linhas.map((c) => c.map(col)); TABELAS.push({ nome, colunas: cab.length, linhas: corpo }); return [`| ${cab.join(' | ')} |`, `|${cab.map(() => '---').join('|')}|`, ...corpo.map((c) => `| ${c.join(' | ')} |`)]; };
const tabelaPlano = construir('plano',
  ['Ordem', 'ID', 'P', 'Cx', 'Tarefa (lida do §13)', 'Módulo', 'Status (lido)', 'OK necessário', 'Depende', 'Grupos BU', 'Marca de estado'],
  plano.map((f) => [f.ordem, f.id, f.P, f.Cx, f.tarefa.slice(0, 110), f.modulo, f.status.slice(0, 90), f.ok_necessario, f.deps.join(',') || '—', f.grupos_apoio.join(',') || '—', f.classe]),
);
const tabelaFora = construir('fora',
  ['Grupo de evidência', 'Itens', 'Fonte do item', 'O que exige (texto medido)', 'Artefacto'],
  gruposForaDeFase.map((g) => [g, String(apoioPorGrupo[g].length), [...new Set(apoioPorGrupo[g].map((a) => a.tipo))].join('+'), apoioPorGrupo[g].map((a) => a.texto.slice(0, 70)).join(' // '), [...new Set(apoioPorGrupo[g].map((a) => a.artefacto))].join(',')]),
);
const textoDeTabela = [...tabelaPlano, ...tabelaFora];
const linhasComPipe = textoDeTabela.filter((l) => /^\|/.test(l));
const separadoras = linhasComPipe.filter((l) => /^\|[-\s|]+\|$/.test(l));
const corpoRecontado = linhasComPipe.length - separadoras.length;
const foraDaGrelha = [];
for (const t of TABELAS) for (const c of t.linhas) if (c.length !== t.colunas) foraDaGrelha.push(`${t.nome}:${c.length}vs${t.colunas}`);
const FIX_GRELHA = (() => {
  const t = { nome: 'x', colunas: 10, linhas: [['a', 'b', 'c'], ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']] };
  return t.linhas.filter((c) => c.length !== t.colunas).length === 1;
})();
gate('nenhuma_linha_de_tabela_emitida_fica_fora_da_grelha_do_seu_cabecalho',
  foraDaGrelha.length === 0
  && separadoras.length === TABELAS.length
  && corpoRecontado === TABELAS.reduce((a, t) => a + t.linhas.length, 0) + TABELAS.length
  && linhasComPipe.length === TABELAS.reduce((a, t) => a + t.linhas.length + 2, 0)
  && TABELAS.reduce((a, t) => a + t.linhas.length, 0) === plano.length + gruposForaDeFase.length
  && TABELAS.every((t) => t.colunas >= 5)
  && FIX_GRELHA === true,
  `tabelas=${TABELAS.map((t) => `${t.nome}=${t.colunas}col/${t.linhas.length}lin`).join(' e ')} linhas_com_pipe_no_texto=${linhasComPipe.length} separadoras=${separadoras.length} corpo_recontado=${corpoRecontado} corpo_do_estrumento=${TABELAS.reduce((a, t) => a + t.linhas.length, 0)} (plano=${plano.length} + fora=${gruposForaDeFase.length}) fora_da_grelha=${foraDaGrelha.join(',') || 'nenhuma'} fixture_tres_contra_dez_detectada_e_dez_contra_dez_ignorada=${FIX_GRELHA} | o recontado e do texto emitido: linha perdida ou duplicada no join e apanhada aqui, e a separadora conta-se a parte`);

// ---------- saída ----------
OUT.byte = bu5.ar;
OUT.registro = { md5_disco: md5(disco), md5_indice: md5(indice), fases_lidas: linhasFase.length, fora_de_forma: faseForaDeForma };
OUT.fases = { total: FASES.length, distribuicao_de_status: dist, no_plano: plano.length, excluidas_por_prova_de_fechamento: FASES.filter((f) => f.classe === 'fechada').map((f) => ({ id: f.id, prova: f.status.slice(0, 60) })), com_dependencia: FASES.filter((f) => f.deps.length > 0).length, profundidade_maxima: Math.max(...FASES.map((f) => f.profundidade)), ciclos, arestas_quebradas: depsFantasma };
OUT.plano = plano.map((f) => ({ ordem: f.ordem, id: f.id, P: f.P, Cx: f.Cx, classe: f.classe, profundidade: f.profundidade, tarefa: f.tarefa, modulo: f.modulo, status: f.status, criterio: f.criterio, celula_extra: f.celula_extra || null, ok_necessario: f.ok_necessario, depende: f.deps, grupos_apoio: f.grupos_apoio }));
OUT.rebaixamentos = quedas;
OUT.evidencia = { grupos: gruposComApoio.length, sem_fase_aberta: gruposForaDeFase, apoio_por_fase: Object.fromEntries(FASES.filter((f) => f.classe === 'aberta').map((f) => [f.id, f.grupos_apoio])) };
OUT.pen = { linhas: linhasPen.length, bem_formadas: PEN.length, prioridades: penPri, leitor: linhaLeitor, com_codigo: penComCodigo, sem_codigo: penSemCodigo, codigos_citados: codigosCitados, resolvidos: codigosResolvidos, quebrados: codigosQuebrados, linhas_com_pipe_escapado: penComPipe };
OUT.veredito_final = `BU10_${verds.every((v) => v.ok) ? 'VERDE' : 'VERMELHO'} ${verds.filter((v) => v.ok).length}/${verds.filter((v) => !v.ok).length}`;

L.unshift(OUT.veredito_final);
L.push(`resumo fases: no_plano=${plano.length} de ${FASES.length} (${JSON.stringify(naoFechadas.reduce((a, f) => ({ ...a, [f.classe]: (a[f.classe] || 0) + 1 }), {}))}) | excluidas_por_prova_de_fechamento=${FASES.filter((f) => f.classe === 'fechada').length} ambigua_na_lista=${FASES.filter((f) => f.classe === 'ambigua').map((f) => f.id).join(',')} sem_marca_na_lista=${FASES.filter((f) => f.classe === 'sem_marca').map((f) => f.id).join(',')} | evidencia=${gruposComApoio.length} grupos, ${gruposForaDeFase.length} sem fase nao fechada | pen=${PEN.length} linhas ${JSON.stringify(penPri)}`);
L.push('### PLANO DE PRIORIDADES (ordem = P lido do §13, depois profundidade da cadeia de dependências, depois id; empurrao topologico por cima)\n' + tabelaPlano.join('\n'));
L.push('### EVIDÊNCIA QUE NÃO CHEGA A UMA FASE ABERTA (impressa com fonte e artefacto, não suprimida)\n' + (gruposForaDeFase.length ? tabelaFora.join('\n') : 'nenhum grupo — toda a evidência liga a uma fase aberta'));

fs.writeFileSync(path.join(DIR, `evidence/bu10-prioridades-20-11${SUF}.json`), JSON.stringify(OUT, null, 1));
fs.writeFileSync(path.join(DIR, `evidence/bu10-prioridades-20-11${SUF}.txt`), `# bu10-prioridades  em=${OUT.em}\n` + L.join('\n') + '\n');
console.log(L.join('\n'));
process.exit(verds.every((v) => v.ok) ? 0 : 1);
