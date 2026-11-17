// AG-4 (peça 1B) — reprodução no ar da PEN-30, SOMENTE LEITURA. Autorizada por escolha explícita de
// 17/11 («só as leituras, sem mint»). A chave anon é lida dos bytes servidos pelo alvo publicado —
// padrão do af1-auditoria-final.mjs — e NUNCA é dactilografada nem gravada: no artefacto fica apenas
// prefixo+comprimento. Todos os pedidos REST levam Prefer: tx=rollback. Este script não importa o
// c2-lib: não abre ficheiro de chave nenhum.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const OUT = join(REPO, 'evidence/ag4-pen30-no-ar-17-11.json');
if (existsSync(OUT)) throw new Error(`já existe ${OUT} — renomeie com md5 dos dois lados, não por cima`);
const md5 = (s) => createHash('md5').update(s).digest('hex');

const shell = await fetch('https://bfr-conecta.turmaroboticabfr.workers.dev/');
const html = await shell.text();
const chave = (html.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*'([^']+)'/) || [])[1];
const host = (html.match(/https:\/\/([a-z]{20})\.supabase\.co/) || [])[1];
if (!chave) throw new Error('chave anon não encontrada no shell servido');
const REST = `https://${host}.supabase.co/rest/v1/announcements`;

const get = async (qs) => {
  const r = await fetch(`${REST}?${qs}`, {
    headers: { apikey: chave, authorization: `Bearer ${chave}`, prefer: 'tx=rollback' },
  });
  const t = await r.text();
  let j = null; try { j = JSON.parse(t); } catch {}
  return { status: r.status, code: j?.code ?? '', message: j?.message ?? '', hint: j?.hint ?? '', linhas: Array.isArray(j) ? j.length : null };
};

const selDefeito = 'id,title,body,message_type,status,published_at,scheduled_at,created_at,important,meeting_id';
const selCorrigido = 'id,title,body,message_type,status,published_at,scheduled_at,important,meeting_id';
const ordemDefeito = 'order=created_at.desc';
const ordemCorrigida = 'order=published_at.desc.nullslast';

const out = {
  em: new Date().toISOString(),
  tarefa: 'AG-4 peça 1B — PEN-30 reproduzida no ar (autorizada 17/11, só leitura)',
  alvo: { url: 'https://bfr-conecta.turmaroboticabfr.workers.dev/', shell_status: shell.status, shell_bytes: html.length, shell_md5: md5(html), host, chave_anon: `${chave.slice(0, 10)}…(${chave.length} B)` },
  nota: 'chave anon lida dos bytes servidos e nunca escrita por extenso; Prefer: tx=rollback em tudo',
};
out.probes = {
  defeituoso: await get(`select=${encodeURIComponent(selDefeito)}&${ordemDefeito}&limit=1`),
  corrigido: await get(`select=${encodeURIComponent(selCorrigido)}&${ordemCorrigida}&limit=1`),
  corrigido_sem_ordem: await get(`select=${encodeURIComponent(selCorrigido)}&limit=1`),
  controle_negativo_coluna_fantasma: await get(`select=${encodeURIComponent('id,coluna_que_nao_existe_xyz')}&limit=1`),
};
const d = out.probes.defeituoso, c = out.probes.corrigido, cn = out.probes.controle_negativo_coluna_fantasma;
const { criarGates } = { criarGates: () => { const f = []; let p = 0; return { gate(n, a, e) { p++; const ok = JSON.stringify(a) === JSON.stringify(e); if (!ok) f.push(`${n} | dado=${JSON.stringify(a)} | esperado=${JSON.stringify(e)}`); console.log(`${ok ? 'VERDE' : 'VERMELHO'}  ${n}`); }, resumo: () => ({ portoes: p, falhas: f }) }; } };
const g = criarGates();
g.gate('alvo_e_a_versao_publicada_v123', out.alvo.shell_md5, 'd418e7fc917f1fbb1437054b7b531f9b');
g.gate('defeituoso_400_com_codigo_42703', [d.status, d.code], [400, '42703']);
g.gate('mensagem_nomeia_a_coluna_ausente', /created_at/.test(d.message), true);
g.gate('corrigido_200_sem_linhas_erradas', c.status, 200);
g.gate('controle_negativo_tambem_400', cn.status, 400);
g.gate('controle_negativo_com_mesmo_codigo_de_coluna', cn.code, '42703');
g.gate('o_delta_do_select_muda_o_veredito', [d.status, c.status].join('/'), '400/200');
out.veredito = (d.status === 400 && d.code === '42703' && c.status === 200) ? 'PEN30_REPRODUZIDA_E_CORRIGIVEL_NO_AR' : 'PEN30_INESPERADA_NO_AR';
out.portoes = g.resumo();
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
for (const f of g.resumo().falhas) console.log('VERMELHO  ' + f);
console.log(`defeituoso: HTTP ${d.status} ${d.code} «${d.message}» · corrigido: HTTP ${c.status} (${c.linhas} linhas) · controle: HTTP ${cn.status} ${cn.code}`);
console.log(`${out.veredito} · ${g.resumo().portoes} portões / ${g.resumo().falhas.length} falhas · artefacto evidence/ag4-pen30-no-ar-17-11.json`);
process.exit(g.resumo().falhas.length ? 1 : 0);
