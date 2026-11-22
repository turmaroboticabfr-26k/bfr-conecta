#!/usr/bin/env node
// Medir se o modulo de apresentacao NO AR e, byte a byte, o remendo da candidata v137 (PEN-40).
// Porque existe: dois documentos de 20/11 afirmam que «a v137 nao foi publicada / o byte avaliado e a
// v136». Isso e uma afirmacao sobre o ar, e o ar avancou ate v142; antes de re-escrever a prosa tenho
// de medir o asset servido, nao concluir da cadeia de versoes.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = process.env.P118_SUF ? '-' + process.env.P118_SUF : '';
const OUT = join(REPO, `evidence/p118-modulo-no-ar-e-o-remendo-v137-21-11${SUF}.json`);
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com P118_SUF=novo');
const t0 = Date.now();
const md5 = (b) => createHash('md5').update(b).digest('hex');

const CAND = 'bfr-candidata-v137-remendo-pen40/bfr-responsive-presentation.js';
const BASE = 'bfr-responsive-presentation.js';
const candBuf = readFileSync(join(REPO, CAND));
const cert = JSON.parse(readFileSync(join(REPO, 'worker-deploy-v142-painel-na-troca/esperado-v142.json'), 'utf8'));

// O nome do asset le-se do proprio shell servido, nao se dactilografia: e a linha <script src=…> do
// modulo de apresentacao. Se o nome mudar, isto aborta em vez de medir outra coisa.
const url = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const shell = await (await fetch(url, { headers: { 'cache-control': 'no-cache' } })).text();
const m = /src="([^"]*bfr-responsive-presentation[^"]*)"/.exec(shell);
if (!m) throw new Error('ABORTA: o shell servido nao tem <script src> do modulo de apresentacao — a sonda nao tem alvo');
const assetUrl = new URL(m[1], url).href;
const r2 = await fetch(assetUrl, { headers: { 'cache-control': 'no-cache' } });
const arBuf = Buffer.from(await r2.arrayBuffer());

const out = {
  programa: 'scripts/p118-modulo-no-ar-e-o-remendo-v137.mjs',
  em: new Date().toISOString(), duracao_ms: Date.now() - t0,
  metodo: 'Fetch anonimo do shell; o nome do asset e lido do <script src> do proprio shell (nunca dactilografado); o bytes do asset servido confrontados com a saida versionada da candidata v137 e com o moduleMd5 do certificado da v142.',
  asset: { url: assetUrl, http: r2.status, bytes: arBuf.length, md5: md5(arBuf) },
  candidata_v137: { f: CAND, bytes: candBuf.length, md5: md5(candBuf) },
  certificado_v142: { moduleMd5: cert.moduleMd5, htmlMd5: cert.htmlMd5, cacheLabel: cert.cacheLabel },
  iguais: { ar_e_candidata_v137: md5(arBuf) === md5(candBuf), ar_e_moduleMd5_do_certificado: md5(arBuf) === cert.moduleMd5, candidata_e_certificado: md5(candBuf) === cert.moduleMd5 },
  o_que_nao_ve: 'Nao ve se o comportamento do ar corresponde ao remendo (isso e a corrida do ah2-mobile2 em P114); ve apenas identidade de bytes.',
};
out.veredito = (out.iguais.ar_e_candidata_v137 && out.iguais.ar_e_moduleMd5_do_certificado)
  ? 'P118_MODULO_NO_AR_E_O_REMENDO_V137_OK'
  : 'P118_MODULO_NO_AR_NAO_E_O_REMENDO — a prosa de 20/11 pode continuar certa';
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`asset=${out.asset.url}`);
console.log(`ar=${out.asset.md5}/${out.asset.bytes}B  v137=${out.candidata_v137.md5}/${out.candidata_v137.bytes}B  cert=${out.certificado_v142.moduleMd5}`);
console.log(`iguais=${JSON.stringify(out.iguais)}`);
console.log(`${out.veredito} · ${out.duracao_ms} ms · registo ${OUT}`);
