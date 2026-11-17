// Sonda 2 (só leitura): definição de SUPABASE_PUBLISHABLE_KEY nos bytes servidos (mascarada) e a
// régua de bytes conferida contra o ficheiro, em vez de contra a memória.
import { readFileSync } from 'node:fs';
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const regua = JSON.parse(readFileSync(`${DIR}/worker-deploy-v123-pdfs/esperado-v123.json`, 'utf8'));
const t = await (await fetch('https://bfr-conecta.turmaroboticabfr.workers.dev/', { headers: { 'Cache-Control': 'no-cache' } })).text();
const servido = Buffer.byteLength(t);
console.log('servido', servido, '| régua htmlBytes', regua.htmlBytes, '| IGUAIS?', servido === regua.htmlBytes);
const m = t.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["'`]([^"'`]+)["'`]/);
if (m) { const v = m[1]; console.log('publishable definida no bundle: sim · prefixo', v.slice(0, 14) + '… · comprimento', v.length); }
else console.log('publishable: definição por regex simples não encontrada — contexto:', t.slice(t.indexOf('SUPABASE_PUBLISHABLE_KEY') - 120, t.indexOf('SUPABASE_PUBLISHABLE_KEY') + 120).replace(/\s+/g, ' '));
const url = t.match(/SUPABASE_URL\s*=\s*["'`]([^"'`]+)/);
console.log('SUPABASE_URL no bundle?', url ? url[1].replace(/https:\/\/([^.]+)\./, 'https://<ref>.') : 'não');
console.log('ocorrências de publishable:', (t.match(/SUPABASE_PUBLISHABLE_KEY/g) || []).length);
