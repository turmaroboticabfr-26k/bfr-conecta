// V136 — candidata com duas alterações sobre a v134 (bfr-candidata-v134-sidebar-escondida):
//  (1) PEN-30: o patch da v125 re-aplicado — anúncios ordenados por published_at (o created_at
//      não existe na tabela announcements e a ordem estava quebrada). Par OLD/NEW extraído
//      verbatim da v125, gateado a disparar exactamente 1x.
//  (2) Nome único da superfície: «Secretaria de Educação» (decisão 18/11 — o vencedor entre os 7
//      nomes medidos em scripts/v136-rotulos-v134.mjs).
// Regra de unificação: renomeiam-se as ocorrências que NOMEIAM o módulo (títulos, hero, nav,
// painéis, placeholders, atalhos, remetente, título de PDF, prosa interna do módulo). NÃO se
// renomeiam: (a) rótulos do PAPEL secretary em mapas/selectores/chips — nomeiam o cargo, paralelo
// a «Direção»/«Coordenação»; (b) «Supervisão»/«Supervisão Educacional» — outra função dentro do
// módulo (sub-aba data-sec-tab="supervisao", chip education_supervisor, painéis de supervisão,
// título multiprofissional); (c) prosa legal/institucional (privacidade, parceiro municipal real
// de Limoeiro de Anadia); (d) <option>Atendimento da escola</option> — é um TIPO DE SOLICITAÇÃO,
// não um nome; (e) a eyebrow «Atendimento da escola» do painel de serviços — descritor de função.
// 0 deploy, 0 DDL, 0 escrita no ar. Única escrita: bfr-candidata-v136-secretaria-de-educacao/.
// Se o directório já existir, verifica byte a byte; se diferir, ABORTA.
import fs from 'node:fs';
import crypto from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const DE = `${DIR}/bfr-candidata-v134-sidebar-escondida`;
const PARA = `${DIR}/bfr-candidata-v136-secretaria-de-educacao`;
const MD5_ORIGEM = 'b272fd4f3a737c518e888250ab8167f1'; // gateado em S4 do v134-gera-bundle (18/11)
const md5 = (b) => crypto.createHash('md5').update(b).digest('hex');
const count = (t, x) => t.split(x).length - 1;
const bytes = (s) => Buffer.byteLength(s, 'utf8');

let portao = 0; const falhas = [];
const G = (nome, ok, dado) => {
  portao++;
  if (!ok) { falhas.push(nome); console.log(`VERMELHO ${nome} :: ${JSON.stringify(dado).slice(0, 220)}`); }
  else console.log(`verde ${nome}`);
};

const antes = fs.readFileSync(`${DE}/index.html`, 'utf8');
G('V136_C0_origem_e_a_candidata_v134_gateada', md5(Buffer.from(antes, 'utf8')) === MD5_ORIGEM,
  { md5: md5(Buffer.from(antes, 'utf8')), bytes: bytes(antes) });

// ---- as substituições: de -> para, com contagem esperada de «de» na v134 ----
const R = [
  // PEN-30 (patch v125, verbatim)
  { id: 'PEN30_created_at', de: `client.from('announcements').select('id,title,body,message_type,status,published_at,scheduled_at,created_at,important,meeting_id').order('created_at',{ascending:false}).limit(100),`,
    para: `client.from('announcements').select('id,title,body,message_type,status,published_at,scheduled_at,important,meeting_id').order('published_at',{ascending:false,nullsFirst:false}).limit(100),`, n: 1 },
  // nomes do módulo
  { id: 'N01_h1_secretaria_digital', de: '<h1>Secretaria digital.</h1>', para: '<h1>Secretaria de Educação.</h1>', n: 1 },
  { id: 'N02_nav_desktop', de: '<span class="nav-icon">▥</span>Secretaria</button>', para: '<span class="nav-icon">▥</span>Secretaria de Educação</button>', n: 1 },
  { id: 'N03_nav_mobile', de: '<span>▥</span>Secretaria</button>', para: '<span>▥</span>Secretaria de Educação</button>', n: 1 },
  { id: 'N04_h2_painel_servicos', de: '<h2 style="margin-top:4px">Secretaria</h2>', para: '<h2 style="margin-top:4px">Secretaria de Educação</h2>', n: 1 },
  { id: 'N05_h1_painel_staff', de: '<h1>Painel da Secretaria.</h1>', para: '<h1>Painel da Secretaria de Educação.</h1>', n: 1 },
  { id: 'N06_h1_centro_gestao', de: '<h1>Centro de Gestão da Educação.</h1>', para: '<h1>Secretaria de Educação.</h1>', n: 2 },
  { id: 'N07_fallback_subabas', de: "|| 'Secretaria digital'", para: "|| 'Secretaria de Educação'", n: 1 },
  { id: 'N08_mapa_modulo', de: "secretaria:'Secretaria digital'", para: "secretaria:'Secretaria de Educação'", n: 1 },
  { id: 'N09_eyebrow_evo', de: '<div class="eyebrow">Secretaria digital</div>', para: '<div class="eyebrow">Secretaria de Educação</div>', n: 1 },
  { id: 'N10_kicker_central', de: 'Secretaria · operação escolar diária', para: 'Secretaria de Educação · operação escolar diária', n: 1 },
  { id: 'N11_h1_central', de: '<h1>Central da Secretaria</h1>', para: '<h1>Central da Secretaria de Educação</h1>', n: 1 },
  { id: 'N12_kicker_municipal', de: 'Secretaria · gestão municipal', para: 'Secretaria de Educação · gestão municipal', n: 1 },
  { id: 'N13_kicker_interno', de: 'Secretaria · atendimento interno', para: 'Secretaria de Educação · atendimento interno', n: 1 },
  { id: 'N14_atalho_pais', de: 'data-parent-dashboard-route="secretaria">Secretaria</button>', para: 'data-parent-dashboard-route="secretaria">Secretaria de Educação</button>', n: 1 },
  { id: 'N15_remetente', de: "? 'Você' : 'Secretaria'}", para: "? 'Você' : 'Secretaria de Educação'}", n: 1 },
  { id: 'N16_assinatura_notificacao', de: 'Secretaria Digital BFR Conecta', para: 'Secretaria de Educação BFR Conecta', n: 1 },
  { id: 'N17_pdf_relatorio', de: "'Relatório operacional da Secretaria'", para: "'Relatório operacional da Secretaria de Educação'", n: 1 },
  { id: 'N18_eyebrow_documentos', de: '<div class="eyebrow">Atendimento da Secretaria</div>', para: '<div class="eyebrow">Atendimento da Secretaria de Educação</div>', n: 1 },
  { id: 'N19_h2_documentos', de: '<h2 style="margin-top:4px">Documentos da Secretaria</h2>', para: '<h2 style="margin-top:4px">Documentos da Secretaria de Educação</h2>', n: 1 },
  { id: 'N20_js_documentos', de: "Documentos da Secretaria';", para: "Documentos da Secretaria de Educação';", n: 1 },
  { id: 'N21_emitidos_estatico', de: 'emitidos pela Secretaria.</p>', para: 'emitidos pela Secretaria de Educação.</p>', n: 1 },
  { id: 'N22_emitidos_js', de: "emitidos pela Secretaria.';", para: "emitidos pela Secretaria de Educação.';", n: 1 },
  { id: 'N23_solicitar_documento', de: 'Solicitar documento à Secretaria</button>', para: 'Solicitar documento à Secretaria de Educação</button>', n: 2 },
  { id: 'N24_nenhum_documento', de: 'Nenhum documento da Secretaria publicado ainda.', para: 'Nenhum documento da Secretaria de Educação publicado ainda.', n: 2 },
  { id: 'N25_central_nao_configurada', de: 'A central da Secretaria ainda não foi configurada.', para: 'A central da Secretaria de Educação ainda não foi configurada.', n: 1 },
  { id: 'N26_categoria_documento', de: "|| 'Documento da Secretaria')", para: "|| 'Documento da Secretaria de Educação')", n: 1 },
  { id: 'N27_descricao_documento', de: "|| 'Documento emitido pela Secretaria.')", para: "|| 'Documento emitido pela Secretaria de Educação.')", n: 1 },
  { id: 'N28_placeholder_buscar', de: 'placeholder="Buscar na Secretaria"', para: 'placeholder="Buscar na Secretaria de Educação"', n: 1 },
  { id: 'N29_aria_buscar', de: 'aria-label="Buscar na Secretaria"', para: 'aria-label="Buscar na Secretaria de Educação"', n: 2 },
  { id: 'N30_aria_busca_global', de: 'aria-label="Busca global da Secretaria"', para: 'aria-label="Busca global da Secretaria de Educação"', n: 2 },
  { id: 'N31_prioridades', de: '<h2>Prioridades da Secretaria</h2>', para: '<h2>Prioridades da Secretaria de Educação</h2>', n: 1 },
  { id: 'N32_consulta', de: 'consulta da Secretaria.', para: 'consulta da Secretaria de Educação.', n: 1 },
  { id: 'N33_permissao_publicacao', de: 'permissão de publicação da Secretaria não está confirmada', para: 'permissão de publicação da Secretaria de Educação não está confirmada', n: 1 },
  { id: 'N34_visao', de: 'visão da Secretaria. Tente atualizar novamente.', para: 'visão da Secretaria de Educação. Tente atualizar novamente.', n: 1 },
  { id: 'N35_aria_secoes', de: 'aria-label="Seções da Secretaria"', para: 'aria-label="Seções da Secretaria de Educação"', n: 1 },
  { id: 'N36_aria_central', de: 'aria-label="Central operacional da Secretaria"', para: 'aria-label="Central operacional da Secretaria de Educação"', n: 1 },
  { id: 'N37_conferencia', de: 'conferência da Secretaria.', para: 'conferência da Secretaria de Educação.', n: 1 },
  { id: 'N38_lia', de: '<h2>LIA da Secretaria</h2>', para: '<h2>LIA da Secretaria de Educação</h2>', n: 1 },
  { id: 'N39_consulta_dados', de: 'A Secretaria consulta', para: 'A Secretaria de Educação consulta', n: 1 },
  { id: 'N40_acompanha', de: 'A Secretaria acompanha indicadores', para: 'A Secretaria de Educação acompanha indicadores', n: 1 },
  { id: 'N41_procure', de: 'Procure a coordenação ou a Secretaria para atualizar vínculos', para: 'Procure a coordenação ou a Secretaria de Educação para atualizar vínculos', n: 1 },
  { id: 'N42_use_atendimento', de: 'Use o atendimento da Secretaria e descreva a alteração', para: 'Use o atendimento da Secretaria de Educação e descreva a alteração', n: 1 },
  { id: 'N43_rotina_dentro', de: 'dentro da Secretaria.', para: 'dentro da Secretaria de Educação.', n: 2 },
];

// ---- portões «antes»: cada par dispara a contagem esperada, e o para ainda não existe ----
const esperadosPara = {};
for (const r of R) {
  const cDe = count(antes, r.de);
  const cPara = count(antes, r.para);
  G(`V136_A_${r.id}`, cDe === r.n && cPara === 0, { de: cDe, esperado: r.n, para_antes: cPara });
  esperadosPara[r.para] = (esperadosPara[r.para] || 0) + r.n;
}

// ---- cirurgia ----
let depois = antes;
for (const r of R) depois = depois.split(r.de).join(r.para);

// ---- portões «depois»: o de sumiu e cada para tem exactamente a soma das suas contagens ----
// quando de é prefixo do para, as n ocorrências «restantes» são as que vivem dentro do próprio para
for (const r of R) {
  const sobraEsperada = r.para.includes(r.de) ? r.n : 0;
  G(`V136_D_${r.id}`, count(depois, r.de) === sobraEsperada, { sobras: count(depois, r.de), esperado: sobraEsperada });
}
for (const [p, n] of Object.entries(esperadosPara)) {
  G(`V136_P_para_${p.length > 46 ? p.slice(0, 46) + '…' : p}`, count(depois, p) === n, { medido: count(depois, p), esperado: n });
}

// ---- controlos negativos: o que NÃO pode mudar ----
const NAO_MUDA = [
  ['papel_option', '<option value="secretary">Secretaria</option>', 1],
  ['papel_mapa_role', "secretary:'Secretaria digital'", 1],
  ['papel_network', "secretary:'Secretaria'", 3],
  ['papel_lista_escolar', "['secretary','Secretaria escolar']", 1],
  ['papel_lista', "['secretary','Secretaria']", 1],
  ['papel_preview', 'data-preview-role="secretary">Secretaria</button>', 1],
  ['chip_secretary', "secretary:['Secretaria escolar','Atendimento e protocolos']", 1],
  ['chip_edsup', "education_supervisor:['Supervisão Educacional','Supervisor(a) de ensino']", 1],
  ['multiprofissional', 'Supervisão multiprofissional', 1],
  ['subaba_supervisao', 'data-sec-tab="supervisao">Supervisão</button>', 1],
  ['painel_supervisao', 'Solicitações de Supervisão', 1],
  ['etiqueta_supervisao', '<span class="bfr-secretary-label">Supervisão Educacional</span>', 1],
  ['option_atendimento', '<option>Atendimento da escola</option>', 1],
  ['eyebrow_servicos', '<div class="eyebrow">Atendimento da escola</div>', 1],
  ['eyebrow_canal', 'Serviços escolares · canal oficial', 1],
  ['prosa_privacidade', 'Secretaria Municipal de Educação em um canal institucional', 1],
  ['parceiro_municipal', 'em parceria com a Secretaria Municipal de Educação', 1],
];
for (const [nome, alvo, n] of NAO_MUDA) {
  const a = count(antes, alvo), d = count(depois, alvo);
  G(`V136_K_${nome}`, a === n && d === n, { antes: a, depois: d, esperado: n });
}

// ---- invariantes estruturais ----
const INV = ['bfr-mobile-nav-sm8-fix', 'bfr-mobile-nav-safe-area-fix', 'fecharGaveta', 'data-bfr-municipal-nav',
  'frame-ancestors', 'bfr-responsive-presentation.js', 'data-sec-tab', 'data-secretary-tab', 'roleSectionAccess'];
const difInv = INV.map((k) => ({ chave: k, antes: count(antes, k), depois: count(depois, k) }));
G('V136_I_invariantes_estruturais', difInv.every((d) => d.antes === d.depois), difInv);
const tags = ['<div', '</div>', '<h1', '</h1>', '<h2', '</h2>', '<button', '</button>', '<script', '</script>', '<style', '</style>', '<option', '</option>', '<nav', '</nav>'];
const difTags = tags.map((t) => ({ t, d: count(depois, t) - count(antes, t) }));
G('V136_T_balanco_de_tags', difTags.every((d) => d.d === 0), difTags);
const deltaEsperado = R.reduce((s, r) => s + (bytes(r.para) - bytes(r.de)) * r.n, 0);
const deltaMedido = bytes(depois) - bytes(antes);
G('V136_B_delta_de_bytes', deltaMedido === deltaEsperado, { medido: deltaMedido, esperado: deltaEsperado });

// ---- veredito de superfície ----
const somaNovoNome = 3 + R.filter((r) => r.para.includes('Secretaria de Educação')).reduce((s, r) => s + r.n, 0);
const superficie = {
  'Secretaria de Educação': count(depois, 'Secretaria de Educação'),
  'Centro de Gestão da Educação': count(depois, 'Centro de Gestão da Educação'),
  'Secretaria digital': count(depois, 'Secretaria digital'),
  'Secretaria Digital': count(depois, 'Secretaria Digital'),
  'Atendimento da escola': count(depois, 'Atendimento da escola'),
  'Supervisão Educacional': count(depois, 'Supervisão Educacional'),
  'Supervisão': count(depois, 'Supervisão'),
};
G('V136_S_centro_de_gestao_sumiu', superficie['Centro de Gestão da Educação'] === 0, superficie);
G('V136_S_secretaria_digital_so_no_papel', superficie['Secretaria digital'] === 1, superficie);
G('V136_S_nome_unico_total', superficie['Secretaria de Educação'] === somaNovoNome, { medido: superficie['Secretaria de Educação'], esperado: somaNovoNome });

// ---- escrita (ou verificação) ----
let escrita = 'verificado_sem_reescrever';
if (fs.existsSync(PARA)) {
  const ja = fs.readFileSync(`${PARA}/index.html`, 'utf8');
  G('V136_W_directorio_ja_existia_verificado_igual', ja === depois,
    { md5_disco: md5(Buffer.from(ja, 'utf8')), md5_novo: md5(Buffer.from(depois, 'utf8')) });
} else {
  fs.mkdirSync(PARA, { recursive: true });
  fs.writeFileSync(`${PARA}/index.html`, depois);
  for (const f of fs.readdirSync(DE).filter((x) => x !== 'index.html' && !x.startsWith('portoes-')))
    fs.copyFileSync(`${DE}/${f}`, `${PARA}/${f}`);
  escrita = 'agora';
  G('V136_W_escrita_e_leitura_bate', fs.readFileSync(`${PARA}/index.html`, 'utf8') === depois, { bytes: bytes(depois) });
}

const out = {
  version: 'v136', em: new Date().toISOString(), escrita,
  origem: { dir: DE.split('/').pop(), index_md5: md5(Buffer.from(antes, 'utf8')), bytes: bytes(antes) },
  saida: { dir: PARA.split('/').pop(), index_md5: md5(Buffer.from(depois, 'utf8')), bytes: bytes(depois) },
  regra_de_unificacao: 'renomeia o que NOMEIA o módulo; preserva rótulos do papel secretary, «Supervisão»/«Supervisão Educacional», prosa legal/institucional e o tipo de solicitação «Atendimento da escola»',
  substituicoes: R.map((r) => ({ id: r.id, n: r.n, delta_bytes: (bytes(r.para) - bytes(r.de)) * r.n })),
  preservados_por_controlo: NAO_MUDA.map(([nome, , n]) => ({ nome, n })),
  invariantes: difInv,
  superficie_depois: superficie,
  delta_bytes: deltaMedido,
  portoes: `${portao}/${falhas.length}`,
  veredito: falhas.length ? `V136_CANDIDATA_FALHOU ${portao}/${falhas.length}` : `V136_CANDIDATA_OK ${portao}/${falhas.length}`,
};
fs.writeFileSync(`${PARA}/portoes-v136-candidata.json`, JSON.stringify(out, null, 2) + '\n');
console.log(`escrito ${PARA}/portoes-v136-candidata.json`);
console.log(`${out.veredito}  md5=${out.saida.index_md5}  ${out.saida.bytes} B  (origem ${out.origem.index_md5} ${out.origem.bytes} B, delta=${out.delta_bytes} B)`);
if (falhas.length) { console.log('VERMELHOS: ' + falhas.join(', ')); }
process.exit(falhas.length ? 1 : 0);
