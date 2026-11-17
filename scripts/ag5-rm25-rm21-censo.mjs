// AG-5 — censo estático de RM-2.5 (falha silenciosa) e RM-2.1 (fome de timers), medido nos bytes da
// v123 publicada. As cifras do roadmap (19 carregadores, 7 sem guarda, 9 catch vazios) são re-lidas
// aqui a partir do ficheiro, não da memória: se divergirem, o achado é a divergência.
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO, md5 } from './ag-lib.mjs';

const OUT = join(REPO, 'evidence/ag5-rm25-rm21-censo-17-11.json');
if (existsSync(OUT)) throw new Error(`já existe ${OUT} — renomeie com md5 dos dois lados`);
const src = readFileSync(join(REPO, 'worker-deploy-v123-pdfs/worker.mjs'), 'utf8');
const o = { em: new Date().toISOString(), alvo: 'worker-deploy-v123-pdfs/worker.mjs', md5: md5(src), tarefa: 'AG-5 — RM-2.5 e RM-2.1 medidos nos bytes publicados' };

// ── RM-2.5 ────────────────────────────────────────────────────────────────────
// Um "carregador" é uma função async cujo corpo consulta e escreve num host. O censo do roadmap contou
// 19 por `load()`; aqui conto as definições `async function load…()` e, para cada uma, se há guarda.
const defs = [...src.matchAll(/async function (load[A-Z]\w*)\s*\(/g)];
const loaders = defs.map((m) => {
  const i = m.index;
  // o corpo termina no próximo `async function` ou `function` ao mesmo nível — aproximação por busca
  // do `\n  }` que fecha, limitada a 4000 caracteres para não engolir o vizinho
  const corpo = src.slice(i, src.indexOf('\n  }', i) > 0 ? Math.min(src.indexOf('\n  }', i) + 5, i + 4000) : i + 4000);
  return {
    nome: m[1],
    offset: i,
    guarda_loading: /state\.loading/.test(corpo),
    guarda_loaded: /state\.loaded/.test(corpo),
    seta_error: /state\.error\s*=|class="[^"]*error|querySelector\('\[data-error/.test(corpo),
    catch_vazio: [...corpo.matchAll(/catch\s*(?:\([^)]*\))?\s*\{\s*\}/g)].length + [...corpo.matchAll(/\.catch\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)/g)].length,
    catch_tratado: [...corpo.matchAll(/catch\s*\([^)]*\)\s*\{[^}]{4,}/g)].length,
    corpo_chars: corpo.length,
  };
});
o.rm25 = {
  definicoes_de_loader: loaders.length,
  nomes: loaders.map((l) => l.nome),
  com_guarda: loaders.filter((l) => l.guarda_loading || l.guarda_loaded).length,
  sem_guarda: loaders.filter((l) => !l.guarda_loading && !l.guarda_loaded).map((l) => l.nome),
  catch_vazios: loaders.reduce((a, l) => a + l.catch_vazio, 0),
  catch_vazios_fora_de_loaders: (src.match(/catch\s*(?:\([^)]*\))?\s*\{\s*\}/g) || []).length + (src.match(/\.catch\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)/g) || []).length,
  setam_error: loaders.filter((l) => l.seta_error).length,
  loaders,
};

// ── RM-2.1 ────────────────────────────────────────────────────────────────────
// Timer periódico é o que se re-arma: setInterval, ou setTimeout cujo callback volta a chamar-se a si
// próprio. Escritas do menu mobile = os callbacks que tocam o nav/menu.
const periodos = [...src.matchAll(/setInterval\(\s*([\s\S]{0,200}?)\)/g)].map((m) => ({ offset: m.index, trecho: m[1].replace(/\s+/g, ' ').slice(0, 160) }));
const timeouts = [...src.matchAll(/setTimeout\(\s*([\s\S]{0,120}?)\s*,\s*(\d+)/g)].map((m) => ({ offset: m.index, atras: Number(m[2]), trecho: m[1].replace(/\s+/g, ' ').slice(0, 120) }));
const rearmados = [...src.matchAll(/function (\w+)\([^)]*\)\s*\{[\s\S]{0,600}?setTimeout\(\s*\1\b/g)].map((m) => m[1]);
const menuMarcas = /nav|menu|drawer|hamb/i;
o.rm21 = {
  setInterval_total: periodos.length,
  setInterval_trechos: periodos,
  setInterval_do_menu: periodos.filter((p) => menuMarcas.test(p.trecho)).map((p) => p.trecho),
  setTimeout_total: timeouts.length,
  setTimeout_re_armando_se_a_si: [...new Set(rearmados)],
  timeouts_de_grande_atraso: timeouts.filter((t) => t.atras >= 30000).map((t) => ({ atras: t.atras, trecho: t.trecho })),
  escritas_periodicas_no_menu: periodos.filter((p) => menuMarcas.test(p.trecho) && /(innerHTML|textContent|classList|appendChild)/.test(p.trecho)).length,
};
writeFileSync(OUT, JSON.stringify(o, null, 2) + '\n');
console.log(`RM-2.5: ${o.rm25.definicoes_de_loaders} loaders · ${o.rm25.com_guarda} com guarda · ${o.rm25.sem_guarda.length} sem (${o.rm25.sem_guarda.join(',')}) · catch vazios dentro de loaders ${o.rm25.catch_vazios}, no ficheiro todo ${o.rm25.catch_vazios_fora_de_loaders}`);
console.log(`RM-2.1: setInterval=${o.rm21.setInterval_total} (menu: ${o.rm21.setInterval_do_menu.length}) · setTimeout=${o.rm21.setTimeout_total} re-armados=${o.rm21.setTimeout_re_armando_se_a_si.length} · escritas periódicas no menu=${o.rm21.escritas_periodicas_no_menu}`);
for (const p of o.rm21.setInterval_trechos) console.log(`   setInterval @${p.offset}: ${p.trecho}`);
console.log(`AG5_CENSO_FEITO artefacto evidence/ag5-rm25-rm21-censo-17-11.json`);
