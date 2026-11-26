#!/usr/bin/env node
// P146 — cobertura da FASE 1 da missão «centro executivo de inteligência educacional» (briefing anexado em
// 23/11) contra os documentos BU indexados em docs/bu-20-11/. Só-leitura: escreve apenas o seu registo, com guarda
// de sobrescrita. Os 17 itens vêm do briefing; os stems de cada item são as palavras com que os documentos os
// cobrem, medidas por grep sobre os próprios documentos antes de serem constantes (ver §SM.42). A frescura
// lê-se do registo mais novo da família de cada produtor, pelo carimpo `em` que o próprio produtor escreveu,
// e aborta se nenhum ou dois resolverem. O conjunto de documentos varridos também não é re-dactilografado: lê
// o índice do git, por isso um documento novo em docs/bu-20-11 entra na matriz em vez de chumbar o portão, e a
// lista dos fora da lista declarada imprime-se mesmo quando vazia.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const RAIZ = resolve(import.meta.dirname, '..');
const SUF = process.env.P146_SUF ? '-' + process.env.P146_SUF : '-23-11';
const OUT = join(RAIZ, `evidence/p146-fase1-cobertura-bu${SUF}.json`);
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com P146_SUF=novo, não por cima');

const ESPERADOS = [
  'docs/bu-20-11/01-mapa-completo-do-aplicativo.md',
  'docs/bu-20-11/02-checklist-dos-modulos.md',
  'docs/bu-20-11/03-perfis-e-permissoes.md',
  'docs/bu-20-11/04-inventario-mobile.md',
  'docs/bu-20-11/05-inventario-web.md',
  'docs/bu-20-11/06-as-quatro-listas.md',
  'docs/bu-20-11/07-roadmap-visual.md',
  'docs/bu-20-11/08-plano-de-prioridades.md',
  'docs/bu-20-11/09-mapa-estrutural-componentes-e-regras.md',
  'docs/bu-20-11/10-runbook-municipal.md'
];
const DIAGNOSTICO = 'docs/bu-20-11/01-mapa-completo-do-aplicativo.md';
const PLANO = ['docs/bu-20-11/08-plano-de-prioridades.md', 'docs/bu-20-11/10-runbook-municipal.md'];

const ITENS = [
  { n: 1, nome: 'estrutura de pastas e arquivos', stems: /estrutura|pastas/i },
  { n: 2, nome: 'framework e arquitetura', stems: /arquitet/i },
  { n: 3, nome: 'componentes existentes', stems: /componente/i },
  { n: 4, nome: 'sistema de autenticação', stems: /autentic|auth\./i },
  { n: 5, nome: 'perfis e níveis de acesso', stems: /perfil|perfis|papel|papéis|cargo/i },
  { n: 6, nome: 'banco de dados Supabase', stems: /supabase|postgres/i },
  { n: 7, nome: 'tabelas e relacionamentos', stems: /tabela/i },
  { n: 8, nome: 'políticas RLS', stems: /rls|política|politica/i },
  { n: 9, nome: 'cadastro de escolas', stems: /escola|school/i },
  { n: 10, nome: 'cadastro de alunos', stems: /aluno|student/i },
  { n: 11, nome: 'cadastro de professores', stems: /professor|teacher/i },
  { n: 12, nome: 'cadastro de turmas', stems: /turma|class/i },
  { n: 13, nome: 'notas e avaliações', stems: /nota|avaliaç|grade/i },
  { n: 14, nome: 'frequência escolar', stems: /frequen|attendance/i },
  { n: 15, nome: 'notificações', stems: /notifica|notification/i },
  { n: 16, nome: 'relatórios existentes', stems: /relatóri|relatorio|report/i },
  { n: 17, nome: 'comunicação entre os módulos', stems: /comunica|integraç/i }
];

const git = (args) => {
  try { return execFileSync('git', ['-c', 'core.quotePath=false', ...args], { cwd: RAIZ, encoding: 'utf8' }); } catch { return ''; }
};
const noIndice = git(['ls-files', '--', 'docs/bu-20-11']).split(/\r?\n/).filter(Boolean).sort();
if (noIndice.length === 0) throw new Error('ABORTA: nenhum documento BU no índice — a sonda não pode contar o vazio');
const conjuntosDeDocs = (esperados, indice) => ({
  varridos: [...indice].sort(),
  faltantes: esperados.filter((p) => !indice.includes(p)),
  fora_da_lista: indice.filter((p) => !esperados.includes(p))
});
const conjuntos = conjuntosDeDocs(ESPERADOS, noIndice);
const docs = conjuntos.varridos.map((p) => ({ caminho: p, texto: readFileSync(join(RAIZ, p), 'utf8') }));
const contar = (stems, texto) => (texto.match(new RegExp(stems.source, 'gi')) || []).length;

// O produtor do registo lido é escolhido pela data que ele próprio escreveu no registo, nunca pelo nome que eu
// lembrasse: re-dactilografar o ficheiro de outro ciclo é a quinta face do mesmo defeito (ver §SM.72).
const EVIDENCE = join(RAIZ, 'evidence');
const escolheMaisNovo = (candidatos) => {
  const legiveis = candidatos.filter((c) => Number.isFinite(c.ms));
  const sem_em = candidatos.filter((c) => !Number.isFinite(c.ms)).map((c) => c.nome);
  if (legiveis.length === 0) return { ok: false, motivo: 'nenhum candidato com carimpo legível', total: candidatos.length, sem_em };
  const max = Math.max(...legiveis.map((c) => c.ms));
  const empatados = legiveis.filter((c) => c.ms === max).map((c) => c.nome);
  if (empatados.length > 1) return { ok: false, motivo: 'empate no carimpo mais novo', total: candidatos.length, sem_em, empatados };
  const escolhido = legiveis.find((c) => c.ms === max);
  return { ok: true, nome: escolhido.nome, em: escolhido.em, total: candidatos.length, sem_em };
};
const leFamilia = (prefixo) => {
  const nomes = readdirSync(EVIDENCE).filter((n) => n.startsWith(prefixo) && n.endsWith('.json')).sort();
  const candidatos = nomes.map((n) => {
    let em;
    try { em = JSON.parse(readFileSync(join(EVIDENCE, n), 'utf8')).em; } catch { em = undefined; }
    return { nome: n, em, ms: typeof em === 'string' ? Date.parse(em) : NaN };
  });
  const escolha = escolheMaisNovo(candidatos);
  if (!escolha.ok) throw new Error(`ABORTA família ${prefixo}: ${escolha.motivo} — ${JSON.stringify(escolha)}`);
  return { ...escolha, json: JSON.parse(readFileSync(join(EVIDENCE, escolha.nome), 'utf8')) };
};
const proveniencias = [];

const porItem = ITENS.map((it) => {
  const porDoc = docs.map((d) => ({ doc: d.caminho, n: contar(it.stems, d.texto) }));
  const total = porDoc.reduce((s, d) => s + d.n, 0);
  const cobre = porDoc.filter((d) => d.n > 0).map((d) => d.doc);
  return { item: it.n, nome: it.nome, total, docs_que_cobrem: cobre, por_doc: porDoc };
});

const md5 = (s) => createHash('md5').update(s).digest('hex');
const proprio = readFileSync(import.meta.filename, 'utf8');
const portoes = [];
const reg = (nome, ok, detalhe) => portoes.push({ nome, ok, detalhe });

reg('docs_esperados_estao_todos_no_indice', conjuntos.faltantes.length === 0,
  `esperados ${ESPERADOS.length} · índice ${noIndice.length} · faltantes ${JSON.stringify(conjuntos.faltantes)} · fora_da_lista ${JSON.stringify(conjuntos.fora_da_lista)}`);

{
  const a = conjuntosDeDocs(['d/01.md', 'd/02.md'], ['d/01.md', 'd/02.md', 'd/03.md']);
  const b = conjuntosDeDocs(['d/01.md', 'd/02.md'], ['d/01.md']);
  reg('derivacao_de_conjunto_de_docs_tem_positivo_e_negativo',
    a.faltantes.length === 0 && a.fora_da_lista.length === 1 && a.varridos.length === 3 && b.faltantes.length === 1 && b.fora_da_lista.length === 0,
    `fixture A faltantes ${a.faltantes.length} fora ${JSON.stringify(a.fora_da_lista)} varridos ${a.varridos.length} · fixture B faltantes ${JSON.stringify(b.faltantes)}`);
}

reg('nenhum_doc_vazio', docs.every((d) => d.texto.length > 0),
  docs.map((d) => `${d.caminho.split('/').pop()} ${d.texto.length}`).join(' · '));

{
  const fixturePos = 'escola aluno arquitetura';
  const acha = (it) => contar(it.stems, fixturePos) > 0;
  reg('contador_dispara_no_fixture_positivo', acha(ITENS[1]) && acha(ITENS[8]) && acha(ITENS[9]),
    `fixture '${fixturePos}' -> itens 2/9/10 com ${contar(ITENS[1].stems, fixturePos)}/${contar(ITENS[8].stems, fixturePos)}/${contar(ITENS[9].stems, fixturePos)}`);
}
{
  const fixtureNeg = 'zzzz qqqq xyz';
  reg('contador_fica_mudo_sem_agulha', ITENS.every((it) => contar(it.stems, fixtureNeg) === 0),
    `fixture '${fixtureNeg}' -> soma ${ITENS.reduce((s, it) => s + contar(it.stems, fixtureNeg), 0)}`);
}

reg('cobertura_completa_dos_17_itens', porItem.every((r) => r.total > 0),
  porItem.map((r) => `${r.item}:${r.total}`).join(' '));

reg('entregaveis_da_fase_1_presentes',
  noIndice.includes(DIAGNOSTICO) && PLANO.every((p) => noIndice.includes(p)),
  `diagnostico ${noIndice.includes(DIAGNOSTICO)} · plano ${PLANO.map((p) => noIndice.includes(p)).join('/')}`);

{
  const pos = escolheMaisNovo([
    { nome: 'velho.json', em: '2026-11-20T00:00:00.000Z', ms: Date.parse('2026-11-20T00:00:00.000Z') },
    { nome: 'novo.json', em: '2026-11-26T00:00:00.000Z', ms: Date.parse('2026-11-26T00:00:00.000Z') }
  ]);
  const mudo = escolheMaisNovo([{ nome: 'sem-carimpo.json', ms: NaN }]);
  const empate = escolheMaisNovo([{ nome: 'a.json', ms: 5 }, { nome: 'b.json', ms: 5 }]);
  const vazio = escolheMaisNovo([]);
  reg('escolha_do_registo_mais_novo_tem_as_quatro_caras',
    pos.ok === true && pos.nome === 'novo.json' && mudo.ok === false && empate.ok === false
      && empate.empatados.length === 2 && vazio.ok === false,
    `positivo ${pos.ok}/${pos.nome} · sem-carimpo ${mudo.ok}/${mudo.sem_em.length} · empate ${empate.ok}/${JSON.stringify(empate.empatados)} · vazio ${vazio.ok}/${vazio.total}`);
}

{
  const lido = leFamilia('bu2-censo-catalogo');
  let censo = null;
  try {
    const j = lido.json;
    censo = {
      tabelas: j.tabelas.length,
      politicas: j.politicas.linhas[0].total,
      funcoes: j.funcoes.linhas[0].total,
      triggers: j.triggers.linhas[0].total,
      contas: j.contas_auth.linhas[0].auth_users
    };
  } catch { censo = null; }
  proveniencias.push({ familia: 'bu2-censo-catalogo', registo: lido.nome, em: lido.em, candidatos: lido.total });
  const camposPositivos = censo && Object.values(censo).every((v) => Number.isFinite(v) && v > 0);
  reg('frescura_catalogo_lida_do_registo_mais_novo_da_familia', camposPositivos === true,
    censo ? `${lido.nome} (em ${lido.em}, ${lido.total} candidatos) -> ${censo.tabelas}/${censo.politicas}/${censo.funcoes}/${censo.triggers}/${censo.contas}`
      : `${lido.nome} ilegível`);
}

{
  const lido = leFamilia('p116-consistencia-de-versao');
  let ar = null;
  try {
    const j = lido.json;
    const l = j.ar.leituras[0];
    ar = { diario: j.ar.diario, bytes: l.bytes, md5: l.md5, veredito: j.veredito };
  } catch { ar = null; }
  proveniencias.push({ familia: 'p116-consistencia-de-versao', registo: lido.nome, em: lido.em, candidatos: lido.total });
  reg('frescura_do_ar_lida_do_registo_mais_novo_da_familia', ar !== null && ar.bytes > 0 && ar.md5.length === 32,
    ar ? `${lido.nome} (em ${lido.em}, ${lido.total} candidatos) -> ${ar.diario} ${ar.bytes}B ${ar.md5} (${ar.veredito})`
      : `${lido.nome} ilegível`);
}

{
  const lido = leFamilia('p133-inventario-das-pendencias-abertas');
  const classes = lido.json.contagem_por_classe;
  proveniencias.push({ familia: 'p133-inventario-das-pendencias-abertas', registo: lido.nome, em: lido.em, candidatos: lido.total });
  reg('frescura_do_classificador_lida_do_registo_mais_novo_da_familia',
    classes && ['ABERTA', 'FECHADA', 'DIVERGENTE', 'SEM_DECLARACAO'].every((k) => Number.isFinite(classes[k])),
    classes ? `${lido.nome} (em ${lido.em}, ${lido.total} candidatos) -> ${Object.entries(classes).map(([k, v]) => `${k} ${v}`).join(' · ')}`
      : `${lido.nome} sem contagem_por_classe`);
}

{
  const nomes = readdirSync(EVIDENCE).filter((n) => n.startsWith('p133-inventario-das-pendencias-abertas') && n.endsWith('.json'));
  const sem_em = escolheMaisNovo(nomes.map((n) => ({ nome: n, ms: NaN })));
  reg('aborta_se_a_familia_nao_tiver_carimpo', sem_em.ok === false && sem_em.total === nomes.length,
    `familia p133 com ${nomes.length} registos: ${sem_em.motivo}`);
}

const ok = portoes.filter((p) => p.ok).length;
const falhas = portoes.filter((p) => !p.ok);
const registo = {
  peca: 'p146-fase1-cobertura-bu',
  em: new Date().toISOString(),
  emissor: 'scripts/p146-fase1-cobertura-bu.mjs',
  emissor_bytes: proprio.length,
  emissor_md5: md5(proprio),
  docs: docs.map((d) => ({ caminho: d.caminho, bytes: Buffer.byteLength(d.texto, 'utf8') })),
  docs_no_indice: noIndice.length,
  lista_declarada: ESPERADOS.length,
  faltantes_da_lista_declarada: conjuntos.faltantes,
  fora_da_lista_declarada: conjuntos.fora_da_lista,
  proveniencias,
  itens: porItem,
  portoes,
  veredito: `P146_FASE1_COBERTURA_${falhas.length === 0 ? 'VERDE' : 'VERMELHO'} ${ok}/${portoes.length}`
};
writeFileSync(OUT, JSON.stringify(registo, null, 2) + '\n');
console.log(`P146 registo ${OUT}`);
console.log(`P146 docs indice=${conjuntos.varridos.length} declarados=${ESPERADOS.length} faltantes=${JSON.stringify(conjuntos.faltantes)} fora_da_lista=${JSON.stringify(conjuntos.fora_da_lista)}`);
console.log(`P146 proveniencias ${proveniencias.map((p) => `${p.registo} @${p.em}`).join(' · ')}`);
console.log(porItem.map((r) => `${String(r.item).padStart(2)} ${r.nome} -> ${r.total} em ${r.docs_que_cobrem.length} docs`).join('\n'));
console.log(registo.veredito);
if (falhas.length) {
  for (const f of falhas) console.log(`FALHA ${f.nome}: ${f.detalhe}`);
  process.exit(1);
}
