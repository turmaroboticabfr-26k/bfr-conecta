#!/usr/bin/env node
// P73-PEN42-PREFLIGHT — só leitura. A candidata `scripts/p73-pen42-ddl-candidata.sql` ADDIRA uma função
// (`register_gate_checkin_v2`) que a bundle servida já chama mas o catálogo não tem. Nada do que a candidata
// promete sobre o estado vivo fica em prosa no SQL: é medido aqui, e o verde deste programa é condição
// necessária (não suficiente) para qualquer OK de aplicação.
// Uso: node scripts/p73-pen42-preflight.mjs            (modo candidata: exige a ausência do nome no catálogo)
//      node scripts/p73-pen42-preflight.mjs --reversao (modo reversao: exige que a aplicação já tenha acontecido)
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sql } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const MODO = process.argv.includes('--reversao') ? 'reversao' : 'candidata';
const SUF = process.env.P73_SUF ? '-' + process.env.P73_SUF : '';
const OUT = join(REPO, `evidence/p73-pen42-preflight-${MODO}-21-11${SUF}.json`);
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com P73_SUF=novo, não por cima');
const CAM_CAND = 'scripts/p73-pen42-ddl-candidata.sql';
const CAM_REV = 'scripts/p73-pen42-ddl-reversao.sql';
const CAM_BUNDLE = 'bfr-candidata-v142-painel-na-troca/index.html';
const NOME = 'register_gate_checkin_v2';
const VIVA = 'register_gate_checkin';
const BUNDE_ESPERADA = { bytes: 3556664, md5: '0e22e78fe1e0ce929ec4717f86365ad9' };
for (const c of [CAM_CAND, CAM_REV, CAM_BUNDLE]) if (!existsSync(join(REPO, c))) throw new Error('ABORTA: falta a peça ' + c);

const md5 = (s) => createHash('md5').update(s).digest('hex');
const cru = (p) => readFileSync(join(REPO, p), 'utf8');
const semComentarios = (t) => t.split(/\r?\n/).map((l) => l.replace(/--.*$/, '')).join('\n');
const textoCand = semComentarios(cru(CAM_CAND));
const textoRev = semComentarios(cru(CAM_REV));
const conta = (re, t) => [...t.matchAll(re)].length;

// ---- normalizadores, uma prédica por classe -------------------------------------
// O catálogo devolve `nome tipo` separados por vírgula, sem DEFAULT; a candidata declara DEFAULTs e escreve
// tipos de duas palavras (`timestamp with time zone`). Comparar as duas formas cruas daria vermelho da sonda,
// por isso cada classe tem o seu normalizador e os dois são verificados contra o mesmo fixture.
const separa = (t) => t.split(',').map((x) => x.trim().replace(/\s+/g, ' ')).filter(Boolean).join(', ');
const argsDeDeclaracao = (t) => {
  const m = new RegExp(`CREATE OR REPLACE FUNCTION public\\.${NOME}\\(([\\s\\S]*?)\\)\\s*RETURNS`, 'm').exec(t);
  if (!m) throw new Error('CANDIDATA_SEM_DECLARACAO_DE_ARGS');
  return separa(m[1].split(',').map((a) => a.replace(/DEFAULT[\s\S]*$/i, '').trim()).filter(Boolean).join(','));
};
const nomesDeDeclaracao = (t) => argsDeDeclaracao(t).split(', ').map((a) => a.split(' ')[0]).sort().join(',');
const colunasDeDeclaracao = (t) => {
  const m = /RETURNS\s+TABLE\(([\s\S]*?)\)\s*LANGUAGE/.exec(t);
  if (!m) throw new Error('CANDIDATA_SEM_RETURNS_TABLE');
  return separa(m[1]);
};
const colunasDoCatalogo = (resultado) => {
  const m = /\(([\s\S]*)\)/.exec(String(resultado).replace(/\s+/g, ' '));
  if (!m) throw new Error('CATALOGO_SEM_TABELA_DE_COLUNAS');
  return separa(m[1]);
};

// ---- estado vivo ----------------------------------------------------------------
const viva = await sql(`select p.oid, p.prosecdef as definer, coalesce(array_to_string(p.proconfig,';'),'<sem set>') as config,
    p.provolatile as volatilidade, pg_get_function_identity_arguments(p.oid) as identidade,
    pg_get_function_result(p.oid) as resultado, coalesce(array_to_string(p.proacl,','),'<nenhum>') as acl
  from pg_proc p join pg_namespace nn on nn.oid=p.pronamespace
  where nn.nspname='public' and p.proname='${VIVA}'`);
if (viva.length !== 1) throw new Error(`ABORTA: esperava uma ${VIVA} no catálogo, li ${viva.length}`);
const v = viva[0];
const identidadeViva = String(v.identidade).replace(/\s+/g, ' ');
const colunasVivas = colunasDoCatalogo(v.resultado);
const dono = (await sql(`select pg_get_userbyid(p.proowner) as dono from pg_proc p
  join pg_namespace nn on nn.oid=p.pronamespace where nn.nspname='public' and p.proname='${VIVA}'`))[0].dono;
const linhasV2 = (await sql(`select count(*)::int as n from pg_proc p join pg_namespace nn on nn.oid=p.pronamespace
  where nn.nspname='public' and p.proname='${NOME}'`))[0].n;
const aclViva = String(v.acl).split(',').map((x) => x.trim()).filter(Boolean);
const papeisVivos = [...new Set(aclViva.map((x) => x.split('=')[0]))].filter(Boolean).sort();
const vivaTemPublic = aclViva.some((x) => x.startsWith('='));

// ---- estrutura das duas peças ---------------------------------------------------
const estrutura = (t) => ({
  create_function: conta(/^\s*CREATE\s+(OR\s+REPLACE\s+)?FUNCTION/gim, t),
  drop_function: conta(/^\s*DROP\s+FUNCTION/gim, t),
  alter: conta(/^\s*ALTER/gim, t),
  drop_policy: conta(/^\s*DROP\s+POLICY/gim, t),
  create_policy: conta(/^\s*CREATE\s+POLICY/gim, t),
  grant_execute: conta(/^\s*GRANT\s+EXECUTE/gim, t),
  revoke: conta(/^\s*REVOKE/gim, t),
  comment: conta(/^\s*COMMENT\s+ON/gim, t),
  insert: conta(/\binsert\s+into\b/gi, t),
  update: conta(/\bupdate\s+public\./gi, t),
  delete: conta(/\bdelete\s+from\b/gi, t),
});
const estCand = estrutura(textoCand);
const estRev = estrutura(textoRev);

// O corpo do revestimento: tem de chamar a viva, qualificada, e nunca a si próprio. Os nomes passados por
// notação nomeada têm de ser exactamente os seis declarados, e nenhum pode colidir com uma coluna devolvida —
// em `LANGUAGE sql` uma colisão dessas seria resolvida pela coluna, não pelo parâmetro.
const corpoCand = (() => { const m = /\bAS\s+\$fn\$([\s\S]*?)\$fn\$/m.exec(textoCand); return m ? m[1] : ''; })();
const chamaViva = conta(/public\.register_gate_checkin\s*\(/g, corpoCand);
const chamaSelf = conta(new RegExp(`\\b${NOME}\\s*\\(`, 'g'), corpoCand);
const nomesEncaminhados = [...corpoCand.matchAll(/([a-z_]+)\s*=>/g)].map((m) => m[1]).sort().join(',');
const colunasSelecionadas = ((m) => (m ? separa(m[1]) : ''))(/SELECT([\s\S]*?)FROM\s+public\.register_gate_checkin/i.exec(corpoCand));
const nomesDeColunasVivas = colunasVivas.split(', ').map((c) => c.split(' ')[0]);
const nomesSelecionados = colunasSelecionadas.split(', ').map((c) => c.replace(/^c\./, ''));
const colisaoComColunas = nomesDeDeclaracao(textoCand).split(', ').filter((n) => nomesDeColunasVivas.includes(n)).join(',');

// ---- o que o front servido promete (medido nos bytes, não na memória) -----------
const html = cru(CAM_BUNDLE);
const chamadasV2 = conta(new RegExp(`rpc\\(\\s*'${NOME}'`, 'g'), html);
const chamadasViva = conta(new RegExp(`rpc\\(\\s*'${VIVA}'`, 'g'), html);
const chavesDasChamadas = (() => {
  const i = html.indexOf(`rpc('${NOME}',params)`);
  if (i < 0) throw new Error('BUNDE_SEM_O_RAMO_MEDIDO');
  const chave = (de) => {
    const a = html.indexOf('{', de);
    if (a < 0) return null;
    let fundo = a, prof = 0;
    for (let k = a; k < html.length; k += 1) {
      if (html[k] === '{') prof += 1;
      else if (html[k] === '}') { prof -= 1; if (prof === 0) { fundo = k; break; } }
    }
    const corpo = html.slice(a + 1, fundo);
    return [...corpo.matchAll(/(?:^|,)\s*([a-z_]+):/g)].map((m) => m[1]);
  };
  const sitios = [];
  let p = i;
  for (let n = 0; n < 2; n += 1) { p = html.indexOf('registerGateCheckin(client,', p + 1); if (p < 0) break; sitios.push(p); }
  if (sitios.length !== 2) throw new Error(`BUNDE_COM_${sitios.length}_CHAMADORES_DO_RAMO_NAO_LEGADO`);
  const tudo = [...new Set(sitios.flatMap((s) => chave(s) || []))].sort().join(',');
  return { nomes: tudo, sitios: sitios.join(',') };
})();
const ramoLegado = (() => {
  const i = html.indexOf(`rpc('${NOME}',params)`);
  const recorte = html.slice(Math.max(0, i - 320), i + 120);
  return { legado_chama_viva: /gateLegacyMode\(\)\s*\?\s*client\.rpc\('register_gate_checkin'/.test(recorte), bytes_ancora: i };
})();
// Cada sitio do nome vivo é ou o ramo legado da condicional que também chama o nome ausente, ou uma chamada
// directa do módulo antigo (que declara `registerGateCheckin(token, source = 'manual')` e nunca viu o sufixo).
// Um sitio que não caiba nas duas classes é código novo a chamar a viva por um caminho que este preflight não
// conhece, e é isso que `nao_classificados` apanha — a contagem crua dos sitios não é promessa de nada.
const inicioModuloNovo = html.indexOf('function gateLegacyMode()');
// Concatenação explícita em vez de interpolação dentro de template: escrever `\\${VIVA}` produz `\` + o nome,
// e o regex recebe `\r` (entrada de carro) no meio do identificador — a sonda deixaria de ver sitios nenhum e
// o portão passaria verde sobre um conjunto vazio. Foi exactamente assim que este portão esteve vermelho.
const RE_SITIO_VIVA = new RegExp("rpc\\('" + VIVA + "'", 'g');
const sitiosVivos = [...html.matchAll(RE_SITIO_VIVA)].map((m) => {
  const antes = html.slice(Math.max(0, m.index - 160), m.index);
  // A agulha só pode olhar para o que fica ANTES do match: `rpc('<nome>'` já foi consumido, e exigi-lo aqui
  // dava ramo_legado zero e um sitio «NAO_CLASSIFICADO» — o vermelho que esta corrida apanhou.
  if (/gateLegacyMode\(\)\s*\?\s*client\.$/.test(antes)) return { bytes: m.index, classe: 'ramo_legado' };
  if (inicioModuloNovo > 0 && m.index < inicioModuloNovo) return { bytes: m.index, classe: 'modulo_antigo' };
  return { bytes: m.index, classe: 'NAO_CLASSIFICADO' };
});
const porClasse = (c) => sitiosVivos.filter((s) => s.classe === c).length;

// ---- fixtures: a régua tem de chumbar com o falso -------------------------------
const FIX_ARG_OK = 'target_badge_token uuid, gate_direction text, visual_confirmation boolean, intake_source text, target_shift text, exception_reason text';
const FIX_TIPO_TROCADO = FIX_ARG_OK.replace('visual_confirmation boolean', 'visual_confirmation text');
const FIX_ARIDADE = FIX_ARG_OK.replace(', exception_reason text', '');
const FIX_DEFAULT_PRESO = "target_badge_token uuid, gate_direction text DEFAULT 'entry'::text";
const FIX_COLUNAS_DUAS_PALAVRAS = 'checked_at timestamp with time zone, entry_status text';
const FIX_COLUNA_A_MAIS = colunasVivas + ', nada_toque text';

const falhas = [];
const portoes = [];
const gate = (nome, obtido, esperado) => {
  portoes.push(nome);
  const o = JSON.stringify(obtido), e = JSON.stringify(esperado);
  if (o !== e) falhas.push({ portao: nome, obtido: o, esperado: e });
};

gate('o_estado_vivo_bate_com_o_que_este_modo_pressupoe',
  [MODO === 'candidata' ? linhasV2 === 0 : linhasV2 >= 1, v.definer === true,
    v.config.includes('search_path=""'), v.volatilidade === 'v', dono],
  [true, true, true, true, 'postgres']);
gate('a_identidade_declarada_na_candidata_e_a_identidade_medida_da_viva',
  [argsDeDeclaracao(textoCand) === identidadeViva, identidadeViva === FIX_ARG_OK,
    argsDeDeclaracao(textoCand) === FIX_ARG_OK, nomesDeDeclaracao(textoCand) === nomesEncaminhados],
  [true, true, true, true]);
gate('as_colunas_devolvidas_batem_na_ordem_e_o_tipo_de_duas_palavras_preserva_se',
  [colunasDeDeclaracao(textoCand) === colunasVivas, /timestamp with time zone/.test(colunasVivas),
    nomesSelecionados.length === 11, nomesSelecionados.join(',') === nomesDeColunasVivas.join(',')],
  [true, true, true, true]);
gate('a_candidata_e_somente_aditiva_e_a_reversao_somente_retira',
  [estCand.create_function, estCand.alter, estCand.drop_function, estCand.drop_policy, estCand.create_policy,
    estCand.insert, estCand.update, estCand.delete, estCand.grant_execute, estCand.revoke,
    estRev.create_function, estRev.drop_function, estRev.alter, estRev.grant_execute, estRev.revoke],
  [1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0]);
gate('o_revestimento_chama_a_viva_qualificada_e_nunca_a_si_proprio',
  [chamaViva, chamaSelf, corpoCand.length > 40, colunasSelecionadas.split(', ').every((c) => /^c\./.test(c)),
    nomesSelecionados.length === nomesDeColunasVivas.length],
  [1, 0, true, true, true]);
gate('nenhum_parametro_colide_com_uma_coluna_devolvida',
  [colisaoComColunas, /public\.register_gate_checkin\(/.test(corpoCand)], ['', true]);
gate('os_privilegios_declarados_na_candidata_batem_com_os_medidos_na_viva',
  [estCand.grant_execute, estCand.revoke, /GRANT EXECUTE ON FUNCTION public\.register_gate_checkin_v2\([^)]*\) TO authenticated, service_role/.test(textoCand),
    /REVOKE ALL ON FUNCTION public\.register_gate_checkin_v2\([^)]*\) FROM PUBLIC/.test(textoCand),
    [...new Set(['authenticated', 'service_role', dono])].sort().join(','), papeisVivos.join(','), vivaTemPublic],
  [1, 1, true, true, 'authenticated,postgres,service_role', 'authenticated,postgres,service_role', false]);
gate('o_front_servido_chama_o_nome_ausente_exactamente_uma_vez',
  [chamadasV2, Buffer.byteLength(html), md5(html), ramoLegado.legado_chama_viva],
  [1, BUNDE_ESPERADA.bytes, BUNDE_ESPERADA.md5, true]);
// A relação que importa não é «quantos sitios», é «cada sitio do nome vivo pertence a uma das duas classes
// conhecidas, e o unico sitio legado existe porque existe um sitio do nome ausente». Um sitio novo que não
// caiba em nenhuma das duas classes, ou um ramo legado sem contrapartida, chumba aqui.
gate('todos_os_sitios_do_nome_vivo_estao_classificados_e_o_legado_tem_par_do_ausente',
  [porClasse('NAO_CLASSIFICADO'), porClasse('ramo_legado') === chamadasV2, porClasse('modulo_antigo') >= 1,
    sitiosVivos.length === porClasse('ramo_legado') + porClasse('modulo_antigo') + porClasse('NAO_CLASSIFICADO'),
    inicioModuloNovo > 0],
  [0, true, true, true, true]);
gate('as_chaves_que_o_chamador_passa_batem_com_os_seis_argumentos',
  [chavesDasChamadas.nomes, chavesDasChamadas.nomes.split(',').length], [nomesDeDeclaracao(textoCand), 6]);
gate('a_regua_tem_dentes_contra_os_seis_falsos', [
  FIX_ARG_OK === FIX_TIPO_TROCADO,
  FIX_ARG_OK === FIX_ARIDADE,
  FIX_DEFAULT_PRESO === identidadeViva,
  separa(FIX_COLUNAS_DUAS_PALAVRAS) === 'checked_at timestamp with time zone, entry_status text',
  colunasDeDeclaracao(textoCand) === FIX_COLUNA_A_MAIS,
  new RegExp(`\\b${NOME}\\s*\\(`, 'g').test(corpoCand) === (chamaSelf > 0)],
  [false, false, false, true, false, true]);
gate('nenhum_identificador_pessoal_nem_token_entra_neste_registo', (() => {
  const probe = JSON.stringify({ identidadeViva, colunasVivas, papeisVivos, chaves: chavesDasChamadas.nomes, estCand, estRev, corpoCand });
  return [/eyJ[A-Za-z0-9_-]{10,}/.test(probe), /(senha|password|passwd)\s*[:=]\s*["'][^"']{6,}/i.test(probe), /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(probe)];
})(), [false, false, false]);

const saida = {
  programa: 'scripts/p73-pen42-preflight.mjs', modo: MODO, em: new Date().toISOString(),
  metodo: 'pg_proc e pg_get_function_* pela Management API (sem JWT de sessão, logo sem RLS e sem escrita); a identidade esperada lê-se da declaração da candidata e confirma-se contra o catálogo; as chamadas contam-se nos bytes do bundle servido',
  pecas: {
    candidata: { caminho: CAM_CAND, bytes: Buffer.byteLength(cru(CAM_CAND)), md5: md5(cru(CAM_CAND)) },
    reversao: { caminho: CAM_REV, bytes: Buffer.byteLength(cru(CAM_REV)), md5: md5(cru(CAM_REV)) },
    bundle: { caminho: CAM_BUNDLE, bytes: Buffer.byteLength(html), md5: md5(html) },
  },
  viva: { oid: v.oid, nome: VIVA, dono, definer: v.definer, config: v.config, volatilidade: v.volatilidade, identidade: identidadeViva, colunas: colunasVivas, papeis: papeisVivos, tem_public: vivaTemPublic },
  ausente_no_catalogo: { nome: NOME, linhas_em_pg_proc: linhasV2 },
  estrutura: { candidata: estCand, reversao: estRev },
  front: { chamadas_ao_nome_ausente: chamadasV2, chamadas_a_viva: chamadasViva, chaves_passadas: chavesDasChamadas.nomes,
    sitios_do_chamador: chavesDasChamadas.sitios, ramo_legado_chama_viva: ramoLegado.legado_chama_viva, indice_do_ramo_medido: ramoLegado.bytes_ancora,
    sitios_vivos_classificados: sitiosVivos, por_classe: { ramo_legado: porClasse('ramo_legado'), modulo_antigo: porClasse('modulo_antigo'), nao_classificados: porClasse('NAO_CLASSIFICADO') },
    inicio_do_modulo_novo: inicioModuloNovo },
  o_que_este_verde_nao_autoriza: 'nada: é leitura. Aplicar a candidata, publicar seja o que for, escrever no banco e git push continuam a pedir cada um a sua frase literal.',
  o_que_este_verde_nao_prova: 'que a aplicação da candidata faça a portaria funcionar de ponta a ponta: isso só se mede depois, no browser. E a frase que aqui estava antes de 21/11 estava invertida contra os bytes, pelo que fica corrigida por medida: `gateLegacyMode()` é `state.loaded && (state.errors.includes("configuração de turnos") || state.errors.includes("calendário letivo"))`, e o estado medido de hoje — `B_hoje_200_com_zero_linhas` em `evidence/p73-rm52-estado-calendario-20-11.txt` — tem as mesas criadas a devolver 200 com zero linhas, logo nenhuma das duas etiquetas entra e o check-in já chama o nome ausente com `lanca=true`. O ramo legado só tinha valor no estado A, antes do DDL do calendário, quando o fetch das mesas rebentava. Também não prova nada sobre `bfr_confirm_school_calendar` nem `correct_gate_attendance`, que este instrumento não abre.',
  portoes, falhas,
};
saida.veredito = falhas.length === 0
  ? `P73_PEN42_PREFLIGHT_VERDE_${MODO.toUpperCase()} ${portoes.length}/0`
  : `P73_PEN42_PREFLIGHT_VERMELHO_${MODO.toUpperCase()} ${falhas.length} de ${portoes.length} portoes`;
writeFileSync(OUT, JSON.stringify(saida, null, 2) + '\n');
console.log(`MODO ${MODO} · candidata ${saida.pecas.candidata.md5} ${saida.pecas.candidata.bytes} B · reversao ${saida.pecas.reversao.md5} ${saida.pecas.reversao.bytes} B`);
console.log(`VIVA oid=${saida.viva.oid} dono=${saida.viva.dono} definer=${saida.viva.definer} config=${saida.viva.config} papeis=${JSON.stringify(saida.viva.papeis)}`);
console.log(`IDENTIDADE_VIVA ${identidadeViva}`);
console.log(`IDENTIDADE_CANDIDATA ${argsDeDeclaracao(textoCand)}`);
console.log(`COLUNAS ${colunasVivas}`);
console.log(`AUSENTE ${NOME} linhas_em_pg_proc=${linhasV2}`);
console.log(`FRONT chamadas_v2=${chamadasV2} chamadas_viva=${chamadasViva} classes=${JSON.stringify(saida.front.por_classe)} chaves=${saida.front.chaves_passadas}`);
console.log(`ESTRUTURA candidata ${JSON.stringify(estCand)}`);
console.log(`ESTRUTURA reversao ${JSON.stringify(estRev)}`);
for (const f of falhas) console.log(`  FALHA ${f.portao} obtido=${f.obtido} esperado=${f.esperado}`);
console.log(`${saida.veredito} · ${portoes.length} portoes · registo ${OUT}`);
process.exit(falhas.length === 0 ? 0 : 1);
