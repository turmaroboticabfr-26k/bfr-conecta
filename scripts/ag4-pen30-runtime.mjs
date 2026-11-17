// AG-4 (peça 3) — emissão real do handler da candidata v125, ao lado do base v123. Importa os dois
// workers e chama o fetch() com um env.ASSETS falso; o HTML que sai é o que o browser receberia.
// Sem deploy, sem rede, sem credencial: o que se mede é a string servida.
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { REPO, md5, conta, runtime } from './ag-lib.mjs';

// Este harness não lê credencial nenhuma: o c2-lib (que abre os ficheiros de chave ao importar) foi
// deliberadamente deixado de fora e o helper de portões é o mesmo, em miniatura.
const criarGates = () => {
  const falhas = []; let portoes = 0;
  return {
    gate(nome, dado, esperado) {
      portoes++;
      const ok = JSON.stringify(dado) === JSON.stringify(esperado);
      if (!ok) falhas.push(`${nome} | dado=${JSON.stringify(dado)} | esperado=${JSON.stringify(esperado)}`);
      console.log(`${ok ? 'VERDE' : 'VERMELHO'}  ${nome}`);
      return ok;
    },
    resumo() { return { portoes, falhas }; },
  };
};
const g = criarGates();
const REGISTO = join(REPO, runtime);
if (existsSync(REGISTO)) throw new Error(`já existe ${REGISTO} — renomeie com md5 dos dois lados, não por cima`);

const BUG = ".from('announcements').select('id,title,body,message_type,status,published_at,scheduled_at,created_at,important,meeting_id').order('created_at',{ascending:false}).limit(100)";
const FIX = ".from('announcements').select('id,title,body,message_type,status,published_at,scheduled_at,important,meeting_id').order('published_at',{ascending:false,nullsFirst:false}).limit(100)";

const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
const env = {
  ASSETS: {
    async fetch(req) {
      const u = new URL(req.url);
      if (u.pathname === '/' || u.pathname === '/index.html') return new Response('Not found', { status: 404 });
      if (u.pathname.endsWith('/nao-existe.txt')) return new Response('Not found', { status: 404 });
      return new Response(PDF, { status: 200, headers: { 'content-type': 'application/pdf' } });
    },
  },
};
const carregar = async (caminho) => (await import(pathToFileURL(caminho).href + '?bust=' + md5(caminho + Math.random()))).default;
const serve = async (mod, path) => {
  const res = await mod.fetch(new Request('https://alvo.test' + path), env, { waitUntil: () => {} });
  return { status: res.status, texto: await res.text(), cabecalhos: Object.fromEntries(res.headers) };
};

const out = { em: new Date().toISOString(), tarefa: 'AG-4 peça 3 — emissão do handler: base v123 × candidata v125, sem deploy', metodo: 'import do worker + env.ASSETS falso; o que se compara é a string servida' };
const base = await carregar(join(REPO, 'worker-deploy-v123-pdfs/worker.mjs'));
const cand = await carregar(join(REPO, 'bfr-candidata-v125-announcement-created-at/worker.mjs'));

const rotas = ['/', '/index.html'];
out.emissao = {};
for (const [q, mod] of [['base_v123', base], ['candidata_v125', cand]]) {
  const r = {};
  for (const p of rotas) {
    const s = await serve(mod, p);
    r[p] = { status: s.status, bytes: s.texto.length, md5: md5(s.texto), bug: conta(s.texto, BUG), fix: conta(s.texto, FIX), cabecalhos: s.cabecalhos };
  }
  out.emissao[q] = r;
}

for (const [q, r] of Object.entries(out.emissao)) {
  g.gate(`${q}: as duas rotas do shell servem 200`, Object.values(r).map((x) => x.status), [200, 200]);
  g.gate(`${q}: as duas rotas emitem o mesmo corpo`, Object.values(r).map((x) => x.md5).filter((v, i, a) => a.indexOf(v) === i).length, 1);
}
const corpoBase = out.emissao.base_v123['/'];
const corpoCand = out.emissao.candidata_v125['/'];
g.gate('base_emite_o_select_defeituoso_uma_vez', corpoBase.bug, 1);
g.gate('base_nao_emite_o_corrigido', corpoBase.fix, 0);
g.gate('candidata_emite_o_corrigido_uma_vez', corpoCand.fix, 1);
g.gate('candidata_nao_emite_o_defeituoso', corpoCand.bug, 0);
g.gate('a_unica_diferenca_e_o_delta_do_patch', corpoCand.bytes - corpoBase.bytes, FIX.length - BUG.length);
g.gate('o_shell_da_candidata_nao_e_o_publicado', corpoCand.md5 !== 'd418e7fc917f1fbb1437054b7b531f9b', true);
// Este patch é de corpo, não de cabeçalho: se os cabeçalhos mudaram, mexi em mais do que combinou.
const sBaseH = await serve(base, '/');
const sCandH = await serve(cand, '/');
g.gate('cabecalhos_do_shell_inalterados', sCandH.cabecalhos, sBaseH.cabecalhos);

// CONTROLE NEGATIVO: o detetor tem de apanhar o defeito quando ele está lá. Reescrevo a candidata de
// volta ao select defeituoso, num ficheiro FORA do repositório (a armadilha da vez anterior foi o
// harness escrever um worker de 3.5 MB dentro de evidence/), e re-medo a emissão.
const srcCand = readFileSync(join(REPO, 'bfr-candidata-v125-announcement-created-at/worker.mjs'), 'utf8');
const MUT = join(tmpdir(), 'ag4-pen30-mutante-negativo-17-11.mjs');
writeFileSync(MUT, srcCand.replace(FIX, BUG));
const mm = await serve(await carregar(MUT), '/');
out.controle_negativo = { ficheiro: MUT, bytes: mm.texto.length, md5: md5(mm.texto), bug: conta(mm.texto, BUG), fix: conta(mm.texto, FIX) };
g.gate('controle_negativo_o_detetor_apanha_o_defeito', [out.controle_negativo.bug, out.controle_negativo.fix], [1, 0]);
g.gate('controle_negativo_volta_ao_md5_do_base', out.controle_negativo.md5, corpoBase.md5);
unlinkSync(MUT);
writeFileSync(REGISTO, JSON.stringify(out, null, 2) + '\n');

const { portoes, falhas } = g.resumo();
for (const f of falhas) console.log('VERMELHO  ' + f);
console.log(`emissão base: ${corpoBase.bytes} B bug=${corpoBase.bug} · candidata: ${corpoCand.bytes} B fix=${corpoCand.fix} · mutante: bug=${out.controle_negativo.bug}`);
if (falhas.length === 0) { console.log(`AG4_RUNTIME_VERDE ${portoes} portões / 0 falhas · base_v123 × candidata_v125 · publicado=false`); process.exit(0); }
console.log(`AG4_RUNTIME_VERMELHA ${falhas.length} falha(s) de ${portoes} portões`);
process.exit(1);
