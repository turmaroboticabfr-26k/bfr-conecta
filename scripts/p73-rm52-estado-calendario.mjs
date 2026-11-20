#!/usr/bin/env node
// RM-5.2 (peça 1) — ESTADO SÓ-LEITURA do turno/calendário real da portaria, 20/11.
// Porque existe: as três mesas foram criadas a 18/11 (PEN-29 fechada por execução) mas o conteúdo
// é a RM-5.2 e nada neste ciclo seminou seja o que for. Este instrumento mede três coisas que a
// prosa não pode inventar:
//   (a) o catálogo e as linhas de hoje (quantas, que anos, que políticas, que privilégios);
//   (b) se o front tem caminho para escrever `source_status='confirmed'` — o único estado que
//       `schoolDayConfirmed()` aceita — e se a função RPC que ele chama existe no banco;
//   (c) a tabela de verdade do portão da portaria, obtida COMPILANDO as cinco funções síncronas tal
//       como vivem no bundle servido (node:vm) contra quatro estados sintéticos: antes do DDL
//       (404), hoje (200 com zero linhas), com conteúdo confirmado e com conteúdo fora da janela.
//       O instante é CONGELADO por mim e lido do `schoolClock` servido — ver a nota no bloco.
//       É isto que decide se a RM-5.2 é «encher tabelas» ou «reabrir uma função que hoje lança erro».
//       (d) há DOIS `registerGateCheckin` no bundle servido, em regiões diferentes, e chamam RPCs
//       diferentes; qual deles a portaria em execução realmente dispara é pergunta de browser, e
//       fica registada como falta em vez de ser afirmada.
// Zero escrita: SELECT, GET com sessão e anónimo, leitura de ficheiro versionado. Chave nunca gravada.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { sql, HOST } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const FORA = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const SUF = process.env.RM52_SUF ? '-' + process.env.RM52_SUF : '';
const BUNDLE = join(REPO, 'bfr-candidata-v136-secretaria-de-educacao/index.html');
const OUT = join(REPO, `evidence/p73-rm52-estado-calendario-20-11${SUF}.json`);
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com RM52_SUF=novo, nunca por cima');

const TABELAS = ['bfr_school_shift_settings', 'bfr_school_calendar_days', 'bfr_school_calendar_month_targets'];
const RPCS_FRONT = ['bfr_confirm_school_calendar', 'register_gate_checkin', 'register_gate_checkin_v2'];
const RPC_CONTROLO = 'correct_gate_attendance';

const bundle = readFileSync(BUNDLE, 'utf8');
const bundleMd5 = createHash('md5').update(bundle, 'utf8').digest('hex');
const qtd = (s) => bundle.split(s).length - 1;

// Extrai o corpo de `function NOME(` por contagem de chavetas, saltando literais de string, e
// conserva o `async` quando ele faz parte da declaração (sem ele, um corpo com `await` não compila).
function extraiFuncao(nome) {
  const inicio = bundle.indexOf('function ' + nome + '(');
  if (inicio < 0) return null;
  const comAsync = bundle.slice(Math.max(0, inicio - 6), inicio).endsWith('async ') ? 'async ' : '';
  const abre = bundle.indexOf('{', inicio);
  let fundo = abre + 1, Prof = 1, cita = null;
  while (fundo < bundle.length && Prof > 0) {
    const c = bundle[fundo];
    if (cita) { if (c === '\\') fundo++; else if (c === cita) cita = null; }
    else if (c === "'" || c === '"' || c === '`') cita = c;
    else if (c === '{') Prof++;
    else if (c === '}') Prof--;
    fundo++;
  }
  return Prof === 0 ? comAsync + bundle.slice(inicio, fundo) : null;
}
// Só as síncronas entram na máquina: são elas que decidem o portão. As outras duas vivem
// no artefacto como fonte registrada (têm `await`, e chamá-las escreveria no banco).
// `gateReady` está listada porque é ELA que `gateScanReady` chama; omitida, a máquina rebentava em
// `ReferenceError: gateReady is not defined` — que foi exatamente o vermelho da corrida anterior.
const FUNCOES = ['schoolDayConfirmed', 'activeSchoolShift', 'gateReady', 'gateLegacyMode', 'gateScanReady'];
const FUNCOES_REGISTRO = ['registerGateCheckin', 'registerGateToken', 'confirmGateCalendar'];
const fonte = Object.fromEntries(FUNCOES.map((f) => [f, extraiFuncao(f)]));
const ocorrencias = Object.fromEntries(FUNCOES.map((f) => [f, qtd('function ' + f + '(')]));
// Há mais de um `registerGateCheckin` no bundle (coordenação e portaria). Em vez de adivinar qual,
// extraem-se TODAS as definições do nome e escolhe-se a que contém o ramo `_v2` — a única que o
// portão da portaria pode chamar. O nome do RPC escolhido sai do fonte servido, não da reconstrução.
function extraiTodas(nome) {
  const alvo = 'function ' + nome + '(', out = [];
  let k = 0;
  while ((k = bundle.indexOf(alvo, k)) >= 0) { const t = extraiFuncaoDesde(k); if (t) out.push({ indice: k, texto: t }); k += alvo.length; }
  return out;
}
function extraiFuncaoDesde(inicio) {
  const comAsync = bundle.slice(Math.max(0, inicio - 6), inicio).endsWith('async ') ? 'async ' : '';
  const abre = bundle.indexOf('{', inicio);
  let fundo = abre + 1, Prof = 1, cita = null;
  while (fundo < bundle.length && Prof > 0) {
    const c = bundle[fundo];
    if (cita) { if (c === '\\') fundo++; else if (c === cita) cita = null; }
    else if (c === "'" || c === '"' || c === '`') cita = c;
    else if (c === '{') Prof++;
    else if (c === '}') Prof--;
    fundo++;
  }
  return Prof === 0 ? comAsync + bundle.slice(inicio, fundo) : null;
}
const ramosPortaria = extraiTodas('registerGateCheckin');
const fonteRamo = ramosPortaria.find((r) => r.texto.includes('register_gate_checkin_v2')) || null;
const registroFonte = Object.fromEntries(FUNCOES_REGISTRO.map((f) => [f, { definicoes_no_bundle: extraiTodas(f).length, indice: bundle.indexOf('function ' + f + '('), chars: (extraiFuncao(f) || '').length }]));

// Contrato do front: rótulos de leitura, selects, onConflict e o literal de escrita do dia.
const rotulos = ['configuração de turnos', 'calendário letivo', 'metas do calendário'];
const pedidos = Object.fromEntries(TABELAS.map((t) => {
  const alvo = `.from('${t}')`;
  const sel = [], confl = [], escrita = [];
  let i = 0;
  while ((i = bundle.indexOf(alvo, i)) >= 0) {
    const jato = bundle.slice(i, i + 900);
    const k = jato.indexOf('.select(');
    if (k >= 0) { const a = jato.indexOf("'", k + 8), b = jato.indexOf("'", a + 1); if (a >= 0 && b > a) sel.push(jato.slice(a + 1, b)); }
    const c = jato.indexOf('onConflict');
    if (c >= 0) { const a = jato.indexOf("'", c), b = jato.indexOf("'", a + 1); if (a >= 0 && b > a) confl.push(jato.slice(a + 1, b)); }
    if (jato.indexOf('.upsert(') >= 0 || jato.indexOf('.insert(') >= 0) escrita.push(i);
    i += alvo.length;
  }
  return [t, { chamadas: qtd(alvo) - 0, selects: sel, on_conflict: confl, escritas: escrita.length }];
}));
const diaLiteral = /source_status:\s*'(\w+)'/g;
const estadosEscritos = [...new Set([...bundle.matchAll(/source_status:\s*'(\w+)'/g)].map((m) => m[1]))];
const bindingAno = bundle.slice(0, bundle.indexOf('async function confirmGateCalendar')).match(/(?:const|let)\s+schoolYear\s*=\s*([^;]{1,40})/g);
const regra365 = /calendarDays\.length===365/.test(bundle);

// ---- banco, só leitura ----------------------------------------------------
const colunas = await sql(`select table_name as tabela, column_name as coluna, data_type as tipo, is_nullable as nulable, coalesce(column_default,'') as omissao
  from information_schema.columns where table_schema='public' and table_name in (${TABELAS.map((x) => `'${x}'`).join(',')}) order by 1, ordinal_position`);
const restricoes = await sql(`select c.relname as tabela, k.conname as nome, k.contype as tipo, pg_get_constraintdef(k.oid) as definicao
  from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
  where c.relname in (${TABELAS.map((x) => `'${x}'`).join(',')}) order by 1, 3, 2`);
const linhas = await sql(TABELAS.map((t) => `select '${t}' as tabela, count(*)::int as linhas, coalesce((select string_agg(x, ',' order by x) from (select distinct school_year::text as x from public.${t}) q),'') as anos from public.${t}`).join(' union all '));
const politicas = await sql(`select p.polname as nome, t.relname as tabela, case p.polcmd when 'r' then 'SELECT' when 'a' then 'ALL' when 'w' then 'UPDATE' when 'i' then 'INSERT' when 'd' then 'DELETE' else p.polcmd::text end as comando,
  (select string_agg(r.rolname, ',' order by r.rolname) from unnest(p.polroles) rid join pg_roles r on r.oid=rid) as papeis_politica,
  pg_get_expr(p.polqual, p.polrelid) as using_txt, coalesce(pg_get_expr(p.polwithcheck, p.polrelid),'') as check_txt
  from pg_policy p join pg_class t on t.oid=p.polrelid join pg_namespace n on n.oid=t.relnamespace and n.nspname='public'
  where t.relname in (${TABELAS.map((x) => `'${x}'`).join(',')}) order by 2, 1`);
const NOMES_RPC_PROVADOS = [...RPCS_FRONT, RPC_CONTROLO, 'bfr_rls_session_role', 'bfr_nome_de_controlo_negativo_inexistente'];
const rpcExiste = await sql(`select nome,
  (select count(*)::int from pg_proc where proname=nome) as no_catalogo,
  coalesce((select string_agg(nn.nspname, ',' order by nn.nspname) from pg_proc p join pg_namespace nn on nn.oid=p.pronamespace where p.proname=nome),'') as schemas
  from (values ${NOMES_RPC_PROVADOS.map((x) => `('${x}')`).join(',')}) as t(nome) order by 1`);
const gradeTempos = await sql(`select v.status as estado_versao, count(*)::int as entradas, min(e.start_time)::text as inicio_min, max(e.end_time)::text as fim_max,
  coalesce((select string_agg(x, ',' order by x) from (select distinct e2.weekday::text as x from public.bfr_schedule_entries e2 join public.bfr_schedule_versions v2 on v2.id=e2.version_id where v2.status=v.status) q),'') as dias
  from public.bfr_schedule_entries e join public.bfr_schedule_versions v on v.id=e.version_id group by 1 order by 1`);
const baselines = await sql(`select (select count(*)::int from public.schools) as schools, (select count(*)::int from public.classes) as classes,
  (select count(*)::int from public.students) as students, (select count(*)::int from public.profiles) as profiles,
  (select coalesce((select string_agg(x, ',' order by x) from (select distinct year::text as x from public.classes) q),'') ) as classes_graus`);

// ---- REST com sessão real e sem sessão ------------------------------------
const shellTxt = bundle;
const anonKey = (/SUPABASE_PUBLISHABLE_KEY\s*=\s*['"]([^'"]+)['"]/.exec(shellTxt) || [])[1];
if (!anonKey) throw new Error('ABORTA: sem chave publishable nos bytes servidos');
const sess = JSON.parse(readFileSync(join(FORA, 'ah2-sessions.json'), 'utf8'));
// A casa tem DOIS sítios de cadeia: o mestre (`ah2-sessions.json`, de 19/11) e o por-papel
// (`ah2-sessao-<papel>.json`, reescrito pela rotação de cada instrumento). À hora desta corrida as
// seis cadeias do mestre morriam em `refresh HTTP 400` — foi exatamente o vermelho da corrida
// anterior, cuja causa era o instrumento ler só um dos sítios. Tenta-se o por-papel primeiro e a
// cadeia renovada volta a gravar-se NO FICHEIRO DE ONDE VEIO (um refresh bem-sucedido ROTACIONA,
// por isso «sondar» e «gastar» são o mesmo ato). Nenhum token entra no artefacto: só o nome do
// ficheiro e o estado.
const lerCadeia = (nome) => {
  const fich = join(FORA, `ah2-sessao-${nome}.json`);
  if (existsSync(fich)) {
    const tudo = JSON.parse(readFileSync(fich, 'utf8'));
    if (tudo[nome] && tudo[nome].refresh_token) return { onde: fich, dados: tudo[nome], escrever: (novo) => { const c = JSON.parse(readFileSync(fich, 'utf8')); c[nome] = novo; writeFileSync(fich, JSON.stringify(c, null, 2) + '\n'); } };
  }
  return { onde: join(FORA, 'ah2-sessions.json'), dados: sess[nome], escrever: (novo) => { const c = JSON.parse(readFileSync(join(FORA, 'ah2-sessions.json'), 'utf8')); c[nome] = novo; writeFileSync(join(FORA, 'ah2-sessions.json'), JSON.stringify(c, null, 2) + '\n'); } };
};
const nomeDoSitio = (caminho) => caminho.split('/').pop();
const tokenVivo = async (nome) => {
  const c = lerCadeia(nome);
  const p = c.dados;
  if (!p || !p.refresh_token) return { erro: 'sem_cadeia_em_nenhum_sitio', lida_de: nomeDoSitio(c.onde) };
  if (Number(p.expires_at) * 1000 > Date.now() + 30_000) return { access: p.access_token, renovado: false, lida_de: nomeDoSitio(c.onde), uid: p.id || null };
  const r = await fetch(`${HOST}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { 'content-type': 'application/json', apikey: anonKey, Authorization: `Bearer ${anonKey}` }, body: JSON.stringify({ refresh_token: p.refresh_token }) });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j || !j.access_token) return { erro: 'refresh HTTP ' + r.status, lida_de: nomeDoSitio(c.onde) };
  const novo = { ...p, ...j, expires_at: j.expires_at ?? Math.floor(Date.now() / 1000) + (j.expires_in || 3600) };
  c.escrever(novo);
  return { access: j.access_token, renovado: true, lida_de: nomeDoSitio(c.onde), gravado_em: nomeDoSitio(c.onde), uid: novo.id || p.id || null };
};
// A lista é sondada, não exigida: cada cadeia morta imprime-se como achado em vez de abortar a
// corrida (foi o aborto de `gatekeeper` que tornou a corrida 3 inútil).
const PERSONAS_SONDADAS = ['secretary', 'director', 'developer', 'education_supervisor', 'coordinator', 'gatekeeper'];
const tokens = {};
for (const nome of PERSONAS_SONDADAS) tokens[nome] = await tokenVivo(nome);
const vivas = PERSONAS_SONDADAS.filter((n) => tokens[n] && tokens[n].access);
const mortas = Object.fromEntries(PERSONAS_SONDADAS.filter((n) => !(tokens[n] && tokens[n].access)).map((n) => [n, tokens[n] ? tokens[n].erro : 'sem_entrada']));
const getJson = async (path, access) => {
  const r = await fetch(HOST + path, { headers: { apikey: anonKey, Authorization: `Bearer ${access}`, Accept: 'application/json', 'Prefer': 'count=exact' } });
  const corpo = await r.text();
  let linhas = null, code = null;
  try { const j = JSON.parse(corpo); linhas = Array.isArray(j) ? j.length : null; if (!Array.isArray(j)) code = j.code || null; } catch {}
  const cr = r.headers.get('content-range');
  return { status: r.status, linhas, code, bytes: Buffer.byteLength(corpo), content_range: cr || null };
};
const leituras = {};
for (const nome of PERSONAS_SONDADAS) {
  if (!tokens[nome] || !tokens[nome].access) { leituras[nome] = { erro: (tokens[nome] && tokens[nome].erro) || 'sem_entrada' }; continue; }
  leituras[nome] = Object.fromEntries(await Promise.all(TABELAS.map(async (t) => [t, await getJson(`/rest/v1/${t}?select=*&limit=5`, tokens[nome].access)])));
}
const semSessao = Object.fromEntries(await Promise.all(TABELAS.map(async (t) => [t, await getJson(`/rest/v1/${t}?select=*&limit=5`, anonKey)])));

// Prova de fio para os RPCs que o catálogo diz não existir: POST a uma função ausente é resolvido
// antes de executar, logo não pode escrever seja o que for. O controlo positivo é uma função que
// existe e não tem efeito de lado (devolve o papel da sessão): se ela também desse PGRST202, o
// Predicado abaixo não estaria a medir ausência nenhuma, estaria a medir o meu pedido malformado.
const ausentesPeloCatalogo = rpcExiste.filter((r) => r.no_catalogo === 0 && r.nome !== 'bfr_nome_de_controlo_negativo_inexistente').map((r) => r.nome);
const tokenParaFio = vivas.length ? tokens[vivas[0]].access : anonKey;
const postRpc = async (nome, corpo, access) => {
  const r = await fetch(`${HOST}/rest/v1/rpc/${nome}`, { method: 'POST', headers: { apikey: anonKey, Authorization: `Bearer ${access}`, 'content-type': 'application/json' }, body: JSON.stringify(corpo) });
  const t = await r.text();
  let code = null, message = null;
  try { const j = JSON.parse(t); code = j.code || null; message = (j.message || '').slice(0, 160); } catch { message = t.slice(0, 160); }
  return { status: r.status, code, message, bytes: Buffer.byteLength(t) };
};
const fioRpc = {
  controlo_positivo_funcao_viva: await postRpc('bfr_rls_session_role', {}, tokenParaFio),
  por_nome: Object.fromEntries(await Promise.all(ausentesPeloCatalogo.map(async (n) => [n, await postRpc(n, n === 'bfr_confirm_school_calendar' ? { target_school_year: 2026 } : {}, tokenParaFio)]))),
};

// ---- tabela de verdade do portão (compilação do fonte servido) -------------
// O instante NÃO é a hora da máquina. A corrida de hoje deu vermelho porque as janelas estavam
// escritas à mão ('06:30'–'12:15') e o relógio local podia cair fora delas: o cenário «com
// conteúdo» passava a depender do minuto do run, que é a régua a mover-se com o medido. Congelo
// 2026-11-20T12:15:00Z e consulto o relógio SERVIDO — a definição de `schoolClock` que fala de
// 'America/Maceio' (há duas definições desse nome no bundle) — a esse instante; é a leitura dele,
// não a minha conta, que entra no estado sintético. A janela positiva envolve essa leitura e a
// negativa fica duas horas depois, o que dá o controlo do próprio eixo.
const INSTANTE_CONGELADO = '2026-11-20T12:15:00Z';
const DataCongelada = class extends Date { constructor() { super(INSTANTE_CONGELADO); } };
const ramosRelogio = extraiTodas('schoolClock');
const fonteRelogio = ramosRelogio.find((r) => r.texto.includes("'America/Maceio'")) || null;
const ctxRelogio = { Intl, Date: DataCongelada, Number, Object, String };
const leituraRelogio = fonteRelogio ? runInNewContext(fonteRelogio.texto + '\nschoolClock()', ctxRelogio) : null;
const weekday = leituraRelogio ? String(leituraRelogio.weekday) : null;
const minutes = leituraRelogio ? Number(leituraRelogio.minutes) : null;
// Conferência no reino do hospedeiro: se a sobreposição de `Date` no vm não tivesse efeito, o
// relógio servido estaria a ler o instante real e as duas leituras não bateriam.
const relogioHospedeiro = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Maceio', weekday: 'long', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date(INSTANTE_CONGELADO));
const valorHospedeiro = Object.fromEntries(relogioHospedeiro.map((x) => [x.type, x.value]));
const leituraHospedeiro = { weekday: valorHospedeiro.weekday, minutes: Number(valorHospedeiro.hour === '24' ? '0' : valorHospedeiro.hour) * 60 + Number(valorHospedeiro.minute || 0) };
const MAPA_DIAS = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 7 };
const hhmmss = (m) => { const x = ((Math.round(m) % 1440) + 1440) % 1440; return String(Math.floor(x / 60)).padStart(2, '0') + ':' + String(x % 60).padStart(2, '0') + ':00'; };
const janelaCobre = [hhmmss(minutes - 30), hhmmss(minutes + 30)];
const janelaFora = [hhmmss(minutes + 120), hhmmss(minutes + 180)];
const ISO_DIAS = MAPA_DIAS;
const turnoOK = (nome, abre, fecha) => ({ school_year: 2026, shift: nome, entry_opens_at: abre, class_starts_at: abre, shift_closes_at: fecha, active_weekdays: [1, 2, 3, 4, 5], late_grace_minutes: 10, confirmed_by: '00000000-0000-4000-8000-000000000000', confirmed_at: '2026-11-20T00:00:00Z', updated_at: '2026-11-20T00:00:00Z' });
const diaConfirmadoFixture = { school_year: 2026, school_date: '2026-11-20', calendar_status: 'school_day', label: '', source_status: 'confirmed', confirmed_at: '2026-11-20T00:00:00Z' };
// `loaded` faz parte do predicado servido (`gateLegacyMode() = state.loaded && errors...`): sem ele
// o cenário A nunca seria legado e a tabela mentiria sobre o estado antes do DDL.
const cenarios = {
  A_antes_do_ddl_404: { loaded: true, errors: ['configuração de turnos', 'calendário letivo'], shiftSettings: [], schoolCalendarDay: null },
  B_hoje_200_com_zero_linhas: { loaded: true, errors: [], shiftSettings: [], schoolCalendarDay: null },
  C_conteudo_confirmado: { loaded: true, errors: [], shiftSettings: [turnoOK('matutino', ...janelaCobre), turnoOK('vespertino', ...janelaFora)], schoolCalendarDay: diaConfirmadoFixture },
  D_dia_confirmado_sem_janela_a_cobrir: { loaded: true, errors: [], shiftSettings: [turnoOK('vespertino', ...janelaFora)], schoolCalendarDay: diaConfirmadoFixture },
};
// A guarda que decide o erro NÃO é reconstrução minha: lê-se do fonte servido. O texto é registado
// no artefacto e o número de ocorrências é portão — se o front mudar a guarda, este instrumento
// fica vermelho em vez de continuar a afirmar o predicado antigo.
const GUARDA = '!gateLegacyMode()&&!gateReady()';
const guardaOcorrencias = qtd(GUARDA);
const guardaIndices = (() => { const out = []; let k = -1; while ((k = bundle.indexOf(GUARDA, k + 1)) >= 0) out.push(k); return out; })();
const guardaTextos = guardaIndices.map((k) => bundle.slice(k - 6, k + 230).replace(/\s+/g, ' '));
// Fronteira medida, não suposta: o módulo diferido da portaria começa na etiqueta de script
// `data-bfr-auth-deferred`. As três guardas têm de estar depois dela; a definição antiga (a que
// chama o RPC v1 pelo `supabaseClient` global) antes.
const AGULHA_MODULO_DIFERIDO = '<script type="text/plain" data-bfr-auth-deferred';
const indiceModuloDiferido = bundle.indexOf(AGULHA_MODULO_DIFERIDO);
const tabelaVerdade = Object.fromEntries(Object.entries(cenarios).map(([nome, st]) => {
  const ctx = { state: st, schoolClock: () => ({ weekday, minutes }), Number, String, Boolean, Date, Array, Intl, Object };
  runInNewContext(Object.values(fonte).filter(Boolean).join('\n') + '\n' + (fonteRamo ? fonteRamo.texto : ''), ctx);
  const legado = runInNewContext('gateLegacyMode()', ctx);
  const pronto = runInNewContext('gateScanReady()', ctx);
  const portaoEstrito = runInNewContext('gateReady()', ctx);
  const diaConfirmado = runInNewContext('schoolDayConfirmed()', ctx);
  const turnoAtivo = runInNewContext('activeSchoolShift()', ctx);
  const guardaLanca = !legado && !pronto;
  // O RPC escolhido é lido da CHAMADA do fonte servido com um cliente de brincar, não de uma
  // reconstrução minha: o cliente stub registra o nome antes de devolver a promessa.
  const escolhido = { nome: null };
  ctx.client = { rpc: (n) => { escolhido.nome = n; return Promise.resolve({ data: [], error: null }); } };
  ctx.params = { target_badge_token: 'sonda', gate_direction: 'entry', visual_confirmation: false, intake_source: 'qr', target_shift: null, exception_reason: null };
  if (fonteRamo) runInNewContext('registerGateCheckin(client, params)', ctx);
  return [nome, { legacy_mode: legado, escaneio_pronto: pronto, portao_estrito: portaoEstrito, dia_letivo_confirmado: diaConfirmado, turno_ativo: turnoAtivo ? turnoAtivo.shift : null, guarda_lanca_erro: guardaLanca, rpc_escolhido_pelo_fonte: escolhido.nome }];
}));
// O fixture que prova que a régua Compiled dispara: um quarto estado onde o dia está confirmado
// mas NENHUM turno tem confirmed_at -> pronto tem de ser falso. Se isto der verdadeiro, a tabela
// de verdade não mede nada.
const ctxFixture = { state: { loaded: true, errors: [], shiftSettings: [{ ...turnoOK('matutino', ...janelaCobre), confirmed_at: null }], schoolCalendarDay: diaConfirmadoFixture }, schoolClock: () => ({ weekday, minutes }), Number, String, Boolean, Date, Array, Intl, Object };
runInNewContext(Object.values(fonte).filter(Boolean).join('\n'), ctxFixture);
const fixture_dispara = { pronto: runInNewContext('gateScanReady()', ctxFixture), dia: runInNewContext('schoolDayConfirmed()', ctxFixture), turno: runInNewContext('activeSchoolShift()', ctxFixture) };

// metas por mês: quantos dias de semana tem cada mês do ano que o front pede. O ANO vem do LITERAL
// que o painel de coordenação usa (`const schoolYear = 2026`), não de `classes.year`: essa coluna é
// o GRAU (hoje 6,7,8,9) e a corrida anterior usou-a como ano, produzindo metas para o ano 6 d.C.
// Números errados no artefacto valem mais caro que números em falta, por isso o programa aborta.
const literalAno = (/const schoolYear = (\d{4})/.exec((bindingAno || []).join(' ')) || [])[1];
const ANO_FRONT = Number(literalAno);
if (!Number.isInteger(ANO_FRONT) || ANO_FRONT < 2000 || ANO_FRONT > 2100) throw new Error('ABORTA: o ano do calendário não é um literal de século — ' + JSON.stringify({ literalAno, classes_graus: baselines[0].classes_graus }));
const metasCalculadas = [];
for (let m = 1; m <= 12; m++) { metasCalculadas.push({ mes: m, dias_de_semana: (() => { let n = 0; const d = new Date(Date.UTC(ANO_FRONT, m - 1, 1)); while (d.getUTCMonth() === m - 1) { const w = d.getUTCDay(); if (w >= 1 && w <= 5) n++; d.setUTCDate(d.getUTCDate() + 1); } return n; })() }); }
// Contagem independente, percorrendo o ano inteiro de uma vez: é o CONTRASTE com a soma mês a mês,
// não uma segunda leitura da mesma soma, que dá positivo possível ao portão abaixo.
const diasDeSemanaNoAno = (ano) => { let n = 0; const d = new Date(Date.UTC(ano, 0, 1)); while (d.getUTCFullYear() === ano) { const w = d.getUTCDay(); if (w >= 1 && w <= 5) n++; d.setUTCDate(d.getUTCDate() + 1); } return n; };

// Os papéis que a política de LEITURA aceita, lidos do `using_txt` devolvido pelo catálogo:
// a forma é `= ANY (ARRAY['coordinator'::text, ...])`, por isso a agulha é o sufixo de tipo.
const papeisDentro = [...new Set(politicas.filter((p) => p.comando === 'SELECT').flatMap((p) => [...String(p.using_txt).matchAll(/'([a-z_]+)'::text/g)].map((m) => m[1])))].sort();

// ---- portões ---------------------------------------------------------------
const falhas = [];
const g = (nome, cond, detalhe) => { if (!cond) falhas.push(`${nome}: ${JSON.stringify(detalhe).slice(0, 300)}`); return { nome, verde: !!cond, detalhe }; };
const nomesColunas = (t) => colunas.filter((c) => c.tabela === t).map((c) => c.coluna);
const dimensaoEscola = (t) => nomesColunas(t).filter((c) => /school_id|escola|unit_id|tenant/.test(c));
const portoes = [
  g('regua_de_extracao_de_funcao_dispara_e_fixture_produz_negativo', FUNCOES.every((f) => typeof fonte[f] === 'string' && fonte[f].length > 20 && ocorrencias[f] === 1) && !!fonteRamo && fixture_dispara.pronto === false && fixture_dispara.turno === null, { ocorrencias_por_nome: ocorrencias, definicoes_de_registerGateCheckin: ramosPortaria.length, ramo_escolhido_indice: fonteRamo ? fonteRamo.indice : null, comprimentos: Object.fromEntries(FUNCOES.map((f) => [f, fonte[f] ? fonte[f].length : null])), fixture_dispara }),
  g('os_quatro_cenarios_dao_respostas_distintas', new Set(Object.values(tabelaVerdade).map((x) => `${x.legacy_mode}/${x.escaneio_pronto}/${x.dia_letivo_confirmado}/${x.turno_ativo}`)).size === 4 && tabelaVerdade.A_antes_do_ddl_404.legacy_mode === true && tabelaVerdade.A_antes_do_ddl_404.portao_estrito === false && tabelaVerdade.C_conteudo_confirmado.turno_ativo === 'matutino' && tabelaVerdade.D_dia_confirmado_sem_janela_a_cobrir.turno_ativo === null, tabelaVerdade),
  g('o_relogio_servido_e_o_mesmo_do_hospedeiro_no_instante_congelado_e_o_dia_e_de_semana', !!fonteRelogio && ramosRelogio.length === 2 && minutes === leituraHospedeiro.minutes && weekday === leituraHospedeiro.weekday && MAPA_DIAS[weekday] >= 1 && MAPA_DIAS[weekday] <= 5 && Number.isInteger(minutes) && minutes > 0 && minutes < 1440, { definicoes_de_schoolClock: ramosRelogio.length, indice_usada: fonteRelogio ? fonteRelogio.indice : null, instante: INSTANTE_CONGELADO, vm: { weekday, minutes }, hospedeiro: leituraHospedeiro, janelas: { cobre: janelaCobre, fora: janelaFora } }),
  g('a_guarda_que_lanca_o_erro_e_a_mesma_que_o_predicado_medido_e_as_tres_sao_do_modulo_diferido', guardaOcorrencias === 3 && guardaTextos.every((t) => t.includes('length<8')) && guardaTextos.filter((t) => t.includes('throw new Error')).length === 1 && guardaTextos.filter((t) => t.includes('scanStatus(')).length === 2 && indiceModuloDiferido > 0 && guardaIndices.every((k) => k > indiceModuloDiferido) && ramosPortaria.every((r) => (r.texto.includes("'register_gate_checkin_v2'") ? r.indice > indiceModuloDiferido : r.indice < indiceModuloDiferido)), { ocorrencias: guardaOcorrencias, sitios: guardaIndices, frontier_script: indiceModuloDiferido, ramos_portaria: ramosPortaria.map((r) => `${r.indice}:${r.texto.includes("'register_gate_checkin_v2'") ? 'v2' : 'v1'}`), textos: guardaTextos.map((t) => t.slice(0, 200)) }),
  g('as_duas_portarias_servidas_chamam_rpcs_diferentes', ramosPortaria.length === 2 && ramosPortaria.filter((r) => r.texto.includes("'register_gate_checkin_v2'")).length === 1 && ramosPortaria.filter((r) => r.texto.includes("'register_gate_checkin'") && !r.texto.includes('_v2')).length === 1, ramosPortaria.map((r) => ({ indice: r.indice, chars: r.texto.length, v1: r.texto.includes("'register_gate_checkin'"), v2: r.texto.includes("'register_gate_checkin_v2'"), async_no_bundle: bundle.slice(Math.max(0, r.indice - 6), r.indice).endsWith('async ') }))),
  g('o_rpc_que_o_modulo_diferido_escolhe_fora_do_legado_nao_existe_no_banco', tabelaVerdade.B_hoje_200_com_zero_linhas.rpc_escolhido_pelo_fonte === 'register_gate_checkin_v2' && tabelaVerdade.A_antes_do_ddl_404.rpc_escolhido_pelo_fonte === 'register_gate_checkin' && rpcExiste.find((r) => r.nome === 'register_gate_checkin_v2').no_catalogo === 0 && rpcExiste.find((r) => r.nome === 'register_gate_checkin').no_catalogo > 0, { escolhido_por_cenario: Object.fromEntries(Object.entries(tabelaVerdade).map(([k, v]) => [k, v.rpc_escolhido_pelo_fonte])), no_catalogo: rpcExiste.filter((r) => r.nome.startsWith('register_gate')).map((r) => `${r.nome}=${r.no_catalogo}`) }),
  g('hoje_o_escaneio_da_portaria_lanca_erro_e_o_unico_estado_real', tabelaVerdade.B_hoje_200_com_zero_linhas.guarda_lanca_erro === true && tabelaVerdade.C_conteudo_confirmado.guarda_lanca_erro === false, { hoje: tabelaVerdade.B_hoje_200_com_zero_linhas, com_conteudo: tabelaVerdade.C_conteudo_confirmado }),
  g('o_front_escreve_so_draft_e_quem_confirma_e_um_rpc', estadosEscritos.length === 1 && estadosEscritos[0] === 'draft' && qtd(".rpc('bfr_confirm_school_calendar'") === 1, { estados_escritos: estadosEscritos, rpc_confirm_nomeado: qtd(".rpc('bfr_confirm_school_calendar'") }),
  g('as_tres_mesas_estao_no_catalogo', TABELAS.every((t) => nomesColunas(t).length > 0), Object.fromEntries(TABELAS.map((t) => [t, nomesColunas(t)]))),
  g('nenhuma_coluna_pedida_pelo_front_falta_no_catalogo', TABELAS.every((t) => [...new Set(pedidos[t].selects.flatMap((s) => s.split(',').map((x) => x.trim())))].every((c) => c === '*' || nomesColunas(t).includes(c))), Object.fromEntries(TABELAS.map((t) => [t, pedidos[t].selects])),),
  g('on_conflict_bate_com_a_chave_primaria', TABELAS.every((t) => { const pk = restricoes.find((r) => r.tabela === t && r.tipo === 'p'); const ped = pedidos[t].on_conflict; return !!pk && ped.every((c) => c.split(',').map((x) => x.trim()).sort().join(',') === pk.definicao.replace(/^PRIMARY KEY \((.*)\)$/, '$1').replace(/"/g, '').split(',').map((x) => x.trim()).sort().join(',')); }), restricoes.filter((r) => r.tipo === 'p').map((r) => `${r.tabela}=${r.definicao}`)),
  g('nenhuma_mesa_tem_dimensao_de_escola_e_o_controlo_positivo_prova_que_a_predica_ve', TABELAS.every((t) => dimensaoEscola(t).length === 0) && (await sql(`select column_name as c from information_schema.columns where table_schema='public' and table_name='classes' and column_name='school_id' limit 1`)).length > 0, { por_mesa: Object.fromEntries(TABELAS.map((t) => [t, dimensaoEscola(t)])), controlo_classes: await sql(`select table_name as t, column_name as c from information_schema.columns where table_schema='public' and table_name='classes' and column_name='school_id'`), mesas_com_school_id_no_banco: (await sql(`select table_name as t from information_schema.columns where table_schema='public' and column_name='school_id' order by 1`)).map((x) => x.t) }),
  g('as_mesas_estao_vazias_hoje', linhas.length === 3 && linhas.every((x) => x.linhas === 0), linhas),
  g('o_predicado_de_existencia_de_rpc_distingue_o_que_existe_do_que_nao_existe', rpcExiste.find((r) => r.nome === RPC_CONTROLO).no_catalogo >= 0 && rpcExiste.find((r) => r.nome === 'bfr_rls_session_role').no_catalogo > 0 && rpcExiste.find((r) => r.nome === 'bfr_nome_de_controlo_negativo_inexistente').no_catalogo === 0, { controlo_positivo: rpcExiste.find((r) => r.nome === 'bfr_rls_session_role'), controlo_negativo: rpcExiste.find((r) => r.nome === 'bfr_nome_de_controlo_negativo_inexistente'), achado_sobre_os_rpcs_do_front: rpcExiste.filter((r) => [...RPCS_FRONT, RPC_CONTROLO].includes(r.nome)) }),
  g('o_fio_confirma_o_catalogo_e_o_controlo_positivo_nao_da_404', fioRpc.controlo_positivo_funcao_viva.status !== 404 && ausentesPeloCatalogo.every((n) => fioRpc.por_nome[n].status === 404 && fioRpc.por_nome[n].code === 'PGRST202'), { controlo: fioRpc.controlo_positivo_funcao_viva, por_nome: fioRpc.por_nome, ausentes_pelo_catalogo: ausentesPeloCatalogo }),
  g('pelo_menos_uma_politica_de_leitura_por_mesa', TABELAS.every((t) => politicas.some((p) => p.tabela === t && p.comando === 'SELECT')), politicas.map((p) => `${p.tabela}:${p.nome}:${p.comando}`)),
  g('as_pessoas_com_cadeia_viva_leem_com_200_e_zero_linhas_e_o_anonao_tambem', vivas.length >= 2 && vivas.every((n) => TABELAS.every((t) => leituras[n][t].status === 200 && leituras[n][t].linhas === 0)) && TABELAS.every((t) => semSessao[t].status === 200 && semSessao[t].linhas === 0), { vivas, mortas, exemplos: Object.fromEntries(vivas.slice(0, 2).map((n) => [n, Object.fromEntries(TABELAS.map((t) => [t.slice(-6), `${leituras[n][t].status}/${leituras[n][t].linhas}`]))])), anonimo: Object.fromEntries(TABELAS.map((t) => [t.slice(-6), `${semSessao[t].status}/${semSessao[t].linhas}`])) }),
  g('o_predicado_de_papel_na_politica_distingue_um_papel_dentro_de_um_papel_fora', papeisDentro.length > 0 && !papeisDentro.includes('gatekeeper'), { papeis_que_a_politica_de_leitura_aceita: papeisDentro, gatekeeper_dentro: papeisDentro.includes('gatekeeper'), politicas_de_leitura: politicas.filter((p) => p.comando === 'SELECT').map((p) => `${p.tabela}:${p.nome}:${String(p.using_txt).slice(0, 120)}`) }),
  g('a_regra_dos_365_dias_e_lectivel_no_bundle_e_o_ano_do_painel_e_um_literal', regra365 && /const schoolYear = (\d{4})/.test(bindingAno ? bindingAno.join(' ') : ''), { regra365, binding_ano: bindingAno, md5_bundle: bundleMd5 }),
  g('o_ano_do_calendario_e_o_literal_de_cem_seculo_e_a_contagem_por_mes_bate_com_a_contagem_por_ano', ANO_FRONT >= 2000 && ANO_FRONT <= 2100 && String(baselines[0].classes_graus).split(',').every((x) => Number(x) > 0 && Number(x) < 2000) && metasCalculadas.length === 12 && metasCalculadas.reduce((a, m) => a + m.dias_de_semana, 0) === diasDeSemanaNoAno(ANO_FRONT), { ano: ANO_FRONT, origem: 'literal `const schoolYear = 2026`', graus_de_classes: baselines[0].classes_graus, soma_por_mes: metasCalculadas.reduce((a, m) => a + m.dias_de_semana, 0), contagem_por_ano: diasDeSemanaNoAno(ANO_FRONT), regra_de_completude_do_front: regra365 ? 'o painel exige 365 linhas de dia por ano' : 'não lida' }),
];
const out = {
  programa: 'scripts/p73-rm52-estado-calendario.mjs',
  em: new Date().toISOString(),
  metodo: 'information_schema + pg_constraint + pg_policy + pg_proc via Management API (sem JWT de sessão, por isso sem RLS); GET ao REST com sessão real e anónimo; POST a RPC inexistente (resolvido antes de executar, logo sem efeito); compilação em node:vm das cinco funções síncronas tal como servidas, com o relógio congelado num instante fixo. Zero escrita; nenhuma chave gravada.',
  relogio_congelado: { instante_utc: INSTANTE_CONGELADO, definicoes_de_schoolClock_no_bundle: ramosRelogio.length, definicao_usada_indice: fonteRelogio ? fonteRelogio.indice : null, leitura_vm: { weekday, minutes }, leitura_hospedeiro: leituraHospedeiro, dia_da_semana_numero: MAPA_DIAS[weekday], janelas: { cobre_o_instante: janelaCobre, fora_do_instante: janelaFora }, nota: 'as janelas do fixture são construídas à volta da leitura do relógio SERVIDO, não de horas dactilografadas — por isso o cenário C não depende do minuto em que a corrida decorre' },
  guarda_servida_do_escalacao: { agulha: GUARDA, ocorrencias_no_bundle: guardaOcorrencias, sitios: guardaIndices, fronteira_do_modulo_diferido: indiceModuloDiferido, textos: guardaTextos.map((t) => t.slice(0, 240)) },
  portarias_servidas_em_duplicado: ramosPortaria.map((r) => ({ indice: r.indice, async_no_bundle: bundle.slice(Math.max(0, r.indice - 6), r.indice).endsWith('async '), cita_register_gate_checkin: r.texto.includes("'register_gate_checkin'"), cita_v2: r.texto.includes("'register_gate_checkin_v2'"), chars: r.texto.length, texto: r.texto.slice(0, 320) })),
  bundle_servido_versionado: { caminho: BUNDLE.replace(REPO + '/', ''), md5: bundleMd5, bytes: Buffer.byteLength(bundle, 'utf8') },
  rotulos_de_leitura_usados_pelo_portao: rotulos.map((r) => ({ rotulo: r, ocorrencias_no_bundle: qtd("'" + r + "'") })),
  front_pede: pedidos,
  front_escreve: { estados_source_status: estadosEscritos, escrita_de_dia: bundle.match(/source_status:'(\w+)'[^)]{0,40}/)[0], on_conflict: Object.fromEntries(TABELAS.map((t) => [t, pedidos[t].on_conflict])), binding_school_year_no_painel_coordenacao: bindingAno, regra_calendario_completo: regra365 },
  funcoes_extraitas: Object.fromEntries(FUNCOES.map((f) => [f, { chars: fonte[f] ? fonte[f].length : 0, texto: (fonte[f] || '').slice(0, 400) }])),
  ocorrencias_por_nome_de_funcao: ocorrencias,
  funcoes_de_registro: { ...registroFonte, registerGateCheckin_ramos: ramosPortaria.map((r) => ({ indice: r.indice, chars: r.texto.length, cita_v2: r.texto.includes('register_gate_checkin_v2') })), ramo_usado_na_verdade: fonteRamo ? fonteRamo.indice : null },
  tabela_verdade_do_portao: tabelaVerdade,
  fixture_que_prova_a_regua: fixture_dispara,
  catalogo: { colunas, restricoes, linhas, politicas, rpc_no_catalogo: rpcExiste, grade_tempos: gradeTempos, baselines: baselines[0] },
  rest: { com_sessao: leituras, sem_sessao: semSessao },
  rpc_pelo_fio: { ausentes_pelo_catalogo: ausentesPeloCatalogo, ...fioRpc },
  pessoas_sondadas: { sondadas: PERSONAS_SONDADAS, vivas, mortas, cadeias: Object.fromEntries(PERSONAS_SONDADAS.map((n) => [n, { lida_de: tokens[n].lida_de || null, renovada: !!tokens[n].renovado, gravado_em: tokens[n].gravado_em || null, erro: tokens[n].erro || null }])) },
  papeis_na_politica_de_leitura: papeisDentro,
  metas_por_mes_computadas_para_o_ano: { ano: ANO_FRONT, origem_do_ano: 'literal `const schoolYear = 2026` do painel de coordenação (binding_ano abaixo); NUNCA classes.year, que é o grau', graus_de_classes: baselines[0].classes_graus, valores: metasCalculadas, nota: 'dias de semana (seg-sex) por mês; feriados e recesso ainda não descontados — são a decisão de conteúdo da RM-5.2' },
  o_que_este_verde_nao_autoriza: 'Não autoriza publicar, não autoriza DDL nem seed, não prova o comportamento no browser (a tabela de verdade é do fonte servido, não de uma sessão real), não decide quais são os dias letivos nem as horas de entrada — decide só se há caminho para isso existir — e não resolve qual dos dois `registerGateCheckin` servidos está ligado ao botão da portaria em execução: isso só se mede com uma sessão de navegador da conta gatekeeper, cuja cadeia hoje está morta.',
  portoes,
};
out.veredito = falhas.length === 0 ? 'RM52_ESTADO_VERDE' : `VERMELHO: ${falhas.length}`;
out.falhas = falhas;
const TXT = OUT.replace(/\.json$/, '.txt');
if (falhas.length) { const p = OUT.replace(/\.json$/, '-VERMELHO.json'); writeFileSync(p, JSON.stringify(out, null, 2) + '\n'); writeFileSync(TXT.replace(/\.txt$/, '-VERMELHO.txt'), falhas.join('\n') + '\n'); for (const f of falhas) console.log('  FALTA ' + f); console.log(`RM52_ESTADO_VERMELHO · registo ${p}`); process.exit(1); }
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
writeFileSync(TXT, Object.entries(tabelaVerdade).map(([k, v]) => `${k}: legacy=${v.legacy_mode} escaneio_pronto=${v.escaneio_pronto} portao_estrito=${v.portao_estrito} lanca=${v.guarda_lanca_erro} rpc=${v.rpc_escolhido_pelo_fonte}`).join('\n') + `\nano_calendario=${ANO_FRONT} (origem: literal; classes_graus=${baselines[0].classes_graus})\nmetas=${JSON.stringify(metasCalculadas.map((m) => `${m.mes}:${m.dias_de_semana}`))}\nrelogio_congelado=${INSTANTE_CONGELADO} vm=${weekday}/${minutes} hospedeiro=${leituraHospedeiro.weekday}/${leituraHospedeiro.minutes} janelas=${JSON.stringify({ cobre: janelaCobre, fora: janelaFora })}\nlinhas=${JSON.stringify(linhas)}\nrpc=${JSON.stringify(rpcExiste.map((r) => `${r.nome}=${r.no_catalogo}`))}\n`);
for (const p of out.portoes) console.log(`  portao ${p.nome}: ${p.verde ? 'VERDE' : 'VERMELHO'}`);
console.log(JSON.stringify({ tabela_verdade: tabelaVerdade, linhas, rpc_no_catalogo: rpcExiste.map((r) => `${r.nome}=${r.no_catalogo}`), rpc_fio: Object.fromEntries(Object.entries(fioRpc.por_nome).map(([k, v]) => [k, `${v.status}/${v.code}`])), controlo_fio: `${fioRpc.controlo_positivo_funcao_viva.status}`, gatekeeper_ou_mortas: mortas, vivas, ano: ANO_FRONT, metas: metasCalculadas.map((m) => m.dias_de_semana) }, null, 1));
console.log(`RM52_ESTADO_OK · registo ${OUT}`);
