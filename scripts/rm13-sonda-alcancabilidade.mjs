// RM-1.3 / alcançabilidade — SOMENTE LEITURA: os caminhos de push do shell estão em código que o
// runtime chega a executar?
// Regra corrigida nesta passada: type="text/plain" + data-bfr-auth-deferred / data-bfr-deferred =
// BLOCO ADIADO (o carregador o converte em <script> no boot); só o sufixo "-disabled" marca o que
// NUNCA é ativado (memória bfr-dead-deferred-modules). Tratar todo text/plain como "morto" era erro.
// 0 escrita, 0 deploy, 0 DDL. Artefato: bfr-conecta/evidence/rm13-alcancabilidade.json
import { readFileSync, writeFileSync } from 'node:fs';

const shell = 'app/index.html';
const src = readFileSync(shell, 'utf8');
const L = src.split('\n');

const blocos = [];
for (let i = 0; i < L.length; i++) {
  const ab = L[i].match(/<script\b([^>]*)>/i);
  if (ab) blocos.push({ inicio: i + 1, attrs: ab[1].trim(), fim: null });
  if (/<\/script>/i.test(L[i])) { const abertos = blocos.filter((b) => b.fim === null); if (abertos.length) abertos[abertos.length - 1].fim = i + 1; }
}
const classeDe = (a) => {
  if (/-disabled/i.test(a)) return 'morto';
  if (/text\/plain/i.test(a)) return 'adiado';
  if (/\bsrc=/i.test(a)) return 'externo';
  return 'imediato';
};
for (const b of blocos) { b.classe = classeDe(b.attrs); b.id = (b.attrs.match(/id="([^"]+)"/) || [, ''])[1]; }
const blocoDe = (n) => { const bs = blocos.filter((b) => b.inicio <= n && (b.fim === null || b.fim >= n)); return bs[bs.length - 1] || null; };

const out = { em: new Date().toISOString(), tarefa: 'RM-1.3 alcançabilidade dos caminhos de push',
  shell, linhas: L.length, blocos_script: blocos.length, funcs: {} };
out.por_classe = blocos.reduce((a, b) => ((a[b.classe] = (a[b.classe] || 0) + 1), a), {});
out.mortos = blocos.filter((b) => b.classe === 'morto').map((b) => ({ id: b.id, linhas: `${b.inicio}-${b.fim}` }));

// O carregador existe mesmo? Procuro o código que converte bloco adiado em <script> executável.
const RE_ATIVADOR = /createElement\(\s*['"]script['"]|\.type\s*=\s*['"]text\/javascript|textContent\s*=\s*[^;]*\.innerHTML|dataset\.bfr(Deferred|AuthDeferred)|getAttribute\(\s*['"]data-bfr-(deferred|auth-deferred)/g;
out.ativadores = [];
for (let i = 0; i < L.length; i++) {
  RE_ATIVADOR.lastIndex = 0;
  if (!RE_ATIVADOR.test(L[i])) continue;
  const b = blocoDe(i + 1);
  out.ativadores.push({ linha: i + 1, dentro_de: b ? `${b.inicio}-${b.fim} (${b.classe})` : 'fora de bloco',
    texto: L[i].trim().slice(0, 220) });
}

const ALVO = {
  enablePush: 'function enablePush(',
  registerPushSubscription: 'function registerPushSubscription(',
  syncPushSubscription: 'function syncPushSubscription(',
  getFirebaseMessaging: 'function getFirebaseMessaging(',
  loadPushScripts: 'function loadPushScripts(',
};
for (const [nome, texto] of Object.entries(ALVO)) {
  const def = L.findIndex((l) => l.includes(texto)) + 1;
  const b = def ? blocoDe(def) : null;
  const re = new RegExp('\\b' + nome + '\\s*\\(');
  const chamadas = [];
  for (let i = 0; i < L.length; i++) {
    if (i + 1 === def || !re.test(L[i])) continue;
    const cb = blocoDe(i + 1);
    chamadas.push({ linha: i + 1, classe: cb ? cb.classe : 'fora', bloco_id: cb?.id || '',
      texto: L[i].trim().slice(0, 170) });
  }
  const por = (k) => chamadas.filter((c) => c.classe === k).length;
  out.funcs[nome] = { def_linha: def || null, def_classe: b?.classe || null, def_id: b?.id || '',
    def_attrs: b ? b.attrs.slice(0, 160) : '', chamadas: chamadas.length,
    chamada_morta: por('morto'), chamada_adiada: por('adiado'), chamada_imediata: por('imediato'),
    amostras: chamadas.slice(0, 8) };
}

// Como o usuário chega a enablePush / registerPushSubscription? Controles com esse nome no HTML.
out.controles_push = [...new Set((src.match(/[^<>\n]{0,70}(?:enablePush|registerPushSubscription|syncPushSubscription|Ativar (?:push|notifica))[^\n]{0,70}/gi) || []))]
  .map((s) => s.trim().slice(0, 150)).slice(0, 14);

console.log(`blocos=${out.blocos_script} por_classe=${JSON.stringify(out.por_classe)}`);
console.log(`mortos (${out.mortos.length}): ${out.mortos.map((m) => m.id || '?').join(' ')}`);
console.log(`\nativadores de bloco adiado: ${out.ativadores.length}`);
for (const a of out.ativadores.slice(0, 8)) console.log(`  ${a.linha} [${a.dentro_de}] ${a.texto.slice(0, 160)}`);
console.log('');
for (const [n, v] of Object.entries(out.funcs))
  console.log(`${n.padEnd(24)} def@${String(v.def_linha).padEnd(6)} bloco=${String(v.def_classe).padEnd(9)} id=${(v.def_id || '-').padEnd(26)} chamadas=${String(v.chamadas).padEnd(3)} mortas=${v.chamada_morta} adiadas=${v.chamada_adiada} imediatas=${v.chamada_imediata}`);
for (const [n, v] of Object.entries(out.funcs)) for (const a of v.amostras.slice(0, 3))
  console.log(`  ${n} @${a.linha} [${a.classe}${a.bloco_id ? ' #' + a.bloco_id : ''}] ${a.texto.slice(0, 120)}`);
console.log(`\ncontroles que nomeiam o push (${out.controles_push.length}):`);
for (const c of out.controles_push) console.log('  | ' + c);
writeFileSync(new URL('../evidence/rm13-alcancabilidade.json', import.meta.url), JSON.stringify(out, null, 2));
console.log('\n artefato: evidence/rm13-alcancabilidade.json');
