#!/usr/bin/env node
// P73-PEN39-SONDA — QUEM CHAMA OS AGREGADOS MUNICIPAIS NO AR DE HOJE (só leitura).
// Porque esta peça existe antes do DDL e não depois: a pendência PEN-39 está escrita como «o painel municipal
// mostra um só número para a rede toda». Isso só é verdade se o módulo servido consumir os agregados. A medida
// de 18/11 (`sm23-escopo-aplicado-por-leitura-18-11.mjs`, portão `a_unica_funcao_de_backend_chamada_e_o_gate_de_autoridade`)
// foi tirada na v134, e o ar é hoje a v136. Sem re-medir, a candidata de DDL poderia estar a arranjar uma
// superfície que ninguém chama — ou a deixar de fora uma que chama. O varrimento é por FAMÍLIA de grafia, cada
// família imprime o seu número (inclusive zero), e a régua tem fixture que sabe disparar: um zero deste
// registo é «a agulha não está no corpo», não «o conceito não existe».
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sql } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = process.env.P73_SUF ? '-' + process.env.P73_SUF : '';
const OUT = join(REPO, `evidence/p73-pen39-sonda-uso-agregados-20-11e${SUF}.json`);
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com P73_SUF=novo, não por cima');
const t0 = Date.now();

const alvoUrl = (/https:\/\/[a-z0-9.-]+\.workers\.dev/i.exec(readFileSync(join(REPO, 'audit-publicacao-v136.json'), 'utf8')) || [])[0];
if (!alvoUrl) throw new Error('ABORTA: sem URL de publicação v136');
const resp = await fetch(alvoUrl + '/', { headers: { 'cache-control': 'no-cache' } });
if (!resp.ok) throw new Error('ABORTA: alvo HTTP ' + resp.status);
const corpo = await resp.text();
const bytes = Buffer.byteLength(corpo, 'utf8');
const md5 = createHash('md5').update(Buffer.from(corpo)).digest('hex');

const aberturas = [...corpo.matchAll(/<script\b[^>]*\bdata-bfr-municipal-module\b[^>]*>/gi)];
if (aberturas.length !== 1) throw new Error('ABORTA: invólucro do módulo municipal não é único na v136 (' + aberturas.length + ')');
const tag = aberturas[0][0];
const corpoDesde = aberturas[0].index + tag.length;
const fim = corpo.indexOf('</script>', corpoDesde);
const dentro = corpo.slice(corpoDesde, fim);

// Nomes das superfícies, lidos do catálogo e do censo versionado — nunca da minha memória.
const censo = JSON.parse(readFileSync(join(REPO, 'evidence/p73-politicas-municipais-20-11e.json'), 'utf8'));
const nomesExistentes = await sql(`select p.proname as nome, 'function' as tipo from pg_proc p join pg_namespace n on n.oid=p.pronamespace and n.nspname='public'
    where p.proname like 'bfr\\_%municipal%'
    union all select c.relname, 'view' from pg_class c join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
    where c.relkind='v' and c.relname like 'bfr\\_%municipal%' order by 1`);
const AGREGADOS = nomesExistentes.filter((x) => /totals|stats/.test(x.nome)).map((x) => x.nome);
const COLUNAS_DA_PEN39 = ['bfr_municipal_municipio_totais', 'bfr_municipal_distribuicao_por_zona'];

const RE_CHAMADA = /\b(?:from|rpc)\s*\(\s*['"`]([A-Za-z_]\w*)['"`]/g;
const chamadas = [...dentro.matchAll(new RegExp(RE_CHAMADA.source, 'g'))].map((m) => m[1]);
const contar = (nome) => [...dentro.matchAll(new RegExp(nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))].length;
const FIX = "const x = sb.from('mesa_sint').rpc('bfr_agregado_sint_totais', {}); // bfr_agregado_sint_totais e bfr_agregado_sint_stats";
const fixNomes = ['mesa_sint', 'bfr_agregado_sint_totais', 'bfr_agregado_sint_stats'];
const fixChamadas = [...FIX.matchAll(new RegExp(RE_CHAMADA.source, 'g'))].map((m) => m[1]);
const fixContagens = fixNomes.map((n) => ({ nome: n, total: [...FIX.matchAll(new RegExp(n, 'g'))].length, chamadas: fixChamadas.filter((c) => c === n).length }));

const porNome = AGREGADOS.map((n) => ({ nome: n, ocorrencias_no_corpo: contar(n), chamadas_de_from_ou_rpc: [...new Set(chamadas)].includes(n) }));
const porNomePen39 = COLUNAS_DA_PEN39.map((n) => ({ nome: n, no_ar: contar(n), existe_no_catalogo: nomesExistentes.some((x) => x.nome === n) }));
const todasChamadas = [...new Set(chamadas)].sort();
const mesasDoCenso = censo.mesas_do_modulo;

const falhas = [];
const g = (nome, cond, detalhe) => { if (!cond) falhas.push(nome); return { nome, verde: !!cond, detalhe }; };
const portoes = [
  g('o_involucre_do_modulo_esta_presente_e_e_unico', dentro.length > 5000 && fim > corpoDesde, { chars: dentro.length, desde: corpoDesde, fim }),
  g('a_regua_de_chamada_ve_as_duas_agulhas_do_fixture', fixChamadas.length === 2 && fixContagens.every((f) => f.total >= 1) && fixContagens.find((f) => f.nome === 'bfr_agregado_sint_stats').chamadas === 0, { fixChamadas, fixContagens }),
  g('a_regua_nao_inventa_em_texto_sem_agulha', contar('nome_que_nao_existe_nesta_app_zzz') === 0, { controlo: 'nome_que_nao_existe_nesta_app_zzz' }),
  g('os_nomes_varridos_sao_os_do_catalogo_e_do_censo', AGREGADOS.length >= 2 && AGREGADOS.every((n) => nomesExistentes.some((x) => x.nome === n)) && mesasDoCenso.length === 11, { agregados_lidos: AGREGADOS, catalogo: nomesExistentes.map((x) => `${x.nome}:${x.tipo}`), mesas: mesasDoCenso.length }),
  g('cada_nome_saida_com_o_seu_numero_inclusive_zero', porNome.length === AGREGADOS.length && porNome.every((x) => Number.isInteger(x.ocorrencias_no_corpo)), porNome),
  g('as_duas_funcoes_da_candidata_pen39_ainda_nao_estao_no_ar_nem_no_catalogo', porNomePen39.every((x) => x.no_ar === 0 && x.existe_no_catalogo === false), porNomePen39),
  g('a_pegada_servida_e_a_shell_que_a_candidata_v137_estende', md5 === JSON.parse(readFileSync(join(REPO, 'worker-deploy-v137-remendo-pen40/esperado-v137.json'), 'utf8')).htmlMd5, { servido: md5, bytes, esperado: JSON.parse(readFileSync(join(REPO, 'worker-deploy-v137-remendo-pen40/esperado-v137.json'), 'utf8')).htmlMd5 }),
];

const usadoNoAr = porNome.filter((x) => x.chamadas_de_from_ou_rpc).map((x) => x.nome);
const out = {
  programa: 'scripts/p73-pen39-sonda-uso-agregados.mjs', em: new Date().toISOString(), duracao_ms: Date.now() - t0,
  pergunta: 'os agregados municipais existentes são chamados pelo módulo servido na v136? se não são, a PEN-39 tem duas metades e uma delas é código por publicar.',
  metodo: 'fetch + md5 do ar; invólucro `data-bfr-municipal-module` (único, senão aborta); nomes lidos do catálogo (pg_proc/pg_class), não da memória; contagem por nome no corpo e por `from()`/`rpc()`; fixture com duas agulhas e controlo negativo',
  servido: { url: alvoUrl, status: resp.status, bytes, md5 },
  involucro: { tag, desde: aberturas[0].index, corpo_desde: corpoDesde, fim, chars: dentro.length },
  catalogo_municipal: nomesExistentes,
  agregados_varridos: AGREGADOS,
  por_nome: porNome,
  nomes_da_candidata_pen39: porNomePen39,
  chamadas_de_from_ou_rpc_no_corpo: todasChamadas,
  mesas_do_modulo_segundo_o_censo: mesasDoCenso,
  fixture: { nomes: fixNomes, chamadas: fixChamadas, contagens: fixContagens },
  conclusao: {
    frase_que_esta_corrida_autoriza: usadoNoAr.length
      ? `no ar de hoje, o módulo chama: ${JSON.stringify(usadoNoAr)} — logo a PEN-39 é de facto o painel`
      : `no ar de hoje nenhum agregado municipal é chamado pelo módulo (${JSON.stringify(porNome.map((x) => `${x.nome}=${x.ocorrencias_no_corpo}`))}): os números municipais só existem para quem chamar RPC por fora, e fechar a PEN-39 exige DDL E código de consumo`,
    o_que_nao_prova: 'não prova que nada no shell fora do invólucro chame estes nomes (a varredura é do corpo declarado); prova do lado de dentro do módulo.',
  },
  portoes, falhas,
};
out.veredito = falhas.length === 0 ? `P73_PEN39_USO_OK ${portoes.length}/0` : `P73_PEN39_USO_VERMELHO ${falhas.length}`;
if (falhas.length) { const p = OUT.replace(/\.json$/, '-VERMELHO.json'); writeFileSync(p, JSON.stringify(out, null, 2) + '\n'); for (const f of falhas) console.log('  FALTA ' + f); console.log(`P73_PEN39_USO_VERMELHO · registo ${p}`); process.exit(1); }
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`SERVIDO ${out.servido.md5} ${out.servido.bytes} B · INVOLUCRO ${dentro.length} chars`);
console.log(`AGREGADOS ${JSON.stringify(porNome.map((x) => `${x.nome}: texto=${x.ocorrencias_no_corpo} chamada=${x.chamadas_de_from_ou_rpc}`))}`);
console.log(`CHAMADAS_NO_CORPO ${JSON.stringify(todasChamadas)}`);
console.log(`PEN39 ${JSON.stringify(porNomePen39)}`);
console.log('CONCLUSAO ' + out.conclusao.frase_que_esta_corrida_autoriza);
for (const p of portoes) console.log(`  portao ${p.nome}: ${p.verde ? 'VERDE' : 'VERMELHO'}`);
console.log(`${out.veredito} · ${out.duracao_ms} ms · registo ${OUT}`);
