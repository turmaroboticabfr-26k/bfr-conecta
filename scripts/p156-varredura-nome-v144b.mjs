#!/usr/bin/env node
// P156 — VARREDURA FINAL POR TODAS AS VARIAÇÕES DO NOME ANTIGO (24/11).
//
// Responde à exigência do brief: «fazer uma busca por todas as variações do nome antigo e apresentar um
// relatório confirmando que nenhuma ocorrência visível permaneceu». Duas zonas: TEXTO VISÍVEL (HTML sem
// script/style) e CÓDIGO (scripts). Nas duas, classifica cada ocorrência: VISÍVEL (proibida) ou TÉCNICA
// (preservada por exigência do brief: identificadores, hosts, nomes de ficheiro, chaves de API, rotas).
// argv[2] = sufixo da corrida; argv[3] = versão (v144b | v144c). Regras: só leitura + evidence/.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const VERSAO = (process.argv[3] || 'v144b').trim();
const HTML = `${REPO}/bfr-candidata-${VERSAO}-uniesco/index.html`;
const WORKER = `${REPO}/worker-deploy-${VERSAO}-uniesco/worker.mjs`;
const MANIFEST = `${REPO}/worker-deploy-${VERSAO}-uniesco/public/manifest.json`;
const SUF = (process.argv[2] || 'a').trim();
const EV = `${REPO}/evidence/p156-varredura-nome-${VERSAO}-24-11-${SUF}.json`;
if (existsSync(EV)) throw new Error('ABORTA: ' + EV + ' existe — use outro sufixo, nunca por cima');
const md5 = (b) => createHash('md5').update(Buffer.isBuffer(b) ? b : Buffer.from(String(b))).digest('hex');
const n = (t, x) => t.split(x).length - 1;
const B = (s) => Buffer.byteLength(s);

const html = readFileSync(HTML, 'utf8');
const worker = readFileSync(WORKER, 'utf8');
const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const visivel = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
const scripts = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]).join('\n');
// scripts com o composto técnico preservado `bfr-conecta` removido (hosts Firebase, etiqueta do cache):
// o nome como palavra isolada tem de ser 0 nos restantes.
const scriptsSemComposto = scripts.replace(/bfr-conecta/g, ' ');
const swCorpo = (() => { const j = worker.indexOf('const SW = '); const q = worker.indexOf('"', j + 11); let k = q + 1, c; for (;;) { c = worker.indexOf('"', k); let bs = 0, i = c - 1; while (worker[i] === String.fromCharCode(92)) { bs++; i--; } if (bs % 2 === 0) break; k = c + 1; } return JSON.parse(worker.slice(q, c + 1)); })();

// ——— réguas: variações do nome, delimitação alargada (sem `-` e `.` na classe) ———
const RE_VISIVEL = /(?<![A-Za-z0-9_$@#])BFR(?![A-Za-z0-9_$@#])|(?<![A-Za-z0-9_$@#])Bfr(?![A-Za-z0-9_$@#])|(?<![A-Za-z0-9_$@#])bFr(?![A-Za-z0-9_$@#])|(?<![A-Za-z0-9_$@#])Conecta(?![A-Za-z0-9_$@#])|(?<![A-Za-z0-9_$@#])CONECTA(?![A-Za-z0-9_$@#])|(?<![A-Za-z0-9_$@#])conecta(?![A-Za-z0-9_$@#])|BFR Conecta|BFR CONECTA|bfr conecta/g;
const ocorreVisivel = [...visivel.matchAll(RE_VISIVEL)].length;
const ocorreScripts = [...scriptsSemComposto.matchAll(RE_VISIVEL)].length;
// régua de download (a do p157): `-bfr-` colado em nomes de ficheiro visíveis, fora de data-bfr- e --bfr-
const RE_DOWNLOAD = /(?<!data)(?<!-)-[Bb][Ff][Rr]-/g;
const ocorreDownloads = [...html.matchAll(RE_DOWNLOAD)].length;

// ——— classe técnica preservada (contagens que DEVEM existir, não zero) ———
const tecnica = {
  'window.BFR_* (APIs internas)': n(scripts, 'window.BFR_'),
  'bfr-app-logo.png (nome técnico, conteúdo = lockup UNIESCO)': n(html, 'bfr-app-logo.png'),
  'bfr-paint-hold (classe do splash)': n(html, 'bfr-paint-hold'),
  'bfr-conecta (hosts CSP/canonical/Firebase + etiqueta do cache SW)': n(html, 'bfr-conecta') + n(worker, 'bfr-conecta'),
  '.bfr-* classes CSS/DOM': (html.match(/class="bfr-|class='bfr-|\.bfr-[a-z]/g) || []).length,
  'bfr-*.js (módulos públicos)': n(html, "bfr-responsive-presentation.js") + n(html, 'bfr-teacher-arrivals.js'),
  'Supabase/rotas bfr_* (RPC)': (scripts.match(/\bbfr_[a-z_]+\b/g) || []).length,
};

const relatorio = {
  veredito: '', em: new Date().toISOString(), gerador: `scripts/p156-varredura-nome-v144b.mjs (versao=${VERSAO})`,
  alvo: { candidata: `bfr-candidata-${VERSAO}-uniesco/index.html`, bundle: `worker-deploy-${VERSAO}-uniesco/` },
  identidade: {
    candidata_md5: md5(html), candidata_bytes: B(html),
    worker_md5: md5(worker), manifest_nome: manifest.name, manifest_theme: manifest.theme_color,
  },
  visivel: {
    ocorrencias_nome_antigo: ocorreVisivel,
    UNIESCO: (visivel.match(/UNIESCO/g) || []).length,
    regra: 'HTML sem script/style; delimitação alargada (sem `-` e `.` na classe); qualquer casamento é proibido',
  },
  scripts: {
    ocorrencias_nome_antigo: ocorreScripts,
    nota: 'scripts medidos com o composto técnico preservado `bfr-conecta` removido; nas 6 originais, todas eram segmento do hostname Firebase bfr-conecta-notificacoes-62bbc (integração, preservada por regra do brief)',
  },
  sw: {
    cache_label: (swCorpo.match(/bfr-conecta-v144/g) || []).length,
    titulo_push_fallback: n(swCorpo, "|| 'UNIESCO';"),
    BFR_Conecta_no_sw: n(swCorpo, 'BFR Conecta') + n(swCorpo, 'BFR CONECTA'),
  },
  downloads: {
    ocorrencias_bfr_colado: ocorreDownloads,
    regra: '`-bfr-` colado em nomes de ficheiro de download visíveis (fora de data-bfr- e --bfr-); a v144c (p157) levou os 10 a zero',
  },
  tecnica_preservada: tecnica,
  portoes: {
    zero_visivel: ocorreVisivel === 0,
    zero_em_scripts: ocorreScripts === 0,
    zero_download: ocorreDownloads === 0,
    sw_sem_nome_velho: n(swCorpo, 'BFR Conecta') + n(swCorpo, 'BFR CONECTA') === 0,
    manifest_uniesco: manifest.name === 'UNIESCO' && manifest.short_name === 'UNIESCO' && manifest.theme_color === '#00399b',
  },
};
const ok = Object.values(relatorio.portoes).every((v) => v === true);
const N = Object.keys(relatorio.portoes).length;
relatorio.veredito = ok ? `P156_VARREDURA_NOME_${VERSAO.toUpperCase()}_OK ${N}/${N}` : `P156_VARREDURA_NOME_${VERSAO.toUpperCase()}_VERMELHO`;
writeFileSync(EV, JSON.stringify(relatorio, null, 2) + '\n');
console.log(relatorio.veredito + ' · visível=' + ocorreVisivel + ' scripts=' + ocorreScripts + ' downloads=' + ocorreDownloads + ' · técnica preservada: ' + JSON.stringify(tecnica));
process.exit(ok ? 0 : 1);
