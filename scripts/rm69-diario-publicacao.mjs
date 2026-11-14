// RM-6.9 / PEN-27 — fecha o ciclo escrevendo o diário de publicação `audit-publicacao-v120-404.json`.
// Nada é dactilografado do ar: a URL e a versão anterior vêm de `audit-publicacao-v120.json`, os
// md5/bytes vêm do disco dos dois diretórios e os portões vêm dos quatro diários já emitidos.
// O único literal externo é o version_id novo, lido de `wrangler deployments status` (somente leitura).
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const md5 = (b) => createHash('md5').update(b).digest('hex');
const ler = (p) => JSON.parse(readFileSync(p, 'utf8'));
const bytesDe = (p) => { const b = readFileSync(p); return { bytes: b.length, md5: md5(b) }; };
const digest = (r) => Object.fromEntries(Object.entries(r).filter(([k]) => k !== 'texto'));

const antes = ler('evidence/rm69-antes-14-11.json');
const depois = ler('evidence/rm69-depois-14-11.json');
const cand = ler('evidence/rm69-candidata-14-11.json');
const chrome = ler('evidence/rm69-chrome-limpo-14-11.json');
const reg120 = ler('audit-publicacao-v120.json');

const BASE = 'worker-deploy-v120';
const ALVO = 'worker-deploy-v120-404';
const wBase = bytesDe(`${BASE}/worker.mjs`);
const wAlvo = bytesDe(`${ALVO}/worker.mjs`);
const tomlBase = bytesDe(`${BASE}/wrangler.toml`);
const tomlAlvo = bytesDe(`${ALVO}/wrangler.toml`);
const assetsAlvo = readdirSync(`${ALVO}/public`).sort();
const assetsBase = readdirSync(`${BASE}/public`).sort();
const assetsIguais = assetsAlvo.length === assetsBase.length
  && assetsAlvo.every((f, i) => f === assetsBase[i]
    && md5(readFileSync(`${ALVO}/public/${f}`)) === md5(readFileSync(`${BASE}/public/${f}`)));

const VERSION_NOVA = '9e921f95-52f8-494b-9e53-75eb6ad3eb72';
const CRIACAO_VERSAO = '2026-11-14T15:24:09.723Z';
const CRIACAO_DEPLOY = '2026-11-14T15:24:11.249Z';

const cinco_antes_do_500 = Object.entries(depois.rotas).filter(([p]) => antes.rotas[p].http === 500).map(([p]) => p);
const P = {};
const checa = (n, v, e) => { P[n] = { valor: v, esperado: e, passou: JSON.stringify(v) === JSON.stringify(e) }; };
checa('G1_url_vem_do_diario_v120', depois.ar, reg120.deploy.url);
checa('G2_anterior_e_a_v120_publicada', reg120.deploy.version_id, '8cad1145-a975-4fd6-8a7b-2fd4e9a4209c');
checa('G3_o_que_foi_publicado_e_a_candidata_gateada', wAlvo.md5, cand.ficheiros.candidata_worker_md5);
checa('G4_base_inalterada_no_disco', wBase.md5, cand.portoes.P1_base_e_a_do_diario.valor);
checa('G5_delta_de_bytes_bate_com_o_portao', wAlvo.bytes - wBase.bytes, cand.ficheiros.delta_bytes);
checa('G6_wrangler_toml_identico', tomlAlvo.md5, tomlBase.md5);
checa('G7_assets_identicos_a_base', assetsIguais, true);
checa('G8_antes_medido_verde', `${antes.veredito} ${antes.total.verde}/${antes.total.vermelho}`, 'RM69_ANTES_MEDIDO 9/0');
checa('G9_depois_verde', `${depois.veredito} ${depois.total.verde}/${depois.total.vermelho}`, 'RM69_DEPOIS_VERDE 9/0');
checa('G10_candidata_22_0', `${cand.veredito} ${cand.total.ok}/${cand.total.falha}`, 'RM69_CANDIDATA_PRONTA_NAO_PUBLICADA 22/0');
checa('G11_chrome_limpo_6_0', `${chrome.veredito} ${chrome.total.verde}/${chrome.total.vermelho}`, 'RM69_CHROME_LIMPO_VERDE 6/0');
const shell_v120 = reg120.md5.shell_depois.split(' ')[0];
const sw_v120 = reg120.md5.sw_depois.split(' ')[0];
const md5DoCorpo404 = md5(Buffer.from('Not found', 'utf8'));
const quarenta_e_quatro = Object.values(depois.rotas).filter((r) => r.http === 404);
checa('G12_shell_igual_ao_da_v120', [antes.shell_servido.md5, depois.shell_servido.md5], [shell_v120, shell_v120]);
checa('G13_sw_igual_ao_da_v120', [antes.sw_servido.md5, depois.sw_servido.md5], [sw_v120, sw_v120]);
checa('G14_os_500_de_antes_viraram_404', cinco_antes_do_500.map((p) => `${p}=${depois.rotas[p].http}`),
  cinco_antes_do_500.map((p) => `${p}=404`));
checa('G14b_sao_cinco_caminhos_fora_do_bundle', cinco_antes_do_500.length, 5);
checa('G15_404_e_text_plain_de_9_bytes', [...new Set(quarenta_e_quatro.map((r) => `${r.ct} ${r.bytes} B`))],
  ['text/plain; charset=utf-8 9 B']);
checa('G15b_corpo_do_404_e_a_string_do_codigo', [...new Set(quarenta_e_quatro.map((r) => r.md5))], [md5DoCorpo404]);
checa('G16_nenhum_asset_regrediu', depois.assets.filter((a) => a.http !== 200).length, 0);
checa('G17_console_do_cliente_sem_500', chrome.console.nenhum_500_no_console, true);

const total = { verde: Object.values(P).filter((x) => x.passou).length, vermelho: Object.values(P).filter((x) => !x.passou).length };

const out = {
  version: 'v120-404',
  data: '2026-11-14',
  ok_literal: 'publicar a candidata v120-404',
  escopo_do_ok: 'somente este deploy do Worker bfr-conecta; não cobre publicar a candidata de cliente v121, nem aplicar o SQL do RM-6.8, nem o reparo RM-1.5 do push',
  tarefa: 'RM-6.9 / PEN-27 — caminhos fora do bundle devem dar 404, não 500',
  deploy: {
    worker: 'bfr-conecta',
    conta: 'turmaroboticabfr@gmail.com',
    version_id: VERSION_NOVA,
    version_anterior: reg120.deploy.version_id,
    deployment_created: CRIACAO_DEPLOY,
    version_created: CRIACAO_VERSAO,
    percentual_trafego_novo: 100,
    wrangler: '4.154.0',
    cwd: ALVO,
    url: reg120.deploy.url,
    stdout: 'Uploaded bfr-conecta | No updated asset files to upload | Deployed bfr-conecta triggers',
    fonte_dos_numeros: 'stdout do wrangler deploy na conversa + `npx --yes wrangler@4.154.0 deployments status` (somente leitura) re-emitido em 14/11 antes de escrever este diário',
    comando_da_url: 'derivado de audit-publicacao-v120.json -> deploy.url, nunca dactilografado',
    aviso_de_ferramenta: 'wrangler 4.156+ quebra o upload de assets com o erro 100312; a versão continua fixada em 4.154.0 e resolvida do cache do npx',
  },
  correcao: {
    pendencia: 'PEN-27 / RM-6.9 (achado RM13-A2 da medição de 12/11)',
    problema: 'todo caminho que não estava nas 4 rotas fixas nem nos 12 assets do bundle respondia 500 com 4.720 B de HTML do erro do Cloudflare, em vez de 404',
    causa: 'o handler passava STRING (`assetUrl`) ao `env.ASSETS.fetch()`; o runtime recusa (`The first argument to ASSETS.fetch must be a Request or URL object`) e a exceção escapava antes do fallback, virando 1101/500',
    solucao: `o bloco de ${cand.portoes.P2_bloco_alvo_e_o_lido_na_base.valor.bytes} B (md5 ${cand.portoes.P2_bloco_alvo_e_o_lido_na_base.valor.md5}) passou a chamar \`await env.ASSETS.fetch(request)\` com o Request e, se o asset devolver 404, a responder \`new Response("Not found", { status: 404, headers: NOFOUNDR })\` com text/plain e nosniff/HSTS/no-store; sem ASSETS ligado, o mesmo 404`,
    alcance_medido: `delta de ${wAlvo.bytes - wBase.bytes} bytes no worker.mjs, exatamente 5 linhas alteradas; CSP, HTML e SW byte-identicos ao v120 (P5/P5b/P5c do diário da candidata) e os 12 assets idênticos ao diretório base (G7)`,
    o_que_NAO_foi_alterado: `nenhum byte do shell (${shell_v120}…) nem do service worker (${sw_v120}…); nenhuma rota de API; o \`/firebase-messaging-sw.js\` continua a não existir — criar a rota é decisão do RM-1.5, não daqui`,
  },
  md5: {
    'worker-deploy-v120/worker.mjs_base': `${wBase.md5} (${wBase.bytes} B)`,
    'worker-deploy-v120-404/worker.mjs_publicado': `${wAlvo.md5} (${wAlvo.bytes} B)`,
    'wrangler_toml_base': `${tomlBase.md5} (${tomlBase.bytes} B)`,
    'wrangler_toml_publicado': `${tomlAlvo.md5} (${tomlAlvo.bytes} B)`,
    'shell_antes_e_depois': `${depois.shell_servido.md5} (${depois.shell_servido.bytes} B) — inalterado`,
    'sw_antes_e_depois': `${depois.sw_servido.md5} (${depois.sw_servido.bytes} B, CACHE ${depois.sw_servido.cache}) — inalterado`,
    'manifest_json': `${depois.rotas['/manifest.json'].md5} (${depois.rotas['/manifest.json'].bytes} B)`,
    'corpo_do_404': `${quarenta_e_quatro[0].md5} (${quarenta_e_quatro[0].bytes} B "Not found")`,
    emissao: 'md5 e bytes recalculados do disco por este script, e os md5 servidos vindos dos diários rm69-antes/rm69-depois, re-emitidos em 14/11',
  },
  medicao: {
    metodo: `as tabelas abaixo são o digest {http, ct, bytes, md5, csp} de cada sonda; o corpo_response cru só vive nos diários de origem (evidence/rm69-antes-14-11.json e -depois-14-11.json), que juntos pesam 14 MB porque duas sondas servem o shell de ${antes.rotas['/'].bytes} B — duplicá-los aqui seria copiar evidência, não medi-la`,
    ar_antes: { em: antes.em, veredito: antes.veredito, total: antes.total, ar: antes.ar, rotas: Object.fromEntries(Object.entries(antes.rotas).map(([p, r]) => [p, digest(r)])) },
    ar_depois: { em: depois.em, veredito: depois.veredito, total: depois.total, ar: depois.ar, rotas: Object.fromEntries(Object.entries(depois.rotas).map(([p, r]) => [p, digest(r)])) },
    delta_por_rota: Object.entries(depois.rotas).map(([p, r]) => ({
      rota: p, antes: `${antes.rotas[p].http} ${antes.rotas[p].ct} ${antes.rotas[p].bytes} B`,
      depois: `${r.http} ${r.ct} ${r.bytes} B`, mudou: antes.rotas[p].http !== r.http,
    })),
    candidata_offline: { em: cand.em, veredito: cand.veredito, total: cand.total,
      censo: cand.censo, metodos: 'node:http local com um mock de ASSETS.fetch que valida o tipo do argumento, como o runtime' },
    chrome_limpo: { em: chrome.em, veredito: chrome.veredito, total: chrome.total,
      boot: chrome.boot, console: chrome.console, probes: chrome.probes_no_mesmo_contexto_com_sw_controlando },
  },
  portoes: {
    candidata_offline: `${cand.total.ok}/${cand.total.falha} VERDE - evidence/rm69-candidata-14-11.json (${cand.veredito})`,
    http_antes: `${antes.total.verde}/${antes.total.vermelho} VERDE - evidence/rm69-antes-14-11.json (${antes.veredito})`,
    http_depois: `${depois.total.verde}/${depois.total.vermelho} VERDE - evidence/rm69-depois-14-11.json (${depois.veredito})`,
    chrome_limpo: `${chrome.total.verde}/${chrome.total.vermelho} VERDE - evidence/rm69-chrome-limpo-14-11.json (${chrome.veredito})`,
    deste_diario: `${total.verde}/${total.vermelho}`,
    total_da_cadeia: cand.total.ok + antes.total.verde + depois.total.verde + chrome.total.verde + total.verde,
    vermelhos: cand.total.falha + antes.total.vermelho + depois.total.vermelho + chrome.total.vermelho + total.vermelho,
    falhas_deste_diario: P,
  },
  o_que_NAO_foi_provado: [
    'push exibido no aparelho: o `/sw-v4.js?v=45` registrado continua sem ouvinte `push` nem `notificationclick` (RM13-A1). RM-6.9 só trocou o 500 pelo 404 na rota; o conserto do recetor é o RM-1.5, tarefa #1144, e precisa de OK próprio',
    'nenhuma conta autenticada foi usada: a prova de cliente é a banda de login',
    'deep link SPA: `/aluno` agora dá 404 em vez de servir o shell — é o comportamento correto de um caminho fora do bundle, mas significa que o Worker não faz fallback de rota para o cliente; decisão de produto registrada como PEN nova',
    '0 DDL, 0 escrita em banco, 0 mint, 0 deploy de EdgeFunction nesta passada',
  ],
  reversao: {
    como: `wrangler deploy a partir de ${BASE} (worker ${wBase.bytes} B md5 ${wBase.md5}), que continua intacto no disco`,
    volta_para: `version_id ${reg120.deploy.version_id} (a v120 de 13/11 06:49:57Z)`,
    prova_de_linhagem: 'o único ficheiro alterado é worker.mjs; os 12 assets e o wrangler.toml são byte-idênticos nos dois diretórios (G6/G7), logo reverter não move asset nenhum',
    exige: 'OK literal novo do usuário',
  },
};
out.diario_de = 'este ficheiro é gerado por scripts/rm69-diario-publicacao.mjs a partir de audit-publicacao-v120.json e dos quatro diários evidence/rm69-*.json';
writeFileSync('audit-publicacao-v120-404.json', JSON.stringify(out, null, 2));
for (const [k, v] of Object.entries(P)) console.log(`${v.passou ? 'OK   ' : 'FALHA'} ${k} valor=${JSON.stringify(v.valor)}`);
console.log(`\ntotal_da_cadeia=${out.portoes.total_da_cadeia} vermelhos=${out.portoes.vermelhos} deste_diario=${total.verde}/${total.vermelho}`);
console.log(`worker publicado ${wAlvo.bytes} B md5 ${wAlvo.md5} | base ${wBase.bytes} B md5 ${wBase.md5} | delta ${wAlvo.bytes - wBase.bytes}`);
console.log(`-> audit-publicacao-v120-404.json`);
process.exit(total.vermelho ? 1 : 0);
