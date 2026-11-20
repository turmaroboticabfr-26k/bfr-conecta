#!/usr/bin/env node
// P73-SONDA-USO-QUATRO — 0 escrita. A prosa do runbook afirma duas coisas sobre o ar: que as quatro funções
// criadas por PEN-38 e PEN-39 existem no catalogo, e que nenhuma delas e chamada pelo modulo servido (logo a
// tela nao mudou com a aplicacao). A segunda afirmao nunca foi medida para os quatro nomes: a sonda de 20/11
// (`scripts/p73-pen39-sonda-uso-agregados.mjs`) varria so os dois nomes da PEN-39 e foi tirada ANTES de
// qualquer DDL, quando o portao exigia que nao existissem no catalogo. Este programa varre os quatro, le as
// pegadas de o ar estar publicado de o diario da v136 e nao da minha memoria, e imprime por nome o numero de
// ocorrencias inclusive zero. Nao ha aqui chamada autenticada nem escrita de espécie alguma.
// Uso: node scripts/p73-sonda-uso-quatro.mjs            (P73_SUF=<rotulo> para nao por cima do anterior)
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sql } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = process.env.P73_SUF ? '-' + process.env.P73_SUF : '';
const OUT = join(REPO, `evidence/p73-sonda-uso-quatro-na-v136-20-11${SUF}.json`);
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com P73_SUF=novo, nao por cima');
const t0 = Date.now();

// Os quatro nomes leem-se dos CREATE FUNCTION das duas candidatas, como na sonda de exposicao: uma agulha
// dactilografada nao sobrevive a uma candidata editada, e o varredor passaria a certificar a minha lista.
const FICHEIROS_DAS_DUAS = ['scripts/p73-pen38-ddl-candidata.sql', 'scripts/p73-pen39-ddl-candidata.sql'];
const SQL_POR_FICHEIRO = Object.fromEntries(FICHEIROS_DAS_DUAS.map((f) => [f, readFileSync(join(REPO, f), 'utf8')]));
const NOMES = [...new Set(FICHEIROS_DAS_DUAS.flatMap((f) => [...SQL_POR_FICHEIRO[f].matchAll(/CREATE\s+FUNCTION\s+(?:public\.)?([a-z0-9_]+)/gi)].map((m) => m[1])))];
if (NOMES.length < 4) throw new Error('ABORTA: as duas candidatas deveriam declarar pelo menos quatro nomes e leram ' + NOMES.length);

const catalogo = await sql(`select p.proname as nome, p.provolatile::text as volatilidade, pg_get_userbyid(p.proowner)::text as dono, p.prosecdef::text as definer
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
    where p.proname in (${NOMES.map((x) => `'${x}'`).join(',')}) order by 1`);
const nomesNoCatalogo = catalogo.map((r) => r.nome);
const ausentesNoCatalogo = NOMES.filter((n) => !nomesNoCatalogo.includes(n));

// O ar: a URL de publicacao vem do diario da v136, e a pegada esperada tambem. Comparar o servido com o
// registado e o que impede este registo de descrever uma build que ja nao esta no ar.
const diarioTxt = readFileSync(join(REPO, 'audit-publicacao-v136.json'), 'utf8');
const diario = JSON.parse(diarioTxt);
const alvoUrl = (/https:\/\/[a-z0-9.-]+\.workers\.dev/i.exec(diarioTxt) || [])[0];
if (!alvoUrl) throw new Error('ABORTA: sem URL de publicacao no diario da v136');
const esperadoTxt = String(diario.md5 && diario.md5['shell_depois_v136'] || '');
const esperado = /([0-9a-f]{32}) \((\d+) B\)/.exec(esperadoTxt);
if (!esperado) throw new Error('ABORTA: o diario da v136 nao tem shell_depois_v136 em forma de pegada — a regua nao pode ser suposicao');

const resp = await fetch(alvoUrl + '/', { headers: { 'cache-control': 'no-cache' } });
if (!resp.ok) throw new Error('ABORTA: alvo HTTP ' + resp.status);
const corpo = await resp.text();
const bytes = Buffer.byteLength(corpo, 'utf8');
const md5 = createHash('md5').update(Buffer.from(corpo)).digest('hex');

const aberturas = [...corpo.matchAll(/<script\b[^>]*\bdata-bfr-municipal-module\b[^>]*>/gi)];
if (aberturas.length !== 1) throw new Error('ABORTA: invólucro do modulo municipal nao e unico no ar (' + aberturas.length + ')');
const tag = aberturas[0][0];
const corpoDesde = aberturas[0].index + tag.length;
const fim = corpo.indexOf('</script>', corpoDesde);
if (fim < corpoDesde) throw new Error('ABORTA: o invólucro do modulo municipal nao fecha no ar');
const dentro = corpo.slice(corpoDesde, fim);

const contar = (texto, nome) => [...texto.matchAll(new RegExp(nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))].length;
const RE_CHAMADA = /\b(?:from|rpc)\s*\(\s*['"`]([A-Za-z_]\w*)['"`]/g;
const chamadasNoModulo = [...new Set([...dentro.matchAll(RE_CHAMADA)].map((m) => m[1]))].sort();

const porNome = NOMES.map((n) => ({ nome: n, no_modulo: contar(dentro, n), no_ar_inteiro: contar(corpo, n),
  chamado_por_from_ou_rpc: chamadasNoModulo.includes(n), no_catalogo: nomesNoCatalogo.includes(n) }));

// O controlo que prova que a contagem sabe disparar e que conta OCORRENCES: dois nomes dentro de rpc()/from(),
// um nome repetido num comentario (para o numero nao poder ser apenas "existe ou nao existe") e um nome que nao
// existe nesta app, que tem de dar zero.
const FIX = [
  'const a = sb.rpc("' + NOMES[0] + '", {});',
  'const b = sb.from("' + NOMES[1] + '").select("*");',
  '// ' + NOMES[2] + ' e de novo ' + NOMES[2],
  'const c = "' + NOMES[3] + '";',
].join('\n');
const fixPorNome = NOMES.map((n) => ({ nome: n, no_fix: contar(FIX, n) }));
const fixChamadas = [...new Set([...FIX.matchAll(RE_CHAMADA)].map((m) => m[1]))];
const controloZero = contar(FIX, 'nome_que_nao_existe_nesta_app_zzz');
const fixDispara = fixPorNome[0].no_fix === 1 && fixPorNome[1].no_fix === 1 && fixPorNome[2].no_fix === 2
  && fixPorNome[3].no_fix === 1 && fixChamadas.length === 2 && controloZero === 0;

const falhas = [];
const g = (nome, cond, detalhe) => { if (!cond) falhas.push(nome); return { nome, verde: !!cond, detalhe }; };
const portoes = [
  g('os_quatro_nomes_sao_lidos_das_candidatas_e_nao_da_minha_lista', NOMES.length >= 4 && porNome.length === NOMES.length, { lidos_das_candidatas: NOMES }),
  g('as_quatro_funcoes_estao_no_catalogo_depois_da_aplicacao', ausentesNoCatalogo.length === 0, { esperadas: NOMES, lidas: catalogo, faltam: ausentesNoCatalogo }),
  g('nenhum_dos_quatro_nomes_aparece_no_modulo_servido', porNome.every((x) => x.no_modulo === 0 && x.no_ar_inteiro === 0 && x.chamado_por_from_ou_rpc === false), porNome),
  g('a_contagem_dispara_no_fixture_e_nao_inventa_no_inexistente', fixDispara && controloZero === 0, { fix_por_nome: fixPorNome, fix_chamadas: fixChamadas, controlo_zero: controloZero }),
  g('a_pegada_servida_e_a_que_o_diario_da_v136_registou', md5 === esperado[1] && bytes === Number(esperado[2]), { servido: { md5, bytes }, diario: esperadoTxt }),
  g('o_involucro_do_modulo_esta_presente_e_tem_corpo_legivel', dentro.length > 5000 && chamadasNoModulo.length > 0, { chars_do_modulo: dentro.length, chamadas_no_modulo: chamadasNoModulo }),
];

const out = {
  programa: 'scripts/p73-sonda-uso-quatro.mjs', em: new Date().toISOString(), duracao_ms: Date.now() - t0,
  pergunta: 'as quatro funcoes que PEN-38 e PEN-39 criaram sao chamadas pelo modulo servido no ar de hoje? e existe alguma delas fora do invólucro?',
  metodo: 'nomes lidos dos CREATE FUNCTION das duas candidatas; catalogo por pg_proc; fetch do ar com cache-control no-cache; invólucro `data-bfr-municipal-module` unico; contagem por nome dentro do modulo e no corpo inteiro; rpc()/from() por regex; pegada esperada lida do audit-publicacao-v136.json',
  servido: { url: alvoUrl, status: resp.status, bytes, md5, pegada_do_diario: esperadoTxt },
  catalogo, por_nome: porNome, chamadas_no_modulo: chamadasNoModulo,
  fixture: { texto: FIX, por_nome: fixPorNome, chamadas: fixChamadas, controlo_zero: controloZero },
  o_que_esta_peca_prova: 'que no ar de hoje (pegada conferida com o diario da v136) nenhum dos quatro nomes novos aparece no corpo do modulo municipal nem no resto da pagina, e que os quatro existem no catalogo.',
  o_que_nao_prova: 'nada sobre o que um utilizador autenticado ve — a pagina serve o mesmo modulo para todos, e o escopo de leitura decide-se no banco. Tambem nao prova que um bundle futuro (v138) continue sem chama-los: este registo e um estado, com a pegada da build que mede.',
  o_um_vermelho_deste_registo_significa: 'que o modulo passou a chamar algum dos quatro nomes — entao a frase do runbook «a tela nao mudou com a aplicacao» esta ultrapassada e e essa frase que se re-escreve, nao a regua.',
  portoes, falhas,
};
out.veredito = falhas.length === 0
  ? `P73_USO_QUATRO_NA_V136_VERDE ${portoes.length}/0 · ${NOMES.length} nomes · 0 ocorrencias · ${chamadasNoModulo.length} chamadas no modulo`
  : `P73_USO_QUATRO_NA_V136_VERMELHO_${falhas.length}`;
if (falhas.length) {
  const p = OUT.replace(/\.json$/, '-VERMELHO.json');
  writeFileSync(p, JSON.stringify(out, null, 2) + '\n');
  for (const f of falhas) console.log('  FALTA ' + f);
  console.log(`P73_USO_QUATRO_NA_V136_VERMELHO · registo ${p}`);
  process.exit(1);
}
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`SERVIDO ${md5} ${bytes} B · esperado ${esperadoTxt} · modulo ${dentro.length} chars`);
for (const x of porNome) console.log(`  ${x.nome}: modulo=${x.no_modulo} ar_inteiro=${x.no_ar_inteiro} chamado=${x.chamado_por_from_ou_rpc} no_catalogo=${x.no_catalogo}`);
console.log(`CHAMADAS_NO_MODULO ${JSON.stringify(chamadasNoModulo)}`);
for (const p of portoes) console.log(`  portao ${p.nome}: ${p.verde ? 'VERDE' : 'VERMELHO'}`);
console.log(`${out.veredito} · ${out.duracao_ms} ms · registo ${OUT}`);
