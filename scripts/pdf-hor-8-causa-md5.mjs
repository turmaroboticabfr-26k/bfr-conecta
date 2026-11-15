// PDF-HOR-8 — atribuição de causa para o md5 divergente citado em §V.11(d).
// §V.11(d) escreveu 98b33ea0… para o corpo falso de 1.477.823 B; o diário v121-pos-deploy-http
// mede 954621f2… no disco E no ar. Este script não escolhe: hashing exhaustive de tudo o que
// se chama horario-* em worker-deploy-*/ e das duas fontes registadas, mais hipóteses mecânicas.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const md5 = b => crypto.createHash('md5').update(b).digest('hex');
const CITA = '98b33ea011b64103c67c28bc220c299c';
const DIARIO = '954621f29537a9be136c0bd9180e8aa3';

const achados = [];
const bundles = fs.readdirSync(dir).filter(d => /^worker-deploy-v/.test(d));
for (const b of bundles) {
  const p = path.join(dir, b, 'public');
  if (!fs.existsSync(p)) continue;
  for (const f of fs.readdirSync(p).filter(x => /^horario-/.test(x))) {
    const buf = fs.readFileSync(path.join(p, f));
    achados.push({ objeto: `${b}/public/${f}`, bytes: buf.length, md5: md5(buf) });
  }
}

// hipóteses mecânicas sobre o corpo falso medido no bundle da v122 (a base deste ciclo)
const bufFalso = fs.readFileSync(path.join(dir, 'worker-deploy-v122-push/public/horario-matutino-2026.pdf'));
const hip = {
  md5_corpo: md5(bufFalso),
  md5_hexstring_do_corpo: md5(Buffer.from(bufFalso.toString('hex'), 'utf8')),
  md5_primeiros_1MB: md5(bufFalso.subarray(0, 1048576)),
  md5_sem_os_ultimos_1KB: md5(bufFalso.subarray(0, bufFalso.length - 1024)),
  md5_corpo_e_newline: md5(Buffer.concat([bufFalso, Buffer.from('\n', 'utf8')])),
  md5_utf8_reconvertido: md5(Buffer.from(bufFalso.toString('utf8'), 'utf8')),
  sha256_truncado_32hex: crypto.createHash('sha256').update(bufFalso).digest('hex').slice(0, 32),
  md5_do_primeiro_bloco_4096: md5(bufFalso.subarray(0, 4096)),
};

// as duas fontes registadas nos diários, lidas dos ficheiros e não da memória
const sonda = JSON.parse(fs.readFileSync(path.join(dir, 'evidence/pdf-hor-sonda-15-11.json'), 'utf8'));
const v121 = JSON.parse(fs.readFileSync(path.join(dir, 'evidence/v121-pos-deploy-http-14-11.json'), 'utf8'));
const esperado = JSON.parse(fs.readFileSync(path.join(dir, 'worker-deploy-v123-pdfs/esperado-v123.json'), 'utf8'));

const reg = {
  sonda_miudo_falso: (sonda.medidos || sonda.assets || []).filter
    ? JSON.stringify(sonda).match(/"md5":"[0-9a-f]{32}","bytes":1477823|"bytes":1477823,"md5":"[0-9a-f]{32}"/g)
    : null,
  v121_A4_quem_tem_1477823: (v121.A4_assets || []).filter(a => a.bytes === 1477823 || a.local_bytes === 1477823)
    .map(a => ({ caminho: a.caminho || a.path || a.nome, local_md5: a.local_md5, servido_md5: a.servido_md5 })),
  esperado_miudoFalso: esperado.miudoFalso,
};

const out = {
  ciclo: 'PDF-HOR-8-CAUSA-MD5', em: new Date().toISOString(), escrita: 0,
  regra: 'o 98b33ea0… de §V.11(d) contra tudo o que se chama horario-* em worker-deploy-*/public, '
    + 'mais 8 hipóteses mecânicas sobre o corpo falso',
  copidas: achados.length,
  md5s_distintos: [...new Set(achados.map(a => a.md5))],
  alguma_copias_dao_98b33ea0: achados.some(a => a.md5 === CITA),
  alguma_copias_dao_954621f2: achados.filter(a => a.md5 === DIARIO).length,
  copias_por_md5: achados.reduce((m, a) => (m[a.md5] = (m[a.md5] || 0) + 1, m), {}),
  achados, hipoteses: hip, registos: reg,
};

out.veredito = (out.alguma_copias_dao_98b33ea0 || Object.values(hip).includes(CITA))
  ? 'PDF_HOR_8_98b33ea0_ATRIBUIDO'
  : 'PDF_HOR_8_98b33ea0_SEM_FONTE_EM_DISCO';
fs.writeFileSync(path.join(dir, 'evidence/pdf-hor-8-causa-md5-15-11.json'), JSON.stringify(out, null, 2));
console.log(`veredito=${out.veredito} copias=${out.copidas} distintos=${out.md5s_distintos.length} `
  + `954621f2_em=${out.alguma_copias_dao_954621f2} 98b33ea0_em=${out.alguma_copias_dao_98b33ea0}`);
console.log('hipoteses: ' + Object.entries(hip).map(([k, v]) => `${k}=${String(v).slice(0, 12)}…`).join(' | '));
console.log('v121_1477823: ' + JSON.stringify(reg.v121_A4_quem_tem_1477823));
