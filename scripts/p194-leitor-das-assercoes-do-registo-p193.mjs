// Leitor das grandezas que o item (5) do bloco SM.78 cita, corrido sobre o registo passado em argv[2].
// Os nomes de campo sao lidos do proprio registo; se um caminho nao resolve, a peca ABORTA em vez de imprimir zero.
import { readFileSync } from 'node:fs';

const caminho = process.argv[2];
if (!caminho) throw new Error('ABORTA: uso = node p194-leitor-das-assercoes-do-registo-p193.mjs <caminho-do-registo>');
const j = JSON.parse(readFileSync(caminho, 'utf8'));
const celulas = j.celulas;
if (!celulas || typeof celulas !== 'object' || Array.isArray(celulas)) {
  throw new Error('ABORTA: `celulas` nao e um mapa de cellulas no registo — o leitor ficou cego');
}
const ids = Object.keys(celulas);
if (!ids.length) throw new Error('ABORTA: mapa de cellulas vazio');

const saida = [];
const falhas = [];
const exige = (rotulo, cond, medido) => {
  saida.push(`${cond ? 'OK  ' : 'VERMELHO'} ${rotulo} :: ${medido}`);
  if (!cond) falhas.push(rotulo);
};
const regiao = (id, nome) => {
  const c = celulas[id];
  if (!c) throw new Error(`ABORTA: nao ha celula ${id}`);
  const r = (c.regioes && c.regioes.regioes || []).find((x) => x.nome === nome);
  if (!r) throw new Error(`ABORTA: celula ${id} nao tem regiao ${nome}`);
  return r;
};
const superficie = (id, nome) => {
  const c = celulas[id];
  const s = (c.superficies || []).find((x) => x.nome === nome);
  if (!s) throw new Error(`ABORTA: celula ${id} nao tem superficie ${nome}`);
  return s;
};

// (a) hash/bytes/linhas de uma regiao, comparados com a celula de controlo da mesma area.
const pares = [
  ['inicio', 'home'],
  ['aprender', 'aprender'],
];
for (const [area, reg] of pares) {
  const ctrl = regiao(`${area}-controle`, reg);
  for (const alvo of ['rest_v1_announcements', 'rest_v1_school_events']) {
    const id = `${area}-falha-${alvo}`;
    if (!celulas[id]) continue;
    const m = regiao(id, reg);
    exige(`regiao ${reg} igual ao controlo em ${id}`,
      m.texto_hash === ctrl.texto_hash && m.texto_bytes === ctrl.texto_bytes && m.linhas === ctrl.linhas,
      `falha=[${m.texto_hash},${m.texto_bytes}B,${m.linhas}linhas] controle=[${ctrl.texto_hash},${ctrl.texto_bytes}B,${ctrl.linhas}linhas]`);
  }
}
const homeCtrl = regiao('inicio-controle', 'home');
exige('Início: hash/bytes/linhas citados no diário estão no controlo',
  homeCtrl.texto_hash === '1c3b411b' && homeCtrl.texto_bytes === 1327 && homeCtrl.linhas === 63,
  `medido=[${homeCtrl.texto_hash},${homeCtrl.texto_bytes}B,${homeCtrl.linhas} linhas]`);
const apCtrl = regiao('aprender-controle', 'aprender');
exige('Aprender: hash/bytes/linhas citados no diário estão no controlo',
  apCtrl.texto_hash === '571a2cad' && apCtrl.texto_bytes === 1073 && apCtrl.linhas === 68,
  `medido=[${apCtrl.texto_hash},${apCtrl.texto_bytes}B,${apCtrl.linhas} linhas]`);
const ap_quatro = ids.filter((id) => /^aprender-/.test(id)).map((id) => {
  const r = regiao(id, 'aprender');
  return `${id}:${r.texto_hash}:${r.texto_bytes}B:${r.linhas}l:${r.caixa}` +
    (r.texto_hash === apCtrl.texto_hash && r.texto_bytes === apCtrl.texto_bytes && r.linhas === apCtrl.linhas ? '=CONTROLO' : '=:DIVERSO');
});
exige('Aprender: as quatro células da área têm o texto da região igual ao do controlo',
  ids.filter((id) => /^aprender-/.test(id)).length === 4 && ap_quatro.every((x) => /=CONTROLO$/.test(x)),
  ap_quatro.join(' | '));

// (b) zero superfícies visíveis nas células de Início/Aprender com avaria.
let visiveis_inicio_aprender = 0;
const ids_visiveis = [];
for (const id of ids) {
  if (!/^(inicio|aprender)-falha-/.test(id)) continue;
  for (const s of celulas[id].superficies || []) {
    if ((s.visiveis || 0) !== 0) { visiveis_inicio_aprender += s.visiveis; ids_visiveis.push(`${id}/${s.nome}=${s.visiveis}`); }
  }
}
exige('Início e Aprender: nenhuma superfície visível com avaria',
  visiveis_inicio_aprender === 0, `somatorio_visiveis=${visiveis_inicio_aprender} [${ids_visiveis.join(' ')}]`);

// (c) Home do aluno com guardian_students a falhar: nós existem mas fora da tela.
const home_gs = regiao('inicio-falha-rest_v1_guardian_students', 'home');
exige('Home com guardian_students: hash citado no diário é o medido',
  home_gs.texto_hash === 'b59b0f27' && home_gs.texto_bytes === 1329,
  `medido=[${home_gs.texto_hash},${home_gs.texto_bytes}B,${home_gs.linhas} linhas]`);
for (const nome of ['espaco_erro', 'espaco_botao_repetir']) {
  const s = superficie('inicio-falha-rest_v1_guardian_students', nome);
  const med = (s.medidos || [])[0] || null;
  exige(`Home com guardian_students: ${nome} existe mas não tem área nem alcance`,
    s.nos === 1 && s.visiveis === 0 && s.zero_caixa === 1 && !!med && med.caixa === '0x0' &&
    med.visivel === false && med.tocavel === false && med.offset_parent === false &&
    med.ponto_fora_ou_tapado === 'por_cima_esta_outra_coisa' && med.texto_bytes > 0,
    `nos=${s.nos} visiveis=${s.visiveis} zero_caixa=${s.zero_caixa} medido=${med ? `${med.caixa} visivel=${med.visivel} tocavel=${med.tocavel} offset_parent=${med.offset_parent} ponto=${med.ponto_fora_ou_tapado} texto=${med.texto_bytes}B` : 'nenhum'}`);
}

// (d) Meu Espaço com guardian_students: as duas superfícies visíveis e tocáveis, e o painel a encolher.
const ctrl_esp = regiao('espaco-controle', 'espaco');
const falha_esp = regiao('espaco-falha-rest_v1_guardian_students', 'espaco');
exige('Meu Espaço: painel a encolher com as cifras citadas',
  ctrl_esp.texto_bytes === 229 && ctrl_esp.elementos === 7 && ctrl_esp.linhas === 6 &&
  falha_esp.texto_bytes === 67 && falha_esp.elementos === 3 && falha_esp.linhas === 2,
  `controlo=[${ctrl_esp.texto_bytes}B,${ctrl_esp.elementos} el,${ctrl_esp.linhas} linhas] falha=[${falha_esp.texto_bytes}B,${falha_esp.elementos} el,${falha_esp.linhas} linhas]`);
const caixas = [];
for (const nome of ['espaco_erro', 'espaco_botao_repetir']) {
  const s = superficie('espaco-falha-rest_v1_guardian_students', nome);
  const med = (s.medidos || [])[0] || null;
  if (med) caixas.push(`${nome}:${med.caixa}:visivel=${med.visivel}:tocavel=${med.tocavel}`);
  exige(`Meu Espaço: ${nome} visível e tocável com a caixa citada`,
    s.nos === 1 && s.visiveis === 1 && !!med && med.visivel === true && med.tocavel === true &&
    med.caixa === (nome === 'espaco_erro' ? '967x43' : '967x33'),
    `medido=${med ? `${med.caixa} visivel=${med.visivel} tocavel=${med.tocavel}` : 'nenhum'}`);
}
exige('Meu Espaço com announcements ou school_events a falhar: zero nós de superfície',
  (() => {
    for (const alvo of ['rest_v1_announcements', 'rest_v1_school_events']) {
      for (const s of celulas[`espaco-falha-${alvo}`].superficies || []) if (s.nos !== 0) return false;
    }
    return true;
  })(),
  'todas as quatro células de Meu Espaço com falha de tabela não-alvo têm nos=0');

// (e) acessibilidade: as entradas medidas desta corrida têm aria_live e papel_aria nulos.
let medidos_totais = 0, aria_nula = 0;
for (const id of ids) {
  for (const s of celulas[id].superficies || []) for (const m of s.medidos || []) {
    medidos_totais++;
    if (m.aria_live === null && m.papel_aria === null) aria_nula++;
  }
  const r = celulas[id].recuperacao;
  if (r) for (const lista of [r.antes_superficies || [], r.depois_superficies || []]) {
    for (const s of lista) for (const m of s.medidos || []) { medidos_totais++; if (m.aria_live === null && m.papel_aria === null) aria_nula++; }
  }
}
exige('Acessibilidade: toda a entrada medida tem aria_live e papel_aria nulos',
  medidos_totais === aria_nula && medidos_totais === 8,
  `entradas_medidas=${medidos_totais} com_aria_e_papel_nulos=${aria_nula} | ${caixas.join(' ')}`);

// (f) degrau de recuperação dentro da célula.
const rec = celulas['espaco-falha-rest_v1_guardian_students'].recuperacao;
if (!rec) throw new Error('ABORTA: a célula de Meu Espaço com guardian_students não tem degrau de recuperação');
const depois = (rec.depois_regioes && rec.depois_regioes.regioes || []).find((x) => x.nome === 'espaco');
exige('Recuperação: as duas superfícies somem do documento',
  (rec.depois_superficies || []).every((s) => s.nos === 0),
  `depois=[${(rec.depois_superficies || []).map((s) => `${s.nome}:${s.nos}`).join(' ')}]`);
exige('Recuperação: o texto da região volta ao hash de controlo citado',
  !!depois && depois.texto_hash === '2123bc0b',
  `depois=${depois ? depois.texto_hash : 'sem região'} controle=${ctrl_esp.texto_hash === '2123bc0b' ? '2123bc0b' : ctrl_esp.texto_hash}`);
exige('Recuperação: zero falhas novas contra as falhas já servidas',
  rec.falhas_novas_depois_do_toque === 0 && rec.falhas_no_documento_antes === 3,
  `novas=${rec.falhas_novas_depois_do_toque} antes=${rec.falhas_no_documento_antes} modo_lido=${JSON.stringify(rec.modo_lido_no_documento)}`);

// (g) chegada por toque em todas as células.
const vias = {};
for (const id of ids) { const v = (celulas[id].chegada || {}).via || 'SEM_VIA'; vias[v] = (vias[v] || 0) + 1; }
exige('Chegada: as 12 células entram pelo toque do botão da barra',
  ids.length === 12 && Object.keys(vias).length === 1 && (vias['toque_no_botao_da_area'] || 0) === 12,
  `celulas=${ids.length} vias=[${Object.entries(vias).map(([k, v]) => `${k}:${v}`).join(' ')}]`);

// (h) contagem de falhas servidas por célula, separada por tabela-alvo.
let com_duas = 0, n_duas = 0;
const linhas_duas = [];
const linhas_tres = [];
for (const id of ids) {
  const c = celulas[id];
  if (/-controle$/.test(id)) { if (c.falhas_no_alvo !== 0) linhas_duas.push(`${id}:esperava_0:no_alvo=${c.falhas_no_alvo}`); continue; }
  const alvo = id.replace(/^[a-z]+-falha-/, '');
  const linha = `${id}:${alvo}:no_alvo=${c.falhas_no_alvo}:servidas=${c.pedidos.falhas_servidas}`;
  if (alvo === 'rest_v1_guardian_students') { linhas_tres.push(linha); continue; }
  n_duas++;
  if (c.falhas_no_alvo === 2) com_duas++;
  linhas_duas.push(linha);
}
exige('Duas falhas servidas por célula nas tabelas de anúncios e eventos, e zero nos controlos',
  com_duas === n_duas && n_duas === 6, `com_duas=${com_duas} de ${n_duas} | ${linhas_duas.join(' ')}`);
exige('As três células do vínculo escolar têm o seu próprio número de falhas servidas',
  linhas_tres.length === 3, `linhas=[${linhas_tres.join(' ')}]`);

console.log(`REGISTO ${caminho}`);
console.log(`em=${j.em} emissor_md5=${j.emissor && j.emissor.md5} bytes_emissor=${j.emissor && j.emissor.bytes} celulas=${ids.length} portoes=${j.portoes} falhas=${(j.falhas || []).length}`);
console.log(saida.join('\n'));
console.log(falhas.length ? `P193_VERDE_LIDO_VERMELHO ${falhas.length} :: ${falhas.join(' | ')}` : `P193_VERDE_LIDO_OK ${saida.length} asserções lidas do registo`);
process.exit(falhas.length ? 1 : 0);
