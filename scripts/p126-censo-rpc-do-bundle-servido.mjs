#!/usr/bin/env node
// P126 — censo dos nomes de RPC que um bundle servido chama, cruzado com o catálogo vivo. Só leitura.
//
// Existe porque a PEN-42 foi descoberta por uma frase no front que o catálogo não conhecia, e ninguém sabia se
// era uma ou dez. A régua anterior (`p73-rm52-estado-calendario.mjs`) varre um bundle fixo nos seus próprios
// portões, por isso não serve para perguntar «e a versão que está no ar?»: aqui o bundle é argumento, e a única
// coisa congelada é a forma de extrair a chamada.
//
// Não imprime valores de dados nem credenciais: nomes, contagens, bytes e md5. Zero escrita no banco.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sql } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const ALVO = process.argv[2];
if (!ALVO) throw new Error('USO: node scripts/p126-censo-rpc-do-bundle-servido.mjs <caminho-do-bundle> [mais um bundle]');
const SUF = process.env.P126_SUF ? '-' + process.env.P126_SUF : '';
const OUT = join(REPO, `evidence/p126-censo-rpc${SUF}.json`);
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com P126_SUF=novo, não por cima');

const bundles = process.argv.slice(2).map((c) => ({ caminho: c, absoluto: join(REPO, c) }));
for (const b of bundles) if (!existsSync(b.absoluto)) throw new Error('ABORTA: o bundle ' + b.caminho + ' não existe');

// Uma só forma de chamar: `rpc('<nome>'`. As duas aspas simples são obrigadas pelo producer do bundle; se um
// dia aparecer crase, este recorte devolve menos nomes do que existem, e o portão do fixture abaixo é o que
// impede que esse silêncio se chame «censo verde».
const RE_RPC = /\brpc\(\s*'([a-z0-9_]+)'/g;
const extrai = (t) => {
  const m = new Map();
  for (const x of t.matchAll(RE_RPC)) m.set(x[1], (m.get(x[1]) || 0) + 1);
  return m;
};
const FIX_DISPARO = "x.rpc('bfr_qualquer_coisa',{a:1}); y.rpc( 'bfr_outra' ,{}); z.rpc(\"bfr_com_crase_nao_conta\");";
const FIX_ESPERADO = ['bfr_outra', 'bfr_qualquer_coisa'];
const disparo = [...extrai(FIX_DISPARO).keys()].sort();
if (disparo.join(',') !== FIX_ESPERADO.join(',')) throw new Error('ABORTA: o extractor não dispara no fixture — ' + JSON.stringify(disparo));

const md5 = (b) => createHash('md5').update(b).digest('hex');
const lidos = bundles.map((b) => {
  const bruto = readFileSync(b.absoluto);
  const texto = bruto.toString('utf8');
  const pedidos = extrai(texto);
  return {
    caminho: b.caminho, bytes: bruto.length, md5: md5(bruto),
    nomes: [...pedidos.keys()].sort(), chamadas: [...pedidos.values()].reduce((a, x) => a + x, 0),
    por_nome: Object.fromEntries([...pedidos.entries()].sort((a, b2) => a[0].localeCompare(b2[0]))),
  };
});
const todosNomes = [...new Set(lidos.flatMap((l) => l.nomes))].sort();
const noCatalogo = [];
for (let i = 0; i < todosNomes.length; i += 40) {
  const lote = todosNomes.slice(i, i + 40).map((n) => `'${n}'`).join(',');
  const r = await sql(`select q.pronome as nome from (select unnest(array[${lote}]) as pronome) q
    where exists (select 1 from pg_proc p join pg_namespace nn on nn.oid=p.pronamespace
                  where nn.nspname='public' and p.proname=q.pronome) order by 1`);
  noCatalogo.push(...r.map((x) => x.nome));
}
const presentes = new Set(noCatalogo);
const ausentes = todosNomes.filter((n) => !presentes.has(n));
const saida = {
  programa: 'scripts/p126-censo-rpc-do-bundle-servido.mjs', em: new Date().toISOString(),
  metodo: 'extracção por `rpc(\x27<nome>\x27)` nos bytes do bundle passado como argumento; existência por pg_proc via Management API (sem JWT de sessão, logo sem RLS e sem escrita)',
  fixture_do_extractor: { disparo, esperado: FIX_ESPERADO, passou: disparo.join(',') === FIX_ESPERADO.join(',') },
  bundles: lidos,
  total: { nomes_distintos: todosNomes.length, no_catalogo: presentes.size, ausentes: ausentes.length },
  ausentes: ausentes.map((n) => ({ nome: n, chamadas: lidos.reduce((a, l) => a + (l.por_nome[n] || 0), 0), em: lidos.filter((l) => l.por_nome[n]).map((l) => l.caminho) })),
  o_que_este_verde_nao_autoriza: 'nada: é leitura. Não há veredicto de «zero ausentes» — a régua do que deve existir é decisão de produto, e cada aplicação de DDL continua a pedir a sua frase literal.',
  o_que_NAO_prova: 'que o nome presente no catálogo tenha os argumentos que o front passa, nem que esteja acessível ao papel que chama: isto é um censo de nomes, não de contratos. O contrato de um nome mede-se pelo preflight da peça correspondente.',
};
saida.veredito = `P126_CENSO_RPC_MEDIDO ${todosNomes.length} nomes · ${presentes.size} no catalogo · ${ausentes.length} ausentes`;
writeFileSync(OUT, JSON.stringify(saida, null, 2) + '\n');
console.log(`BUNDLE ${saida.bundles.map((b) => `${b.caminho} ${b.bytes} B ${b.md5}`).join(' | ')}`);
console.log(`EXTRACTOR fixture=${JSON.stringify(disparo)} passou=${saida.fixture_do_extractor.passou}`);
console.log(`TOTAL nomes=${todosNomes.length} chamadas=${lidos.reduce((a, l) => a + l.chamadas, 0)} no_catalogo=${presentes.size} ausentes=${ausentes.length}`);
for (const a of saida.ausentes) console.log(`  AUSENTE ${a.nome} chamadas=${a.chamadas} em=${a.em.join(',')}`);
console.log(`${saida.veredito} · registo ${OUT}`);
// Sem `process.exit(0)` aqui: forçar a saída com o socket da Management API ainda em teardown
// rebenta no build do Windows com a asserção de libuv DEPOIS de o registo estar escrito, e o
// `exit=$?` do wrapper passa a 127 sem que nada do produto tenha falhado. O código natural já é 0.
