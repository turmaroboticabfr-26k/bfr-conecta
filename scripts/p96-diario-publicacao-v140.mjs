// P96 — DIÁRIO DE PUBLICAÇÃO DA v140 (21/11, noite). Não publica: grava o diário do deploy já feito e
// conferido, com todos os números lidos dos artefactos do servidor e das peças, nunca dactilografados.
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const ESP = JSON.parse(readFileSync(`${DIR}/worker-deploy-v140-trilha-de-acesso/esperado-v140.json`, 'utf8'));
const P94 = JSON.parse(readFileSync(`${DIR}/evidence/p94-gera-bundle-v140-21-11.json`, 'utf8'));
const P95 = JSON.parse(readFileSync(`${DIR}/evidence/p95-pos-deploy-v140-a.json`, 'utf8'));
const STDOUT = readFileSync(`${DIR}/evidence/v140-deploy-stdout-21-11.txt`, 'utf8');
const STATUS = JSON.parse(readFileSync(`${DIR}/evidence/v140-deployments-status-21-11.json`, 'utf8'));
const LISTA = JSON.parse(readFileSync(`${DIR}/evidence/v140-deployments-list-21-11.json`, 'utf8'));
const DIARIO136 = JSON.parse(readFileSync(`${DIR}/audit-publicacao-v136.json`, 'utf8'));
const P92 = JSON.parse(readFileSync(`${DIR}/evidence/p92-dados-municipais-c.json`, 'utf8'));
const P93 = JSON.parse(readFileSync(`${DIR}/evidence/p93-porta-mapa-vs-backend-c.json`, 'utf8'));
const OUT = `${DIR}/audit-publicacao-v140.json`;
const EV = `${DIR}/evidence/p96-diario-v140-21-11.json`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' já existe — a publicação só se diary uma vez');
if (P95.veredito !== 'P95_POS_DEPLOY_V140_OK 12/0') throw new Error('ABORTA: o pos-deploy não está verde (' + P95.veredito + ') — não se diary um ar não conferido');

const md5 = (b) => createHash('md5').update(Buffer.from(String(b))).digest('hex');
const porData = [...LISTA].sort((a, b) => String(b.created_on).localeCompare(String(a.created_on)));
const verStdout = (/Current Version ID:\s*([0-9a-f-]{36})/.exec(STDOUT) || [])[1];
const upload = (/Success! Uploaded ([\d,]+) file.*?\(([\d.]+) sec\)/.exec(STDOUT) || []);
const assetsDoBundle = readdirSync(`${DIR}/worker-deploy-v140-trilha-de-acesso/public`).sort();
const assetsServidos = (P95.medido.assets || []).map((a) => a.arquivo).sort();
const naoServidos = assetsDoBundle.filter((f) => !assetsServidos.includes(f));
if (!verStdout) throw new Error('ABORTA: sem Current Version ID no stdout — o diário não teria o número do servidor');
if (porData[0].versions[0].version_id !== verStdout) throw new Error('ABORTA: o deployment mais novo do servidor não é o do stdout');
if (STATUS.versions[0].version_id !== verStdout) throw new Error('ABORTA: o status do servidor não concorda com o stdout — o diário diariaria um deploy não confirmado');
// O diário só pode descrever o bundle que o gerador certificou: o `esperado-v140.json` lido aqui é o mesmo ficheiro
// cuja saída o P94 produziu e o P95 voltou a medir no ar.
if (P94.esperado.workerMd5 !== ESP.workerMd5 || P94.esperado.htmlMd5 !== ESP.htmlMd5) throw new Error('ABORTA: o esperado do gerador difere do esperado do diário');
if (P95.medido.shells.some((s) => s.md5 !== ESP.htmlMd5 || s.bytes !== ESP.htmlBytes)) throw new Error('ABORTA: o ar medido por P95 não é o html certificado por P94');

const di = {
  version: 'v140',
  data: '2026-11-21',
  ok_literal: 'resolva todas as pendencias, tem meu ok (21/11, depois da tabela de seis pendências cada uma com o OK que exige)',
  nota_do_ok: 'cobre a publicacao do bundle escolhido e a escrita de dados municipais. NAO cobre git push (o utilizador respondeu «Nao, deixar local» no mesmo dia) nem a reversao de PEN-43/PEN-44: reverter re-concederia graus a anon e PUBLIC, contra a prioridade de seguranca que ele proprio nomeou.',
  escopo_do_ok: 'publicar a candidata que fecha os dois vermelhos medidos no browser (sonda honesta da v139 por P86, trilha interceptada da v140 por P88) e preencher o buraco de dados escola-municipio por P92',
  tarefa: 'levar ao ar a sonda honesta (o painel do developer passa a ler a negacao em vez de «Controle no backend confirmado») e a trilha de acesso em bfr_municipal_audit, com o remendo da PEN-40 que ja estava no bundle da v138',
  porque_esta_versao: 'a cadeia certificada e v138 -> p85 (v139 sonda honesta, portoes 11/0) -> p87 (v140 trilha, portoes 12/0): publicar a v140 inclui a v139, logo nao e escolha entre as duas',
  deploy: {
    worker: 'bfr-conecta',
    conta: STATUS.author_email,
    version_id: verStdout,
    deployment_id: porData[0].id,
    versao_anterior_v136: DIARIO136.deploy.version_id,
    deployment_created: porData[0].created_on,
    percentual_trafego_novo: STATUS.versions[0].percentage,
    wrangler: '4.154.0 (fixada: 4.156+ quebra o upload de assets com o erro 100312)',
    cwd: 'worker-deploy-v140-trilha-de-acesso',
    base_do_bundle: 'worker-deploy-v138-painel-municipal (bundle local nunca publicado; escolhido por medida porque ja leva o modulo da PEN-40)',
    url: P95.url,
    comando: 'npx -y wrangler@4.154.0 deploy dentro de worker-deploy-v140-trilha-de-acesso',
    stdout_regue: { caminho: 'evidence/v140-deploy-stdout-21-11.txt', bytes: STDOUT.length, md5: md5(STDOUT), uploaded_files: upload[1] || null, tempo_upload_s: upload[2] || null },
    assets_no_bundle: assetsDoBundle.length,
    assets_servidos_conferidos: P95.medido.assets.length,
    assets_nao_servidos_como_ficheiro: naoServidos,
    nota_assets: 'os dois numeros diferem por medida, nao por descuido: o _headers nao e servido como ficheiro proprio, e sim aplicado pelo Cloudflare a todas as rotas (G8/9 no p95)',
  },
  origem_dos_numeros: 'stdout do wrangler + deployments status/list re-emitidos por p95; nada copiado-colado da conversa',
  bundle: {
    worker_md5: ESP.workerMd5, worker_bytes: ESP.workerBytes, delta_worker_bytes: ESP.deltaWorkerBytes,
    html_md5: ESP.htmlMd5, html_bytes: ESP.htmlBytes,
    sw_md5: P95.medido.sw.md5, sw_bytes: P95.medido.sw.bytes, cache_label_no_ar: P95.medido.sw.rotulo,
    modulo_pen40_md5: ESP.moduleMd5, modulo_pen40_bytes: ESP.moduleBytes,
    headers_md5: ESP.headersMd5, mesa_de_trilha: ESP.mesaDeTrilha, rpc_sem_modulo: ESP.rpcNoModulo,
    portoes_do_gerador: P94.veredito,
  },
  conferencia_no_ar: {
    veredito: P95.veredito, duracao_ms: P95.duracao_ms,
    tres_fetches_de_slash: P95.medido.shells,
    rota_inexistente: P95.medido.notfound,
    desvios_de_assets: P95.medido.assets.filter((a) => a.md5_servido !== a.md5_local || a.http !== 200),
    contagens: P96_contagens(),
  },
  o_que_este_deploy_muda_para_um_usuario_real: {
    developer: 'o painel municipal passa a ler a negao do backend em vez do banner verde de «Controle no backend confirmado» (proviso por P86 em f e g)',
    education_supervisor: 'continua a ver a aba, e passa a ter a entrada no gaveta movel (P80: painel com 10 abas pintado)',
    outros_papeis: `nada: P93 mediu D1=0 e D2=0 nas ${P93.resumo.prontas} personas legiveis do total de ${P93.resumo.pedidas} — o mapa do bundle e o backend dao o mesmo veredicto`,
  },
  dados_no_banco_nesta_noite: {
    p92: P92.veredito, escolas_ligadas: P92.depois.escolas.filter((e) => e.municipality_id !== null).length,
    sessao_concedida_ve: (P92.visao_por_sessao.concedida || [])[0] || P92.visao_por_sessao.concedida,
    sessao_controle_ve: (P92.visao_por_sessao.negada_controle || [])[0] || P92.visao_por_sessao.negada_controle,
    reversao: 'scripts/p92-reversao-dados-municipais.sql',
    nota: 'a concessao nova e sobre a conta de teste da barra; o municipio da SM8 («apagar») e as suas 4 concessoes de contas reais ficam intactos',
  },
  o_que_este_diario_nao_autoriza: 'git push (recusado pelo utilizador); reversao de PEN-43/PEN-44; revogar as 4 concessoes de contas reais sobre o municipio de exemplo; dar a porta da visibilidade ao rpc (P93 mediu 0 divergencias, e a mudanca so afectaria contas reais com concessao); qualquer nova escrita no banco.',
  portoes: {
    p94: P94.total,
    p95: `${Object.keys(P95).filter((k) => /^G\d/.test(k)).length}/0`,
    p93: { veredito: P93.veredito, vermelhos: P93.falhas.length,
      quais: P93.falhas.map((f) => String(f).split(' | ')[0]),
      causa_lida_do_artefacto: P93.resumo.com_defeito_de_leitura,
      nota: 'o unico vermelho do P93 e de leitura, nao de acesso: a persona «pending» nunca carrega perfil (nav_qtd=0 apos 24 tentativas), logo nao e uma persona mensuravel. Os contadores D1/D2 so aceitam amostras prontas.' },
  },
};
function P96_contagens() {
  const chaves = Object.keys(P95).filter((k) => /^G\d/.test(k));
  const l = (prefixo) => P95[chaves.find((k) => k.startsWith(prefixo))];
  return { G6: l('G6_'), G7: l('G7_'), G10: l('G10_'), G11: l('G11_'), G12: l('G12_') };
}
writeFileSync(OUT, JSON.stringify(di, null, 2) + '\n');
writeFileSync(EV, JSON.stringify({ programa: 'scripts/p96-diario-publicacao-v140.mjs', em: new Date().toISOString(), diario: OUT.replace(DIR + '/', ''), veredito_diariado: P95.veredito, portoes: P94.total, url: P95.url }, null, 2) + '\n');
console.log('P96_DIARIO_V140_ESCRITO ' + OUT.replace(DIR + '/', '') + ' · version=' + verStdout + ' · deployment=' + porData[0].id + ' · ' + P95.veredito);
