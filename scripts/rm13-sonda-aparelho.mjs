// RM-1.3 sonda SOMENTE LEITURA: o aparelho assinante e a cadeia de entrega ainda estão vivos?
// 0 escrita, 0 envio, 0 DDL, 0 deploy. Nenhum token impresso (só comprimento e md5).
// Artefato: bfr-conecta/evidence/rm13-aparelho.json
import { readFileSync, writeFileSync } from 'node:fs';

const REF = 'yyzqoxlkcvqpessypfjo';
const PAT = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();
const AR = 'https://bfr-conecta.turmaroboticabfr.workers.dev';
const CONTA = '19bc8c0e-5b1c-4e73-a765-80ea58911315';
const SUB = 'dc0b8019-a492-4e4d-8741-d4094eb410e8';

async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST', headers: { Authorization: 'Bearer ' + PAT, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const t = await r.text();
  if (r.status !== 201) throw new Error(`sql HTTP ${r.status} ${t.slice(0, 500)}`);
  try { return JSON.parse(t); } catch { return []; }
}

const out = { em: new Date().toISOString(), tarefa: 'RM-1.3', metodo: 'somente leitura', gate: {}, total: { ok: 0, falha: 0 } };
function checa(nome, valor, esperado) {
  const passou = JSON.stringify(valor) === JSON.stringify(esperado);
  out.gate[nome] = { valor, esperado, passou };
  out.total[passou ? 'ok' : 'falha'] += 1;
  return passou;
}

// 1) A conta-aparelho e a assinatura
const linha = await sql(`
select (select count(*)::int from auth.users where id = '${CONTA}')            as auth_viva,
       (select count(*)::int from public.profiles where id = '${CONTA}')       as perfil_vivo,
       (select role from public.profiles where id = '${CONTA}')                as papel,
       (select count(*)::int from public.push_subscriptions)                   as subs_totais,
       (select count(*)::int from public.push_subscriptions where id = '${SUB}') as subs_alvo,
       (select coalesce(max(length(fcm_token)),-1) from public.push_subscriptions where id = '${SUB}') as token_ch,
       (select coalesce(md5(fcm_token),'-') from public.push_subscriptions where id = '${SUB}')        as token_md5,
       (select created_at::text  from public.push_subscriptions where id = '${SUB}')                   as criada_em,
       (select last_seen_at::text from public.push_subscriptions where id = '${SUB}')                  as vista_em,
       (select push_enabled from public.notification_preferences where profile_id = '${CONTA}')        as push_on,
       (select email_enabled from public.notification_preferences where profile_id = '${CONTA}')       as email_on,
       (select count(*)::int from public.notification_preferences)              as prefs_totais
`);
const L = linha[0] || {};
out.aparelho = L;
checa('A1_conta_aparelho_viva', L.auth_viva >= 1 ? 'viva' : 'morta', 'viva');
checa('A2_assinatura_presente', L.subs_alvo, 1);
checa('A3_token_formato', L.token_ch, 142);
checa('A4_token_mesmo_do_diario', L.token_md5, '6827bbf6757ce478f492de9ea0843b8c');
checa('A5_preferencia_push_ligada', L.push_on, true);
checa('A6_papel_esperado', L.papel, 'parent');

// 2) O canal de emissão ainda responde ao que o diário C.25/C.40 deixou escrito
const can = await sql(`
select (select count(*)::int from net._http_response)                          as respostas,
       (select coalesce(max(id),-1) from net._http_response)                    as id_max,
       (select coalesce(min(id),-1) from net._http_response)                    as id_min,
       (select coalesce(max(created)::text,'-') from net._http_response)         as ultima_em,
       (select count(*)::int from net._http_response where status_code = 200)    as com_200,
       (select coalesce((content::text),'-') from net._http_response order by id desc limit 1) as ultimo_corpo,
       (select count(*)::int from pg_trigger where tgname = 'bfr_pf_notify_location' and NOT tgisinternal) as gatilho_pf,
       (select tgenabled from pg_trigger where tgname = 'bfr_pf_notify_location' and NOT tgisinternal)     as gatilho_ligado,
       (select count(*)::int from vault.secrets where name = 'pf_emissor_service_role')                    as segredo_vault
`);
out.canal = can[0] || {};
checa('C1_gatilho_do_emissor_vivo', out.canal.gatilho_pf, 1);
checa('C2_gatilho_habilitado', out.canal.gatilho_ligado, 'O');
checa('C3_segredo_do_emissor_no_vault', out.canal.segredo_vault, 1);

// 3) A Edge que faz o envio — versão lida da plataforma, valor de segredo nunca impresso
// Caminho lido em 12/11: GET /v1/projects/{ref}/functions/{slug} devolve 200 com versao e verify_jwt;
// /functions/deployments devolve 404 {"message":"Function not found"} (instrumento, nao produto).
try {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/functions/send-school-notification`, {
    headers: { Authorization: 'Bearer ' + PAT },
  });
  const j = r.status === 200 ? await r.json() : {};
  out.edge = { http: r.status, slug: j?.slug ?? null, version: j?.version ?? null, verify_jwt: j?.verify_jwt ?? null,
    status: j?.status ?? null, atualizada_em: j?.updated_at ?? null };
  checa('E1_edge_v23_ou_posterior', (out.edge.version ?? 0) >= 23 ? '>=23' : String(out.edge.version), '>=23');
  checa('E2_edge_verify_jwt', out.edge.verify_jwt, true);
} catch (err) { out.edge = { erro: String(err).slice(0, 160) }; out.total.falha += 1; out.gate.E1_edge_leitura = { passou: false, erro: String(err).slice(0, 160) }; }

// 4) As peças publicadas do cliente (handler push no SW + rota real do FCM)
const html = await (await fetch(AR + '/', { headers: { 'cache-control': 'no-cache' } })).text();
const sw = await fetch(AR + '/sw-v4.js?v=45', { headers: { 'cache-control': 'no-cache' } });
const swtxt = await sw.text();
const fcm = await fetch(AR + '/firebase-messaging-sw.js', { headers: { 'cache-control': 'no-cache' } });
const fcmTxt = await fcm.text();
out.cliente = {
  html_bytes: html.length, html_md5: (await import('node:crypto')).createHash('md5').update(html).digest('hex'),
  sw_http: sw.status, sw_bytes: swtxt.length,
  sw_md5: (await import('node:crypto')).createHash('md5').update(swtxt).digest('hex'),
  sw_push: (swtxt.match(/addEventListener\(['"]push['"]/g) || []).length,
  sw_click: (swtxt.match(/addEventListener\(['"]notificationclick['"]/g) || []).length,
  sw_show: (swtxt.match(/showNotification/g) || []).length,
  fcm_http: fcm.status, fcm_ct: fcm.headers.get('content-type'), fcm_bytes: fcmTxt.length,
};
checa('S1_sw_tem_handler_push', out.cliente.sw_push >= 1 ? 'tem' : 'nao', 'tem');
checa('S2_sw_tem_notificationclick', out.cliente.sw_click >= 1 ? 'tem' : 'nao', 'tem');
checa('S3_rota_fcm_nao_e_html', String(out.cliente.fcm_ct).includes('html') ? 'html' : 'js', 'js');
checa('S4_sw_identico_ao_do_diario', out.cliente.sw_md5, 'e11fca1951440c13a136994412c69441');

const passou = out.total.falha === 0;
out.veredito = passou ? 'RM13_APARELHO_VIVO_OK' : 'RM13_APARELHO_COM_FALHAS';
out.total_string = Object.keys(out.gate).length;
writeFileSync(new URL('../evidence/rm13-aparelho.json', import.meta.url), JSON.stringify(out, null, 2));
for (const [k, v] of Object.entries(out.gate)) console.log(`  ${v.passou ? 'OK  ' : 'FALHA'} ${k}  valor=${JSON.stringify(v.valor)} esperado=${JSON.stringify(v.esperado)}`);
console.log(`\naparelho=${JSON.stringify(out.aparelho)}`);
console.log(`canal=${JSON.stringify(out.canal)}`);
console.log(`edge=${JSON.stringify(out.edge)}`);
console.log(`cliente=${JSON.stringify(out.cliente)}`);
console.log(`\nportoes: ${out.total.ok} verde / ${out.total.falha} vermelho de ${out.total_string} · ${out.veredito}`);
process.exit(passou ? 0 : 1);
