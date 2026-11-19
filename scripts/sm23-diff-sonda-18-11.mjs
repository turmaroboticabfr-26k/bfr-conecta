#!/usr/bin/env node
// Diff só-leitura entre as duas passadas da sonda com sessão (antes = pré-DDL, depois = pós-DDL).
// Percorre o VALOR, não o JSON.stringify: comparar texto por índice de caractere dá vermelho com a
// resposta errada. Para cada persona imprime as três grandezas que importam (linhas da vista, linha do
// rpc de totais, valor do oráculo de grants) e separa o que MUDOU do que não mudou, com unidade.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const A = JSON.parse(readFileSync(join(REPO, 'evidence/sm23-sonda-com-sessao-antes-18-11.json'), 'utf8'));
const B = JSON.parse(readFileSync(join(REPO, 'evidence/sm23-sonda-com-sessao-depois-18-11.json'), 'utf8'));

const chave = (l) => l.perfil || l.persona;
const por = (doc) => {
  const m = new Map();
  for (const l of doc.por_persona || doc.porPersona || doc.sessoes_por_persona || []) m.set(chave(l), l);
  return m;
};
const campos = ['vista_municipal', 'rpc_network_totals', 'rpc_has_grant_com_municipio_real', 'rpc_has_grant_sem_concessao', 'calendario'];
// O produtor antigo gravou `valor:null` para escalares JSON: `true` tem 4 bytes, `false` tem 5. Sem
// esta nota a coluna de grants diria «?» e eu leria isso como «não sei» quando o ficheiro sabe.
const leitura = (x) => x == null ? '—' : `${x.status ?? x.http ?? '?'}/${x.linhas ?? x.valor ?? x.code ?? '?'}`;
// Só para as duas colunas de oráculo booleano, cujo produtor gravou valor:null: 4 bytes = true, 5 = false.
const leituraGrant = (x) => x == null ? '—' : `${x.status}/${x.valor != null ? x.valor : (x.code || (x.bytes === 4 ? 'true' : x.bytes === 5 ? 'false' : x.bytes + 'B'))}`;
const pa = por(A), pb = por(B);
const nomes = [...new Set([...pa.keys(), ...pb.keys()])].sort();
console.log('CAMPOS LIDOS DO ANTES:', Object.keys(A).join(','));
console.log('CAMPOS LIDOS DO DEPOIS:', Object.keys(B).join(','));
const linhaCal = (l) => l && l.calendario ? Object.entries(l.calendario).map(([t, v]) => `${t.replace('bfr_school_', '').replace('_targets', '·T').replace('_settings', '·S').replace('_days', '·D')}=${leitura(v)}`).join(' ') : '—';
console.log('\nperfil                        | vista antes→depois | rpc antes→depois | grant_real antes→depois | grant_sem antes→depois');
const mudancas = [];
for (const n of nomes) {
  const a = pa.get(n), b = pb.get(n);
  const f = (l, c) => l && l[c] ? (c.startsWith('rpc_has_grant') ? leituraGrant(l[c]) : leitura(l[c])) : '—';
  const linha = `${n.padEnd(28)} | ${f(a, 'vista_municipal')} → ${f(b, 'vista_municipal')} | ${f(a, 'rpc_network_totals')} → ${f(b, 'rpc_network_totals')} | ${f(a, 'rpc_has_grant_com_municipio_real')} → ${f(b, 'rpc_has_grant_com_municipio_real')} | ${f(a, 'rpc_has_grant_sem_concessao')} → ${f(b, 'rpc_has_grant_sem_concessao')}`;
  console.log(linha);
  for (const c of ['vista_municipal', 'rpc_network_totals', 'rpc_has_grant_com_municipio_real', 'rpc_has_grant_sem_concessao']) {
    const va = a && a[c] ? JSON.stringify(a[c]) : null, vb = b && b[c] ? JSON.stringify(b[c]) : null;
    if (va !== vb) mudancas.push({ perfil: n, campo: c, antes: a && a[c], depois: b && b[c] });
  }
}
console.log('\nANON: vista', leitura(A.anon?.vista_municipal), '→', leitura(B.anon?.vista_municipal), '| rpc', leitura(A.anon?.rpc_network_totals), '→', leitura(B.anon?.rpc_network_totals), '| grant', leituraGrant(A.anon?.rpc_has_grant_com_municipio_real ?? A.anon?.rpc_has_grant), '→', leituraGrant(B.anon?.rpc_has_grant_com_municipio_real ?? B.anon?.rpc_has_grant));
console.log('ANON calendario: antes', linhaCal(A.anon), '\n              depois', linhaCal(B.anon));
console.log('\nCATALOGO antes:', JSON.stringify(A.catalogo_no_instante), '\nCATALOGO depois:', JSON.stringify(B.catalogo_no_instante));
console.log('\nMUDANCAS por campo (unidade: uma linha por persona×campo):', mudancas.length);
for (const m of mudancas) console.log(`  ${m.perfil} · ${m.campo}\n     antes ${JSON.stringify(m.antes)}\n     depois ${JSON.stringify(m.depois)}`);
