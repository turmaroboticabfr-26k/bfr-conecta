#!/usr/bin/env node
// P116 — régua de consistência de versão, 21/11.
// Porque existe: a classe de defeito que se repetiu em 20 e 21/11 não é um medida errada, é um
// documento que ficou parado enquanto o ar avançava. Medido antes de escrever esta linha: o painel
// declarava 42 itens quando o emissor do próprio projecto imprime 46, e o diário de corrida não tem
// um único bloco que nomeie v140/v141/v142. Nada na casa impedia isso — `portao-indice.mjs` varre
// credencial, `pacote-municipal-confere-pecas.mjs` varre caminhos citados, e nenhum dos dois olha
// para a relação entre o que está no ar, o que o painel conta e o que o diário narra.
// O instrumento é só de leitura: fetch anónimo do shell, `git ls-files`, três ficheiros do repo e
// o emissor de contagens. Zero DDL, zero escrita no banco, zero publicação, zero credencial lida.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = process.env.P116_SUF ? '-' + process.env.P116_SUF : '';
const OUT = join(REPO, `evidence/p116-consistencia-de-versao-21-11${SUF}.json`);
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com P116_SUF=novo, não por cima');
const t0 = Date.now();
const md5 = (b) => createHash('md5').update(b).digest('hex');
const l = (p) => readFileSync(p, 'utf8');
const git = (a) => execFileSync('git', a, { cwd: REPO, encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);

// Diário = ficheiro versionado `audit-publicacao-vNNN.json`. A ordenação é pelo número medido no
// nome, não pela data do sistema de ficheiros, porque um checkout novo re-escreve os mtimes todos.
const diarios = git(['ls-files']).filter((f) => /^audit-publicacao-v[0-9]+\.json$/.test(f))
  .map((f) => ({ f, n: Number(/v([0-9]+)\.json$/.exec(f)[1]), o: JSON.parse(l(join(REPO, f))) }))
  .sort((a, b) => a.n - b.n);
if (!diarios.length) throw new Error('ABORTA: nenhum audit-publicacao-vNNN.json no índice — a régua não tem alvo');
const novo = diarios[diarios.length - 1];

const url = (novo.o.deploy && novo.o.deploy.url ? novo.o.deploy.url : 'https://bfr-conecta.turmaroboticabfr.workers.dev') + '/';
const leituras = [];
for (let i = 0; i < 2; i++) {
  const r = await fetch(url, { headers: { 'cache-control': 'no-cache' } });
  const t = await r.text();
  leituras.push({ i: i + 1, http: r.status, bytes: Buffer.byteLength(t), md5: md5(Buffer.from(t)) });
}

// A cadeia de anteriores: cada diário que declara `versao_anterior_vX` tem de apontar para o
// `version_id` do diário vX. É assim que se apanha um diário órfão ou uma publicação sem diário.
const por_versao = Object.fromEntries(diarios.map((d) => [d.n, d.o.deploy && d.o.deploy.version_id ? String(d.o.deploy.version_id) : null]));
const arestas = [];
const arestas_rotas = [];
for (const d of diarios) {
  for (const k of Object.keys(d.o.deploy || {})) {
    const m = /^versao_anterior_v([0-9]+)$/.exec(k);
    if (!m) continue;
    const origem = Number(m[1]);
    const esperado = por_versao[origem];
    const deu = String(d.o.deploy[k]);
    const ok = !!esperado && esperado === deu;
    arestas.push({ de: 'v' + d.n, para: 'v' + origem, id_declarado: deu.slice(0, 8), id_do_diario_destino: esperado ? esperado.slice(0, 8) : 'SEM_DIARIO', ok });
    if (!ok) arestas_rotas.push(`v${d.n}->v${origem}`);
  }
}
// Caminhar a cadeia a partir do diário mais novo, não contar arestas: a primeira versão desta régua
// exigia `arestas >= diarios - 1`, o que não tem positivo nenhum porque os diários antigos declaram
// o anterior com outros nomes de campo. O que tem positivo é: partir do mais novo e subir por
// diários versionados até um termo declarado, sem ciclo e sem id que não bate.
const anterior_de = (n) => { const d = diarios.find((x) => x.n === n); if (!d) return null; for (const k of Object.keys(d.o.deploy || {})) { const m = /^versao_anterior_v([0-9]+)$/.exec(k); if (m) return { n: Number(m[1]), id: String(d.o.deploy[k]) }; } return null; };
const caminho = [];
let cur = novo.n; const vistos = new Set([cur]); let termo = 'ok';
for (;;) {
  const a = anterior_de(cur);
  if (!a) { termo = `sem_aresta_declarada_em_v${cur}`; break; }
  if (vistos.has(a.n)) { termo = `ciclo_em_v${a.n}`; break; }
  const esperado = por_versao[a.n];
  const passo = { de: 'v' + cur, para: 'v' + a.n, id_declarado: a.id.slice(0, 8), id_do_diario_destino: esperado ? esperado.slice(0, 8) : 'SEM_DIARIO', ok: !!esperado && esperado === a.id };
  caminho.push(passo);
  if (!esperado) { termo = `destino_sem_diario_v${a.n}`; break; }
  if (esperado !== a.id) { termo = `id_nao_bate_em_v${cur}`; break; }
  vistos.add(a.n); cur = a.n;
}

// O emissor de contagens é a única fonte do número de linhas PEN; chamá-lo aqui é o que impede
// esta régua de passar a contar por conta própria e divergir do resto da casa.
const emissorTxt = execFileSync('node', ['scripts/ah1-cuenta-pen.mjs'], { cwd: REPO, encoding: 'utf8' });
const em = /linhas PEN: (\d+) \| A (\d+) · M (\d+) · B (\d+) · soma (\d+)/.exec(emissorTxt);
const em2 = /fora de forma: (\S+)/.exec(emissorTxt);
const em3 = /únicas: (\d+) \| maior: PEN-(\d+)/.exec(emissorTxt);
if (!em || !em2 || !em3) throw new Error('ABORTA: o emissor de contagens mudou de forma e esta régua deixaria de poder lê-lo — corpo impresso: ' + JSON.stringify(emissorTxt.slice(0, 260)));
const emissor = { linhas: Number(em[1]), A: Number(em[2]), M: Number(em[3]), B: Number(em[4]), soma: Number(em[5]), fora_de_forma: em2[1], unicas: Number(em3[1]), maior: Number(em3[2]) };

// O painel declara o número numa linha `h2` que também nomeia a fonte da contagem. Recorto por
// linha, não por um regex que atravesse etiquetas: a primeira versão desta régua exigiu `[^<]*`
// até ao `)` e não casou porque o `<code>` vive no meio da frase — e sem imprimir a linha
// extraída isso teria parecido um painel partido em vez de uma sonda partida.
const painelTxt = l(join(REPO, 'docs/roadmap-painel.html'));
const cabLine = painelTxt.split(/\r?\n/).find((s) => s.includes('Pendências (') && s.includes('itens · PEN-01')) || '';
const cab = { itens: Number((/(\d+) itens/.exec(cabLine) || [])[1] ?? NaN), maior: Number((/PEN-01…PEN-(\d+)/.exec(cabLine) || [])[1] ?? NaN) };
const kpi = (rotulo) => { const m = new RegExp('<div class="kpi"><div class="n">(\\d+)</div><div class="l">prioridade ' + rotulo + '</div></div>').exec(painelTxt); return m ? Number(m[1]) : null; };
const painel = { itens_extraido: Number.isFinite(cab.itens) ? cab.itens : null, maior_extraido: Number.isFinite(cab.maior) ? cab.maior : null, nomeia_a_fonte: cabLine.includes('ah1-cuenta-pen.mjs'), linha_cabecalho: cabLine.slice(0, 220) || 'NAO_CASEI', ALTA: kpi('ALTA'), MEDIA: kpi('MÉDIA'), BAIXA: kpi('BAIXA') };

// Diário de corrida: um bloco `**SM.NN.` por tranche. O critério é o que a casa já faz quando
// publica (SM.21 nomeia v134, SM.24 nomeia v135/v136): o título do bloco nomeia a versão.
const audTxt = l(join(REPO, 'docs/auditoria-bfr-conecta.md'));
const blocos = (audTxt.match(/^\*\*SM\.[0-9]+\. .*$/gm) || []);
const rotulo_novo = 'v' + novo.n;
const blocos_que_nomeiam = blocos.filter((s) => s.includes(rotulo_novo));
const ultimo_bloco = blocos.length ? blocos[blocos.length - 1] : 'SEM_BLOCOS';

// Coerência interna do diário mais novo: o `html_md5` do bundle e o md5 que a linha da candidata
// declara têm de ser o mesmo número escritos por duas mãos diferentes do mesmo instrumento.
const bund = novo.o.bundle || {};
const cand = (bund.candidata && bund.candidata.destino) || '';
const md5_da_candidata = /md5=([0-9a-f]{32})/.exec(cand);

const tCred = l(join(REPO, 'scripts/portao-indice.mjs'));
const linhaJWT = (tCred.match(/const JWT\s*=\s*\/((?:\\.|[^\\/\r\n])*)\/([dgimsuy]*)/) || []);
const reJWT = linhaJWT[1] ? new RegExp(linhaJWT[1], linhaJWT[2].includes('g') ? linhaJWT[2] : linhaJWT[2] + 'g') : null;

const falhas = [];
const g = (nome, cond, detalhe) => { if (!cond) falhas.push(`${nome}: ${JSON.stringify(detalhe).slice(0, 320)}`); return { nome, verde: !!cond, detalhe }; };
const portoes = [
  g('o_ar_servido_duas_vezes_seguidas_e_igual_a_si_mesmo_e_ao_md5_do_diario_mas_novo',
    leituras.every((x) => x.http === 200) && new Set(leituras.map((x) => x.md5)).size === 1 && leituras[0].md5 === bund.html_md5 && leituras[0].bytes === bund.html_bytes,
    { diario: rotulo_novo, html_md5_declarado: bund.html_md5, html_bytes_declarados: bund.html_bytes, leituras: leituras.map((x) => `${x.http}/${x.bytes}B/${x.md5}`) }),
  g('a_cadeia_partida_do_diario_mas_novo_sobe_por_diarios_versionados_ate_um_termo_declarado_sem_ciclo_nem_id_trocado',
    caminho.length >= 3 && /^sem_aresta_declarada_em_v\d+$/.test(termo) && arestas_rotas.length === 0,
    { caminho, termo, arestas_globais: arestas.length, rotas: arestas_rotas, diarios_no_indice: diarios.map((d) => 'v' + d.n) }),
  g('o_painel_declara_a_contagem_de_itens_do_emissor_e_o_maior_id_declara_o_mesmo_e_cita_a_fonte',
    painel.itens_extraido === emissor.linhas && painel.maior_extraido === emissor.maior && emissor.unicas === emissor.linhas && painel.nomeia_a_fonte === true,
    { emissor, painel, unidades: 'linhas da tabela PEN do ledger, contadas pela grelha do emissor, não por prefixo' }),
  g('o_painel_declara_as_tres_prioridades_do_emissor_e_a_soma_delas_e_a_contagem_de_itens',
    painel.ALTA === emissor.A && painel.MEDIA === emissor.M && painel.BAIXA === emissor.B && emissor.A + emissor.M + emissor.B === emissor.soma,
    { emissor, painel }),
  g('nenhuma_linha_pen_fica_fora_de_forma_no_emissor',
    emissor.fora_de_forma === 'nenhuma', { emissor }),
  g('o_diario_de_corrida_tem_um_bloco_SM_que_nomeia_a_versao_publicada_mas_nova',
    blocos_que_nomeiam.length >= 1,
    { alvo: rotulo_novo, blocos_SM: blocos.length, que_nomeiam_a_versao: blocos_que_nomeiam.map((s) => s.slice(0, 90)), ultimo_bloco: ultimo_bloco.slice(0, 110) }),
  g('o_diario_mas_novo_declara_o_mesmo_md5_para_o_bundle_e_para_a_saida_da_candidata',
    !!md5_da_candidata && md5_da_candidata[1] === bund.html_md5,
    { bundle_html_md5: bund.html_md5, candidata_destino_md5: md5_da_candidata ? md5_da_candidata[1] : 'NADA_EXTRAIDO', destino: cand.slice(0, 120) }),
];

{
  const corpo = JSON.stringify({ portoes, diarios: diarios.map((d) => ({ f: d.f, version_id: por_versao[d.n], html_md5: d.o.bundle && d.o.bundle.html_md5 })), leituras, emissor, painel });
  const jwt = reJWT ? (corpo.match(reJWT) || []).length : -1;
  portoes.push(g('nenhum_token_de_sessao_chega_ao_registo_desta_regua', reJWT !== null && jwt === 0, { regexua_lida_do_emissor: !!reJWT, ocorrencias: jwt, comparado: 'o corpo serializado desta própria saída' }));
}

const out = {
  programa: 'scripts/p116-consistencia-de-versao.mjs',
  em: new Date().toISOString(), duracao_ms: Date.now() - t0,
  metodo: 'Fetch anónimo duplicado do shell; diários lidos de `git ls-files` e ordenados pelo número medido no nome; a cadeia de `versao_anterior_vX` confrontada com os `version_id` dos próprios diários; as contagens vêm de chamar `scripts/ah1-cuenta-pen.mjs`, nunca de contar linhas aqui; painel e diário de corrida recortados por uma prédica por linha declarante, com o texto extraído impresso ao lado do veredicto.',
  ar: { url, leituras, diario: rotulo_novo, data_do_diario: novo.o.data },
  diarios_no_indice: diarios.map((d) => `v${d.n}`),
  cadeia: { caminho, termo, arestas, rotas: arestas_rotas },
  emissor, painel,
  diario_de_corrida: { blocos_SM: blocos.length, primeiro: blocos.length ? blocos[0].slice(0, 90) : null, ultimo: ultimo_bloco.slice(0, 120), que_nomeiam_a_versao_mais_nova: blocos_que_nomeiam.map((s) => s.slice(0, 120)) },
  o_que_esta_regua_ve_e_nao_ve: 'Vê as três relações que a casa não medía: ar↔diário, painel↔emissor, diário de corrida↔versão publicada. Não vê se o conteúdo do bloco SM está certo, se o painel descreve bem cada cartão, nem se um `deploy` do Cloudflare tem diário — isso continua no `pacote-municipal-confere-pecas.mjs` e na leitura da lista de deployments. Um KPI do painel que não tenha emissor (o de «versões publicadas») não é governado por esta régua, porque eu não tenho como derivar o esperado dele sem chamar a API de administração.',
  portoes, falhas,
};
out.veredito = falhas.length === 0 ? `P116_CONSISTENCIA_DE_VERSAO_OK ${portoes.length}/0` : `P116_CONSISTENCIA_DE_VERSAO_VERMELHO ${falhas.length} de ${portoes.length}`;
const TXT = OUT.replace(/\.json$/, '.txt');
if (falhas.length) { const p = OUT.replace(/\.json$/, '-VERMELHO.json'); writeFileSync(p, JSON.stringify(out, null, 2) + '\n'); for (const f of falhas) console.log('  FALTA ' + f); console.log(`P116_VERMELHO · registo ${p}`); process.exit(1); }
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
writeFileSync(TXT, `ar=${leituras[0].md5}/${leituras[0].bytes}B diario=${rotulo_novo}\nemissor=linhas ${emissor.linhas} A ${emissor.A} M ${emissor.M} B ${emissor.B} maior PEN-${emissor.maior}\npainel=itens ${painel.itens_extraido} maior ${painel.maior_extraido} A ${painel.ALTA} M ${painel.MEDIA} B ${painel.BAIXA}\ncadeia=${caminho.map((p) => p.de + '>' + p.para).join(' ')} termo=${termo} arestas=${arestas.length} rotas=${arestas_rotas.length}\nblocos_SM=${blocos.length} que_nomeiam_${rotulo_novo}=${blocos_que_nomeiam.length}\n` + `${out.veredito} · ${out.duracao_ms} ms · registo ${OUT}\n`);
for (const p of portoes) console.log(`  portao ${p.nome}: ${p.verde ? 'VERDE' : 'VERMELHO'}`);
console.log(`EMISSOR=${emissor.linhas}·A${emissor.A}·M${emissor.M}·B${emissor.B} · PAINEL=${painel.itens_extraido}·A${painel.ALTA}·M${painel.MEDIA}·B${painel.BAIXA} · DIARIO=${rotulo_novo} BLOCOS_QUE_O_NOMEIAM=${blocos_que_nomeiam.length}`);
console.log(`${out.veredito} · ${out.duracao_ms} ms · registo ${OUT}`);
