// BU-4/5/6/7 insumo — digestão das evidências já medidas (bu2, bu2b, bu2c, bu2d, bu3) num único
// artefacto compacto, com as pegadas dos ficheiros lidos e portões de coerência entre eles.
// Só-leitura: nada toca o banco; os números vêm dos artefactos, e o que é re-extraído é re-extraído do bundle em disco.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = process.env.BU4_SUF || '';
const OUT = `${DIR}/evidence/bu4-digestao-para-documentacao-20-11${SUF}.json`;
const TXT = `${DIR}/evidence/bu4-digestao-para-documentacao-20-11${SUF}.txt`;
if (existsSync(OUT) || existsSync(TXT)) throw new Error(`ABORTA: ${OUT} já existe — correr com BU4_SUF novo`);
const t0 = Date.now();

const FONTE = {
  censo: `${DIR}/evidence/bu2-censo-catalogo-20-11.json`,
  grants: `${DIR}/evidence/bu2b-matriz-de-acesso-20-11.json`,
  caminhos: `${DIR}/evidence/bu2c-caminhos-de-autorizacao-20-11c.json`,
  sem_mecanismo: `${DIR}/evidence/bu2d-politicas-sem-mecanismo-20-11.json`,
  pegada: process.env.BU4_PEGADA || `${DIR}/evidence/bu3-pegada-de-modulos-20-11e-VERMELHO-de-tres-rpcs-chamados-e-inexistentes.json`,
};
const lidos = {};
for (const [k, p] of Object.entries(FONTE)) {
  if (!existsSync(p)) throw new Error(`falta a evidência ${k} em ${p} — a digestão não se inventa`);
  const txt = readFileSync(p, 'utf8');
  lidos[k] = JSON.parse(txt);
  if (k === 'pegada' && !lidos[k].pegada_global?.secoes_globais) throw new Error(`ABORTA: a pegada lida em ${p.replace(DIR + '/', '')} não declara secoes_globais — é variante superada, aponte BU4_PEGADA para a que declara`);
  FONTE[k] = { caminho: p.replace(DIR + '/', ''), bytes: Buffer.byteLength(txt, 'utf8'), md5: createHash('md5').update(txt).digest('hex') };
}

const res = {
  em: new Date().toISOString(), modo: 'read-only', instrumento: 'scripts/bu4-digestao-de-evidencias-20-11.mjs',
  fontes: FONTE,
};

// os campos do censo vêm embrulhados em {rotulo, ok, linhas:[…]} — desembolar é função do produtor, não memória
const desembrulha = (obj, pegaPrimeira) => {
  if (obj && Array.isArray(obj.linhas)) return pegaPrimeira ? (obj.linhas[0] ?? null) : obj.linhas;
  return obj ?? null;
};
const objetos = desembrulha(lidos.censo.objetos) || [];
const tabelasCenso = lidos.censo.tabelas || [];

// 1. catálogo e volume de dados
res.catalogo = {
  objetos, politicas: desembrulha(lidos.censo.politicas, true), funcoes: desembrulha(lidos.censo.funcoes, true),
  triggers: desembrulha(lidos.censo.triggers, true), realtime: desembrulha(lidos.censo.realtime, true),
  views: desembrulha(lidos.censo.views), buckets_no_censo: desembrulha(lidos.censo.buckets, true),
  classes_de_dados: lidos.censo.classes_de_dados, nucleares_nao_encontradas: lidos.censo.nucleares_nao_encontradas,
  pegada_consulta_politicas: lidos.censo.pegada_consulta_politicas,
  tabelas_rls_ativa: tabelasCenso.filter((t) => t.rls === true).length,
  tabelas_rls_forcada: tabelasCenso.filter((t) => t.forca === true).length,
  tabelas_com_politica: tabelasCenso.filter((t) => t.politicas > 0).length,
  veredito_censo: lidos.censo.veredito_final,
  gates_vermelhos_censo: (lidos.censo.veredictos || []).filter((g) => g.veredito === 'VERMELHO').map((g) => g.nome),
};
res.volumes = desembrulha(lidos.censo.volumes_exatos, true);
res.contas_por_papel = Object.fromEntries((desembrulha(lidos.censo.contas_por_papel) || []).map((l) => [l.papel, l.contas]));
res.papeis_enum = lidos.caminhos.papeis_enum;
res.cargos_aparecem_na_matriz_do_censo = lidos.censo.cargos_aparecem_na_matriz;
res.cargos_sem_politica_que_o_nomeie_no_censo = lidos.censo.cargos_sem_politica_que_o_nomeie;

// 2. autorização: mecanismos, matriz por papel com as listas inteiriças
res.autorizacao = {
  veredito: lidos.caminhos.veredito_final, pegada_matriz: lidos.caminhos.pegada_matriz,
  politicas_lidas: lidos.caminhos.politicas_lidas, tabelas_total: lidos.caminhos.tabelas_total,
  mecanismos: lidos.caminhos.mecanismos, multipla_mecanismo: lidos.caminhos.politicas_com_varios_mecanismos,
  tabelas_sem_politica: lidos.caminhos.tabelas_sem_politica,
  alcancadas_por_nenhum_papel: lidos.caminhos.tabelas_alcancadas_por_nenhum_papel,
  sem_porta_de_papel: lidos.caminhos.politicas_sem_porta_de_papel,
  cortes_de_fechamento: lidos.caminhos.cortes_de_fechamento_transitivo,
  helpers: lidos.caminhos.helpers.map((h) => ({ nome: h.nome, definer: h.definer, cargos: h.cargos_por_regua_larga })),
  por_papel: Object.fromEntries(res.papeis_enum.map((p) => {
    const m = lidos.caminhos.matriz[p];
    return [p, { leitura_n: m.leitura_larga_n, escrita_n: m.escrita_larga_n, leitura_estreita_n: m.leitura_estreita_n,
      escrita_estreita_n: m.escrita_estreita_n, leitura: m.leitura_larga, escrita: m.escrita_larga }];
  })),
};
res.resumo_por_tabela = lidos.caminhos.resumo_por_tabela;

// 3. o que o bundle chama
res.bundle = {
  veredito: lidos.pegada.veredito_final, caminho: lidos.pegada.bundle.caminho, md5: lidos.pegada.bundle.md5,
  bytes: lidos.pegada.bundle.bytes, ar: lidos.pegada.ar, tags: lidos.pegada.tags,
  agregado: lidos.pegada.agregado, pegada_global: lidos.pegada.pegada_global, regioes: lidos.pegada.regioes.map((r) => ({
    nome: r.nome, chars: r.chars, diferido: r.diferido, desativado: r.desativado, critico_para: r.critico_para,
    src: r.src, n_tabelas: r.tabelas.length, tabelas: r.tabelas, rpcs: r.rpcs, rpcs_fora_do_catalogo: r.rpcs_fora_do_catalogo,
    buckets: r.buckets, canais: r.canais, secoes: r.secoes, n_selectores: r.n_selectores,
    papeis_alcancaveis: r.papeis_alcancaveis, mesas_sem_caminho_de_papel: r.mesas_sem_caminho_de_papel,
  })),
};
// re-extração do bundle em disco: os RPCs que faltam têm de continuar a faltar, senão a evidência é velha
const bundleTxt = readFileSync(`${DIR}/${lidos.pegada.bundle.caminho}`, 'utf8');
const rpcsAgora = [...new Set([...bundleTxt.matchAll(/\.rpc\(\s*'([a-z_0-9]+)'/g)].map((m) => m[1]))].sort();
const citadasAgora = [...new Set([...bundleTxt.matchAll(/\.from\(\s*'([a-z_0-9]+)'/g)].map((m) => m[1]))].sort();

// 4. mesas do catálogo que a interface nunca nomeia, agrupadas por família de prefixo
const orfas = lidos.pegada.mesas_do_catalogo_sem_citacao_no_bundle;
const familias = {};
for (const t of orfas) {
  const pref = t.includes('_') ? t.slice(0, t.indexOf('_')) : t;
  (familias[pref] ||= []).push(t);
}
res.mesas_orfas_por_familia = Object.fromEntries(Object.entries(familias).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
  .map(([k, v]) => [k, { n: v.length, nomes: v }]));

// 5. storage e grants
res.storage_e_grants = { buckets: desembrulha(lidos.grants.buckets) ?? lidos.grants.buckets,
  grants_funcoes: desembrulha(lidos.grants.grants_funcoes) ?? lidos.grants.grants_funcoes,
  grants_tabelas: desembrulha(lidos.grants.grants_tabelas) ?? lidos.grants.grants_tabelas,
  veredito_grants: lidos.grants.veredito_final, estilos_de_politica_no_censo: lidos.grants.estilo ?? null,
  literais_fora_do_enum_no_censo: lidos.grants.literais_fora_do_enum ?? null };
res.sem_mecanismo = { veredito: lidos.sem_mecanismo.veredito_final,
  politica_total: lidos.sem_mecanismo.politica_total_no_catalogo,
  sem_mecanismo_na_predica_anterior: lidos.sem_mecanismo.politicas_sem_mecanismo_na_predica_da_bu2c,
  tabelas_envolvidas: lidos.sem_mecanismo.tabelas_envolvidas,
  por_candidato: lidos.sem_mecanismo.por_candidato_de_mecanismo,
  sem_nenhum_candidato: lidos.sem_mecanismo.sem_nenhum_candidato_lista };

// portões de coerência entre evidências
const gates = [];
const G = (nome, cond, detalhe) => gates.push({ nome, veredito: cond ? 'VERDE' : 'VERMELHO', detalhe });
const papeisSemLista = res.papeis_enum.filter((p) => Array.isArray(res.autorizacao.por_papel[p].leitura) === false);
G('todo_papel_do_enum_tem_lista_de_leitura_e_escrita_na_digestao', papeisSemLista.length === 0, { ausentes: papeisSemLista });
const trocados = res.papeis_enum.filter((p) => res.autorizacao.por_papel[p].leitura.length !== res.autorizacao.por_papel[p].leitura_n
  || res.autorizacao.por_papel[p].escrita.length !== res.autorizacao.por_papel[p].escrita_n);
G('os_contadores_da_matriz_batem_com_o_comprimento_das_listas', trocados.length === 0, { trocados });
const desalinhados = res.bundle.regioes.filter((r) => r.tabelas.length !== r.n_tabelas);
G('a_soma_das_regioes_igual_o_censo_de_regioes_do_produtor', res.bundle.regioes.length === lidos.pegada.regioes_n, { digestao: res.bundle.regioes.length, produtor: lidos.pegada.regioes_n });
G('nenhuma_regiao_e_perdida_na_digestao', desalinhados.length === 0, { desalinhados: desalinhados.map((r) => r.nome) });
const glob = lidos.pegada.pegada_global || {};
const globTabelas = glob.tabelas_globais || [];
const fora = (glob.rpcs_fora_do_catalogo || []);
G('os_rpcs_fora_do_catalogo_persistem_no_bundle_em_disco', fora.length > 0 && fora.every((n) => rpcsAgora.includes(n)), { no_artefacto: fora, no_bundle_agora: rpcsAgora });
G('a_pegada_global_do_produtor_e_subconjunto_da_re_extracao_do_documento', globTabelas.length === (glob.tabelas_n ?? -1)
  && globTabelas.filter((t) => citadasAgora.includes(t)).length === globTabelas.length,
  { globais_no_artefacto: glob.tabelas_n, globais_na_lista: globTabelas.length, dentro_da_re_extracao: globTabelas.filter((t) => citadasAgora.includes(t)).length,
    re_extracao_do_documento: citadasAgora.length, so_na_re_extracao: citadasAgora.filter((t) => !globTabelas.includes(t)) });
const orfasContraditasNoGlobal = orfas.filter((t) => globTabelas.includes(t) || citadasAgora.includes(t));
G('as_mesas_orfas_nao_sao_chamadas_em_nenhum_texto_do_documento', orfasContraditasNoGlobal.length === 0, { contraditas: orfasContraditasNoGlobal, orfas: orfas.length });
const perdidasNaGlobal = lidos.pegada.regioes.flatMap((r) => r.tabelas).filter((t) => !globTabelas.includes(t));
G('a_pegada_global_nao_perde_nenhuma_mesa_das_regioes_identificadas', perdidasNaGlobal.length === 0, { perdidas: [...new Set(perdidasNaGlobal)], globais: glob.tabelas_n, das_regioes: res.bundle.agregado.tabelas_citadas_pelo_bundle });
G('os_rpcs_globais_do_bundle_sao_um_superconjunto_dos_dos_artefactos_de_regioes', res.bundle.agregado.rpcs_fora_do_catalogo.every((n) => (glob.rpcs_globais || []).includes(n))
  && (glob.rpcs_globais || []).length === (glob.rpcs_n ?? -1), { globais: glob.rpcs_n, lista: (glob.rpcs_globais || []).length, so_fora_das_regioes: glob.rpcs_citados_so_fora_das_regioes_identificadas });
const somasOrfas = Object.values(res.mesas_orfas_por_familia).reduce((s, v) => s + v.n, 0);
G('o_agrupamento_por_familia_preserva_o_censo_de_orfas', somasOrfas === orfas.length, { soma: somasOrfas, censo: orfas.length });
const semPapelNasRegioes = res.bundle.regioes.filter((r) => r.tabelas.length > 0 && r.papeis_alcancaveis.length === 0);
G('nenhuma_regiao_que_consulta_mesas_fica_sem_papel_na_digestao', semPapelNasRegioes.length === 0, { sem_papel: semPapelNasRegioes.map((r) => r.nome) });
G('a_pegada_da_matriz_e_a_do_produtor', res.autorizacao.pegada_matriz === lidos.caminhos.pegada_matriz, { digestao: res.autorizacao.pegada_matriz });
// as três evidências têm de concordar sobre o enum e sobre o número de tabelas, senão documento fala de três bancos
const enumDoCenso = desembrulha(lidos.censo.papeis_enum, true)?.papeis || [];
G('o_enum_do_censo_e_o_mesmo_da_matriz_de_caminhos', enumDoCenso.join(',') === res.papeis_enum.join(','), { censo: enumDoCenso, caminhos: res.papeis_enum });
const rNoCenso = objetos.find((o) => o.tipo === 'r')?.total ?? -1;
G('as_tres_fontes_contam_a_mesma_quantidade_de_tabelas', rNoCenso === res.autorizacao.tabelas_total && rNoCenso === lidos.censo.tabelas?.length,
  { censo_objetos: rNoCenso, caminhos: res.autorizacao.tabelas_total, lista_de_tabelas_do_censo: lidos.censo.tabelas?.length ?? null });
const politicasDoCenso = res.catalogo.politicas?.total ?? -1;
G('a_contagem_de_politicas_bate_entre_censo_e_caminhos', politicasDoCenso === res.autorizacao.politicas_lidas && politicasDoCenso === res.sem_mecanismo.politica_total,
  { censo: politicasDoCenso, caminhos: res.autorizacao.politicas_lidas, bu2d: res.sem_mecanismo.politica_total });
G('as_regioes_desativadas_sao_as_que_o_produtor_lista', res.bundle.regioes.filter((r) => r.desativado).map((r) => r.nome).sort().join(',') === (res.bundle.agregado.regioes_desativadas || []).sort().join(','),
  { digestao: res.bundle.regioes.filter((r) => r.desativado).map((r) => r.nome), produtor: res.bundle.agregado.regioes_desativadas });

res.veredictos = gates;
const vermelhas = gates.filter((g) => g.veredito === 'VERMELHO');
res.veredito_final = vermelhas.length === 0
  ? `BU4_DIGESTAO_VERDE ${gates.length}/0`
  : `BU4_DIGESTAO_VERMELHO ${gates.length - vermelhas.length}/${vermelhas.length} ${vermelhas.map((v) => v.nome).join(',')}`;
res.msd = Date.now() - t0;

writeFileSync(OUT, JSON.stringify(res, null, 2) + '\n');
const txt = [
  `veredito=${res.veredito_final}`,
  `fontes=${Object.entries(FONTE).map(([k, v]) => `${k}:${v.md5}(${v.bytes}B)`).join(' ')}`,
  `catalogo=${JSON.stringify(res.catalogo.objetos)} politicas=${JSON.stringify(res.catalogo.politicas)} funcoes=${JSON.stringify(res.catalogo.funcoes)} triggers=${JSON.stringify(res.catalogo.triggers)} realtime=${JSON.stringify(res.catalogo.realtime)}`,
  `vereditos_produtores=${res.catalogo.veredito_censo} | ${res.autorizacao.veredito} | ${res.storage_e_grants.veredito_grants} | ${res.sem_mecanismo.veredito} | ${res.bundle.veredito}`,
  `contas_por_papel=${Object.entries(res.contas_por_papel).map(([k, v]) => `${k}=${v}`).join(' ')}`,
  `volumes=${Object.entries(res.volumes || {}).map(([k, v]) => `${k}=${v}`).join(' ')}`,
  `rls=${res.catalogo.tabelas_rls_ativa}/${res.catalogo.objetos.find((o) => o.tipo === 'r')?.total} forca=${res.catalogo.tabelas_rls_forcada} com_politica=${res.catalogo.tabelas_com_politica} views=${(res.catalogo.views || []).length} buckets=${JSON.stringify(res.storage_e_grants.buckets)}`,
  `matriz=${res.papeis_enum.map((p) => `${p}:L${res.autorizacao.por_papel[p].leitura_n}/W${res.autorizacao.por_papel[p].escrita_n}`).join(' ')}`,
  `helpers_com_cargo_zero=${res.autorizacao.helpers.filter((h) => h.cargos.length === 0).map((h) => h.nome).join(',')}`,
  `bundle=${res.bundle.caminho} md5=${res.bundle.md5} regioes=${res.bundle.regioes.length} diferidas=${res.bundle.agregado.regioes_diferidas} desativadas=${res.bundle.agregado.regioes_desativadas.join(',')}`,
  `rpcs_fora=${res.bundle.agregado.rpcs_fora_do_catalogo.join(',')} tabelas_citadas=${res.bundle.agregado.tabelas_citadas_pelo_bundle} canais=${res.bundle.agregado.canais} buckets=${res.bundle.agregado.buckets.join(',')}`,
  `pegada_global=${JSON.stringify({ corpos: res.bundle.pegada_global.corpos, tabelas_n: res.bundle.pegada_global.tabelas_n, rpcs_n: res.bundle.pegada_global.rpcs_n, rpcs_fora: res.bundle.pegada_global.rpcs_fora_do_catalogo, canais: res.bundle.pegada_global.canais, secoes: res.bundle.pegada_global.secoes_globais.length, regioes_sem_identidade: res.bundle.tags.regioes_sem_identidade, bytes_sem_identidade: res.bundle.tags.bytes_sem_identidade })}`,
  `orfas=${orfas.length} familias=${Object.keys(res.mesas_orfas_por_familia).length}: ${Object.entries(res.mesas_orfas_por_familia).slice(0, 14).map(([k, v]) => `${k}:${v.n}`).join(',')}`,
  `ar=${JSON.stringify(res.bundle.ar)}`,
  `gates=${gates.map((g) => `${g.nome}:${g.veredito}`).join(' ')}`,
  `node_exit=0 ms=${res.msd}`,
].join('\n') + '\n';
writeFileSync(TXT, txt);
console.log(txt);
