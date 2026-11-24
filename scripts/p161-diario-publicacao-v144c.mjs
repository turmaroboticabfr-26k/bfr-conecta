#!/usr/bin/env node
// P161 — DIARIO DA PUBLICACAO v144c (24/11).
// Este ficheiro nao publica nada: monta `audit-publicacao-v144.json` so com numeros LIDOS dos artefactos da
// cadeia (p151/p152/p154/p155/p157/p158 candidatas e bundles, p153 prova local, p156 varredura, p159 preflight,
// p160 pos-deploy, stdout do wrangler, status/list do Cloudflare) e do esperado-v144c. Aborta se alguma peca
// nao estiver verde ou se o artefacto ja existir. Regras: 0 DDL, 0 escrita no banco, 0 deploy, 0 push, 0 publicacao.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SAIDA = `${REPO}/audit-publicacao-v144.json`;
const TXT = `${REPO}/audit-publicacao-v144.txt`;
if ([SAIDA, TXT].some((f) => existsSync(f))) throw new Error('ABORTA: o diario v144 ja existe — nunca se sobrescreve');
const md5 = (b) => createHash('md5').update(Buffer.from(String(b))).digest('hex');
const rd = (p) => JSON.parse(readFileSync(`${REPO}/${p}`, 'utf8'));

const ESP144C = rd('worker-deploy-v144c-uniesco/esperado-v144c.json');
const D142 = rd('audit-publicacao-v142.json');
const P151 = rd('evidence/p151-gera-candidata-v144-24-11-c.json');
const P152 = rd('evidence/p152-gera-bundle-v144-24-11-a.json');
const P154 = rd('evidence/p154-deriva-v144b-24-11-b.json');
const P155 = rd('evidence/p155-gera-bundle-v144b-24-11-b.json');
const P157 = rd('evidence/p157-deriva-v144c-24-11-b.json');
const P158 = rd('evidence/p158-gera-bundle-v144c-24-11-a.json');
const P153 = rd('evidence/p153-prova-local-v144c-24-11-a.json');
const P156 = rd('evidence/p156-varredura-nome-v144c-24-11-a.json');
const P159 = rd('evidence/p159-preflight-v144c-24-11-a.json');
const P160 = rd('evidence/p160-pos-deploy-v144c-24-11-b.json');
const STDOUT = readFileSync(`${REPO}/evidence/v144c-deploy-stdout-24-11.txt`, 'utf8');
const ST = rd('evidence/v144c-deployments-status-depois-24-11.json');
const LD = rd('evidence/v144c-deployments-list-depois-24-11.json');
const VER = (/Current Version ID:\s*([0-9a-f-]{36})/.exec(STDOUT) || [])[1];
if (!VER) throw new Error('ABORTA: sem version id no stdout do deploy — o diario nao poderia nomear a versao');
const porData = [...LD].sort((a, b) => String(b.created_on).localeCompare(String(a.created_on)));
if (porData.length < 2) throw new Error('ABORTA: ' + porData.length + ' registos na lista de deployments — sem cadeia de reversao');

const falhas = [];
const g = (nome, cond, dado) => { const v = cond === true; if (!v) falhas.push(nome + ' | ' + JSON.stringify(dado).slice(0, 400)); console.log(`${v ? 'VERDE' : 'VERMELHO'}  ${nome}`); };
g('D1_candidata_v144c_derivada_verde', P157.veredito === 'P157_DERIVA_V144C_OK 7/0' && P157.destino.md5 === ESP144C.htmlMd5, { veredito: P157.veredito, destino: P157.destino && P157.destino.md5, html_certificado: ESP144C.htmlMd5 });
g('D2_bundle_verde_e_o_mesmo_worker_registrado', P158.veredito === 'P158_BUNDLE_V144C_OK 18/0' && P158.publicado === false && ESP144C.workerMd5 === P158.esperado.workerMd5 && ESP144C.htmlMd5 === P158.esperado.htmlMd5, { p158: P158.veredito, publicado: P158.publicado, esperado_worker: ESP144C.workerMd5, p158_worker: P158.esperado.workerMd5 });
g('D3_cadeia_anterior_verde', P151.veredito === 'P151_CANDIDATA_V144_UNIESCO_OK 16/0' && P152.veredito === 'P152_BUNDLE_V144_OK 18/0' && P154.veredito === 'P154_DERIVA_V144B_OK 6/0' && P155.veredito === 'P155_BUNDLE_V144B_OK 18/0', { p151: P151.veredito, p152: P152.veredito, p154: P154.veredito, p155: P155.veredito });
g('D4_prova_local_e_varredura_verdes', P153.veredito === 'P153_PROVA_LOCAL_OK 12/0' && P156.veredito === 'P156_VARREDURA_NOME_V144C_OK 5/5', { p153: P153.veredito, p156: P156.veredito });
g('D5_preflight_verde_sobre_a_v142', P159.veredito === 'P159_PREFLIGHT_V144C_OK 11/0' && P159.total.falha === 0, { p159: P159.veredito, total: P159.total });
g('D6_pos_deploy_verde', P160.veredito === 'P160_POS_DEPLOY_V144C_OK 12/0' && P160.total.falha === 0 && P160.medido.visivel_velho === 0 && P160.medido.scripts_velho === 0 && P160.medido.downloads_velho === 0 && P160.medido.sw_velho === 0, { p160: P160.veredito, medido: P160.medido });
g('D7_o_html_servido_e_o_certificado_e_a_versao_e_a_do_stdout', P160.portoes.B1_shell_no_ar_e_a_candidata_v144c.passou === true && ST.versions[0].version_id === VER && ST.versions[0].percentage === 100 && porData[0].versions[0].version_id === VER, { versao_stdout: VER, status: ST.versions[0], lista: porData[0].versions[0].version_id });
g('D8_reversao_nomeada_para_a_v142', porData[1].versions[0].version_id === D142.deploy.version_id, { anterior: porData[1].versions[0].version_id, v142: D142.deploy.version_id });
g('D9_o_ar_de_antes_era_a_v142_no_preflight', P159.portoes.A1_shell_no_ar_e_a_v142.passou === true, { nota: 'o preflight provou o ar anterior = v142 com a marca velha visivel' });
if (falhas.length) { console.error('VERMELHOS: ' + falhas.join(' ;; ')); process.exit(1); }

const git = (cmd) => execSync(cmd, { cwd: REPO, encoding: 'utf8' }).trim();
const main = git('git rev-parse main');
const orig = git('git rev-parse origin/main');
const ahead = Number(git('git rev-list --count origin/main..main'));

const diario = {
  version: 'v144c', data: new Date().toISOString(),
  ok_literal: '«resolva o item 1»',
  nota_do_ok: 'o item 1 da pergunta «Quer que ataque algum destes três?» era a publicação da v144c, que aguardava OK — este OK cobre só esse objeto',
  escopo_do_ok: 'só a publicação (deploy) da v144c; nenhum push, nenhuma escrita no banco, nenhum DDL/mint/rotação',
  tarefa: 'UNIESCO T5: publicação da v144c (renomeação BFR CONECTA → UNIESCO)',
  porque_esta_versao: 'a v144c é a candidata que fecha os 10 nomes de download -bfr- além dos 13 residuais visíveis da v144b; varredura final 5/5 e prova local 12/0',
  origem_dos_numeros: 'stdout do wrangler + deployments status/list depois + artefactos p151/p152/p154/p155/p157/p158/p153/p156/p159/p160 e esperado-v144c em disco; nada copiado-colado da conversa',
  deploy: {
    worker: 'bfr-conecta', conta: 'turmaroboticabfr@gmail.com',
    version_id: VER, deployment_id: ST.id, deployment_created: ST.created_on,
    versao_anterior_v142: D142.deploy.version_id, url: D142.deploy.url,
    assets_novos: ['manifest.json', 'uniesco-icon-192.png', 'uniesco-icon-180.png', 'uniesco-icon-512.png', 'bfr-app-logo.png'],
    reversao: 'devolver o ar a v142 e `wrangler deploy` a partir de worker-deploy-v142-painel-na-troca — exige OK literal novo',
  },
  bundle: { workerMd5: ESP144C.workerMd5, workerBytes: ESP144C.workerBytes, htmlMd5: ESP144C.htmlMd5, htmlBytes: ESP144C.htmlBytes, swMd5: ESP144C.swMd5, swBytes: ESP144C.swBytes, cacheLabel: ESP144C.cacheLabel, logoTecnicaMd5: ESP144C.logoTecnicaMd5, icones: ESP144C.icones },
  conferencia_no_ar: {
    shell_md5: P160.portoes.B1_shell_no_ar_e_a_candidata_v144c.medido.md5, shell_bytes: P160.portoes.B1_shell_no_ar_e_a_candidata_v144c.medido.bytes, versao: VER, percentagem: ST.versions[0].percentage,
    nome_antigo_visivel: P160.medido.visivel_velho, nome_antigo_em_scripts: P160.medido.scripts_velho, nome_antigo_em_downloads: P160.medido.downloads_velho, nome_antigo_no_sw: P160.medido.sw_velho, UNIESCO: P160.medido.UNIESCO,
    manifest: 'UNIESCO / UNIESCO / #00399b',
    tecnica_preservada: P156.tecnica_preservada,
  },
  portoes: { p151: P151.veredito, p152: P152.veredito, p154: P154.veredito, p155: P155.veredito, p157: P157.veredito, p158: P158.veredito, p153: P153.veredito, p156: P156.veredito, p159: P159.veredito, p160: P160.veredito, diario: 'D1-D9 verdes' },
  o_que_este_deploy_muda_para_um_usuario_real: 'todo o visível passa a dizer UNIESCO (título, splash, manifest, ícones, logo, nomes de download); os identificadores técnicos (window.BFR_*, classes .bfr-*, rotas bfr_*, hosts, nome do worker) ficam intactos; nada muda em banco, tabelas, senhas, perfis, permissões, APIs ou integrações',
  o_que_este_diario_nao_autoriza: 'git push, DDL/DML/grants, mint/rotação, decisões PEN-41/43/44 e v141 (#27), templates de email do Supabase, push FCM do servidor, listagens das stores, PDFs raster (precisam dos documentos-fonte), prova autenticada por papel',
  estado_do_remoto_medido_agora: { main, origin_main: orig, ahead, nota: 'sem push deste ciclo — o ahead inclui o b30ed3f do §SM.51 e este diario ainda nao esta commitado' },
};
writeFileSync(SAIDA, JSON.stringify(diario, null, 2) + '\n');
const linhas = [
  'AUDIT_PUBLICACAO_V144_OK D1-D9 · deploy ' + VER + ' (' + ST.created_on + ') · shell ' + P160.portoes.B1_shell_no_ar_e_a_candidata_v144c.medido.md5 + ' · nome antigo visivel/scripts/downloads/sw = 0/0/0/0 · UNIESCO ' + P160.medido.UNIESCO,
  'reversao para ' + D142.deploy.version_id + ' (v142) · worker ' + ESP144C.workerMd5 + ' · nao autoriza push/DDL/mint/publicacao de mais nada · node_exit=0',
];
writeFileSync(TXT, linhas.join('\n') + '\n');
console.log(linhas.join('\n'));
process.exit(0);
