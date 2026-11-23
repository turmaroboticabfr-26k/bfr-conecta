#!/usr/bin/env node
// P146 — cobertura da FASE 1 da missão «centro executivo de inteligência educacional» (briefing anexado em
// 23/11) contra os dez documentos BU em docs/bu-20-11/. Só-leitura: escreve apenas o seu registo, com guarda
// de sobrescrita. Os 17 itens vêm do briefing; os stems de cada item são as palavras com que os documentos os
// cobrem, medidas por grep sobre os próprios documentos antes de serem constantes (ver §SM.42). A frescura
// lê-se dos artefactos do §SM.41 — censo vivo, identidade do ar e classes do classificador — nunca se
// dactilografa: se o ficheiro-fonte faltar, o portão chumba.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
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
const docs = ESPERADOS.map((p) => ({ caminho: p, texto: readFileSync(join(RAIZ, p), 'utf8') }));
const contar = (stems, texto) => (texto.match(new RegExp(stems.source, 'gi')) || []).length;

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

reg('docs_no_indice_batem_com_a_lista_esperada',
  JSON.stringify(noIndice) === JSON.stringify([...ESPERADOS].sort()),
  `indice ${noIndice.length} vs esperados ${ESPERADOS.length}`);

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
  const FONTE = 'evidence/bu2-censo-catalogo-20-11-23-11-aud.json';
  let censo = null;
  try {
    const j = JSON.parse(readFileSync(join(RAIZ, FONTE), 'utf8'));
    censo = {
      tabelas: j.tabelas.length,
      politicas: j.politicas.linhas[0].total,
      funcoes: j.funcoes.linhas[0].total,
      triggers: j.triggers.linhas[0].total,
      contas: j.contas_auth.linhas[0].auth_users
    };
  } catch { censo = null; }
  const camposPositivos = censo && Object.values(censo).every((v) => Number.isFinite(v) && v > 0);
  reg('frescura_catalogo_lida_do_artefacto_sm41', camposPositivos === true,
    censo ? `${FONTE} -> ${censo.tabelas}/${censo.politicas}/${censo.funcoes}/${censo.triggers}/${censo.contas}` : `${FONTE} ilegível`);
}

{
  const FONTE = 'evidence/p116-consistencia-de-versao-21-11-23-11-sm41.json';
  let ar = null;
  try {
    const j = JSON.parse(readFileSync(join(RAIZ, FONTE), 'utf8'));
    const l = j.ar.leituras[0];
    ar = { diario: j.ar.diario, bytes: l.bytes, md5: l.md5, veredito: j.veredito };
  } catch { ar = null; }
  reg('frescura_do_ar_lida_do_artefacto_sm41', ar !== null && ar.bytes > 0 && ar.md5.length === 32,
    ar ? `${FONTE} -> ${ar.diario} ${ar.bytes}B ${ar.md5} (${ar.veredito})` : `${FONTE} ilegível`);
}

{
  const FONTE = 'evidence/p133-inventario-das-pendencias-abertas-22-11--23-11-aud.json';
  let classes = null;
  try {
    const j = JSON.parse(readFileSync(join(RAIZ, FONTE), 'utf8'));
    classes = j.contagem_por_classe;
  } catch { classes = null; }
  reg('frescura_do_classificador_lida_do_artefacto_sm41',
    classes && ['ABERTA', 'FECHADA', 'DIVERGENTE', 'SEM_DECLARACAO'].every((k) => Number.isFinite(classes[k])),
    classes ? `${FONTE} -> ${Object.entries(classes).map(([k, v]) => `${k} ${v}`).join(' · ')}` : `${FONTE} ilegível`);
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
  itens: porItem,
  portoes,
  veredito: `P146_FASE1_COBERTURA_${falhas.length === 0 ? 'VERDE' : 'VERMELHO'} ${ok}/${portoes.length}`
};
writeFileSync(OUT, JSON.stringify(registo, null, 2) + '\n');
console.log(`P146 registo ${OUT}`);
console.log(porItem.map((r) => `${String(r.item).padStart(2)} ${r.nome} -> ${r.total} em ${r.docs_que_cobrem.length} docs`).join('\n'));
console.log(registo.veredito);
if (falhas.length) {
  for (const f of falhas) console.log(`FALHA ${f.nome}: ${f.detalhe}`);
  process.exit(1);
}
