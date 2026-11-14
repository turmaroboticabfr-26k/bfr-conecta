// RM-1.3 sonda SOMENTE LEITURA em disco: em que versão o handler `push` saiu do SW publicado?
// 0 escrita, 0 deploy, 0 envio. Nunca imprime linha do worker (o HTML e uma linha de megabytes).
// Artefato: bfr-conecta/evidence/rm13-sw-disco.json
import { readdirSync, readFileSync, existsSync, writeFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';

const RAIZ = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const md5 = (b) => createHash('md5').update(b).digest('hex');
const conta = (t, re) => (t.match(re) || []).length;

function marcas(txt) {
  return {
    push: conta(txt, /addEventListener\(['"]push['"]/g),
    click: conta(txt, /addEventListener\(['"]notificationclick['"]/g),
    show: conta(txt, /showNotification/g),
    fcm_rota: conta(txt, /firebase-messaging-sw/g),
    cache: (txt.match(/bfr-conecta-v\d+/g) || []).slice(0, 3).join(','),
  };
}

// 1) Todo sw-v4.js existente em disco
const sws = [];
(function andar(dir) {
  let itens = [];
  try { itens = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const it of itens) {
    const p = dir + '/' + it.name;
    if (it.isDirectory()) { if (!/node_modules|\.git$/.test(it.name)) andar(p); }
    else if (/^sw-v4\.js$/.test(it.name)) {
      const b = readFileSync(p);
      sws.push({ caminho: p.slice(RAIZ.length + 1), bytes: b.length, md5: md5(b), ...marcas(b.toString('utf8')) });
    }
  }
})(RAIZ);

// 2) Cada diretório de deploy: o que o worker embute como SW
const deploys = [];
for (const nome of readdirSync(RAIZ).sort()) {
  if (!/^worker-deploy-/.test(nome)) continue;
  const w = RAIZ + '/' + nome + '/worker.mjs';
  if (!existsSync(w)) { deploys.push({ dir: nome, worker: 'ausente' }); continue; }
  const txt = readFileSync(w, 'utf8');
  const linha = txt.split('\n')[2] || '';
  deploys.push({
    dir: nome, worker_bytes: txt.length, worker_md5: md5(txt),
    const_sw_comeca_com: linha.slice(0, 96),
    ...marcas(txt),
    public_tem_sw: existsSync(w.replace('worker.mjs', 'public/sw-v4.js')),
  });
}

// 3) Os builds que montam o worker: de onde vem o SW
const builds = [];
for (const nome of readdirSync(RAIZ).sort()) {
  if (!/^build-worker-.*\.js$/.test(nome)) continue;
  const txt = readFileSync(RAIZ + '/' + nome, 'utf8');
  const refs = [...new Set((txt.match(/['"`][^'"`]*sw-v4\.js[^'"`]*['"`]/g) || []))].slice(0, 6);
  builds.push({ arquivo: nome, refs_sw: refs, menciona_push_handler: conta(txt, /addEventListener\(['"]push['"]/g) });
}

const out = { em: new Date().toISOString(), tarefa: 'RM-1.3', metodo: 'somente leitura em disco',
  md5_esperado_do_diario_v89: 'e11fca1951440c13a136994412c69441',
  md5_servido_hoje: '3fcbc3ad52f1a0491362506466c82596', sws, deploys, builds };
writeFileSync(new URL('../evidence/rm13-sw-disco.json', import.meta.url), JSON.stringify(out, null, 2));
console.log(`sws em disco: ${sws.length}`);
for (const s of sws) console.log(`  ${s.md5 === out.md5_servido_hoje ? '»' : s.md5 === out.md5_esperado_do_diario_v89 ? '★' : ' '} ${s.caminho}  ${s.bytes} B md5=${s.md5.slice(0, 12)}… push=${s.push} click=${s.click} show=${s.show}`);
console.log(`\ndeploys: ${deploys.length}`);
for (const d of deploys) console.log(`  ${d.dir}  push=${d.push ?? '-'} fcm_rota=${d.fcm_rota ?? '-'} cache=${d.cache ?? '-'} worker=${(d.worker_bytes ?? 0)}`);
console.log(`\nbuilds: ${builds.length}`);
for (const b of builds) console.log(`  ${b.arquivo}  refs=${b.refs_sw.join(' ')}  push_no_build=${b.menciona_push_handler}`);
