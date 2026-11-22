#!/usr/bin/env node
// P114 — leitor que fecha PEN-40 no AR, 21/11.
// Porque existe: o critério de fecho escrito no ledger diz «re-corrida do ah2-mobile2 com
// `nav_existe=true` nas 6 larguras do papel `monitor`». Medido antes de qualquer asserção:
// `nav_existe` é campo da BANCADA (`p73-bancada-pen40-navexiste.mjs`), não do produtor
// `ah2-mobile2` — este emite `censo.barra_existe` (:177) e `censo.barra[i].w/h`. Logo o critério
// nomeia um campo que o instrumento do ar não produz, e um verde meu teria de dizer que campo é.
// O produtor só aceita três larguras por lançamento com o mesmo nome de saída, por isso as 6
// chegam de dois lançamentos sequenciais (a seguir um renova() roda e rotaciona a cadeia —
// paralelos dariam `refresh_token_already_used`). Este leitor compõe os dois artefactos, confere
// a identidade do ar com o `esperado-v142.json` e com uma leitura fresca, e não escreve nada.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const FORA = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const A = join(REPO, 'evidence/ah2-mobile2-21-11-pen40-a.json');
const B = join(REPO, 'evidence/ah2-mobile2-21-11-pen40-b.json');
const ESP = join(REPO, 'worker-deploy-v142-painel-na-troca/esperado-v142.json');
const PRODUTOR = join(REPO, 'scripts/ah2-mobile2.mjs');
const LEDGER = join(REPO, 'docs/roadmap-master.md');
const CREDENCIAIS = 'C:/Users/pcmac/.ah2-senhas-de-teste.json';
const SUF = process.env.P114_SUF ? '-' + process.env.P114_SUF : '';
const OUT = join(REPO, `evidence/p114-leitor-pen40-no-ar-21-11${SUF}.json`);
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com P114_SUF=novo, não por cima');
const t0 = Date.now();
for (const f of [A, B, ESP, PRODUTOR, LEDGER]) if (!existsSync(f)) throw new Error('ABORTA: falta ' + f);
const md5 = (b) => createHash('md5').update(b).digest('hex');
const l = (p) => readFileSync(p, 'utf8');

const producerTxt = l(PRODUTOR);
// A régua das larguras vem do contrato do produtor, não de memória minha.
const LARGURAS_CONTRATO = (producerTxt.match(/process\.argv\[3\] \|\| '([0-9,]+)'/) || [])[1].split(',').map(Number);
const CAMPO_BARRA = /barra_existe:\s*!!nav/.test(producerTxt);

const artefactos = { a: JSON.parse(l(A)), b: JSON.parse(l(B)) };
const esp = JSON.parse(l(ESP));
const unidades = ['censo.barra_existe (booleano por largura)', 'botoes_com_caixa (contagem de itens da barra com w>0 e h>0)', 'abertas (painéis abertos por toque real, por largura)', 'declaradas_sem_rota (nomes de seção por largura)'];
const bandas = [];
for (const [corrida, o] of Object.entries(artefactos)) {
  for (const [w, b] of Object.entries(o.bandas)) {
    const barra = b.censo?.barra || [];
    bandas.push({ corrida, largura: Number(w), papel: o.papel, md5_shell: o.md5_shell, url: o.url, em: o.em,
      barra_existe: b.censo?.barra_existe, rotas_barra: barra.length, gaveta: b.censo?.gaveta?.length ?? null,
      botoes_com_caixa: barra.filter((x) => x.w > 0 && x.h > 0).length,
      alvos_menores_que_44: barra.filter((x) => x.w > 0 && Math.min(x.w, x.h) < 44).length,
      abertas: b.abertas, pela_praga: !!b.pela_praga, declaradas_sem_rota: b.declaradas_sem_rota || [],
      veredito_corrida: o.veredito, medido_incompleto: o.medido?.incompleto, faltaram: o.faltaram ?? null });
  }
}
bandas.sort((x, y) => x.largura - y.largura);

// Identidade do ar por três lados: o que cada corrida gravou, o que a v142 certificou, e o que o
// ar serve agora. Um valor que diverge entre os três é exactamente o que este portão existe para apanhar.
const urlApp = bandas[0].url;
const vivoTxt = await (await fetch(urlApp, { headers: { 'cache-control': 'no-cache' } })).text();
const vivo = md5(Buffer.from(vivoTxt));
const md5s_lidos = bandas.map((x) => x.md5_shell);
const sem_rota = [...new Set(bandas.flatMap((x) => x.declaradas_sem_rota))].sort();
const ledgerTxt = l(LEDGER);
const linha_pen = (id) => (ledgerTxt.split('\n').find((s) => s.startsWith(`| ${id} `)) || '');
const pen40 = linha_pen('PEN-40'), pen46 = linha_pen('PEN-46');

// O campo que o critério nomeia existe noutro instrumento: prova-se dos dois lados para que a
// troca de nome fique registada como medida e não como escolha minha.
const nav_existe_no_produtor = (producerTxt.match(/nav_existe/g) || []).length;
const BANCADA = join(REPO, 'scripts/p73-bancada-pen40-navexiste.mjs');
const nav_existe_na_bancada = existsSync(BANCADA) ? (l(BANCADA).match(/nav_existe/g) || []).length : -1;

const falhas = [];
const g = (nome, cond, detalhe) => { if (!cond) falhas.push(`${nome}: ${JSON.stringify(detalhe).slice(0, 320)}`); return { nome, verde: !!cond, detalhe }; };
const portoes = [
  g('as_seis_larguras_do_contrato_do_produtor_estao_medidas_e_as_duas_corridas_sao_do_monitor',
    LARGURAS_CONTRATO.length === 6 && JSON.stringify([...new Set(bandas.map((x) => x.largura))].sort((a, b) => a - b)) === JSON.stringify(LARGURAS_CONTRATO) && bandas.length === 6 && bandas.every((x) => x.papel === 'monitor') && bandas[0].corrida !== bandas[5].corrida && new Set(bandas.map((x) => x.em)).size === 2,
    { contrato: LARGURAS_CONTRATO, medidas: bandas.map((x) => `${x.largura}px@${x.corrida}`), papéis: [...new Set(bandas.map((x) => x.papel))] }),
  g('nenhuma_banda_caiu_pela_praga_e_nenhuma_largura_faltou',
    bandas.every((x) => x.pela_praga === false && x.medido_incompleto === 0 && (x.faltaram === null || x.faltaram.length === 0)),
    Object.fromEntries(bandas.map((x) => [x.largura, `praga=${x.pela_praga} incompleto=${x.medido_incompleto} faltaram=${JSON.stringify(x.faltaram)}`])),),
  g('o_md5_do_ar_e_o_mesmo_nas_duas_corridas_no_certificado_da_v142_e_no_servido_agora',
    new Set(md5s_lidos).size === 1 && md5s_lidos[0] === esp.htmlMd5 && vivo === esp.htmlMd5,
    { corridas: [...new Set(md5s_lidos)], esperado_v142: esp.htmlMd5, servido_agora: vivo, bytes_servidos_agora: Buffer.byteLength(vivoTxt) }),
  g('a_barra_mobile_existe_em_todas_as_seis_larguras_do_monitor_pelo_campo_do_produtor',
    CAMPO_BARRA && bandas.length === 6 && bandas.every((x) => x.barra_existe === true),
    { campo_lido: 'censo.barra_existe', dado: Object.fromEntries(bandas.map((x) => [x.largura, x.barra_existe])) }),
  g('a_barra_tem_cinco_rotas_e_as_cinco_tem_caixa_de_layout_em_todas_as_seis',
    bandas.every((x) => x.rotas_barra === 5 && x.botoes_com_caixa === 5 && x.alvos_menores_que_44 === 0),
    Object.fromEntries(bandas.map((x) => [x.largura, `rotas=${x.rotas_barra} com_caixa=${x.botoes_com_caixa} menores44=${x.alvos_menores_que_44}`])),),
  g('o_toque_real_abriu_sete_paineis_em_cada_uma_das_seis_larguras',
    bandas.every((x) => x.abertas === 7 && x.gaveta === 7),
    Object.fromEntries(bandas.map((x) => [x.largura, `abertas=${x.abertas} gaveta=${x.gaveta}`])),),
  g('o_vermelho_remanescente_e_so_a_classe_ja_registada_na_pen46_e_o_nome_dela_consta_no_ledger_com_monitor',
    JSON.stringify(sem_rota) === JSON.stringify(['escola-historia']) && pen46.includes('escola-historia') && pen46.includes('monitor') && pen46.includes('sem_botao'),
    { sem_rota, ocorrencias_no_ledger_pen46: (pen46.match(/escola-historia/g) || []).length, cellulas_por_largura: Object.fromEntries(bandas.map((x) => [x.largura, x.declaradas_sem_rota.join('|') || 'vazio'])) }),
  g('o_nome_do_criterio_no_ledger_nao_e_um_campo_do_produtor_e_sim_da_bancada',
    nav_existe_no_produtor === 0 && nav_existe_na_bancada > 0 && pen40.includes('nav_existe'),
    { nav_existe_em_ah2_mobile2: nav_existe_no_produtor, nav_existe_em_p73_bancada: nav_existe_na_bancada, campo_do_produtor: 'censo.barra_existe', criterio_escrito_no_ledger: 'nav_existe=true nas 6 larguras' }),
  g('as_duas_corridas_trouxeram_veredito_de_defeito_pela_mesma_classe_e_nao_um_aborto',
    bandas.every((x) => x.veredito_corrida === 'AH7b_MOBILE_COM_DEFEITOS') && Object.values(artefactos).every((o) => Array.isArray(o.falhas) && o.falhas.length === 3 && typeof o.portoes === 'number' && o.portoes === 48),
    Object.fromEntries(Object.entries(artefactos).map(([k, o]) => [k, `${o.veredito} falhas_array=${Array.isArray(o.falhas)}=${(o.falhas || []).length} portoes=${o.portoes} forma_de_portoes=${typeof o.portoes}`])),),
];

// Última régua: percorre o corpo serializado à procura dos VALORES reais de credencial do papel
// monitor (a senha gravada e as duas strings de sessão). Não é nome de campo nem lista lembrada.
{
  const corpo = JSON.stringify({ portoes, bandas });
  const sess = JSON.parse(l(join(FORA, 'ah2-sessao-monitor.json'))).monitor || {};
  const cred = JSON.parse(l(CREDENCIAIS)).monitor || {};
  const pool = [cred.senha, sess.access_token, sess.refresh_token].filter((s) => typeof s === 'string' && s.length >= 12);
  const presentes = pool.filter((s) => corpo.includes(s));
  portoes.push(g('nenhum_valor_real_de_credencial_chega_ao_registo', pool.length === 3 && presentes.length === 0, { comparados: pool.length, presentes: presentes.length, unidades: 'três valores: a credencial gravada e as duas strings de sessão do monitor' }));
}

const out = {
  programa: 'scripts/p114-leitor-pen40-no-ar.mjs',
  em: new Date().toISOString(), duracao_ms: Date.now() - t0,
  metodo: 'Compõe os dois lançamentos sequenciais do produtor `ah2-mobile2` (3 larguras por lançamento, porque um `renova()` roda no arranque de cada um e dois paralelos dariam `refresh_token_already_used`), confere a identidade do ar por três lados (as duas corridas, o `esperado-v142.json` e uma leitura fresca) e aplica a régua do produtor: a barra existe por `censo.barra_existe`, os botões têm caixa por `w>0 && h>0`, os painéis contam-se por `abertas`.',
  unidades,
  ar: { url: urlApp, esperada_html_md5_v142: esp.htmlMd5, servida_agora_md5: vivo, cacheLabel: esp.cacheLabel, moduleMd5: esp.moduleMd5, workerMd5: esp.workerMd5 },
  contrato_lido_do_produtor: { larguras: LARGURAS_CONTRATO, campo_da_barra: 'censo.barra_existe', regexua: "process.argv[3] || '<csv>' e barra_existe: !!nav" },
  corridas: { a: { ficheiro: A.split('/').pop(), em: artefactos.a.em, veredito: artefactos.a.veredito, larguras: artefactos.a.larguras }, b: { ficheiro: B.split('/').pop(), em: artefactos.b.em, veredito: artefactos.b.veredito, larguras: artefactos.b.larguras } },
  bandas, sem_rota_union: sem_rota,
  pen40: { criterio_escrito: 'nav_existe=true nas 6 larguras do papel monitor', campo_efetivamente_medido: 'censo.barra_existe', nav_existe_em_produtor: nav_existe_no_produtor, nav_existe_em_bancada: nav_existe_na_bancada },
  o_que_esta_prova_e_o_que_ela_nao_e: 'Verde: a barra mobile do `monitor` MONTA no ar publicado da v142 nas seis larguras do contrato, com as cinco rotas com caixa, 7 painéis abertos por toque e 0 alvos abaixo de 44 px — é o critério de fecho da PEN-40, medido no ar e não em bancada. Vermelho que fica e não é da PEN-40: `escola-historia` continua declarada no mapa do `monitor` sem rota tocável nas seis larguras, que é exatamente a classe que a PEN-46 conta em 33 células / 11 papéis e que a PEN-36(b) deixou como re-prova por DOM/clique depois de `BFR_APP_RUNTIME` ter deixado de estar exposto. Não autoriza publicar, DDL, grant, rotação de credencial, mint nem `git push`.',
  portoes, falhas,
};
out.veredito = falhas.length === 0 ? `P114_PEN40_AR_OK ${portoes.length}/0` : `P114_PEN40_AR_VERMELHO ${falhas.length}`;
const TXT = OUT.replace(/\.json$/, '.txt');
if (falhas.length) { const p = OUT.replace(/\.json$/, '-VERMELHO.json'); writeFileSync(p, JSON.stringify(out, null, 2) + '\n'); for (const f of falhas) console.log('  FALTA ' + f); console.log(`P114_VERMELHO · registo ${p}`); process.exit(1); }
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
writeFileSync(TXT, bandas.map((x) => `${x.largura}px@${x.corrida}: barra_existe=${x.barra_existe} rotas=${x.rotas_barra} com_caixa=${x.botoes_com_caixa} abertas=${x.abertas} gaveta=${x.gaveta} menores44=${x.alvos_menores_que_44} sem_rota=${x.declaradas_sem_rota.join('|') || 'vazio'}`).join('\n') + `\nar: duas_corridas=${[...new Set(md5s_lidos)].join(',')} esperado_v142=${esp.htmlMd5} servido_agora=${vivo}\ncritério: nav_existe(produtor)=${nav_existe_no_produtor} nav_existe(bancada)=${nav_existe_na_bancada} campo_medido=censo.barra_existe\nsem_rota_union=${JSON.stringify(sem_rota)}\n` + `${out.veredito} · ${out.duracao_ms} ms · registo ${OUT}\n`);
for (const p of portoes) console.log(`  portao ${p.nome}: ${p.verde ? 'VERDE' : 'VERMELHO'}`);
console.log(`BARRA_EXISTE=${bandas.filter((x) => x.barra_existe === true).length}/${bandas.length} · SEM_ROTA=${JSON.stringify(sem_rota)}`);
console.log(`${out.veredito} · ${out.duracao_ms} ms · registo ${OUT}`);
