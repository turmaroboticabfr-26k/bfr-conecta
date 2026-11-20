#!/usr/bin/env node
// P73-PEN38-SONDA-CONSUMIDOR — QUEM CHAMA AS FUNÇÕES DA PEN-38 NO CÓDIGO VERSÃO (só leitura, 0 HTTP, 0 banco).
//
// Existe porque a FALTA-3 do runbook é uma afirmação sobre ficheiros e estava escrita como memória: «zero
// chamadas ao diagnóstico nos bundles versionados». A medida tem de poder ser re-tirada por outra pessoa, por
// isso vive aqui. Os nomes varridos NÃO são dactilografados: lêem-se dos `CREATE FUNCTION public.<nome>` da
// própria candidata PEN-38 (`scripts/p73-pen38-ddl-candidata.sql`) — se a candidata acrescentar uma quinta
// função, esta varredura passa a varrê-la sem que ninguém se lembre de a acrescentar.
//
// A lista de ficheiros vem do índice (`git ls-files`), não do `ls` do disco: «está em disco» não é «está no
// pacote», e um bundle que só existe nesta máquina não é um consumidor que alguém possa publicar amanhã.
//
// Uma régua por família de grafia, cada família com o seu fixture que sabe disparar: um zero aqui é «esta
// grafia não está no corpo», nunca «o conceito não existe». O controlo negativo (nome inventado) tem de dar
// zero nas três famílias, senão o zero do diagnóstico não quer dizer nada.
//
// Veredito: VERDE enquanto a FALTA-3 estiver aberta (zero consumidores). No dia em que um bundle chamar a
// função, este portão vai a vermelho de caso predito e é a prosa do §2.2 que passa a ter de dizer quem chama —
// é esse o propósito, não a conveniência.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const CANDIDATA_SQL = 'scripts/p73-pen38-ddl-candidata.sql';
const MANIFEST_V136 = 'worker-deploy-v136-secretaria-de-educacao/esperado-v136.json';
const SHELL_V136 = 'bfr-candidata-v136-secretaria-de-educacao/index.html';
const SUF = process.env.P73_SUF ? '-' + process.env.P73_SUF : '';
const OUT = join(REPO, `evidence/p73-pen38-sonda-consumidor-do-diagnostico-20-11${SUF}.json`);
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com P73_SUF=novo, não por cima');
const md5 = (b) => createHash('md5').update(b).digest('hex');
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// 1) os nomes varridos, do produtor
const sqlCand = readFileSync(join(REPO, CANDIDATA_SQL), 'utf8');
const NOMES = [...new Set([...sqlCand.matchAll(/CREATE\s+FUNCTION\s+public\.([a-z_][a-z0-9_]*)/gi)].map((m) => m[1]))].sort();
const NOME_ALVO = NOMES.filter((n) => /diagnostico$/.test(n));
if (NOMES.length < 2) throw new Error(`ABORTA: a candidata não descreve funções reconhecíveis (${JSON.stringify(NOMES)})`);
if (NOME_ALVO.length !== 1) throw new Error(`ABORTA: o diagnóstico não é um nome único na candidata: ${JSON.stringify(NOME_ALVO)}`);

// 2) as três famílias de grafia, cada uma com construtor próprio para que o fixture e o corpus usem a mesma régua
const RE_CHAMADA_RPC = (nome) => new RegExp(`\\.\\s*rpc\\s*\\(\\s*['"\`]${esc(nome)}['"\`]`, 'g');
const RE_CAMINHO_REST = (nome) => new RegExp(`/rpc/${esc(nome)}\\b`, 'g');
const RE_NOME_TEXTO = (nome) => new RegExp(`\\b${esc(nome)}\\b`, 'g');
const conta = (t, re) => [...t.matchAll(re)].length;
// a mesma grafia, sem nome fixo: serve para provar que o corpus não é texto morto aos olhos da régua
const RE_TODAS = /\.\s*rpc\s*\(\s*['"`]([A-Za-z_]\w*)['"`]/g;

// 3) os ficheiros, do índice
const ls = (padrao) => execFileSync('git', ['-c', 'core.quotePath=false', 'ls-files', '-z', padrao], { cwd: REPO, encoding: 'utf8' })
  .split('\0').filter(Boolean);
const BUNDLES = ls('*index.html').sort();
const WORKERS = ls('*worker.mjs').sort();
const todos = [...BUNDLES, ...WORKERS];
const ausentes = todos.filter((rel) => !existsSync(join(REPO, rel)));
if (ausentes.length) throw new Error(`ABORTA: o índice anuncia ${ausentes.length} ficheiros que não estão em disco: ${JSON.stringify(ausentes)}`);

// 4) uma passagem por ficheiro: os corpos não cabem em memória todos juntos (59 MB de index.html e 79 MB de
//    worker.mjs versionados), e o registo só guarda o que tem carga.
const acumulador = Object.fromEntries(NOMES.map((n) => [n, { bundles: [], workers: [] }]));
const nomesChamados = {};
let totalChamadasRpc = 0;
const varre = (rel, familia) => {
  const t = readFileSync(join(REPO, rel), 'utf8');
  if (familia === 'bundles') for (const m of t.matchAll(RE_TODAS)) { nomesChamados[m[1]] = (nomesChamados[m[1]] || 0) + 1; totalChamadasRpc += 1; }
  for (const nome of NOMES) {
    const r = { rel, rpc: conta(t, RE_CHAMADA_RPC(nome)), rest: conta(t, RE_CAMINHO_REST(nome)), texto: conta(t, RE_NOME_TEXTO(nome)) };
    if (r.rpc + r.rest + r.texto > 0) acumulador[nome][familia].push(r);
  }
};
for (const rel of BUNDLES) varre(rel, 'bundles');
for (const rel of WORKERS) varre(rel, 'workers');
// bundles e workers contam-se em separado porque a shell está embutida dentro do `worker.mjs`: somar os dois
// seria contar o mesmo texto duas vezes e chamar-lhe cobertura.
const soma = (lst, k) => lst.reduce((a, b) => a + b[k], 0);
const porNome = NOMES.map((nome) => ({ nome, bundles: acumulador[nome].bundles, workers: acumulador[nome].workers,
  chamadas_rpc: { bundles: soma(acumulador[nome].bundles, 'rpc'), workers: soma(acumulador[nome].workers, 'rpc') },
  caminho_rest: { bundles: soma(acumulador[nome].bundles, 'rest'), workers: soma(acumulador[nome].workers, 'rest') },
  ocorrencias_nome: { bundles: soma(acumulador[nome].bundles, 'texto'), workers: soma(acumulador[nome].workers, 'texto') } }));
const alvo = porNome.find((x) => x.nome === NOME_ALVO[0]);
const chamadasAoAlvo = alvo.chamadas_rpc.bundles + alvo.chamadas_rpc.workers + alvo.caminho_rest.bundles + alvo.caminho_rest.workers;

// 5) fixture e controlo negativo: a régua tem de poder dar positivo, senão o zero é cego.
const FIX_NOME = 'bfr_nome_de_fixture_que_nao_existe';
const FIX = `const a = sb.rpc('${FIX_NOME}', {});
const b = sb.rpc("${FIX_NOME}", {});
fetch('https://x.supabase.co/rest/v1/rpc/${FIX_NOME}', { method: 'POST' });
// e o nome aparece ainda como texto: ${FIX_NOME}`;
const fix = { chamada_rpc: conta(FIX, RE_CHAMADA_RPC(FIX_NOME)), caminho_rest: conta(FIX, RE_CAMINHO_REST(FIX_NOME)), ocorrencias_nome: conta(FIX, RE_NOME_TEXTO(FIX_NOME)) };
const VAZIO = 'const nada = sb.from("mesa").select("*");';
const neg = { chamada_rpc: conta(VAZIO, RE_CHAMADA_RPC(FIX_NOME)), caminho_rest: conta(VAZIO, RE_CAMINHO_REST(FIX_NOME)), ocorrencias_nome: conta(VAZIO, RE_NOME_TEXTO(FIX_NOME)) };
const ESP_MANIFEST = JSON.parse(readFileSync(join(REPO, MANIFEST_V136), 'utf8'));
const md5ShellV136 = md5(readFileSync(join(REPO, SHELL_V136)));

const falhas = [];
const g = (nome, cond, detalhe) => { if (!cond) falhas.push(nome); return { nome, verde: !!cond, detalhe }; };
const portoes = [
  g('os_nomes_varridos_sao_os_da_candidata_e_nao_da_memoria', NOMES.length >= 2 && NOMES.includes(NOME_ALVO[0]) && porNome.length === NOMES.length,
    { nomes_da_candidata: NOMES, alvo: NOME_ALVO[0], origem: CANDIDATA_SQL }),
  g('a_lista_de_bundles_ve_do_indice_e_todos_resolvem', BUNDLES.length >= 10 && WORKERS.length >= 1 && ausentes.length === 0,
    { index_html: BUNDLES.length, worker_mjs: WORKERS.length, ausentes }),
  g('nenhuma_chamada_ao_diagnostico_no_codigo_versionado', chamadasAoAlvo === 0, { alvo: alvo.nome, ...alvo }),
  g('nenhuma_das_funcoes_da_pen38_e_chamada_por_bundles_ou_workers',
    porNome.every((x) => x.chamadas_rpc.bundles + x.chamadas_rpc.workers + x.caminho_rest.bundles + x.caminho_rest.workers === 0),
    porNome.map((x) => ({ nome: x.nome, rpc: x.chamadas_rpc, rest: x.caminho_rest, texto: x.ocorrencias_nome }))),
  g('a_varredura_ve_chamadas_a_outras_coisas_nao_e_cega', totalChamadasRpc > 0 && Object.keys(nomesChamados).length >= 1,
    { total_chamadas_rpc_bundles: totalChamadasRpc, nomes_chamados: Object.fromEntries(Object.entries(nomesChamados).sort((a, b) => b[1] - a[1])) }),
  g('cada_familia_de_grafia_dispara_no_fixture', fix.chamada_rpc === 2 && fix.caminho_rest === 1 && fix.ocorrencias_nome === 4, fix),
  g('o_controlo_negativo_da_mesma_regua_da_zero', neg.chamada_rpc === 0 && neg.caminho_rest === 0 && neg.ocorrencias_nome === 0, neg),
  g('o_bundle_varrido_e_byte_a_byte_a_shell_que_o_ar_serve_hoje', md5ShellV136 === ESP_MANIFEST.htmlMd5,
    { varrido: SHELL_V136, md5_varrido: md5ShellV136, htmlMd5_do_manifest: ESP_MANIFEST.htmlMd5,
      nota: 'a v137 serve o mesmo html (portao C2 de scripts/v137-pos-deploy.mjs), por isto esta pegada cobre o ar de hoje e o da v137' }),
];

const out = {
  programa: 'scripts/p73-pen38-sonda-consumidor-do-diagnostico.mjs', em: new Date().toISOString(),
  http: 0, escrita_no_banco: 0, ddl: 0,
  pergunta: 'a FALTA-3 está aberta? ou seja: existe algum bundle versionado que chame bfr_municipal_scope_diagnostico()?',
  metodo: `nomes lidos de ${CANDIDATA_SQL}; ficheiros lidos de \`git ls-files\` (índice, não disco); três famílias de grafia (.rpc('…'), /rpc/<nome>, nome em texto), cada uma com fixture e controlo negativo; bundles e workers contados separadamente porque a shell está embutida no worker.mjs`,
  familias: { chamada_rpc: RE_CHAMADA_RPC('X').source, caminho_rest: RE_CAMINHO_REST('X').source, ocorrencias_nome: RE_NOME_TEXTO('X').source },
  bundles_varridos: BUNDLES, workers_varridos: WORKERS,
  por_nome: porNome,
  chamadas_rpc_de_tudo_nos_bundles: { total: totalChamadasRpc, por_nome: Object.fromEntries(Object.entries(nomesChamados).sort((a, b) => b[1] - a[1])) },
  fixture: { nome: FIX_NOME, disparos: fix, controlo_negativo: neg },
  conclusao: {
    falta_3_aberta: chamadasAoAlvo === 0,
    frase_que_esta_corrida_autoriza: chamadasAoAlvo === 0
      ? `zero chamadas a ${alvo.nome} nos ${BUNDLES.length} index.html e ${WORKERS.length} worker.mjs do índice; as funções da PEN-38 ficam sem consumidora até existir código de tela que as chame`
      : `${alvo.nome} já tem chamadas: ${JSON.stringify(alvo)} — a FALTA-3 deixou de ser aberta e o §2.2 do runbook tem de passar a nomear a consumidora`,
    o_que_nao_prova: 'não prova nada do lado do browser nem do lado do SQL: uma chamada construída por composição de string (`rpc(nomeVariavel)`) não tem o nome entre aspas ao lado do `rpc(` e escapa às três grafias varridas; e um consumidor pode existir num bundle ainda não publicado (a candidata da v138 não existe ainda — ver §5 do runbook).',
  },
  portoes, falhas,
};
out.veredito = falhas.length === 0 ? `P73_PEN38_CONSUMIDOR_${out.conclusao.falta_3_aberta ? 'FALTA3_ABERTA' : 'FALTA3_FECHADA'}_CONFIRMADO ${portoes.length}/0`
  : `P73_PEN38_CONSUMIDOR_VERMELHO ${falhas.length} de ${portoes.length}`;
if (falhas.length) {
  const p = OUT.replace(/\.json$/, '-VERMELHO.json');
  writeFileSync(p, JSON.stringify(out, null, 2) + '\n');
  for (const f of falhas) console.log('  FALTA ' + f);
  console.log(`P73_PEN38_CONSUMIDOR_VERMELHO · registo ${p}`);
  process.exit(1);
}
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`VARRIDOS ${BUNDLES.length} index.html + ${WORKERS.length} worker.mjs · chamadas rpc nos bundles: ${totalChamadasRpc} em ${Object.keys(nomesChamados).length} nomes`);
console.log(`DIAGNOSTICO ${alvo.nome}: rpc ${JSON.stringify(alvo.chamadas_rpc)} rest ${JSON.stringify(alvo.caminho_rest)} nome_em_texto ${JSON.stringify(alvo.ocorrencias_nome)}`);
console.log(`CHAMADOS ${JSON.stringify(out.chamadas_rpc_de_tudo_nos_bundles.por_nome)}`);
console.log(`FIXTURE ${JSON.stringify(fix)} NEGATIVO ${JSON.stringify(neg)}`);
console.log('CONCLUSAO ' + out.conclusao.frase_que_esta_corrida_autoriza);
for (const p of portoes) console.log(`  portao ${p.nome}: ${p.verde ? 'VERDE' : 'VERMELHO'}`);
console.log(`${out.veredito} · registo ${OUT}`);
