// AG-4 (peça 1, SOMENTE LEITURA) — PEN-30: onde está o select que pede `announcements.created_at`,
// quantas vezes, o que consome o campo, e a reprodução do defeito contra o PostgREST **vivo** com a
// chave anon lida dos bytes servidos. Nada escreve: GET com `Prefer: tx=rollback` em tudo.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const WORKER = join(REPO, 'worker-deploy-v123-pdfs/worker.mjs');
const OUT = join(REPO, 'evidence/ag4-pen30-sonda-16-11.json');
if (existsSync(OUT)) throw new Error(`já existe ${OUT} — renomeie com md5 dos dois lados, não por cima`);

const src = readFileSync(WORKER, 'utf8');
const out = { em: new Date().toISOString(), tarefa: 'AG-4 peça 1 — PEN-30 medida no código e no ar (somente leitura)', origem_worker_md5: createHash('md5').update(src).digest('hex') };

// 1) todos os selects que tocam `announcements`, com offset e o que pedem
const alvos = [];
const re = /\.from\(\s*['"`]announcements['"`]\s*\)/g;
let m;
while ((m = re.exec(src))) {
  const ante = src.slice(Math.max(0, m.index - 700), m.index);
  const sm = [...ante.matchAll(/\.select\(\s*['"`]([^'"`]{0,400})['"`]/g)].pop();
  const sel = sm ? sm[1] : null;
  alvos.push({
    offset: m.index,
    select: sel,
    pede_created_at: !!sel && /(^|[, (])created_at([,.):]|$)/.test(sel.replace(/\s+/g, '')),
    ordem: src.slice(m.index, m.index + 420).match(/\.order\(\s*['"`]([^'"`]+)['"`]/)?.[1] || null,
    trecho: src.slice(Math.max(0, m.index - 120), m.index + 220).replace(/\s+/g, ' ').slice(0, 300),
  });
}
out.selects_announcements = alvos;
out.com_created_at = alvos.filter((a) => a.pede_created_at).map((a) => a.offset);

// 2) URL literal com `announcements?select=` (o ar é servido também como string de fetch)
const urls = [...src.matchAll(/announcements\?select=([^\s"'`&]{0,300})/g)].map((x) => ({ select_url_decodificado: decodeURIComponent(x[1]), offset: x.index }));
out.urls_announcements = urls;
out.urls_que_pedem_created_at = urls.filter((u) => /(^|,)created_at([,.]|$)/.test(u.select_url_decodificado)).map((u) => u.offset);

// 3) quem lê `.created_at` de linhas de announcements (campo consumido, não só selecionado)
const consumos = [...src.matchAll(/[^.\w](?:a|ann|an|item|row|r)\.created_at/g)].map((x) => x.index);
out.consumos_possiveis_created_at = consumos.length;

// 4) o catálogo: as colunas reais de announcements (via c2-lib, a mesma de todos os ciclos)
const { sql, REF } = await import('file:///C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta/scripts/c2-lib.mjs');
const cols = await sql("select column_name, data_type from information_schema.columns where table_schema='public' and table_name='announcements' order by ordinal_position");
out.colunas_catalogo = cols.map((c) => c.column_name);
out.tem_created_at = out.colunas_catalogo.includes('created_at');
out.candidatas_de_data = out.colunas_catalogo.filter((c) => /at$|date$|_on$/i.test(c));

// 5) a chave anon vem dos bytes servidos, não de config
const shell = await fetch('https://bfr-conecta.turmaroboticabfr.workers.dev/');
const html = await shell.text();
const chave = (html.match(/["']?(sb_publishable-[A-Za-z0-9_-]{20,})["']?/) || html.match(/["'](eyJ[A-Za-z0-9_.-]{60,})["']/) || [])[1];
const supa = (html.match(/https:\/\/([a-z]{20})\.supabase\.co/) || [])[1];
out.identidade = { shell_status: shell.status, shell_bytes: html.length, shell_md5: createHash('md5').update(html).digest('hex'), host: supa === REF ? supa : '(divergente)', chave_anon: chave ? `${chave.slice(0, 14)}…(${chave.length} B)` : null };

// 6) reprodução no ar: o select defeituoso vs. o select corrigido, os dois como GET de leitura
const REST = `https://${REF}.supabase.co/rest/v1/announcements`;
const probe = async (qs) => {
  const r = await fetch(`${REST}?${qs}&limit=3`, { headers: { apikey: chave, authorization: `Bearer ${chave}`, prefer: 'tx=rollback' } });
  const t = await r.text();
  let j = null;
  try { j = JSON.parse(t); } catch {}
  return { qs, status: r.status, code: j?.code ?? '', message: j?.message ?? '', linhas: Array.isArray(j) ? j.length : null, corpo: t.slice(0, 220) };
};
const selectDefeito = 'id,title,created_at';
const selectCorrigido = 'id,title,published_at as created_at';
out.no_ar = {
  defeituoso: await probe(`select=${encodeURIComponent(selectDefeito)}`),
  corrigido_alias: await probe(`select=${encodeURIComponent(selectCorrigido)}`),
  corrigido_sem_alias: await probe('select=' + encodeURIComponent('id,title,published_at')),
  nota: 'os três são GET de leitura contra o PostgREST vivo; o "corrigido" prova que a substituição devolve 200 e que o alias preserva o nome do campo que o JS consome',
};
out.veredito = out.no_ar.defeituoso.status >= 400 && out.no_ar.corrigido_alias.status === 200 ? 'PEN30_REPRODUZIDA_E_CORRIGIVEL_POR_ALIAS' : 'PEN30_INESPERADA';
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify({ selects: alvos.length, com_created_at: out.com_created_at, urls: urls.length, urls_created_at: out.urls_que_pedem_created_at, colunas: out.colunas_catalogo, tem_created_at: out.tem_created_at, defeituoso: [out.no_ar.defeituoso.status, out.no_ar.defeituoso.code], corrigido: [out.no_ar.corrigido_alias.status, out.no_ar.corrigido_alias.linhas], veredito: out.veredito, md5: out.identidade.shell_md5 }, null, 1));
