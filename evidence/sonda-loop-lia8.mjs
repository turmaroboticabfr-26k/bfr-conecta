// Ronda 8: a whitelist CSS que esconde o inbox na v59 é a causa do loop de ~300/s nos command-cards?
// Mede 5s ANTES, injeta a regra que desesconde o inbox (efeito do fix D1), mede 5s DEPOIS.
import { ligarChrome, conectar, Pagina, desligar } from './cdp.mjs';

const PORTA = Number(process.argv[2] || 8263);
const { ws, processo } = await ligarChrome({ cabeca: true, porta: 9372 });
const cdp = conectar(ws);
await cdp.pronto;
const p = await Pagina.abrir(cdp, `http://localhost:${PORTA}/?role=teacher&n=sondaloop8-${PORTA}`);
await p.largura(390, 900);

const fimGate = Date.now() + 40000;
while (Date.now() < fimGate) {
  if (await p.avaliar(`return !!window.BFR_CURRENT_PROFILE && !!document.getElementById('appShell')?.classList.contains('ready')`).catch(() => false)) break;
  await new Promise(r => setTimeout(r, 500));
}
await new Promise(r => setTimeout(r, 8000));

await p.avaliar(`return (() => {
  window.__med = [];
  window.__fase = 'antes';
  const obs = new MutationObserver(muts => {
    if (window.__fase === 'medindo') {
      for (const m of muts) {
        const alvo = m.target;
        if (alvo instanceof Element && alvo.closest('.bfr-teacher-command-card, .bfr-teacher-command-pending')) window.__med[window.__med.length - 1]++;
      }
    }
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });
  return true;
})()`);
await p.avaliar(`return (window.__fase = 'medindo', window.__med.push(0), true)`);
await new Promise(r => setTimeout(r, 5000));
const antes = await p.avaliar(`return window.__med[0]`);
await p.avaliar(`return (() => {
  // A whitelist da v59 vale (1,4,0) — nenhuma folha injetada vence; inline !important vence sempre.
  const inbox = document.querySelector('[data-teacher-inbox]');
  inbox.style.setProperty('display', 'block', 'important');
  window.__fase = 'medindo'; window.__med.push(0);
  return true;
})()`);
await new Promise(r => setTimeout(r, 5000));
const depois = await p.avaliar(`return (() => { const inbox = document.querySelector('[data-teacher-inbox]'); return { churn: window.__med[1], inboxDisplay: inbox ? getComputedStyle(inbox).display : null, inboxAltura: inbox ? Math.round(inbox.getBoundingClientRect().height) : null }; })()`);
console.log('PORTA', PORTA, JSON.stringify({ antes, depois }, null, 2));
await desligar(cdp, processo);
