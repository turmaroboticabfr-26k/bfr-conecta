// Ensaio vivo do THROTTLE de notificacao de nova localizacao.
// Escreve posicoes como postgres direto na tabela (o gatilho e o mesmo caminho do
// RPC provado em §C.26; a trava de 30 s do RPC fica de fora de proposito).
// T1 emite · T2 silencia dentro da janela · T3 reemite com carimbo retrocedido
// T4 aluno diferente nao e silenciado · T5 sem destinatario nao gasta janela.
// Artefato: pf-throttle-ensaio-<timestamp>.json
import { readFileSync, writeFileSync } from 'node:fs';

const REF = 'yyzqoxlkcvqpessypfjo';
const PAT = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();
const fx = JSON.parse(readFileSync('pf-throttle-fixture.json', 'utf8'));
const A = fx.ids.alunoA, B = fx.ids.alunoB, C = fx.ids.alunoC;

async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST', headers: { Authorization: 'Bearer ' + PAT, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const t = await r.text();
  if (r.status !== 201) throw new Error(`sql HTTP ${r.status} ${t.slice(0, 900)}`);
  try { return JSON.parse(t); } catch { return []; }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function net() {
  const r = await sql(`select count(*)::int as n, coalesce(max(id),0)::int as max_id
                         from net._http_response`);
  return r[0];
}
async function linhasNetDepoisDe(id) {
  return sql(`select id, status_code, error_msg, created, timed_out
                from net._http_response where id > ${id} order by id`);
}
async function carimbo(who) {
  const r = await sql(`select student_id::text as aluno,
                              to_char(last_notified_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as carimbo
                         from public.student_location_notify_throttle
                        where student_id = '${who}'`);
  return r[0] || null;
}
async function posicao(who) {
  const r = await sql(`select latitude, longitude, source, reported_by_profile_id::text as relator,
                              to_char(reported_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as reported_at
                         from public.student_locations where student_id = '${who}'`);
  return r[0] || null;
}
// Escrita de posicao no caminho real do gatilho (upsert em student_locations).
async function escreve(who, lat, lon) {
  const t0 = Date.now();
  await sql(`
    insert into public.student_locations
      (student_id, latitude, longitude, accuracy_m, reported_by_profile_id, source, reported_at)
    values ('${who}', ${lat}, ${lon}, 12, null, 'student_app', now())
    on conflict (student_id) do update
      set latitude = excluded.latitude,
          longitude = excluded.longitude,
          accuracy_m = excluded.accuracy_m,
          source = excluded.source,
          reported_at = excluded.reported_at
  `);
  return { ms: Date.now() - t0 };
}
// Espera ate N linhas novas no pg_net (ou o prazo estourar).
async function esperaNovas(idAntes, prazoMs) {
  const fim = Date.now() + prazoMs;
  for (;;) {
    const novas = await linhasNetDepoisDe(idAntes);
    if (novas.length) return { novas, esperado: true, gasto_ms: Date.now() - (fim - prazoMs) };
    if (Date.now() > fim) return { novas: [], esperado: false, gasto_ms: Date.now() - (fim - prazoMs) };
    await sleep(1000);
  }
}
// Janela de silencio: nada deve aparecer no pg_net.
async function vigiaSilencio(idAntes, prazoMs) {
  const fim = Date.now() + prazoMs;
  while (Date.now() < fim) await sleep(1000);
  return { novas: await linhasNetDepoisDe(idAntes), prazo_ms: prazoMs };
}

const resultados = [];
const portas = {};
function gate(nome, ok, detalhe) { portas[nome] = { ok, detalhe }; if (!ok) throw new Error('PORTAO FALHO: ' + nome + ' :: ' + detalhe); }

const antes = await net();
const throttAntes = await sql(`select count(*)::int as n from public.student_location_notify_throttle`);
resultados.push({ caso: 'T0_partida', net: antes, throttle_linhas: throttAntes[0].n });

// ---- T1: primeira escrita do aluno A emite -------------------------------
let idAntes = antes.max_id;
const w1 = await escreve(A, -23.5500, -46.6330);
const pos1 = await posicao(A);
const car1 = await carimbo(A);
const e1 = await esperaNovas(idAntes, 25000);
const p1 = await carimbo(A);
resultados.push({ caso: 'T1_primeira_emite', escrita: w1, posicao: pos1,
  carimbo_criado: car1, carimbo_apos_envio: p1, net_novas: e1.novas, aguardou_ms: e1.gasto_ms });
gate('T1_emiteu', e1.esperado && e1.novas.length === 1 && e1.novas[0].status_code === 200, JSON.stringify(e1));
gate('T1_carimbo', !!p1 && p1.aluno === A, JSON.stringify(p1));

// ---- T2: segunda escrita dentro da janela silencia, posicao grava --------
idAntes = (await net()).max_id;
const w2 = await escreve(A, -23.5510, -46.6340);
const pos2 = await posicao(A);
const car2 = await carimbo(A);
const s2 = await vigiaSilencio(idAntes, 15000);
resultados.push({ caso: 'T2_dentro_da_janela_silencia', escrita: w2, posicao: pos2,
  carimbo: car2, silencio: s2 });
gate('T2_posicao_gravada', pos2 && pos2.latitude === -23.5510 && pos2.reported_at !== pos1.reported_at,
  JSON.stringify({ pos1, pos2 }));
gate('T2_nada_enviado', s2.novas.length === 0, JSON.stringify(s2));
gate('T2_carimbo_intacto', car2 && car2.carimbo === p1.carimbo, JSON.stringify({ antes: p1, depois: car2 }));

// ---- T3: carimbo retrocedido para alem da janela reemite -----------------
await sql(`update public.student_location_notify_throttle
              set last_notified_at = now() - interval '6 minutes'
            where student_id = '${A}'`);
const car3antes = await carimbo(A);
idAntes = (await net()).max_id;
const w3 = await escreve(A, -23.5520, -46.6350);
const e3 = await esperaNovas(idAntes, 25000);
const car3 = await carimbo(A);
resultados.push({ caso: 'T3_carimbo_retrocedido_reemite', escrita: w3, carimbo_retrocedido: car3antes,
  net_novas: e3.novas, carimbo_novo: car3, aguardou_ms: e3.gasto_ms });
gate('T3_reemiteu', e3.esperado && e3.novas[0].status_code === 200, JSON.stringify(e3));
gate('T3_carimbo_renovoado', car3.carimbo > car3antes.carimbo, JSON.stringify({ antes: car3antes, depois: car3 }));

// ---- T4: aluno B (janela de A fechada) emite na hora ---------------------
const janelaA = await carimbo(A);
idAntes = (await net()).max_id;
const w4 = await escreve(B, -23.5600, -46.6400);
const e4 = await esperaNovas(idAntes, 25000);
const car4 = await carimbo(B);
resultados.push({ caso: 'T4_outro_aluno_nao_e_silenciado', escrita: w4,
  janela_de_A: janelaA, net_novas: e4.novas, carimbo_B: car4, aguardou_ms: e4.gasto_ms });
gate('T4_emiteu', e4.esperado && e4.novas[0].status_code === 200, JSON.stringify(e4));
gate('T4_carimbo_proprio_do_B', !!car4 && car4.aluno === B && car4.carimbo !== janelaA.carimbo,
  JSON.stringify({ B: car4, A: janelaA }));

// ---- T5: aluno sem destinatarios grava, nao envia e nao gasta janela -----
idAntes = (await net()).max_id;
const w5 = await escreve(C, -23.5700, -46.6500);
const pos5 = await posicao(C);
const s5 = await vigiaSilencio(idAntes, 15000);
const car5 = await carimbo(C);
resultados.push({ caso: 'T5_sem_destinatario', escrita: w5, posicao: pos5, silencio: s5, carimbo_C: car5 });
gate('T5_posicao_gravada', !!pos5 && pos5.latitude === -23.5700, JSON.stringify(pos5));
gate('T5_nada_enviado', s5.novas.length === 0, JSON.stringify(s5));
gate('T5_janela_nao_gasta', car5 === null, JSON.stringify(car5));

// ---- Estado final do ciclo ----------------------------------------------
const final = await sql(`
select (select count(*)::int from public.student_locations) as posicoes,
       (select count(*)::int from public.student_location_notify_throttle) as carimbos,
       (select count(*)::int from public.student_location_notify_throttle where student_id = '${C}') as carimbos_c,
       (select count(*)::int from net._http_response) as net_total,
       (select count(*)::int from net._http_response where status_code = 200) as net_200
`);
resultados.push({ caso: 'T9_estado_final', ...final[0] });
gate('T9_tres_posicoes', final[0].posicoes === 3, JSON.stringify(final[0]));
gate('T9_dois_carimbos', final[0].carimbos === 2 && final[0].carimbos_c === 0, JSON.stringify(final[0]));
// Emiteme apenas T1, T3 e T4 (T2 e T5 ficam em silencio).
gate('T9_tres_envios', final[0].net_total === antes.n + 3 && final[0].net_200 === antes.n + 3,
  JSON.stringify({ partida: antes, fim: final[0] }));

const quando = new Date().toISOString();
const out = { quando, artefato: 'pf-throttle-ensaio', fixture_ids: fx.ids,
  partida: antes, resultados, portoes: portas,
  contagem_portoes: Object.keys(portas).length,
  ok: Object.values(portas).every(p => p.ok) };
const nome = `pf-throttle-ensaio-${quando.replace(/[:.]/g, '-')}.json`;
writeFileSync(nome, JSON.stringify(out, null, 2) + '\n');
writeFileSync('pf-throttle-ensaio.json', JSON.stringify(out, null, 2) + '\n');
console.log(`${quando} | portoes ${Object.keys(portas).length}/${Object.keys(portas).length} ok=${out.ok}`);
for (const [k, v] of Object.entries(portas)) console.log(`  ${v.ok ? 'OK  ' : 'FAIL'} ${k}`);
console.log('ARTEFATO', nome);
console.log(out.ok ? 'PF_THROTTLE_ENSAIO_OK' : 'PF_THROTTLE_ENSAIO_FALHOU');
