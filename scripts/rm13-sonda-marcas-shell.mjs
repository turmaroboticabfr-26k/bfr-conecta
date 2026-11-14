// RM-1.3 / marcas de push no shell — SOMENTE LEITURA: onde exatamente o código publicado fala de push.
// O shell servido foi provado byte-idêntico ao app/index.html da bancada (portão M1 do rm13-sonda-rotas),
// então as linhas abaixo são as linhas do que o ar devolve.
// 0 escrita, 0 deploy, 0 DDL. Artefato: bfr-conecta/evidence/rm13-marcas-shell.json
import { readFileSync, writeFileSync } from 'node:fs';

const shell = 'app/index.html';
const t = readFileSync(shell, 'utf8');

const linhas = [];
let ate = 0;
for (let i = 0; i < t.length; i++) if (t[i] === '\n') { linhas.push(ate); ate = i + 1; }
const linhaDe = (pos) => { let lo = 0, hi = linhas.length; while (lo < hi) { const m = (lo + hi) >> 1; if (linhas[m] <= pos) lo = m + 1; else hi = m; } return lo; };

const MARCAS = {
  serviceWorker_register: /serviceWorker\.register\(\s*(['"`])([^'"`]+)\1/g,
  getToken: /getToken\s*\(/g,
  Notification_requestPermission: /Notification\.requestPermission/g,
  new_Notification: /new Notification\(/g,
  pushManager_subscribe: /pushManager\.subscribe|PushManager/g,
  push_subscriptions: /push_subscriptions/g,
  firebase: /firebase/gi,
  vapid: /vapid/gi,
};

const out = { em: new Date().toISOString(), tarefa: 'RM-1.3 marcas de push no shell',
  shell, bytes: Buffer.byteLength(t), linhas_no_arquivo: linhas.length + 1, marcas: {} };

for (const [nome, re] of Object.entries(MARCAS)) {
  const achados = [];
  for (const m of t.matchAll(re)) {
    const pos = m.index;
    const a = Math.max(0, pos - 90), b = Math.min(t.length, pos + 150);
    achados.push({ linha: linhaDe(pos), col: pos - (linhas[linhaDe(pos) - 2] ?? 0),
      texto: t.slice(a, b).replace(/\s+/g, ' ').slice(0, 220) });
    if (achados.length >= 14) break;
  }
  out.marcas[nome] = { total: (t.match(re) || []).length, amostras: achados };
}

// O caminho de notificação do app, na ordem em que aparece: quem chama o quê?
out.rota_notifications = [...new Set((t.match(/[?&]notifications=[01]|\?notifications\b/g) || []))].slice(0, 6);
out.sws_registrados = [...new Set((t.match(/serviceWorker\.register\(\s*['"`][^'"`]+/g) || []).map((s) => s.split(/['"`]/)[1]))];
out.fcm = { menciona_sw_fcm: (t.match(/firebase-messaging-sw/gi) || []).length,
  menciona_messaging_v8: (t.match(/firebase\/messaging|initializeApp|getMessaging/g) || []).length,
  chave_api_key_proxima: (t.match(/apiKey\s*:|API_KEY/gi) || []).length };

console.log(`shell ${out.bytes}B, ${out.linhas_no_arquivo} linhas`);
for (const [n, v] of Object.entries(out.marcas)) console.log(`\n== ${n}: ${(v.amostras.length < v.total ? v.total + ' (mostradas ' + v.amostras.length + ')' : v.total)}`);
for (const [n, v] of Object.entries(out.marcas)) for (const a of v.amostras.slice(0, 6))
  console.log(`  ${String(a.linha).padStart(7)}:${String(a.col).padStart(5)}  ${a.texto}`);
console.log(`\nsws registrados pelo shell: ${JSON.stringify(out.sws_registrados)}`);
console.log(`fcm: ${JSON.stringify(out.fcm)}`);
writeFileSync(new URL('../evidence/rm13-marcas-shell.json', import.meta.url), JSON.stringify(out, null, 2));
console.log('\n artefato: evidence/rm13-marcas-shell.json (somente leitura)');
