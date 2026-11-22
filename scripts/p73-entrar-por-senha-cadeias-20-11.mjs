#!/usr/bin/env node
// P73-R2 — ENTRAR POR SENHA GRAVADA (auth apenas, SEM rotação de credencial), 20/11.
// Porque existe: a corrida 7 do instrumento da RM-5.2 ficou vermelha com `refresh HTTP 400` nos seis
// papéis. A causa medida nesta conversa é `error_code: refresh_token_already_used` — não é «conta sem
// senha», é cadeia queimada: um refresh bem-sucedido ROTACIONA, e quando duas vozes usam a mesma
// cadeia a segunda morre. `p73-renova-cadeias.mjs` só sabe fazer refresh; `p73-rotacao-de-senhas.mjs`
// faria login, mas NO PUT de auth para qualquer papel a quem falte credencial gravada — ou seja,
// relançá-lo com um papel sem registo seria escrever uma senha nova sem OK novo.
// Este programa não tem esse caminho: ABORTA se algum alvo não tiver credencial gravada, nunca lê a
// chave de serviço (logo nenhum endpoint de admin é alcançável) e a igualdade do hash da senha antes
// e depois é portão, não promessa. Zero DDL, zero linha de produto, zero publicação.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { causaAdmissivel } from './p74-predicado-da-causa-da-cadeia.mjs';
import { join } from 'node:path';
import { sql, HOST } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const FORA = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const CREDENCIAIS = 'C:/Users/pcmac/.ah2-senhas-de-teste.json';
const MESTRE = join(FORA, 'ah2-sessions.json');
const ALVOS = (process.argv[2] || 'secretary,director,developer,education_supervisor,coordinator,gatekeeper').split(',').map((s) => s.trim()).filter(Boolean);
const SUF = process.env.P73_SUF ? '-' + process.env.P73_SUF : '';
const OUT = join(REPO, `evidence/p73-entrar-por-senha-cadeias-20-11e${SUF}.json`);
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com P73_SUF=novo, não por cima');
if (!ALVOS.length) throw new Error('ABORTA: lista de alvos vazia');
if (!existsSync(CREDENCIAIS)) throw new Error('ABORTA: falta ' + CREDENCIAIS + ' — sem credencial gravada este programa não entra e NÃO rotacia senha');
const t0 = Date.now();
const md5 = (s) => createHash('md5').update(Buffer.from(String(s))).digest('hex');

// A chave publishable lê-se dos bytes SERVIDOS, como no resto da casa — nunca dactilografada.
const urlApp = (/https:\/\/[a-z0-9.-]+\.workers\.dev/i.exec(readFileSync(join(REPO, 'audit-publicacao-v136.json'), 'utf8')) || [])[0];
if (!urlApp) throw new Error('ABORTA: sem URL de publicação v136');
const shellTxt = await (await fetch(urlApp + '/', { headers: { 'cache-control': 'no-cache' } })).text();
const anonKey = (/SUPABASE_PUBLISHABLE_KEY\s*=\s*['"]([^'"]+)['"]/.exec(shellTxt) || [])[1];
if (!anonKey) throw new Error('ABORTA: sem SUPABASE_PUBLISHABLE_KEY nos bytes servidos');

const cred = JSON.parse(readFileSync(CREDENCIAIS, 'utf8'));
const ausentes = ALVOS.filter((p) => !cred[p] || !cred[p].senha || !cred[p].email);
if (ausentes.length) throw new Error(`ABORTA: sem credencial gravada para ${ausentes.join(',')} — aqui NÃO se rotaciona senha, procure outro OK`);
const mestreTxt = readFileSync(MESTRE, 'utf8');
const hashes_senha_antes = Object.fromEntries(ALVOS.map((p) => [p, md5(cred[p].senha).slice(0, 12)]));

const baselines = async () => (await sql(`select (select count(*)::int from public.schools) as schools,
  (select count(*)::int from public.students) as students, (select count(*)::int from public.profiles) as profiles,
  (select count(*)::int from public.bfr_municipal_access_grants) as concessoes,
  (select count(*)::int from public.bfr_school_calendar_days) as dias, (select count(*)::int from public.bfr_school_shift_settings) as turnos`))[0];
const antes = await baselines();

// Antes de deitar fora a cadeia velha, prova-se a causa do vermelho: o refresh que o instrumento
// usou tinha de responder `refresh_token_already_used`. Sem esta linha o meu diagnóstico seria
// inferência a partir de um HTTP 400 sem corpo lido.
const tenta_refresh = async (token) => {
  const r = await fetch(`${HOST}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { 'content-type': 'application/json', apikey: anonKey, Authorization: `Bearer ${anonKey}` }, body: JSON.stringify({ refresh_token: token }) });
  const j = await r.json().catch(() => null);
  return { http: r.status, codigo: (j && (j.error_code || j.msg || j.error)) || (j && j.access_token ? 'renovou' : 'sem-corpo'), ok: !!r.ok && !!(j && j.access_token) };
};

const papeis = {};
const tokensEmitidos = [];
for (const papel of ALVOS) {
  const reg = { uid_gravado: String(cred[papel].uid || '').slice(0, 8), email_forma: String(cred[papel].email).split('@')[0].replace(/-[0-9a-f]{6}$/, '-<hex6>') + '@' + String(cred[papel].email).split('@')[1] };
  const fich = join(FORA, `ah2-sessao-${papel}.json`);
  const objecto = existsSync(fich) ? JSON.parse(readFileSync(fich, 'utf8')) : {};
  reg.cadeia_anterior = objecto[papel] && objecto[papel].refresh_token ? await tenta_refresh(objecto[papel].refresh_token) : { http: null, codigo: 'sem_cadeia_no_ficheiro_do_papel', ok: false };
  const r = await fetch(`${HOST}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { 'content-type': 'application/json', apikey: anonKey, Authorization: `Bearer ${anonKey}` }, body: JSON.stringify({ email: cred[papel].email, password: cred[papel].senha }) });
  const j = await r.json().catch(() => null);
  reg.login_http = r.status;
  reg.login_codigo = (j && (j.error_code || j.msg)) || (r.ok ? 'ok' : 'sem-corpo');
  if (!r.ok || !j || !j.access_token) { reg.falha = 'login HTTP ' + r.status + ' codigo=' + reg.login_codigo; papeis[papel] = reg; continue; }
  const expira_em = j.expires_at ? Number(j.expires_at) - Math.floor(Date.now() / 1000) : (j.expires_in || 0);
  tokensEmitidos.push(j.access_token, j.refresh_token);
  objecto[papel] = { id: j.user.id, email: j.user.email, access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at ?? Math.floor(Date.now() / 1000) + (j.expires_in || 3600), user: j.user };
  writeFileSync(fich, JSON.stringify(objecto, null, 2) + '\n');
  const lido = JSON.parse(readFileSync(fich, 'utf8'))[papel];
  reg.escritura_provada = md5(lido.access_token) === md5(j.access_token) && md5(lido.refresh_token) === md5(j.refresh_token);
  reg.uid_preservado = String(j.user.id) === String(cred[papel].uid);
  reg.expira_em_s = expira_em;
  reg.comprimentos = { access: String(j.access_token).length, refresh: String(j.refresh_token).length };
  reg.cadeia_nova_hash = md5(j.refresh_token).slice(0, 12);
  // A prova de que a cadeia serve: uma leitura autenticada com RLS a uma mesa que o papel tem de ver.
  const rp = await fetch(`${HOST}/rest/v1/profiles?select=id&id=eq.${j.user.id}`, { headers: { apikey: anonKey, Authorization: `Bearer ${j.access_token}`, Prefer: 'count=exact' } });
  reg.leitura_de_prova = { http: rp.status, total: (rp.headers.get('content-range') || '').split('/')[1] || null, corpo_bytes: Buffer.byteLength(await rp.text()) };
  reg.gravado_em = fich.split('/').pop();
  reg.ok = !!(reg.escritura_provada && reg.uid_preservado && expira_em > 60 && reg.leitura_de_prova.http === 200 && reg.leitura_de_prova.total === '1');
  papeis[papel] = reg;
}

const depois = await baselines();
const hashes_senha_depois = Object.fromEntries(ALVOS.map((p) => [p, md5(JSON.parse(readFileSync(CREDENCIAIS, 'utf8'))[p].senha).slice(0, 12)]));
const mestre_depois = readFileSync(MESTRE, 'utf8');
const vivas = ALVOS.filter((p) => papeis[p].ok);

const falhas = [];
const g = (nome, cond, detalhe) => { if (!cond) falhas.push(`${nome}: ${JSON.stringify(detalhe).slice(0, 300)}`); return { nome, verde: !!cond, detalhe }; };
const portoes = [
  g('nenhuma_senha_foi_rotacionada_o_hash_antes_iguala_o_depois', ALVOS.every((p) => hashes_senha_antes[p] === hashes_senha_depois[p]), { antes: hashes_senha_antes, depois: hashes_senha_depois }),
  g('a_causa_do_vermelho_e_ja_queimada_ou_so_access_expirado_e_nao_falta_de_senha', ALVOS.every((p) => causaAdmissivel(papeis[p])), Object.fromEntries(ALVOS.map((p) => [p, `${papeis[p].cadeia_anterior.http}/${papeis[p].cadeia_anterior.codigo}${papeis[p].falha ? ' COM-FALHA-DE-LOGIN' : ''}`]))),
  g('o_login_por_senha_bate_para_todos_os_alvos', ALVOS.every((p) => papeis[p].login_http === 200), Object.fromEntries(ALVOS.map((p) => [p, `${papeis[p].login_http}/${papeis[p].login_codigo}`]))),
  g('o_uid_de_cada_papel_e_o_mesmo_do_registo_a_rotação_nao_mudou_identidade', ALVOS.every((p) => papeis[p].uid_preservado === true), Object.fromEntries(ALVOS.map((p) => [p, papeis[p].uid_gravado])),),
  g('a_cadeia_nova_fica_no_ficheiro_do_papel_e_o_mestre_nao_e_tocado', ALVOS.every((p) => papeis[p].escritura_provada === true) && md5(mestre_depois) === md5(mestreTxt), { mestre_antes: md5(mestreTxt).slice(0, 12), mestre_depois: md5(mestre_depois).slice(0, 12), ficheros: Object.fromEntries(ALVOS.map((p) => [p, papeis[p].gravado_em || null])) }),
  g('cada_cadeia_nova_lem_um_linha_de_perfil_com_rls', ALVOS.every((p) => papeis[p].leitura_de_prova && papeis[p].leitura_de_prova.http === 200 && papeis[p].leitura_de_prova.total === '1'), Object.fromEntries(ALVOS.map((p) => [p, papeis[p].leitura_de_prova]))),
  g('nenhuma_linha_de_produto_foi_escrita', JSON.stringify(antes) === JSON.stringify(depois), { antes, depois }),
];

const out = {
  programa: 'scripts/p73-entrar-por-senha-cadeias-20-11.mjs',
  em: new Date().toISOString(), duracao_ms: Date.now() - t0,
  metodo: 'POST /auth/v1/token?grant_type=password com a senha JÁ gravada fora do git; zero endpoint de admin (a chave de serviço não é lida por este programa); a cadeia nova escreve-se só no ficheiro do papel e o mestre fica byte a byte igual.',
  autorizacao: 'Nenhum ato privilegiado novo: login com credencial existente. Sem OK não se rotaciona senha — por isso o programa aborta se algum alvo não tiver registo.',
  ar: { url: urlApp, md5_shell: md5(shellTxt), bytes: Buffer.byteLength(shellTxt) },
  alvos: ALVOS, credenciais_de: CREDENCIAIS.replace(/[^/]+$/, (x) => x + ' (fora do git)'),
  hashes_senha: { antes: hashes_senha_antes, depois: hashes_senha_depois },
  baselines: { antes, depois },
  papeis, vivas,
  o_que_este_verde_nao_autoriza: 'Não autoriza publicar, DDL, seed, mint nem rotação de senha; prova só que existem agora cadeias vivas para as seis personas, gravadas nos ficheiros locais de sessão.',
  portoes, falhas,
};
// Última régua, e por isso corrida DEPOIS de `out` existir: percorre o corpo serializado do artefacto
// à procura dos VALORES reais (senhas gravadas, tokens emitidos, tokens deixados em disco). Não é
// lista lembrada nem nome de campo — se um token escorregar para o registo, este portão fica vermelho.
{
  const corpo = JSON.stringify(out);
  const em_disco = ALVOS.flatMap((p) => { const o = JSON.parse(readFileSync(join(FORA, `ah2-sessao-${p}.json`), 'utf8'))[p] || {}; return [o.access_token, o.refresh_token]; });
  const segredos = ALVOS.map((p) => cred[p].senha).concat(tokensEmitidos, em_disco).filter((s) => typeof s === 'string' && s.length >= 12);
  const presentes = segredos.filter((s) => corpo.includes(s));
  portoes.push(g('nenhum_valor_de_senha_ou_token_chega_ao_artefacto', presentes.length === 0 && segredos.length >= ALVOS.length + 2 * vivas.length, { comparados: segredos.length, presentes_no_corpo: presentes.length, regexua: 'cada valor real percorrido como string contra o artefacto serializado' }));
}
out.veredito = falhas.length === 0 ? `P73_ENTRAR_CADEIAS_OK ${ALVOS.length}/0` : `P73_ENTRAR_CADEIAS_VERMELHO ${falhas.length}`;
const TXT = OUT.replace(/\.json$/, '.txt');
if (falhas.length) { const p = OUT.replace(/\.json$/, '-VERMELHO.json'); writeFileSync(p, JSON.stringify(out, null, 2) + '\n'); for (const f of falhas) console.log('  FALTA ' + f); console.log(`P73_ENTRAR_VERMELHO · registo ${p}`); process.exit(1); }
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
writeFileSync(TXT, ALVOS.map((p) => `${p}: login=${papeis[p].login_http} cadeia_anterior=${papeis[p].cadeia_anterior.http}/${papeis[p].cadeia_anterior.codigo} expira_em_s=${papeis[p].expira_em_s} prova_leitura=${papeis[p].leitura_de_prova.http}/${papeis[p].leitura_de_prova.total} gravado=${papeis[p].gravado_em} hash=${papeis[p].cadeia_nova_hash} ok=${papeis[p].ok}`).join('\n') + `\nbaselines antes=${JSON.stringify(antes)} depois=${JSON.stringify(depois)}\nmestre_igual=${md5(mestre_depois) === md5(mestreTxt)}\n`);
for (const p of portoes) console.log(`  portao ${p.nome}: ${p.verde ? 'VERDE' : 'VERMELHO'}`);
console.log(`CADEIAS_VIVAS=${vivas.length}/${ALVOS.length} · ${JSON.stringify(Object.fromEntries(ALVOS.map((p) => [p, `${papeis[p].login_http}/${papeis[p].expira_em_s}s`])))}`);
console.log(`${out.veredito} · ${out.duracao_ms} ms · registo ${OUT}`);
