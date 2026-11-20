// P73-R — rotacao de senha das contas de teste SEM cadeia viva, autorizada literalmente nesta conversa
// («Redefinir senha das 14 contas (Recommended)»). Escrita SÓ na auth: 0 linhas de produto, 0 DDL, 0 publicacao.
// Os uid preservam-se de proposito — foi por isso que a rotacao se escolheu em vez dum mint novo: as 79 celulas
// coerentes do ar anterior e as tabelas dos ciclos passados comparam papel a papel, e mudar o uid quebraria a
// comparabilidade célula a célula.
// A causa do beco é estrutural e fica registada aqui: ah2-mint.mjs:80 gera a senha com randomBytes(18) e nunca
// a grava (diario ah2-mint-17-11.json tem 0 ocorrencias de senha/email). Sem credencial persistente, cada
// rotacao do refresh token e uma conta que so vive enquanto ninguem a usar duas vezes. Por isso a senha nova vai
// para C:/Users/pcmac/.ah2-senhas-de-teste.json — fora do git, no mesmo padrao da chave de servico. Relançar e
// idempotente: quem ja tem senha registada NAO e rotado de novo, apenas faz login com a gravada.
// Nunca imprimo senha nem token: comprimento, classe e prefixo de 8 do uid. O registo mestre nao e tocado:
// cada papel escreve no seu ficheiro, e a unica voz do mestre continua a ser ah2-funde-sessoes.mjs.
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { randomBytes } from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const REPO = `${DIR}/bfr-conecta`;
const EV = `${REPO}/evidence`;
const REF = 'yyzqoxlkcvqpessypfjo';
const HOST = `https://${REF}.supabase.co`;
const MESTRE = `${DIR}/ah2-sessions.json`;
const CHAVE_SERVICO = 'C:/Users/pcmac/.supabase-service-role';
const CREDENCIAIS = 'C:/Users/pcmac/.ah2-senhas-de-teste.json';
const SUF = (process.argv[3] || '19-11').trim();
const OUT = `${EV}/p73-rotacao-de-senhas-${SUF}.json`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — renomeie como ANTERIOR e re-corra');

const dsrc = readFileSync(`${REPO}/scripts/ah2-varredura.mjs`, 'utf8');
const mT = /const TODOS\s*=\s*\[([^\]]*)\]/.exec(dsrc);
if (!mT) throw new Error('ABORTA: enum de perfis nao lido de ah2-varredura.mjs');
const TODOS = [...mT[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
if (TODOS.length < 10) throw new Error('ABORTA: enum lido tem ' + TODOS.length + ' perfis — o padrão partiu');

// Que ars? O ultimo diario de publicacao e o `esperado-v*.json` desse mesmo deploy, nada dactilografado.
const por_versao = (re) => readdirSync(REPO).filter((f) => re.test(f)).sort((a, b) => parseInt(/(\d+)/.exec(a)[1], 10) - parseInt(/(\d+)/.exec(b)[1], 10));
const DIARIO = por_versao(/^audit-publicacao-v\d+\.json$/).slice(-1)[0];
if (!DIARIO) throw new Error('ABORTA: nenhum audit-publicacao-v*.json');
const URL_APP = (/https:\/\/[a-z0-9.-]+\.workers\.dev/i.exec(readFileSync(`${REPO}/${DIARIO}`, 'utf8')) || [])[0] + '/';
const PASTA_DEPLOY = por_versao(/^worker-deploy-v\d+/).slice(-1)[0];
const FICHEIRO_ESPERADO = readdirSync(`${REPO}/${PASTA_DEPLOY}`).filter((f) => /^esperado-v\d+\.json$/.test(f)).sort((a, b) => parseInt(/v(\d+)/.exec(a)[1], 10) - parseInt(/v(\d+)/.exec(b)[1], 10)).slice(-1)[0];
const md5 = (b) => createHash('md5').update(Buffer.from(b)).digest('hex');
const shellTxt = await (await fetch(URL_APP, { headers: { 'cache-control': 'no-cache' } })).text();
const AR_MD5 = md5(shellTxt);
const ESPERADO = JSON.parse(readFileSync(`${REPO}/${PASTA_DEPLOY}/${FICHEIRO_ESPERADO}`, 'utf8')).htmlMd5;
if (AR_MD5 !== ESPERADO) throw new Error(`ABORTA: o ar servido (${AR_MD5}) nao e o esperado do ${PASTA_DEPLOY}/${FICHEIRO_ESPERADO} (${ESPERADO})`);
const anonKey = (/SUPABASE_PUBLISHABLE_KEY\s*=\s*['"]([^'"]+)['"]/.exec(shellTxt) || [])[1];
if (!anonKey) throw new Error('ABORTA: sem SUPABASE_PUBLISHABLE_KEY nos bytes servidos');
if (!existsSync(CHAVE_SERVICO)) throw new Error('ABORTA: falta ' + CHAVE_SERVICO + ' — sem chave de servico nao ha PUT de auth');
const serviceKey = readFileSync(CHAVE_SERVICO, 'utf8').trim();

// Quem precisa de senha nova decide-se por MEDICAO, nao por uma lista lembrada: um papel so entra se nenhum
// acesso em disco estiver vivo (mesma regua do p73-exp-por-entrada.mjs, aqui reimplementada em 6 linhas).
const agora = () => Math.floor(Date.now() / 1000);
const expDoJWT = (t) => { try { return JSON.parse(Buffer.from(String(t).split('.')[1], 'base64url').toString('utf8')).exp; } catch { return null; } };
const fich_sess = readdirSync(DIR).filter((f) => /^ah2-sess/.test(f) && f.endsWith('.json'));
const vivo = {};
for (const f of fich_sess) { let j; try { j = JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8')); } catch { continue; } for (const p of TODOS) { const e = expDoJWT(j[p]?.access_token); if (e && e > agora()) vivo[p] = true; } }
const ALVOS_TODOS = TODOS.filter((p) => !vivo[p]);
// Filtro por papel para poder provar o endpoint NUMA conta antes de tocar nas outras — o OK cobre as 14, mas
// a casa exige escalonar uma escrita de credencial antes de a repetir em série.
const PEDIDO = (process.argv[2] || 'MORTOS').trim();
const ALVOS = PEDIDO === 'MORTOS' ? ALVOS_TODOS : PEDIDO.split(',').map((s) => s.trim()).filter(Boolean);
for (const p of ALVOS) if (!TODOS.includes(p)) throw new Error('ABORTA: papel fora do enum: ' + p);
console.log('ALVOS MORTOS POR MEDICAO: ' + ALVOS_TODOS.length + ' (' + ALVOS_TODOS.join(',') + ') · nesta corrida: ' + ALVOS.join(','));
console.log('AR: ' + URL_APP + ' md5=' + AR_MD5 + ' (esperado de ' + PASTA_DEPLOY + '/' + FICHEIRO_ESPERADO + ') · com acesso vivo: ' + (TODOS.filter((p) => vivo[p]).join(',') || 'nenhum') + ' · alvos desta corrida: ' + ALVOS.join(','));

const mestre = JSON.parse(readFileSync(MESTRE, 'utf8'));
const credenciais = existsSync(CREDENCIAIS) ? JSON.parse(readFileSync(CREDENCIAIS, 'utf8')) : {};
const saida = { programa: 'scripts/p73-rotacao-de-senhas.mjs', em: new Date().toISOString(), ok_literal: 'Redefinir senha das 14 contas (Recommended)', ar: { url: URL_APP, md5: AR_MD5, esperado_de: PASTA_DEPLOY + '/' + FICHEIRO_ESPERADO }, escrita: 'auth apenas: PUT /auth/v1/admin/users/<uid> com password nova + POST grant_type=password. 0 tabelas de produto, 0 DDL, 0 publicacao.', ficheros_de_sessao_varridos: fich_sess.length, papeis: {} };

const admin = async (path, init) => { const r = await fetch(`${HOST}${path}`, { ...init, headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'content-type': 'application/json', ...(init?.headers || {}) }, signal: AbortSignal.timeout(45000) }); const j = await r.json().catch(() => null); return { ok: r.ok, status: r.status, j }; };
const publica = async (path, body) => { const r = await fetch(`${HOST}${path}`, { method: 'POST', headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(45000) }); const j = await r.json().catch(() => null); return { ok: r.ok, status: r.status, j }; };

for (const papel of ALVOS) {
  const reg = { uid_prefixo: null, email_forma: null, senha: null, rotacao_http: null, login_http: null, cadeia: null };
  saida.papeis[papel] = reg;
  const m = mestre[papel];
  if (!m?.user?.id || !m?.user?.email) { reg.falha = 'sem uid/email no registo mestre — nada pode ser rotado'; console.log('VERMELHO ' + papel.padEnd(21) + reg.falha); continue; }
  reg.uid_prefixo = String(m.user.id).slice(0, 8);
  reg.email_forma = String(m.user.email).split('@')[0].replace(/-[0-9a-f]{6}$/, '-<hex6>') + '@' + String(m.user.email).split('@')[1];
  if (!credenciais[papel]?.senha) {
    const senha = randomBytes(18).toString('base64url');
    const put = await admin(`/auth/v1/admin/users/${m.user.id}`, { method: 'PUT', body: JSON.stringify({ password: senha }) });
    reg.rotacao_http = put.status; reg.rotacao_codigo = put.j?.error_code || (put.ok ? 'ok' : String(put.j?.error || 'sem corpo').slice(0, 60));
    if (!put.ok) { reg.falha = 'PUT de auth falhou em HTTP ' + put.status; console.log('VERMELHO ' + papel.padEnd(21) + reg.falha + ' codigo=' + reg.rotacao_codigo); continue; }
    credenciais[papel] = { senha, desde: new Date().toISOString(), uid: m.user.id, email: m.user.email };
    writeFileSync(CREDENCIAIS, JSON.stringify(credenciais, null, 2) + '\n');
    reg.senha = 'rotacionada (comprimento=' + senha.length + ', gravada fora do git)';
  } else {
    reg.senha = 'reutilizada da credencial gravada (comprimento=' + credenciais[papel].senha.length + ') — nao roto de novo';
    reg.rotacao_http = 'nao_tocada';
  }
  const tok = await publica('/auth/v1/token?grant_type=password', { email: m.user.email, password: credenciais[papel].senha });
  reg.login_http = tok.status;
  if (!tok.ok || !tok.j?.access_token) { reg.falha = 'login por senha falhou em HTTP ' + tok.status + ' codigo=' + (tok.j?.error_code || tok.j?.error || 'sem corpo'); console.log('VERMELHO ' + papel.padEnd(21) + reg.falha); continue; }
  const exp = expDoJWT(tok.j.access_token);
  reg.cadeia = { access_comprimento: String(tok.j.access_token).length, refresh_comprimento: String(tok.j.refresh_token).length, expira_em_s: exp ? exp - agora() : null, token_type: tok.j.token_type || null };
  if (!exp || exp <= agora()) { reg.falha = 'o acesso novo ja nasceu expirado'; console.log('VERMELHO ' + papel.padEnd(21) + reg.falha); continue; }
  const fich = `${DIR}/ah2-sessao-${papel}.json`;
  const obj = existsSync(fich) ? JSON.parse(readFileSync(fich, 'utf8')) : {};
  obj[papel] = { id: m.user.id, email: m.user.email, access_token: tok.j.access_token, refresh_token: tok.j.refresh_token, expires_at: tok.j.expires_at, user: tok.j.user };
  writeFileSync(fich, JSON.stringify(obj, null, 2) + '\n');
  const lido = JSON.parse(readFileSync(fich, 'utf8'))[papel];
  reg.escritura_provada = md5(lido.access_token) === md5(tok.j.access_token);
  reg.ok = !!reg.escritura_provada;
  console.log((reg.ok ? 'VERDE  ' : 'VERMELHO ') + papel.padEnd(21) + reg.senha.split(' ')[0] + ' · login=' + reg.login_http + ' · expira_em=' + reg.cadeia.expira_em_s + 's · access=' + reg.cadeia.access_comprimento + 'B refresh=' + reg.cadeia.refresh_comprimento + 'B · ' + fich.split('/').pop());
  if (!reg.ok) reg.falha = 'a leitura de volta nao bate com o token emitido';
}

const ok_ = ALVOS.filter((p) => saida.papeis[p].ok);
const maus = ALVOS.filter((p) => !saida.papeis[p].ok);
saida.resumo = { alvos: ALVOS.length, recuperados: ok_.length, falhas: maus.length, lista_falhas: maus, tocados_sem_nada: TODOS.filter((p) => vivo[p]) };
writeFileSync(OUT, JSON.stringify(saida, null, 2) + '\n');
console.log('RECUPERADOS: ' + ok_.length + '/' + ALVOS.length + (maus.length ? ' · FALHAS: ' + maus.join(',') : ''));
console.log('Nao toquei (ja tinham acesso vivo): ' + (saida.resumo.tocados_sem_nada.join(',') || 'nenhum'));
console.log(maus.length ? 'P73_ROTACAO_FALHAS · registo ' + OUT : 'P73_ROTACAO_OK · registo ' + OUT + ' · proxima voz unica: node scripts/ah2-funde-sessoes.mjs');
process.exit(maus.length ? 1 : 0);
