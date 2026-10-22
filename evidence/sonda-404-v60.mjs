// Sonda: quais URLs devolvem status >= 400 numa banda (8265=v60, 8263=v59) durante ~80 s de churn.
// Motivo: o diário da banda v60@390 gravou 99x "network: 404" sem URL (Log.entryAdded não carrega o alvo).
// Rodar com AUDIT_CDP_NETWORK=1 (o domínio Network só liga com a flag, cdp.mjs:108).
import { ligarChrome, conectar, Pagina, desligar } from './cdp.mjs';

const PORTA = Number(process.argv[2] || 8265);
const { ws, processo } = await ligarChrome({ cabeca: true, porta: 9372 });
const cdp = conectar(ws);
await cdp.pronto;
const p = await Pagina.abrir(cdp, `http://localhost:${PORTA}/?role=teacher&n=sonda404-${PORTA}`);
await p.largura(390, 900);

const t0 = Date.now();
const fim = t0 + 60000;
while (Date.now() < fim) {
  const pronto = await p.avaliar(`return !!window.BFR_CURRENT_PROFILE && !!document.getElementById('appShell')?.classList.contains('ready')`).catch(() => false);
  await new Promise(r => setTimeout(r, 500));
}
await new Promise(r => setTimeout(r, 20000));

const porStatus = {};
const porUrl = {};
for (const e of cdp.eventos) {
  if (!e || !e.params || (e.params.sessionId && e.params.sessionId !== p.s)) continue;
  if (e.method === 'Network.responseReceived' && e.params.response?.status >= 400) {
    const u = String(e.params.response.url);
    porStatus[u] = (porStatus[u] || 0) + 1;
  }
  if (e.method === 'Network.requestWillBeSent') {
    const u = String(e.params.request.url).slice(0, 140);
    porUrl[u] = (porUrl[u] || 0) + 1;
  }
}
console.log('== respostas >= 400 ==');
for (const [u, n] of Object.entries(porStatus)) console.log(n, 'x', u);
console.log('== requests por URL (top 25) ==');
for (const [u, n] of Object.entries(porUrl).sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log(n, 'x', u);
await desligar(cdp, processo);
