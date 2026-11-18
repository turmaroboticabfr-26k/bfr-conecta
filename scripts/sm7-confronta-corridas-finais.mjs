// SM-7-CONFRONTO — leitura das quatro corridas finais do MÓDULO 2 numa só mesa: veredito, contagem
// de portões do artefacto, pegada do instrumento e pegada da candidata. Existe porque o stdout e o
// JSON divergiram (o total era escrito a meio do ficheiro) e porque «os quatro batem com a mesma
// régua» é uma afirmação que só vale impressa lado a lado, não lembrada.
import { readFileSync } from 'node:fs';
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta/evidence';
const FICHEIROS = [
  'sm7-municipal-education_supervisor-1366-sup1366r13.json',
  'sm7-municipal-secretary-1366-sec1366r12.json',
  'sm7-municipal-education_supervisor-390-sup390r14.json',
  'sm7-municipal-education_supervisor-430-sup430r12.json',
];
let reguas = new Set();
for (const f of FICHEIROS) {
  const o = JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8'));
  reguas.add(String(o.instrumento_md5));
  const op = o.stages.operacoes || {};
  console.log(`\n${f}`);
  console.log(`  veredito=${o.veredito}  portoes_do_artefacto=${o.stages.portoes}  falhas=${(o.falhas || []).length}`);
  console.log(`  instrumento=${o.instrumento_md5}  candidata=${o.candidata_md5}  caracteres=${o.candidata_caracteres}`);
  console.log(`  papel=${o.papel}  largura=${o.largura}  mobile=${o.mobile}`);
  console.log(`  nav_visiveis=${(o.stages.modulo.botao_nav || []).filter((b) => b.visivel).length}  munApto=${o.stages.apto_depois_do_boot ? (o.stages.apto_depois_do_boot.apto ? 'sim' : 'nao') : '?'}`);
  if (o.stages.negacao) console.log(`  negacao: tabs_no_dom=${o.stages.negacao.tabs_no_dom} leituras_de_tabela=${o.stages.negacao.contadores.n_de} botao_no_menu=${o.stages.negacao.botao_no_menu} munApto=${o.stages.negacao.munApto} caminho=${JSON.stringify(o.stages.negacao.caminho)}`);
  if (o.stages.abas) console.log(`  abas_por_estado=${Object.keys(o.stages.abas).length} saltadas=${Object.values(o.stages.abas).filter((a) => a.saltada).length}`);
  if (op.escolas_sem_filtro) console.log(`  escolas: sem_filtro=${op.escolas_sem_filtro.linhas_reais} termo_inexistente=${op.filtro_inexistente?.medido?.linhas_reais} nome_real=${op.escolas_depois_filtro?.linhas_reais} depois_de_limpar=${op.escolas_depois_de_limpar?.linhas_reais} todas_contem_o_termo=${op.escolas_depois_filtro?.todas_contem_o_termo}`);
  if (op.detalhe) console.log(`  detalhe: assentou=${op.detalhe.assentou_em_ms} ms h3=${JSON.stringify((op.detalhe.medido?.h3) || '')} volta_linhas=${op.volta?.medido?.linhas_reais}`);
  if (op.contadores_finais) console.log(`  exports=${JSON.stringify(op.exports && op.exports.botoes)} blobs=${JSON.stringify((op.contadores_finais.blobs || []).map((b) => b.bytes))} prints=${op.contadores_finais.prints}`);
  if (o.stages.gaveta && o.stages.gaveta.sonda_gatilho) {
    const g = o.stages.gaveta.sonda_gatilho;
    console.log(`  gatilho_mais: y=${g.y_antes}->${g.y_depois} janela=${o.janela_alto || (g.visual_viewport && g.visual_viewport.a)} barra_altura=${(g.cadeia_de_posicionados.find((c) => /sidebar/.test(c.el)) || {}).altura}`);
    console.log(`  A/B entrada municipal: sem=${g.ab_teste_entrada_municipal && g.ab_teste_entrada_municipal.y_do_gatilho_sem_a_minha_entrada} com=${g.ab_teste_entrada_municipal && g.ab_teste_entrada_municipal.y_do_gatilho_com}`);
  }
  console.log(`  erros_de_consola=${(o.stages.console_erros || []).length}`);
  for (const fl of o.falhas || []) console.log(`  FALHA ${fl}`);
}
console.log(`\nreguas_diferentes=${reguas.size}`);
