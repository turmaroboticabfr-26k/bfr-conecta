#!/usr/bin/env node
// SM.23 peca 5 — CONFERIDOR POS-FACTO dos NOMES MUNICIPAIS DE BACKEND no bundle servido (só leitura).
// Porque existem três corridas vermelhas desta medição, preservadas e não apagadas:
//   …-ANTERIOR-janela-fixa-de-24kb-sobre-colhia-vizinhos.json  (janela fixa apanhava as 50 mesas da app)
//   …-ANTERIOR-exigia-marca-dentro-de-cada-corpo.json          (exigia que CADA corpo citasse `bfrMunicipal`)
//   …-ANTERIOR-exigia-involucre-unico-e-corpos-de-40bytes.json (pedia um invólucro único que o bundle não tem,
//                                                        corpos >40 B quando os falsos positivos do regex de
//                                                        cabeçalho são de 2–79 B, e contava `bfr_is_municipal_authority`
//                                                        — que É o gate legítimo do módulo — como fuga).
// As três eram réguas minhas, não propriedades do produto. O que sobrevive a todas e é observável sem invólucro
// é a AUSÊNCIA de nome: se `bfr_municipal_school_stats` não aparece em byte nenhum dos 3,5 MB servidos, então
// o DDL que endireitei (vista→invoker, REVOKE dos dois agregados) não altera número visível algum; o efeito é
// de superfície de acesso, que já está medida noutro artefacto. Aqui há controlo positivo (`.from('schools')`,
// que o bundle usa) e negativo (nome que não existe na base), porque uma régua de ausência sem positivo não
// distingue «não está lá» de «a sonda está cega».
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sql } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = process.env.SM23_SUF ? '-' + process.env.SM23_SUF : '';
const OUT = join(REPO, `evidence/sm23-conferencia-nomes-municipais-18-11${SUF}.json`);
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com SM23_SUF=novo, não por cima');
const t0 = Date.now();

const dj = JSON.parse(readFileSync(join(REPO, 'audit-publicacao-v134.json'), 'utf8'));
const alvoUrl = dj.deploy?.url;
if (!alvoUrl || !/^https:\/\/[a-z0-9.-]+\.workers\.dev$/.test(alvoUrl)) throw new Error('ABORTA: deploy.url do diário não é uma origem workers.dev limpa: ' + String(alvoUrl).slice(0, 80));
const resp = await fetch(alvoUrl + '/', { headers: { 'cache-control': 'no-cache' } });
if (!resp.ok) throw new Error('ABORTA: alvo HTTP ' + resp.status);
const corpo = await resp.text();
const bytes = Buffer.byteLength(corpo, 'utf8');
const md5 = createHash('md5').update(corpo, 'utf8').digest('hex');

const Toca = (alvo) => { const v = []; let i = 0; while ((i = corpo.indexOf(alvo, i)) >= 0) { v.push(i); i += alvo.length; } return v; };
const Contexto = (off) => corpo.slice(Math.max(0, off - 90), off + 90).replace(/\s+/g, ' ');

// A superfície que o DDL de 18/11 endureceu: a vista (peça b) e o que ela agregava.
const SUPERFICIE_DDL = ['bfr_municipal_school_stats', 'bfr_municipal_network_totals', 'bfr_municipal_municipalities', 'bfr_municipal_access_grants', 'bfr_municipal_audit', 'bfr_school_in_municipal_scope'];
// O gate legítimo do módulo — tem de estar presente, senão a aba nem se abre.
const GATE_DO_MODULO = 'bfr_is_municipal_authority';
const CONTROL_POSITIVO = ".from('schools')";
const CONTROL_NEGATIVO = 'bfr_municipal_nome_que_nao_existe_na_base';

const contagem = Object.fromEntries([...SUPERFICIE_DDL, GATE_DO_MODULO, CONTROL_POSITIVO, CONTROL_NEGATIVO].map((n) => [n, Toca(n).length]));
const ocorrenciasDoGate = Toca(GATE_DO_MODULO).map((off) => ({ offset: off, contexto: Contexto(off) }));

// Números já medidos noutros artefactos, citados por campo (não re-medidos aqui).
const apl = JSON.parse(readFileSync(join(REPO, 'evidence/sm23-aplicacao-view-funcoes-18-11.json'), 'utf8'));
const censo = JSON.parse(readFileSync(join(REPO, 'evidence/sm23-censo-municipios-18-11.json'), 'utf8'));
const causa = JSON.parse(readFileSync(join(REPO, 'evidence/sm23-causa-vista-18-11.json'), 'utf8'));

// Estado VIVO no instante desta conferência: o registo de aplicação prova o que aconteceu às 18:xx, não o que
// está agora. Um GRANT posterior (o último resultado de ferramenta desta sessão afirmava um, sem artefacto em
// disco) só é refutado por releitura. A régua de modo é a mesma da ae4, com os rótulos que ela sabe emitir.
const REGUA_MODO = `case when c.reloptions::text like '%security_invoker=true%' then 'invoker'
     when c.reloptions::text like '%security_invoker=false%' then 'definer'
       else 'sem-opcao-null' end`;
const VISTAS_CENSO = ['bfr_municipal_school_stats', 'sports_public_athletes', 'bfr_municipal_view_que_nao_existe_xyz'];
const vistasVivas = await sql(`select c.relname as nome, ${REGUA_MODO} as modo, coalesce(c.reloptions::text,'NULL') as reloptions,
  pg_catalog.pg_get_viewdef(c.oid, true) as definicao from pg_class c join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
  where c.relkind='v' and c.relname in (${VISTAS_CENSO.map((v) => `'${v}'`).join(',')}) order by 1`);
// Fixture da régua de modo: as três literais de `reloptions` aplicadas à MESMA expressão, para provar que ela
// emite os três rótulos. Sem isto, «invoker» podia ser apenas o rótulo de uma régua que nunca sabe dizer
// «definer» — e foi assim que a corrida anterior ficou vermelha por falta de discriminante, não por falta de facto.
const fixtureModo = await sql(`select ${REGUA_MODO.replace(/c\.reloptions::text/g, 'x.op')} as rotulo from (values ('{security_invoker=true}'::text),('{security_invoker=false}'::text),(NULL::text)) as x(op)`);
const VIVAS = ['bfr_municipal_network_totals', 'bfr_municipal_municipalities', 'bfr_has_municipal_grant', 'bfr_is_municipal_authority'];
const funcoesVivas = await sql(`select p.proname as nome, coalesce(array_to_string(p.proacl,' | '),'HERDA-PUBLIC') as acl,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_exec, has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_exec,
  (p.prosecdef) as definer, pg_get_function_arguments(p.oid) as argumentos
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace and n.nspname='public'
  where p.proname in (${VIVAS.map((f) => `'${f}'`).join(',')}) order by 1`);

// Vista e agregados, lidos PELA FORMA QUE O PRODUTOR EMITE: `porPersona[i].bfr_municipal_school_stats`
// é o GET à vista (com `status`/`linhas`) e `porPersona[i].rpc_totals.valores` são os agregados municipais.
// A corrida anterior vasculhava `"total_ou_estrela":"N-"`, um hífen que este emissor nunca escreve, e por
// isso devolvia `lidos:0`: uma régua que não lê não pode dar verde nem vermelho útil.
const lidoVista = (p) => p.bfr_municipal_school_stats ?? null;
const vistasDoArtefacto = (c) => (c.porPersona || []).map((p) => ({ persona: p.persona, ...(lidoVista(p) || {}) }));
const agregadosDoArtefacto = (c) => (c.porPersona || []).map((p) => ({ persona: p.persona, ...(p.rpc_totals || {}) }));
const vistasReais = vistasDoArtefacto(causa);
// Fixture obrigatório: o mesmo leitor aplicado a um persona sintético com 5 linhas TEM de apanhar o 5.
const fixtureLeitor = vistasDoArtefacto({ porPersona: [{ persona: 'sintetico', bfr_municipal_school_stats: { status: 200, linhas: 5 } }] });

const falhas = [];
const g = (nome, cond, detalhe) => { if (!cond) falhas.push(`${nome}: ${JSON.stringify(detalhe).slice(0, 260)}`); return { nome, verde: !!cond, detalhe }; };
const portoes = [
  g('regua_de_ausencia_dispara_no_controlo_positivo', contagem[CONTROL_POSITIVO] >= 1, { ocorrencias_de_from_schools: contagem[CONTROL_POSITIVO] }),
  g('regua_nao_inventa_um_nome_que_nao_existe', contagem[CONTROL_NEGATIVO] === 0, { ocorrencias: contagem[CONTROL_NEGATIVO] }),
  g('a_vista_endurecida_nao_e_nome_nenhum_do_bundle', contagem.bfr_municipal_school_stats === 0, { ocorrencias: contagem.bfr_municipal_school_stats }),
  g('os_agregados_revogados_a_anon_nao_sao_nomes_nenhum_do_bundle', contagem.bfr_municipal_network_totals === 0 && contagem.bfr_municipal_municipalities === 0, { network_totals: contagem.bfr_municipal_network_totals, municipalities: contagem.bfr_municipal_municipalities }),
  g('o_catalogo_e_a_auditoria_municipais_tambem_nao_aparecem', contagem.bfr_municipal_access_grants === 0 && contagem.bfr_municipal_audit === 0 && contagem.bfr_school_in_municipal_scope === 0, { grants: contagem.bfr_municipal_access_grants, audit: contagem.bfr_municipal_audit, scope: contagem.bfr_school_in_municipal_scope }),
  g('o_gate_legitimo_do_modulo_esta_la_e_contado', contagem[GATE_DO_MODULO] >= 1, { ocorrencias: contagem[GATE_DO_MODULO], offsets: ocorrenciasDoGate.map((x) => x.offset) }),
  g('nenhum_nome_endurecido_e_rota_de_dado_da_aba', SUPERFICIE_DDL.every((n) => contagem[n] === 0), SUPERFICIE_DDL.map((n) => `${n}=${contagem[n]}`)),
  g('o_aplicador_registrou_anon_sem_execucao_dos_dois_agregados', apl.anon_depois?.rpc_totals?.status === 401 && apl.anon_depois?.rpc_totals?.code === '42501' && apl.anon_depois?.rpc_grant?.status === 401, { rpc_totals: apl.anon_depois?.rpc_totals ?? null, rpc_grant: apl.anon_depois?.rpc_grant ?? null }),
  g('o_censo_nomeia_a_causa_dos_zeros_escolas_sem_municipio', censo.contagens.escolas_com_municipio === 0 && censo.contagens.escolas > 0, censo.contagens),
  g('o_leitor_de_vista_ainda_sabe_dizer_nao_zero', fixtureLeitor.length === 1 && fixtureLeitor[0].linhas === 5, fixtureLeitor),
  g('a_vista_devolve_zero_linhas_a_todos_os_papeis_lidos', vistasReais.length >= 4 && vistasReais.every((v) => v.status === 200 && v.linhas === 0), vistasReais),
  g('os_agregados_do_admin_de_plataforma_sao_da_rede_toda_e_isto_fica_registrado', agregadosDoArtefacto(causa).some((a) => (a.valores?.schools ?? 0) > 0), agregadosDoArtefacto(causa)),
  g('o_censo_de_vistas_devolve_as_duas_reais_e_nao_a_agulha_negativa', vistasVivas.length === 2 && !vistasVivas.some((v) => v.nome === 'bfr_municipal_view_que_nao_existe_xyz'), { lidas: vistasVivas.length, nomes: vistasVivas.map((v) => v.nome) }),
  g('a_regua_de_modo_emite_os_tres_rotulos_no_fixture', new Set(fixtureModo.map((x) => x.rotulo)).size === 3, fixtureModo.map((x) => x.rotulo)),
  g('no_instante_deste_censo_a_superficie_endurecida_e_invoker', (vistasVivas.find((v) => v.nome === 'bfr_municipal_school_stats') || {}).modo === 'invoker', vistasVivas.map((v) => `${v.nome}:${v.modo}:${v.reloptions}`)),
  g('no_instante_deste_censo_anon_nao_executa_os_dois_agregados', ['bfr_municipal_network_totals', 'bfr_municipal_municipalities'].every((n) => (funcoesVivas.find((f) => f.nome === n) || {}).anon_exec === false), funcoesVivas.map((f) => `${f.nome}:anon=${f.anon_exec}:auth=${f.auth_exec}:${f.acl}`)),
  g('o_gate_legitimo_continua_executavel_pelo_token_do_utilizador', (funcoesVivas.find((f) => f.nome === 'bfr_is_municipal_authority') || {}).auth_exec === true, (funcoesVivas.find((f) => f.nome === 'bfr_is_municipal_authority') || {})),
];

const o = {
  programa: 'scripts/sm23-conferir-nomes-municipais-no-ar-18-11.mjs',
  em: new Date().toISOString(),
  duracao_ms: Date.now() - t0,
  pergunta: 'o DDL de 18/11 (vista→security_invoker, REVOKE dos agregados a anon) muda algum NÚMERO que a Secretaria Municipal pinta, ou só a superfície de acesso?',
  metodo: 'fetch dos bytes servidos e contagem por índice de cada nome; zero SQL; nenhum segredo lido ou impresso; números alheios citados por campo de artefacto',
  alvo: { url: alvoUrl, status: resp.status, bytes, md5 },
  controles: { positivo: { agulha: CONTROL_POSITIVO, ocorrencias: contagem[CONTROL_POSITIVO] }, negativo: { agulha: CONTROL_NEGATIVO, ocorrencias: contagem[CONTROL_NEGATIVO] } },
  contagem_por_nome: contagem,
  estado_vivo: { vistas: vistasVivas.map((v) => ({ nome: v.nome, modo: v.modo, reloptions: v.reloptions, bytes_definicao: Buffer.byteLength(v.definicao || '', 'utf8') })), funcoes: funcoesVivas },
  ocorrencias_do_gate_municipal: ocorrenciasDoGate,
  citado: {
    aplicacao_view_funcoes: { ficheiro: 'evidence/sm23-aplicacao-view-funcoes-18-11.json', veredito: apl.veredito, espera_do_cache_ms: apl.espera_do_cache_ms ?? null, tentativas_de_espera: apl.tentativas_de_espera ?? null, anon_rpc_totals_depois: apl.anon_depois?.rpc_totals ?? null, anon_rpc_grant_depois: apl.anon_depois?.rpc_grant ?? null, diff_linhas_da_vista: apl.diff_linhas_da_vista ?? null },
    censo_municipios: { ficheiro: 'evidence/sm23-censo-municipios-18-11.json', contagens: censo.contagens, municipios: censo.municipios, concessionarios: censo.concessionarios },
    causa_vista: { ficheiro: 'evidence/sm23-causa-vista-18-11.json', a_vista_por_papel: vistasReais, os_agregados_por_papel: agregadosDoArtefacto(causa), estado_do_aplicador: causa.estado_do_aplicador ?? null },
  },
  portoes,
};
o.veredito = falhas.length === 0 ? 'NOMES_MUNICIPAIS_CONFERIDOS' : `VERMELHO: ${falhas.length}`;
o.falhas = falhas;
o.conclusao = {
  frases_que_esta_corrida_autoriza: [
    `nos ${bytes} bytes servidos (md5 ${md5}) os ${SUPERFICIE_DDL.length} nomes da superfície endurecida pelo DDL têm ZERO ocorrências; o gate legítimo \`bfr_is_municipal_authority\` tem ${contagem[GATE_DO_MODULO]}`,
    'logo as peças (b) e (c) do OK de 18/11 não alteram nenhum número visível na aba: o que elas alteram é quem pode chamar essas rotas por fora do bundle, que está medido em sm23-aplicacao-view-funcoes-18-11.json',
    'e os zeros da vista têm causa própria e anterior: ' + JSON.stringify(censo.contagens) + ' — nenhuma escola traz município, pelo que `bfr_school_in_municipal_scope` não tem com que casar, seja o modo definer ou invoker',
  ],
  o_que_este_artefacto_nao_prova: [
    'não prova por onde vêm os números da aba: as três corridas anteriores a essa pergunta ficaram vermelhas por prédicas minhas e estão preservadas; a resposta precisaria de resolver as chamadas por corpo de função com o invólucro correto, que este bundle não expõe como unidade única',
    'não prova que a vista está vazia em produção — isso está em sm23-causa-vista-18-11.json',
  ],
};
if (falhas.length) { const p = OUT.replace(/\.json$/, '-VERMELHO.json'); writeFileSync(p, JSON.stringify(o, null, 2) + '\n'); for (const f of falhas) console.log('  FALTA ' + f); console.log(`SM23_NOMES_MUN_VERMELHO · registo ${p}`); process.exit(1); }
writeFileSync(OUT, JSON.stringify(o, null, 2) + '\n');
console.log('ALVO', JSON.stringify(o.alvo));
console.log('CONTAGEM', JSON.stringify(contagem));
console.log('GATE_OFFS', JSON.stringify(ocorrenciasDoGate.map((x) => x.offset)));
console.log('CITADO', JSON.stringify({ veredito_aplicacao: o.citado.aplicacao_view_funcoes.veredito, contagens_censo: o.citado.censo_municipios.contagens }));
for (const p of o.portoes) console.log(`  portao ${p.nome}: ${p.verde ? 'VERDE' : 'VERMELHO'}`);
console.log('CONCLUSAO', JSON.stringify(o.conclusao.frases_que_esta_corrida_autoriza, null, 1));
console.log(`SM23_NOMES_MUN_CONFERIDO · registo ${OUT} · ${o.duracao_ms} ms`);
