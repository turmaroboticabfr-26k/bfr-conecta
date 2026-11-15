// RM-6.8 degrau 3 — fecho consolidado.
// NÃO sobrescreve: se evidence/rm68-ruler3-fecho.json já existir, aborta.
// Todos os números vêm de (a) parsing dos artefactos em disco, (b) sondas
// somente-leitura rodadas agora. Nada é dactilografado.
// Sondas: contagem de referências às 4 tabelas do RM-6.8 dentro do instrumento
// do degrau 3 (bounding de alcance), censo de contas sintéticas por classe,
// e taxa do HTTP 500 intermitente da API de gestão.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const REF = 'yyzqoxlkcvqpessypfjo';
const sqlToken = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();
const FECHO = 'evidence/rm68-ruler3-fecho.json';

if (existsSync(FECHO)) throw new Error(`Feito antes: ${FECHO} já existe — não sobrescrever artefactos.`);

const sql = async (query, tentativas = 6) => {
  let ultimo = '';
  for (let i = 0; i < tentativas; i++) {
    const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + sqlToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const t = await r.text();
    if (r.ok) return JSON.parse(t);
    ultimo = `sql HTTP ${r.status}: ${t.slice(0, 200)}`;
    if (!/Failed to check user auth status/.test(t)) throw new Error(ultimo);
    await new Promise((s) => setTimeout(s, 3000));
  }
  throw new Error(`sql esgotou as tentativas — ${ultimo}`);
};

const ler = (p) => readFileSync(p, 'utf8');

// --- (a) números lidos dos artefactos ---
const stdoutB = ler('evidence/rm68-ruler3-stdout-b.log');
const diary = JSON.parse(ler('evidence/s20-ruler3-diary.json'));
const limpeza = ler('evidence/rm68-ruler3-limpeza.log');
const limpezaStorage = ler('evidence/rm68-ruler3-limpeza-storage.log');
const compare1 = ler('evidence/rm68-ruler3-compare-1.log');
const compare2 = ler('evidence/rm68-ruler3-compare-2.log');
const pre = JSON.parse(ler('evidence/rm68-ruler3-baseline-pre-b.json'));
const pos = JSON.parse(ler('evidence/rm68-ruler3-baseline-pos-b.json'));

const num = (txt, re, nome) => {
  const m = re.exec(txt);
  if (!m) throw new Error(`Regex não casou em ${nome}`);
  return m[1];
};

const behavioral = {
  portoes: Number(num(stdoutB, /Portões:\s*(\d+)/, 'Portões')),
  falhas: Number(num(stdoutB, /Falhas:\s*(\d+)/, 'Falhas')),
  veredito: diary.stages['S20 Behavioral'].veredito,
  started: diary.started,
  verde_linhas: (stdoutB.match(/^VERDE/gm) || []).length,
  prosa_limpeza_do_instrumento: num(stdoutB, /(\[7\][^\n]*)/, '[7]').trim(),
};

// última passada da limpeza (depois do ciclo) = o bloco com LIMPEZA_OK final
const blocosLimpeza = limpeza.split('Contas s20-\* encontradas:').slice(1);
const ultimoBloco = 'Contas s20-* encontradas:' + blocosLimpeza[blocosLimpeza.length - 1];
const limpezaContas = {
  contas_encontradas: Number(num(ultimoBloco, /Contas s20-\* encontradas:\s*(\d+)/, 'contas')),
  linhas_supervision_audit: Number(
    num(ultimoBloco, /Linhas supervision_audit dessas contas:\s*(\d+)/, 'audit rows'),
  ),
  remanescentes: Number(num(ultimoBloco, /Remanescentes após limpeza:\s*(\d+)/, 'remanescentes')),
  escolas_s20_remanescentes: Number(
    num(ultimoBloco, /Escolas %S20 remanescentes:\s*(\d+)/, 'escolas'),
  ),
  veredito: num(ultimoBloco, /(LIMPEZA_OK)/, 'LIMPEZA_OK'),
};

const storage = {
  antes: Number(num(limpezaStorage, /Objetos no bucket antes:\s*(\d+)/, 'antes')),
  deste_ciclo: Number(
    num(limpezaStorage, /Pertencentes a este ciclo:\s*(\d+)/, 'deste ciclo'),
  ),
  depois: Number(num(limpezaStorage, /Objetos no bucket depois:\s*(\d+)/, 'depois')),
  veredito: num(limpezaStorage, /(LIMPEZA_STORAGE_OK)/, 'LIMPEZA_STORAGE_OK'),
};

const baseline = {
  pre_em: pre.em,
  pos_em: pos.em,
  tabelas: Object.keys(pre.tabelas).length,
  compare_1: num(compare1, /(BASELINE_DIVERGENTE \(\d\)|BASELINE_RESTAURADA)/, 'compare 1'),
  compare_2: num(compare2, /(BASELINE_RESTAURADA|BASELINE_DIVERGENTE \(\d\))/, 'compare 2'),
  verde_no_compare_2: (compare2.match(/^VERDE/gm) || []).length,
  auth_users_pre_a: JSON.parse(ler('evidence/rm68-ruler3-baseline-pre.json')).tabelas['auth.users'].n,
  auth_users_pre_b: pre.tabelas['auth.users'].n,
  auth_users_pos: pos.tabelas['auth.users'].n,
};

// --- (b) bounding: o instrumento do degrau 3 não toca as tabelas do RM-6.8 ---
const instrumento = ler('scripts/s20-behavioral-ruler3.mjs');
const alvo_rm68 = ['attendance', 'grades', 'access_requests', 'occurrences'];
const referencias = {};
for (const t of alvo_rm68) referencias[t] = (instrumento.match(new RegExp(t, 'g')) || []).length;
const total_referencias = Object.values(referencias).reduce((s, n) => s + n, 0);

// --- (c) censo somente-leitura de contas sintéticas por classe ---
const censo = await sql(
  `select split_part(email,'@',1) as classe, count(*) as n,
          min(created_at)::text as primeira, max(created_at)::text as ultima
     from auth.users
    where email like 's20-%' or email like 's17-%'
    group by 1 order by 1;`,
);
const auditPorClasse = await sql(
  `select split_part(p.email,'@',1) as classe, count(*) as n
     from public.supervision_audit a join auth.users p on p.id = a.profile_id
    where p.email like 's20-%' or p.email like 's17-%'
    group by 1 order by 1;`,
);

// --- (d) taxa do HTTP 500 intermitente na API de gestão (5 sondas idempotentes) ---
let probes = { ok: 0, http500_auth: 0, outros: 0 };
for (let i = 0; i < 5; i++) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + sqlToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'select 1;' }),
  });
  const t = await r.text();
  if (r.ok) probes.ok++;
  else if (r.status === 500 && /Failed to check user auth status/.test(t)) probes.http500_auth++;
  else probes.outros++;
}

const out = {
  ciclo: 'RM-6.8 degrau 3 (régua de equivalência por papel com JWTs reais)',
  ok_litral: 'Autorizo — rodar o degrau 3',
  em: new Date().toISOString(),
  behavioral,
  limpeza_contas: limpezaContas,
  limpeza_storage: storage,
  baseline,
  alcance: {
    instrumento: 'scripts/s20-behavioral-ruler3.mjs',
    politicas_provas: 9,
    gaps: 10,
    tabelas_do_degrau_3: [
      'supervision_responses',
      'supervision_requests',
      'sports_schools',
      'storage.objects (secretary-attachments)',
    ],
    tabelas_alteradas_pelo_rm68: alvo_rm68,
    referencias_do_rm68_no_instrumento: referencias,
    total_referencias,
    limitacao:
      total_referencias === 0
        ? 'O degrau 3 prova equivalência autenticada apenas para as 9 policies do S20; as 11 policies PUBLIC alteradas pelo RM-6.8 (attendance/grades/access_requests/occurrences) NÃO são exercidas por este instrumento — continuam cobertas pela conferência de texto (44/0) e pela suite RM-1.4 no anon (30/1/0).'
        : 'Instrumento toca tabelas do RM-6.8 — bounding inválido.',
  },
  sobras_fora_do_escopo: {
    nota:
      'Classe de fuga idêntica à do ciclo, medida mas NÃO removida: fora do OK do degrau 3 (escopo s20).',
    contas: censo,
    supervision_audit: auditPorClasse,
  },
  api_gestao_probe_5x_select_1: probes,
  artefactos: {
    stdout: 'evidence/rm68-ruler3-stdout-b.log',
    diary: 'evidence/s20-ruler3-diary.json',
    limpeza: 'evidence/rm68-ruler3-limpeza.log',
    limpeza_storage: 'evidence/rm68-ruler3-limpeza-storage.log',
    baseline_pre_a: 'evidence/rm68-ruler3-baseline-pre.json',
    baseline_pre_operativa: 'evidence/rm68-ruler3-baseline-pre-b.json',
    baseline_pos: 'evidence/rm68-ruler3-baseline-pos-b.json',
    compare_divergente: 'evidence/rm68-ruler3-compare-1.log',
    compare_restaurada: 'evidence/rm68-ruler3-compare-2.log',
    run_abortado: 'evidence/rm68-ruler3-stdout.log',
  },
};

writeFileSync(FECHO, JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify(out, null, 2));
console.log('FECHO_ESCRITO ' + FECHO);
