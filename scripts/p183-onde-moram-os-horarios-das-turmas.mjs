// Onde moram os horários das turmas, medido no catálogo vivo, e que horas são agora no fuso do aplicativo.
// A peça existe para responder a uma pergunta que o portão da portaria não responde: as bandas confirmáveis
// cobrem a hora em que a escola está de facto em aula? Nada aqui escreve: uma consulta por linha de catálogo.
// Uso: P183_SUF=<sufixo> node scripts/p183-onde-moram-os-horarios-das-turmas.mjs [--selfteste]
// A proveniência da ligação é lida do fonte do produtor (p178) e a peça aborta se não a ler: um nome de projeto,
// um fuso ou um endpoint dactilografados aqui envelhem sem que ninguém dê por isso.
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdtempSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const PRODUTOR = 'scripts/p178-portao-da-portaria-lido-do-ar.mjs';
const SUF = process.env.P183_SUF;
if (!SUF) throw new Error('ABORTA: P183_SUF e obrigatorio — cada corrida precisa de nome proprio');
const OUT = join(REPO, 'evidence', 'p183-horarios-das-turmas-' + SUF + '.json');
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' ja existe — use outro P183_SUF');
const EU = readFileSync(new URL(import.meta.url), 'utf8');
const fonte = readFileSync(join(REPO, PRODUTOR), 'utf8');

function constanteDoProdutor(nome, re, deOnde) {
  const m = re.exec(deOnde);
  if (!m) throw new Error('ABORTA: o produtor ' + PRODUTOR + ' nao devolve a constante «' + nome + '» — foi renomeado ou apagado');
  return m[1];
}
const REF = constanteDoProdutor('REF', /const REF = '([a-z0-9]+)'/, fonte);
const PATCAMINHO = constanteDoProdutor('PAT', /readFileSync\('([^']+\.supabase-pat)'/, fonte);
const ENDPOINT = constanteDoProdutor('ENDPOINT', /fetch\('(https:\/\/api\.supabase\.com\/v1\/projects\/)'/, fonte);
const FUSO = constanteDoProdutor('FUSO', /timeZone: '([^']+)'/, fonte);
const TABELA_TURNO = constanteDoProdutor('TABELA_TURNO', /public\.(bfr_school_shift_settings)/, fonte);

const FIX_PROVENIENCIA = [
  { id: 'f1_ref_ausente_aborta', deOnde: "const OUTRO = 'abc'", re: /const REF = '([a-z0-9]+)'/, esperaAborta: true },
  { id: 'f2_ref_presente_devolve', deOnde: "const REF = 'zzz1'", re: /const REF = '([a-z0-9]+)'/, esperaAborta: false, espera: 'zzz1' },
  { id: 'f3_fuso_ausente_aborta', deOnde: "const tz = 'UTC'", re: /timeZone: '([^']+)'/, esperaAborta: true },
  { id: 'f4_tabela_de_turno_ausente_aborta', deOnde: 'from public.outra_coisa', re: /public\.(bfr_school_shift_settings)/, esperaAborta: true },
];
const casosProv = FIX_PROVENIENCIA.map((f) => {
  let obtido = null, abortou = false;
  try { obtido = constanteDoProdutor(f.id, f.re, f.deOnde); } catch (e) { abortou = true; obtido = e.message.slice(0, 40); }
  const bate = f.esperaAborta ? abortou === true : abortou === false && obtido === f.espera;
  return { id: f.id, espera: f.esperaAborta ? 'aborta' : f.espera, obtido, bate };
});

// A janela que abre o portao NAO e recontada aqui: quem a mede e o p178, que extrai o predicado dos bytes do ar.
// A 1.ª versao desta peca calculava «turnos que cobrem o instante» com class_starts_at e fim exclusivo — o app
// compara entry_opens_at com fim INCLUSIVO e so admite um unico turno (activeSchoolShift, linha 25498 do shell),
// por isso a copia aproximada media outra coisa. O veredicto passa a vir do registo mais novo do produtor e a
// peça aborta se nao o ler; as fixtures abaixo provam os dois sentidos dessa leitura.
function maisRecentePrimeiro(fichas) { return fichas.slice().sort((a, b) => b.m - a.m); }
function veredictoDoPortaoMaisNovo(fichas) {
  if (fichas.length === 0) throw new Error('ABORTA: nenhum registo do p178 em evidence/ — a janela do portao nao pode ser lembrada');
  const reg = JSON.parse(readFileSync(fichas[0].caminho, 'utf8'));
  const deFora = reg.veredito;
  const deDentro = reg && reg.medido ? reg.medido.veredito : undefined;
  const minutos = reg && reg.medido ? reg.medido.minutos_locais : undefined;
  if (typeof deFora !== 'string' || deFora !== deDentro) throw new Error('ABORTA: o registo p178 nao bate veredito com medido.veredito — obtido ' + JSON.stringify([deFora, deDentro]));
  if (!Number.isInteger(minutos)) throw new Error('ABORTA: medido.minutos_locais ausente no registo p178 — obtido ' + JSON.stringify(minutos));
  return { veredito: deFora, minutos_locais: minutos, linhas_de_turno: reg.medido.linhas_de_turno, com_confirmacao: reg.medido.com_confirmacao, registos_lidos: fichas.length, caminho: fichas[0].caminho };
}
const FICHAS_P178 = maisRecentePrimeiro(readdirSync(join(REPO, 'evidence'))
  .filter((f) => /^p178-portao-da-portaria-.*\.json$/.test(f))
  .map((f) => ({ caminho: join(REPO, 'evidence', f), m: statSync(join(REPO, 'evidence', f)).mtimeMs })));

const FIX_PORTA = [];
{
  const dir = mkdtempSync(join(tmpdir(), 'p183porta-'));
  const ficha = (nome, corpo, m) => { const c = join(dir, nome); writeFileSync(c, JSON.stringify(corpo)); return { caminho: c, m }; };
  const boa = (v, m) => ficha('boa-' + m + '.json', { veredito: v, medido: { veredito: v, minutos_locais: 900, linhas_de_turno: 2, com_confirmacao: 2 } }, m);
  const fAberta = boa('ABERTO', 1);
  const fFechada = boa('FECHADO_NENHUMA_LINHA_CONFIRMADA', 2);
  const fSemDentro = ficha('sem_dentro.json', { veredito: 'ABERTO' }, 3);
  const fDivergente = ficha('divergente.json', { veredito: 'ABERTO', medido: { veredito: 'FECHADO_HORA_FORA_DA_JANELA_CONFIRMADA', minutos_locais: 900 } }, 4);
  const provaPorta = (id, fichas, espera) => {
    let obtido;
    try { obtido = veredictoDoPortaoMaisNovo(fichas).veredito; } catch (e) { obtido = 'aborta'; }
    FIX_PORTA.push({ id, espera, obtido, bate: obtido === espera });
  };
  provaPorta('g1_sem_registo_aborta', [], 'aborta');
  provaPorta('g2_a_mais_nova_ganha', maisRecentePrimeiro([fAberta, fFechada]), 'FECHADO_NENHUMA_LINHA_CONFIRMADA');
  provaPorta('g3_a_ordem_de_entrada_nao_troca_o_mundo', maisRecentePrimeiro([fFechada, fAberta]), 'FECHADO_NENHUMA_LINHA_CONFIRMADA');
  provaPorta('g4_sem_medido_aborta', [fSemDentro], 'aborta');
  provaPorta('g5_vereditos_divergentes_aborta', [fDivergente], 'aborta');
}

const saida = {
  peca: 'p183-onde-moram-os-horarios-das-turmas',
  ficheiro_do_produtor_lido: PRODUTOR,
  emissor_bytes: Buffer.byteLength(EU, 'utf8'),
  emissor_md5: createHash('md5').update(EU).digest('hex'),
  produtor_bytes: Buffer.byteLength(fonte, 'utf8'),
  produtor_md5_8: createHash('md5').update(fonte).digest('hex').slice(0, 8),
  proveniencia_lida: { ref_8: REF.slice(0, 8), pat_caminho: PATCAMINHO, endpoint_prefixo: ENDPOINT, fuso: FUSO, tabela_turno: TABELA_TURNO },
  prova_proveniencia: casosProv,
  prova_portaria_lida_do_registo: FIX_PORTA,
};
const vermesProv = casosProv.concat(FIX_PORTA).filter((c) => !c.bate);
if (vermesProv.length) {
  saida.veredito = 'P183_VERMELHO_PROVENIENCIA';
  writeFileSync(OUT, JSON.stringify(saida, null, 1), 'utf8');
  throw new Error('ABORTA: a prova de proveniencia falhou em ' + JSON.stringify(vermesProv.map((c) => c.id)));
}

if (process.argv.includes('--selfteste')) {
  saida.modo = 'selfteste';
  saida.veredito = 'P183_SELFTESTE_OK';
  writeFileSync(OUT, JSON.stringify(saida, null, 1), 'utf8');
  console.log(saida.veredito + ' casos=' + (casosProv.length + FIX_PORTA.length) + ' proveniencia=' + casosProv.length + ' portaria=' + FIX_PORTA.length);
  for (const c of casosProv.concat(FIX_PORTA)) console.log('  ' + c.id + ' espera=' + c.espera + ' obtido=' + JSON.stringify(c.obtido) + ' bate=' + c.bate);
  process.exit(0);
}

const PAT = readFileSync(PATCAMINHO, 'utf8').trim();
const q = async (sql) => {
  const r = await fetch(ENDPOINT + REF + '/database/query', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + PAT, 'content-type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error('ABORTA HTTP ' + r.status + ' :: ' + t.slice(0, 300));
  return JSON.parse(t);
};

const agora = new Date();
const partes = new Intl.DateTimeFormat('en-GB', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false }).formatToParts(agora).reduce((a, p) => (a[p.type] = p.value, a), {});
const minutoLocal = Number(partes.hour) * 60 + Number(partes.minute);
saida.instantaneo = { data_local: partes.year + '-' + partes.month + '-' + partes.day, dia_da_semana: partes.weekday, hora_local: partes.hour + ':' + partes.minute, minutos_desde_meia_noite: minutoLocal, fuso: FUSO };

const colunasTempo = await q("select table_name, column_name, data_type from information_schema.columns where table_schema='public' and data_type in ('time without time zone','time with time zone') order by table_name, column_name");
const nomesColunasDias = await q("select table_name, column_name, data_type from information_schema.columns where table_schema='public' and table_name in (select table_name from information_schema.columns where table_schema='public' and data_type in ('time without time zone','time with time zone')) and (column_name ilike '%day%' or column_name ilike '%weekday%' or column_name ilike '%dia%' or column_name ilike '%shift%' or column_name ilike '%start%' or column_name ilike '%end%' or column_name ilike '%hora%') order by table_name, column_name");
const tabelas = [...new Set(colunasTempo.map((c) => c.table_name))];
const contagens = {};
for (const t of tabelas) {
  if (!/^[a-z_][a-z0-9_]*$/.test(t)) throw new Error('ABORTA: nome de tabela ilegitimo lido do catalogo: ' + t);
  const r = await q('select count(*)::int as n from public.' + t);
  contagens[t] = r[0].n;
}
saida.catalogo = { tabelas_com_coluna_de_tempo: tabelas, colunas_de_tempo: colunasTempo, colunas_de_eixo: nomesColunasDias, linhas_por_tabela: contagens };
if (tabelas.length === 0) {
  saida.veredito = 'P183_VERMELHO_NENHUMA_TABELA_COM_TEMPO';
  writeFileSync(OUT, JSON.stringify(saida, null, 1), 'utf8');
  throw new Error('ABORTA: nenhuma tabela public.* tem coluna de tempo — o censo nao tem positivo para a pergunta');
}

const turnos = await q('select school_year, shift, entry_opens_at, class_starts_at, shift_closes_at, active_weekdays, late_grace_minutes, (confirmed_at is not null) as confirmado from public.' + TABELA_TURNO + ' order by school_year, shift');
saida.turnos_configurados = turnos;
saida.janela_configurada_por_turno = turnos.map((t) => ({
  turno: t.shift, portao_abre: t.entry_opens_at, aula_comeca: t.class_starts_at, turno_fecha: t.shift_closes_at,
  dias_com_aula: t.active_weekdays, confirmado: t.confirmado, tolerancia_min: t.late_grace_minutes,
}));
saida.portaria_lida_do_registo_do_produtor = veredictoDoPortaoMaisNovo(FICHAS_P178);

saida.veredito = 'P183_HORARIOS_MEDIDOS';
writeFileSync(OUT, JSON.stringify(saida, null, 1), 'utf8');
console.log(saida.veredito + ' minuto_local=' + minutoLocal + ' tabelas=' + tabelas.length + ' turnos=' + turnos.length + ' portaria_do_p178=' + saida.portaria_lida_do_registo_do_produtor.veredito + ' aos_minutos=' + saida.portaria_lida_do_registo_do_produtor.minutos_locais + ' captura=' + OUT);
for (const t of turnos) console.log('  turno ' + t.school_year + '/' + t.shift + ' ' + t.entry_opens_at + '..' + t.shift_closes_at + ' aula_desde=' + t.class_starts_at + ' dias=' + JSON.stringify(t.active_weekdays) + ' confirmado=' + t.confirmado);
