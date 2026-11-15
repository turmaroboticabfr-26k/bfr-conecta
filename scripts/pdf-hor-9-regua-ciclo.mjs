// PDF-HOR-9 — régua do ciclo PDF-HOR: colhe de cada diário, sem memória, os números que §Z cita.
// Cada script deste ciclo gravou as suas contagens com um nome de chave diferente ({total,falhas},
// portoes+vermelhos, totais{portoes,vermelhos}, portoes + portoesDetalhados{passou}); a régua lê
// as formas em vez de as assumir, e aborta se alguma linha ficar sem número.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(path.join(dir, p), 'utf8');
const md5 = b => crypto.createHash('md5').update(b).digest('hex');
const J = p => JSON.parse(read(p));

// nenhuma destas linhas sabe à partida onde o autor anterior pôs o par (portões, vermelhos)
const lida = o => {
  if (Number.isInteger(o.portoes) && Number.isInteger(o.vermelhos)) return { portoes: o.portoes, vermelhos: o.vermelhos };
  if (Number.isInteger(o.totais?.portoes)) return { portoes: o.totais.portoes, vermelhos: o.totais.vermelhos };
  if (Number.isInteger(o.portoes?.total)) return { portoes: o.portoes.total, vermelhos: o.portoes.falhas };
  const d = o.portoesDetalhados;
  if (d && typeof d === 'object') {
    const v = Object.values(d);
    return { portoes: v.length, vermelhos: v.filter(x => !x?.passou).length };
  }
  return null;
};

const linhas = [
  { diário: 'evidence/pdf-hor-1-preflight-15-11.json', nome: 'PDF-HOR-1 preflight da candidata' },
  { diário: 'worker-deploy-v123-pdfs/esperado-v123.json', nome: 'gerador do bundle v123' },
  { diário: 'evidence/pdf-hor-3-preflight-v123-15-11.json', nome: 'PDF-HOR-3 preflight do bundle' },
  { diário: 'evidence/pdf-hor-5-pos-deploy-v123-15-11.json', nome: 'PDF-HOR-5 camada 1 (Worker)' },
  { diário: 'evidence/pdf-hor-7-prova-cliente-v2-15-11.json', nome: 'PDF-HOR-7 camada 2 (navegador)' },
].map(l => {
  const o = J(l.diário);
  const c = lida(o);
  if (!c) { console.error('ABORTO: sem contagens em ' + l.diário); process.exit(1); }
  return { ...l, em: o.em, veredito: o.veredito, ...c, falhas: o.totais?.falhas ?? o.falhas ?? null };
});

const p1 = J('evidence/pdf-hor-1-preflight-15-11.json');
const c1 = J('evidence/pdf-hor-5-pos-deploy-v123-15-11.json');
const c2 = J('evidence/pdf-hor-7-prova-cliente-v2-15-11.json');
const esp = J('worker-deploy-v123-pdfs/esperado-v123.json');
const cd = J('bfr-candidata-v122-horarios-pdf/portoes-horarios-pdf-diary.json');
const stdout = read('evidence/pdf-hor-4-deploy-v123-stdout-15-11.txt');

const soma = linhas.reduce((a, l) => ({ portoes: a.portoes + l.portoes, vermelhos: a.vermelhos + l.vermelhos }),
  { portoes: 0, vermelhos: 0 });

const v = stdout.match(/Current Version ID:\s*([0-9a-f-]{36})/i);
const u = stdout.match(/Success! Uploaded (\d+) files \((\d+) already uploaded\)/);
const w = fs.readFileSync(path.join(dir, 'worker-deploy-v123-pdfs/worker.mjs'));
const rv = fs.readFileSync(path.join(dir, 'worker-deploy-v123-pdfs/sw-v122-embed.js'));

const out = {
  ciclo: 'PDF-HOR-9-REGUA-CICLO', em: new Date().toISOString(), escrita_em_banco: 0, deploy: 0, mint: 0,
  ok_literal: esp.ok_literal,
  origem: 'todos os números abaixo vêm destes cinco diários; nenhum foi escrito de memória',
  linhas, soma,
  candidata: { diário: 'bfr-candidata-v122-horarios-pdf/portoes-horarios-pdf-diary.json', em: cd.em,
    porta_ok: cd.porta_ok, nao_sobrescreve: cd.nao_sobrescreve, alvos: cd.alvos },
  deploy_stdout: { diário: 'evidence/pdf-hor-4-deploy-v123-stdout-15-11.txt',
    em_mtime: fs.statSync(path.join(dir, 'evidence/pdf-hor-4-deploy-v123-stdout-15-11.txt')).mtime.toISOString(),
    version_id: v ? v[1] : null, upload: u ? { reenviados: +u[1], ja_enviados: +u[2] } : null },
  ar: { url: c1.reguas?.url, versao: c1.reguas?.versao_deploy, rotulo: esp.cacheLabel,
    tentativas_de_propagacao: c1.tentativas_de_propagacao },
  disco: { worker_md5: md5(w), worker_bytes: w.length, igual_a_regra: md5(w) === esp.workerMd5,
    sw_reversao_md5: md5(rv), sw_reversao_bytes: rv.length,
    assets: fs.readdirSync(path.join(dir, 'worker-deploy-v123-pdfs/public')).length },
  cliente: { cache_antes: c2.pagina.cache_antes_keys, cache_depois: c2.pagina.cache_depois_keys,
    veredito_camada1: c1.veredito, veredito_camada2: c2.veredito },
  miudo_falso: { citado_em_V_11_d: '98b33ea011b64103c67c28bc220c299c',
    medido_neste_ciclo: esp.miudoFalso,
    medido_em_dois_diarios: [p1.detalhe.find(d => d.id === 'ar_matutino_igual_ar_vespertino_defeito_presente_no_ar')?.medido,
      c1.pdfs_no_ar?.find?.(x => x.md5 === esp.miudoFalso?.md5) || null],
    varredura_de_causa: 'evidence/pdf-hor-8-causa-md5-15-11.json' },
};
out.veredito = (soma.vermelhos === 0 && out.disco.igual_a_regra && out.deploy_stdout.version_id
  && out.miudo_falso.medido_neste_ciclo?.md5 === p1.detalhe[1].medido.matutino)
  ? 'PDF_HOR_9_REGUA_OK' : 'PDF_HOR_9_REGUA_VERMELHA';
fs.writeFileSync(path.join(dir, 'evidence/pdf-hor-9-regua-ciclo-15-11.json'), JSON.stringify(out, null, 2));

for (const l of linhas) console.log(`${l.nome} | ${l.em} | ${l.veredito} | ${l.portoes}/${l.vermelhos}`
  + (l.falhas?.length ? ' FALHAS=' + JSON.stringify(l.falhas) : ''));
console.log(`SOMA portoes=${soma.portoes} vermelhos=${soma.vermelhos} | versao=${out.deploy_stdout.version_id} `
  + `| reenviados=${out.deploy_stdout.upload?.reenviados} ja_enviados=${out.deploy_stdout.upload?.ja_enviados} `
  + `| url=${out.ar.url} | veredito=${out.veredito}`);
