// Sonda so leitura dos DOS grafias de host candidates. Decide por medida, nao por olho
// nem por contagem de ocorrencias, qual delas serve de facto a aplicacao.
// Armadilha desta maquina: dns.resolve4 da ECONNREFUSED em ambos os hosts (o resolvedor
// direto esta bloqueado), o que NAO prova nada. O transporte provado e o fetch do rig HTTP.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import dns from 'node:dns/promises';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const diario = JSON.parse(fs.readFileSync(path.join(RAIZ, 'audit-publicacao-v120-404.json'), 'utf8'));
const réguaDoDiário = diario.medicao.ar_depois.ar;
const régua = JSON.parse(fs.readFileSync(path.join(RAIZ, 'worker-deploy-v121', 'esperado-v121.json'), 'utf8'));

const md5 = b => crypto.createHash('md5').update(b).digest('hex');
const hosts = [
  { grafia: 'com_o_do_diario', url: réguaDoDiário },
  { grafia: 'com_i_datilografado', url: réguaDoDiário.replace('turmaroboticabfr', 'turmarobiticabfr') },
];
if (hosts[0].url === hosts[1].url) throw new Error('as duas grafias colapsaram na mesma URL: sonda sem sentido');

const out = { qnd: new Date().toISOString(), script: 'v121-sonda-dois-hosts.mjs',
  regua: { url_do_diario: réguaDoDiário, shell_md5: régua.htmlMd5, shell_bytes: régua.htmlBytes,
           sw_md5: régua.swMd5, cache_label: régua.cacheLabel } };

for (const h of hosts) {
  const r = { url: h.url };
  const hostname = new URL(h.url).hostname;
  try { r.lookup = await dns.lookup(hostname, { all: true }); }
  catch (e) { r.lookup_erro = (e.code || '') + ' ' + e.message; }
  for (const caminho of ['/', '/sw-v4.js', '/rota-que-nao-existe-x']) {
    const s = {};
    try {
      const t0 = Date.now();
      const res = await fetch(h.url + caminho, { redirect: 'manual', signal: AbortSignal.timeout(20000) });
      const buf = Buffer.from(await res.arrayBuffer());
      s.status = res.status;
      s.bytes = buf.length;
      s.md5 = md5(buf);
      s.tipo = res.headers.get('content-type');
      if (caminho === '/') {
        const corpo = buf.toString('latin1');
        s.md5_igual_a_shell_v121 = s.md5 === régua.htmlMd5;
        s.par_education_supervisor = (corpo.match(/education_supervisor:\['/g) || []).length;
        s.chave_accountLabels = (corpo.match(/const accountLabels = \{/g) || []).length;
      }
      if (caminho === '/sw-v4.js') {
        s.etiqueta_cache = (/const CACHE\s*=\s*["']([^"']+)["']/.exec(buf.toString('latin1')) || [])[1] || null;
      }
      s.ms = Date.now() - t0;
    } catch (e) {
      s.erro = e.name + ': ' + (e.cause?.code || e.cause?.message || e.message);
    }
    r[caminho.slice(1) || 'raiz'] = s;
  }
  out[h.grafia] = r;
}

const certo = out.com_o_do_diario, errado = out.com_i_datilografado;
const serve_o_diario = certo.raiz?.md5_igual_a_shell_v121 === true;
const o_outro_nao_serve = !errado.raiz?.md5_igual_a_shell_v121;
out.veredito = serve_o_diario && o_outro_nao_serve
  ? 'V121_GRAFIA_DECIDIDA: serve o host do diario; o datilografado nao entrega a shell'
  : 'INDECISA: ler os campos';
fs.writeFileSync(path.join(RAIZ, 'evidence', 'v121-sonda-dois-hosts-14-11.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
process.exit(out.veredito.startsWith('V121_GRAFIA_DECIDIDA') ? 0 : 1);
