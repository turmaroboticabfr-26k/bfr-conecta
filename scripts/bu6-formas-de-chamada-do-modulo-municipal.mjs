#!/usr/bin/env node
// BU6-FORMAS-DE-CHAMADA-DO-MODULO-MUNICIPAL — só leitura. Existe porque dois artefactos versionados dizem
// coisas contrárias sobre a mesma região do mesmo byte: `docs/bu-20-11/03-perfis-e-permissoes.md` §4 afirma que
// o módulo municipal «não cita tabela nenhuma e chama só bfr_is_municipal_authority», e
// `evidence/sm23-escopo-aplicado-por-leitura-18-11.json` percorre 20 leituras dentro do mesmo invólucro.
// A causa está na FORMA da chamada: o censador por região (scripts/bu3-pegada-de-modulos-20-11.mjs:90) usa a
// agulha `\.from\(\s*'([a-z_0-9]+)'` — exige um ponto antes de `from(` — e o módulo chama `from('t')` sem
// ponto, porque recebe o `from` como parâmetro do helper `ler(nome, (from) => …)`. Este programa conta as duas
// formas, uma por uma, dentro do invólucro e no corpus inteiro, imprime cada número (inclusive zero) e tem
// fixture com as duas grafias, para que um zero signifique «a forma não está aqui» e não «a agulha está cega».
// Uso: node scripts/bu6-formas-de-chamada-do-modulo-municipal.mjs
//      BU6_SUF=… node scripts/bu6-formas-de-chamada-do-modulo-municipal.mjs   (corrida preservada)
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = process.env.BU6_SUF ? '-' + process.env.BU6_SUF.replace(/^-/, '') : '';
const OUT = join(REPO, `evidence/bu6-formas-de-chamada-do-modulo-municipal-20-11${SUF}.json`);
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com BU6_SUF=novo, não por cima');
const t0 = Date.now();

const diario = JSON.parse(readFileSync(join(REPO, 'audit-publicacao-v136.json'), 'utf8'));
const alvoUrl = (/https:\/\/[a-z0-9.-]+\.workers\.dev/i.exec(JSON.stringify(diario)) || [])[0];
if (!alvoUrl) throw new Error('ABORTA: sem URL de publicação no diário da v136');
const esperado = JSON.parse(readFileSync(join(REPO, 'worker-deploy-v136-secretaria-de-educacao/esperado-v136.json'), 'utf8'));
const resp = await fetch(alvoUrl + '/', { headers: { 'cache-control': 'no-cache' } });
if (!resp.ok) throw new Error('ABORTA: alvo HTTP ' + resp.status);
const corpo = await resp.text();
const bytes = Buffer.byteLength(corpo, 'utf8');
const md5 = createHash('md5').update(Buffer.from(corpo)).digest('hex');

const aberturas = [...corpo.matchAll(/<script\b[^>]*\bdata-bfr-municipal-module\b[^>]*>/gi)];
if (aberturas.length !== 1) throw new Error('ABORTA: invólucro do módulo municipal não é único (' + aberturas.length + ')');
const tag = aberturas[0][0];
const desde = aberturas[0].index + tag.length;
const fim = corpo.indexOf('</script>', desde);
const dentro = corpo.slice(desde, fim);

// As duas famílias, uma contagem por família. A AGULHA_COM_PONTO é copiada verbatim do censador por região,
// para que o «0» de dentro do invólucro seja o mesmo 0 que o censador produziu, e não outro meu.
const AGULHA_COM_PONTO = /\.from\(\s*'([a-z_0-9]+)'/g;
const AGULHA_SEM_PONTO = /(^|[^A-Za-z0-9_$.])from\(\s*'([a-z_0-9]+)'/g;
const AGULHA_RPC = /\.rpc\(\s*'([a-z_0-9_]+)'/g;
const AGULHA_LE = /(^|[^A-Za-z0-9_$.])ler\(\s*'([a-zA-Z_0-9]+)'/g;
const AGULHA_MUNICIPIO = /municipalit/gi;
const nomesComPonto = (texto) => [...new Set([...texto.matchAll(AGULHA_COM_PONTO)].map((m) => m[1]))];
const nomesSemPonto = (texto) => [...new Set([...texto.matchAll(AGULHA_SEM_PONTO)].map((m) => m[2]))];
const ocorrencias = (re, texto) => (texto.match(new RegExp(re.source, re.flags)) || []).length;

const dentroPontos = nomesComPonto(dentro);
const dentroSemPonto = nomesSemPonto(dentro);
const corpusPontos = nomesComPonto(corpo);
const corpusSemPonto = nomesSemPonto(corpo);
const dentroRpc = [...new Set([...dentro.matchAll(AGULHA_RPC)].map((m) => m[1]))].sort();
const dentroLer = ocorrencias(AGULHA_LE, dentro);
const dentroMunicipio = ocorrencias(AGULHA_MUNICIPIO, dentro);
const ocorrenciasSemPonto = ocorrencias(AGULHA_SEM_PONTO, dentro);
const ocorrenciasRpc = ocorrencias(AGULHA_RPC, dentro);

// Fixture com as duas grafias mais dois falsos positivos: `plataforma`/`transform(` não são mesas.
const FIX = "const a = await supabase.from('mesa_com_ponto'); const b = await (from) => from('mesa_sem_ponto'); const plataforma = 1; transform('nada'); const c = await sb.rpc('funcao_sint');";
const fixPontos = nomesComPonto(FIX);
const fixSemPonto = nomesSemPonto(FIX);

const censo = JSON.parse(readFileSync(join(REPO, 'evidence/p73-politicas-municipais-20-11e.json'), 'utf8'));
const mesasDoCenso = (censo.mesas_do_modulo || []).slice().sort();
const sm23 = JSON.parse(readFileSync(join(REPO, 'evidence/sm23-escopo-aplicado-por-leitura-18-11.json'), 'utf8'));
const leiturasSm23 = sm23.leituras.length;
const mesasSm23 = [...new Set(sm23.leituras.map((l) => l.mesa))].sort();

const DOC = join(REPO, 'docs/bu-20-11/03-perfis-e-permissoes.md');
const doc = readFileSync(DOC, 'utf8');
const AGULHAS = [
  `abre ${dentroSemPonto.length} mesas distintas nas ${leiturasSm23} leituras do seu invólucro`,
  `${ocorrenciasSemPonto} ocorrências \`from('t')\``,
  `${dentroPontos.length} chamadas pela agulha do censador por região`,
  `${corpusPontos.length} mesas com ponto no corpus`,
];
const citacaoFalta = AGULHAS.filter((a) => !doc.includes(a));

const falhas = [];
const g = (nome, cond, detalhe) => { if (!cond) falhas.push(nome); return { nome, verde: !!cond, detalhe }; };
const portoes = [
  g('o_involucre_do_modulo_esta_presente_e_unico', dentro.length > 5000 && fim > desde, { chars: dentro.length, bytes: Buffer.byteLength(dentro, 'utf8'), desde, fim }),
  g('as_duas_agulhas_contam_cada_um_dois_nomes_do_fixture_e_nem_um_falso_positivo', fixPontos.join(',') === 'mesa_com_ponto' && fixSemPonto.join(',') === 'mesa_sem_ponto', { fixPontos, fixSemPonto, nota: 'plataforma/transform não entram em nenhuma das duas' }),
  g('a_agulha_do_censador_devolve_zero_dentro_do_involucre_e_muitas_fora_dele', dentroPontos.length === 0 && corpusPontos.length > 50, { dentro: dentroPontos.length, corpus: corpusPontos.length }),
  g('a_agulha_sem_ponto_devolve_o_inverso_e_só_existe_no_involucre', dentroSemPonto.length === mesasDoCenso.length && corpusSemPonto.length === dentroSemPonto.length, { dentro: dentroSemPonto.sort(), corpus: corpusSemPonto.length, nota: 'se o corpus e o invólucro dão o mesmo número, nenhuma outra região do bundle usa esta forma — a diferença é sistemática, não acidental' }),
  g('os_nomes_lidos_sem_ponto_batem_com_o_censo_de_policies', mesasDoCenso.length === 11 && dentroSemPonto.length === mesasDoCenso.length && dentroSemPonto.every((n) => mesasDoCenso.includes(n)), { lidos: dentroSemPonto, censo: mesasDoCenso, divergem: dentroSemPonto.filter((n) => !mesasDoCenso.includes(n)).concat(mesasDoCenso.filter((n) => !dentroSemPonto.includes(n))) }),
  g('a_contagem_bate_com_a_varredura_de_leituras_de_18_11', leiturasSm23 === 20 && mesasSm23.length === dentroSemPonto.length + dentroRpc.length && mesasSm23.every((n) => dentroSemPonto.includes(n) || dentroRpc.includes(n)), { leituras_sm23: leiturasSm23, mesas_sm23: mesasSm23, mesas_agora: dentroSemPonto, rpc_agora: dentroRpc, nota: 'a leitura 0 do sm23 é o RPC de autoridade contado como mesa' }),
  g('a_única_função_chamada_por_rpc_e_a_de_autoridade', dentroRpc.length === 1 && dentroRpc[0] === 'bfr_is_municipal_authority', { rpc: dentroRpc }),
  g('o_helper_e_as_chamadas_contam_se_em_ocorrencias_nao_em_nomes_distintos', dentroLer === ocorrenciasSemPonto && ocorrenciasSemPonto + ocorrenciasRpc === leiturasSm23, { helper_ler: dentroLer, ocorrencias_sem_ponto: ocorrenciasSemPonto, ocorrencias_rpc: ocorrenciasRpc, leituras_sm23: leiturasSm23, nomes_distintos: dentroSemPonto.length, nota: 'unidades: 19 ocorrências de mesa + 1 de RPC = 20 leituras, sobre 11 nomes distintos; comparar ocorrências com nomes seria o mesmo defeito de unidade que já me apanhou' }),
  g('nenhuma_familia_municipal_de_backend_aparece_no_involucre', dentroMunicipio === 0, { dentro: dentroMunicipio, nota: 'a classe imprime-se com o zero no lugar, porque é isto que a PEN-38 afirma' }),
  g('o_ar_e_a_pegada_esperada_da_v136', md5 === esperado.htmlMd5 && bytes === esperado.htmlBytes, { servido: { bytes, md5 }, esperado: { bytes: esperado.htmlBytes, md5: esperado.htmlMd5 } }),
  g('a_frase_nova_do_documento_03_cita_os_numeros_deste_artefacto', citacaoFalta.length === 0, { agulhas_de_frase: AGULHAS, faltam: citacaoFalta }),
];

const out = {
  programa: 'scripts/bu6-formas-de-chamada-do-modulo-municipal.mjs', em: new Date().toISOString(), duracao_ms: Date.now() - t0,
  pergunta: 'o módulo municipal servido não cita tabela nenhuma (documento 03) ou abre 11 mesas sobre 20 leituras (sm23)? a resposta está na forma da chamada, e conta-se forma a forma.',
  metodo: 'fetch + md5/bytes contra `esperado-v136.json`; invólucro `data-bfr-municipal-module` (único, senão aborta); duas agulhas de mesa (com ponto = verbatim do censador por região `bu3:90`, sem ponto = a forma do módulo) contadas dentro e no corpus; RPC e helper contados à parte; fixture com as duas grafias e dois falsos positivos; confronto com `p73-politicas-municipais` e `sm23-escopo-aplicado-por-leitura`; zero SQL, zero escrita no produto',
  servido: { url: alvoUrl, status: resp.status, bytes, md5, esperado_md5: esperado.htmlMd5, esperado_bytes: esperado.htmlBytes },
  involucro: { tag, desde: aberturas[0].index, corpo_desde: desde, fim, chars: dentro.length, bytes: Buffer.byteLength(dentro, 'utf8') },
  agulhas: {
    com_ponto_copiada_do_censador: AGULHA_COM_PONTO.source,
    sem_ponto: AGULHA_SEM_PONTO.source,
    dentro_com_ponto: dentroPontos.length,
    dentro_sem_ponto: dentroSemPonto.length,
    corpus_com_ponto: corpusPontos.length,
    corpus_sem_ponto: corpusSemPonto.length,
    helper_ler: dentroLer,
    ocorrencias_sem_ponto: ocorrenciasSemPonto,
    ocorrencias_rpc: ocorrenciasRpc,
    rpc_distintos: dentroRpc.length,
    familia_municipio: dentroMunicipio,
  },
  mesas_por_agulha_sem_ponto: dentroSemPonto.sort(),
  rpc_no_involucre: dentroRpc,
  comparacao: { censo_policies_mesas: mesasDoCenso, sm23_leituras: leiturasSm23, sm23_mesas: mesasSm23, corpus_mesas_com_ponto: corpusPontos.length },
  fixture: { texto: FIX, com_ponto: fixPontos, sem_ponto: fixSemPonto },
  conclusao: {
    frase_que_esta_corrida_autoriza: `o módulo municipal servido abre ${dentroSemPonto.length} mesas distintas nas ${leiturasSm23} leituras do seu invólucro — ${ocorrenciasSemPonto} ocorrências \`from('t')\` sem ponto mais ${ocorrenciasRpc} RPC, e ${dentroPontos.length} chamadas pela agulha do censador por região, que conta ${corpusPontos.length} mesas com ponto no corpus — «não cita tabela nenhuma» era efeito da agulha (\`bu3:90\` exige o ponto antes de \`from(\`), não do código`,
    o_que_nao_prova: 'não prova que as 20 leituras tragam linhas (isso é RLS, medido com sessão na PEN-38 e na PEN-41); prova a forma e o conjunto de nomes, não o resultado de cada pedido.',
  },
  portoes, falhas,
  precedentes: ['evidence/sm23-escopo-aplicado-por-leitura-18-11.json', 'evidence/p73-politicas-municipais-20-11e.json', 'docs/bu-20-11/03-perfis-e-permissoes.md', 'scripts/bu3-pegada-de-modulos-20-11.mjs'],
};
out.veredito = falhas.length === 0 ? `BU6_FORMAS_VERDE ${portoes.length}/0` : `BU6_FORMAS_VERMELHO ${falhas.length}/${portoes.length}`;
if (falhas.length) {
  const p = OUT.replace(/\.json$/, '-VERMELHO.json');
  writeFileSync(p, JSON.stringify(out, null, 2) + '\n');
  for (const f of falhas) console.log('  FALTA ' + f);
  console.log(`${out.veredito} · registo ${p}`);
  process.exit(1);
}
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`SERVIDO ${md5} ${bytes} B · INVOLUCRO ${dentro.length} chars ${Buffer.byteLength(dentro, 'utf8')} B`);
console.log(`AGULHAS ${JSON.stringify(out.agulhas)}`);
console.log(`MESAS ${JSON.stringify(dentroSemPonto.sort())}`);
console.log(`RPC ${JSON.stringify(dentroRpc)} · FALSA_AUSENCIA_MUNICIPIO ${dentroMunicipio}`);
for (const p of portoes) console.log(`  portao ${p.nome}: ${p.verde ? 'VERDE' : 'VERMELHO'}`);
console.log(`${out.veredito} · ${out.duracao_ms} ms · registo ${OUT}`);
