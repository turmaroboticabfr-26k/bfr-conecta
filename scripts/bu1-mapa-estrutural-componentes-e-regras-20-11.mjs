// BU-1 — mapa estrutural do código: tecnologias, componentes compartilhados, regras de negócio
// e cobertura dos 12 pontos da parte 1 do briefing. Só-leitura: nada toca o banco nem o ar.
// Todos os números vêm de varredura do bundle em disco ou dos artefactos bu2/bu2c/bu3/bu4 (lidos, não datilografados).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = process.env.BU1_SUF || '';
const OUT = `${DIR}/evidence/bu1-mapa-estrutural-componentes-e-regras-20-11${SUF}.json`;
const TXT = `${DIR}/evidence/bu1-mapa-estrutural-componentes-e-regras-20-11${SUF}.txt`;
if (existsSync(OUT) || existsSync(TXT)) throw new Error(`ABORTA: ${OUT} já existe — correr com BU1_SUF novo`);
const parcial = (motivo) => {
  try { writeFileSync(OUT.replace('.json', '-INTERROMPIDA' + SUF + '.json'), JSON.stringify({ interrompida_em: motivo, msd: Date.now() - t0 }, null, 2) + '\n'); } catch { }
};
process.on('uncaughtException', (e) => { parcial('uncaughtException: ' + e.message); process.exit(1); });
process.on('unhandledRejection', (e) => { parcial('unhandledRejection: ' + (e && e.message) + ''); process.exit(1); });
const t0 = Date.now();

const DOC = `${DIR}/bfr-candidata-v136-secretaria-de-educacao/index.html`;
const FONTES = {
  bu2: `${DIR}/evidence/bu2-censo-catalogo-20-11.json`,
  bu2c: `${DIR}/evidence/bu2c-caminhos-de-autorizacao-20-11c.json`,
  bu3: `${DIR}/evidence/bu3-pegada-de-modulos-20-11e-VERMELHO-de-tres-rpcs-chamados-e-inexistentes.json`,
  bu4: `${DIR}/evidence/bu4-digestao-para-documentacao-20-11.json`,
};
const lidos = {}; const pegadasFontes = {};
for (const [k, p] of Object.entries(FONTES)) {
  if (!existsSync(p)) throw new Error(`ABORTA: falta a evidência ${k} em ${p.replace(DIR + '/', '')}`);
  const txt = readFileSync(p, 'utf8');
  lidos[k] = JSON.parse(txt);
  pegadasFontes[k] = { caminho: p.replace(DIR + '/', ''), bytes: Buffer.byteLength(txt, 'utf8'), md5: createHash('md5').update(txt).digest('hex') };
}
for (const [k, p] of Object.entries(FONTES)) FONTES[k] = pegadasFontes[k];
if (!lidos.bu3.tags || lidos.bu3.tags.corpos_de_script_no_documento === undefined) throw new Error('ABORTA: bu3 lido não declara tags.corpos_de_script_no_documento — variante superada');
if (!existsSync(DOC)) throw new Error(`ABORTA: o bundle ${DOC.replace(DIR + '/', '')} não está em disco`);

const bundleBuf = readFileSync(DOC);
const t = bundleBuf.toString('utf8');
const md5Bundle = createHash('md5').update(bundleBuf).digest('hex');
const bytesBundle = bundleBuf.length;
const charsBundle = t.length;

// ---------- 0. utilitários de varredura (cada régua tem o seu fixture) ----------
const occ = (re, alvo) => (alvo.match(re) || []).length;
const fix = []; // prova de que cada predicado dispara
const prova = (id, re, alvoEsperado, minimo) => {
  const n = occ(re, alvoEsperado);
  fix.push({ regua: id, dispara_em_fixture: n >= minimo, n, minimo });
};

// ---------- A. corpo de script: abre corpo, ignora abertura textual dentro de corpo já consumido ----------
const aberturasCruas = [...t.matchAll(/<script\b[^>]*>/g)];
const fechos = [...t.matchAll(/<\/script>/g)];
const segmenta = (alvo) => {
  const ab = [...alvo.matchAll(/<script\b[^>]*>/g)].map((m) => ({ i: m.index, s: m[0] }));
  const fe = [...alvo.matchAll(/<\/script>/g)].map((m) => m.index);
  const corpos = []; const externos = []; let textuais = 0; let ai = 0; let consumidoAte = -1; let semFecho = 0;
  for (const f of fe) {
    while (ai < ab.length && ab[ai].i <= consumidoAte) { textuais++; ai++; }
    const a = ab[ai];
    if (!a || a.i >= f) { semFecho++; continue; }
    consumidoAte = f; ai++;
    if (/\ssrc=/.test(a.s)) { externos.push(a.s); continue; }
    corpos.push({ ini: a.i, fim: f, texto: alvo.slice(a.i + a.s.length, f) });
  }
  while (ai < ab.length) { textuais++; ai++; }
  return { corpos, externos, textuais, semFecho };
};
const seg = segmenta(t);
const corposLimpos = seg.corpos;
{
  const sint = '<script>f(); "<script>"; g(); </script><script src="e.js"></script><script>h();</script>';
  const r = segmenta(sint);
  fix.push({ regua: 'segmentacao_de_corpos', dispara_em_fixture: r.corpos.length === 2 && r.textuais === 1 && r.externos.length === 1,
    n: r.corpos.length, minimo: 2, detalhe: { corpos: r.corpos.length, textuais: r.textuais, externos: r.externos.length, sem_fecho: r.semFecho } });
}
const textoScripts = seg.corpos.map((c) => c.texto).join('\n');
const bytesDeCorpos = Buffer.byteLength(textoScripts, 'utf8');
const charsDeCorpos = seg.corpos.reduce((s, c) => s + c.texto.length, 0);
const corpoTexto = textoScripts.length;

// ---------- B. componentes compartilhados ----------
const reDeclaracao = /function\s+([A-Za-z_$][\w$]*)\s*\(|\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b|\()/g;
const reInvocacao = /([A-Za-z_$][\w$]*)\s*\(/g;
const reId = /\sid="([^"]+)"/g;
const reClasse = /\sclass="([^"]*)"/g;

const declaracoes = new Map();
corposLimpos.forEach((b, i) => {
  for (const m of b.texto.matchAll(reDeclaracao)) {
    const n = m[1] || m[2];
    const e = declaracoes.get(n) || { total: 0, corpos: new Set() };
    e.total += 1; e.corpos.add(i);
    declaracoes.set(n, e);
  }
});
const invPorCorpo = new Map();
corposLimpos.forEach((b, i) => {
  const vistos = new Set();
  for (const m of b.texto.matchAll(reInvocacao)) { if (!vistos.has(m[1])) { vistos.add(m[1]); (invPorCorpo.get(m[1]) || invPorCorpo.set(m[1], new Set()).get(m[1])).add(i); } }
});
const invocacoes = new Map();
for (const m of t.matchAll(reInvocacao)) invocacoes.set(m[1], (invocacoes.get(m[1]) || 0) + 1);

const classesComp = { sem_chamada_no_byte: [], chamada_em_um_corpo: [], compartilhada_em_dois_ou_mais_corpos: [] };
for (const [n, d] of declaracoes) {
  const corposQueInvocam = (invPorCorpo.get(n) || new Set()).size;
  if (corposQueInvocam === 0) classesComp.sem_chamada_no_byte.push(n);
  else if (corposQueInvocam === 1) classesComp.chamada_em_um_corpo.push(n);
  else classesComp.compartilhada_em_dois_ou_mais_corpos.push({ nome: n, corpos: corposQueInvocam, chamadas: invocacoes.get(n) || 0, declaracoes: d.total });
}
classesComp.compartilhada_em_dois_ou_mais_corpos.sort((a, b) => b.corpos - a.corpos || b.chamadas - a.chamadas);
const colisoes = [...declaracoes.entries()].filter(([, d]) => d.total > 1).sort((a, b) => b[1].total - a[1].total)
  .map(([nome, d]) => ({ nome, declaracoes: d.total, corpos: [...d.corpos].length }));
const totalDeclaracoes = [...declaracoes.values()].reduce((s, v) => s + v.total, 0);

const idsMap = new Map();
for (const m of t.matchAll(reId)) idsMap.set(m[1], (idsMap.get(m[1]) || 0) + 1);
const idsOcorrencias = [...idsMap.values()].reduce((s, v) => s + v, 0);
const idsDuplicados = [...idsMap.entries()].filter(([, c]) => c > 1).sort((a, b) => b[1] - a[1]).map(([n, c]) => ({ id: n, vezes: c }));

const classeMap = new Map();
const tokenInvalido = new Map();
let tokensBrutos = 0;
for (const m of t.matchAll(reClasse)) for (const c of m[1].trim().split(/\s+/)) {
  if (!c) continue;
  tokensBrutos++;
  if (/^[A-Za-z][\w:-]*$/.test(c)) classeMap.set(c, (classeMap.get(c) || 0) + 1);
  else tokenInvalido.set(c, (tokenInvalido.get(c) || 0) + 1);
}
const classeOcorrencias = [...classeMap.values()].reduce((s, v) => s + v, 0);
const tokensNaoClasse = tokensBrutos - classeOcorrencias;
const classesInterpoladas = occ(/class="[^"]*\$\{/g, t);
const classeSingletons = [...classeMap.entries()].filter(([, c]) => c === 1).length;
const classesTopo = [...classeMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([n, c]) => ({ classe: n, vezes: c }));

prova('declaracao_de_funcao', reDeclaracao, 'const a = () => 1; function b(x) { return b(x); }', 2);
prova('invocacao', reInvocacao, 'a(); a(); b();', 3);
prova('id_duplicado', reId, '<div id="q"></div><div id="q"></div>', 2);
const tokensDeClasse = (alvo) => { let n = 0; for (const m of alvo.matchAll(reClasse)) n += m[1].trim().split(/\s+/).filter((c) => c && /^[A-Za-z][\w:-]*$/.test(c)).length; return n; };
prova('classe_multiple', reClasse, '<p class="a b">x</p><p class="a">y</p>', 2);
fix.push({ regua: 'tokens_de_classe', dispara_em_fixture: tokensDeClasse('<p class="a b">x</p><p class="a ${v}">y</p>') === 3, n: tokensDeClasse('<p class="a b"><p class="a">'), minimo: 3 });

// ---------- C. vocabulário de tecnologia (classes vazias imprimem zero) ----------
const vocab = [
  ['script_src_externo', /<script[^>]*\ssrc="[^"]+"/g], ['script_embutido', /<script(?![^>]*\ssrc=)[^>]*>/g],
  ['modulo_es', /<script[^>]*\stype="module"/g], ['import_dinamico', /\bimport\s*\(/g], ['export_topo', /^\s*export\s/mg],
  ['web_component_define', /customElements\.define\(/g], ['template_id', /<template[^>]*\sid=/g], ['shadow_attach', /attachShadow\(/g],
  ['supabase_createClient', /createClient\b/g], ['supabase_js_no_cdn', /@supabase\/supabase-js@[\d.]+/g], ['janela_supabase', /window\.supabase\b/g],
  ['fetch', /\bfetch\(/g], ['websocket', /\bWebSocket\b/g], ['service_worker', /\bserviceWorker\b/g],
  ['local_storage', /\blsItem\b|\blocalStorage\b/g], ['session_storage', /\bsessionStorage\b/g], ['indexed_db', /\bindexedDB\b/g],
  ['crypto', /\bcrypto\.[a-zA-Z]+\(/g], ['intl', /\bIntl\.[A-Za-z]+\b/g], ['blob', /new\s+Blob\(/g], ['file_reader', /\bFileReader\b/g],
  ['innerHTML', /\.innerHTML\s*=/g], ['insertAdjacentHTML', /insertAdjacentHTML\(/g], ['createElement', /document\.createElement\(/g],
  ['querySelector', /querySelector(?:All)?\(/g], ['getElementById', /getElementById\(/g], ['addEventListener', /addEventListener\(/g],
  ['funcao_async', /\basync\s+function\b/g], ['setInterval_ou_timeout', /\bset(?:Interval|Timeout)\(/g],
  ['style_embutido', /<style\b/g], ['media_query', /@media\b/g], ['variavel_css_root', /:root\b/g],
  ['meta_csp', /http-equiv="Content-Security-Policy"/g], ['lang_ptbr', /<html[^>]*lang="pt-BR"/g], ['manifest_link', /rel="manifest"/g],
];
const tecnologias = {};
for (const [nome, re] of vocab) tecnologias[nome] = occ(re, t);
prova('web_component_define', /customElements\.define\(/g, 'customElements.define("x", class extends HTMLElement {})', 1);
prova('modulo_es', /<script[^>]*\stype="module"/g, '<script type="module">1</script>', 1);

const srcs = [...t.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1]);
const links = [...t.matchAll(/<link[^>]*\shref="([^"]+)"/g)].map((m) => m[1]);
const origens = [...new Set([...srcs, ...links].map((u) => { const m = /^https?:\/\/([^/]+)/.exec(u); return m ? m[1] : '(mesma_origem)'; }))].sort();

// ---------- D. regras de negócio: banco (artefactos) ----------
const linha = (obj) => (obj && Array.isArray(obj.linhas) ? obj.linhas[0] : obj) ?? null;
const politicasBanco = linha(lidos.bu2.politicas) || {};
const funcoesBanco = linha(lidos.bu2.funcoes) || {};
const mecanismos = lidos.bu2c.mecanismos || {};
const helpers = (lidos.bu2c.helpers || []).map((h) => ({ nome: h.nome, definer: h.definer, cargos: h.cargos_por_regua_larga.length, profundidade: h.profundidade_caminho }));
const helpersComCargo = helpers.filter((h) => h.cargos > 0).length;
const helpersSemCargo = helpers.filter((h) => h.cargos === 0).map((h) => h.nome);
const somaMecanismos = Object.values(mecanismos).reduce((s, v) => s + v, 0);

// ---------- E. regras de negócio: cliente (bundle) cruzado com banco ----------
const papeis = lidos.bu2c.papeis_enum || [];
const literaisPorPapel = {};
for (const p of papeis) literaisPorPapel[p] = occ(new RegExp(`['"\`]${p}['"\`]`, 'g'), t);
const gatesClientePorPapel = {};
for (const p of papeis) {
  let n = 0;
  for (const m of t.matchAll(new RegExp(`[A-Za-z_$.]+\\s*[=!]==?\\s*['"\`]${p}['"\`]`, 'g'))) n++;
  for (const m of t.matchAll(new RegExp(`['"\`]${p}['"\`]\\s*[=!]==?\\s*[A-Za-z_$.]+`, 'g'))) n++;
  for (const m of t.matchAll(new RegExp(`\\.includes\\(\\s*['"\`]${p}['"\`]\\s*\\)`, 'g'))) n++;
  gatesClientePorPapel[p] = n;
}
const comparacoesDePapelTotais = occ(/[A-Za-z_$.]+\s*[=!]==?\s*['"`][a-z_]+['"`]/g, t);
const cruzamento = papeis.map((p) => {
  const mm = lidos.bu2c.matriz[p] || {};
  const lado = (mm.leitura_larga_n || 0) + (mm.escrita_larga_n || 0);
  const distintas = new Set([...(mm.leitura_larga || []), ...(mm.escrita_larga || [])]).size;
  const cliente = gatesClientePorPapel[p];
  return { papel: p, portas_no_cliente: cliente, pares_mesa_lado_no_banco: lado, mesas_distintas_no_banco: distintas,
    classe: cliente > 0 && lado > 0 ? 'nos_dos_lados' : cliente > 0 ? 'so_no_cliente' : lado > 0 ? 'so_no_banco' : 'em_nenhum_lado' };
});
const classesCruzamento = { nos_dos_lados: [], so_no_cliente: [], so_no_banco: [], em_nenhum_lado: [] };
for (const c of cruzamento) classesCruzamento[c.classe].push(c.papel);
prova('comparacao_de_papel', /[A-Za-z_$.]+\s*[=!]==?\s*['"`][a-z_]+['"`]/g, "if (user.role === 'director') {}", 1);
prova('comparacao_invertida_de_papel', /['"`][a-z_]+['"`]\s*[=!]==?\s*[A-Za-z_$.]+/g, "if ('director' === user.role) {}", 1);
prova('lista_contem_papel', new RegExp("\\.includes\\(\\s*['\"\`]director['\"\`]\\s*\\)", 'g'), "papéis.includes('director')", 1);

// ---------- F. cobertura dos 12 pontos da parte 1 do briefing ----------
const PONTOS = [
  ['estrutura do projeto', ['estrutura'], ['01', '02'], '01 §1'],
  ['arquitetura', ['arquitetura', 'camada'], ['09', '01'], '09 §1'],
  ['tecnologias utilizadas', ['tecnologia', 'supabase-js', 'cdn'], ['09'], '09 §2'],
  ['banco de dados', ['banco'], ['01', '09'], '01 §4 + 09 §5'],
  ['perfis', ['perfil', 'papel'], ['03'], '03'],
  ['rotas', ['rota'], ['01', '02'], '01 §2 + 02'],
  ['abas', ['aba'], ['01', '05'], '01 §2 + 05'],
  ['módulos', ['módulo'], ['02'], '02'],
  ['funcionalidades', ['funcionalidade'], ['02', '06'], '02 + 06'],
  ['integrações', ['integra'], ['01'], '01 §5'],
  ['componentes compartilhados', ['componente compartilhado', 'compartilhada'], ['09'], '09 §3 e §4'],
  ['regras de negócio', ['regra de negócio', 'mecanismo'], ['09'], '09 §5 e §6'],
];
const docsDir = `${DIR}/docs/bu-20-11`;
const nomesDocs = { '01': 'mapa-completo-do-aplicativo', '02': 'checklist-dos-modulos', '03': 'perfis-e-permissoes', '04': 'inventario-mobile', '05': 'inventario-web', '06': 'as-quatro-listas', '07': 'roadmap-visual', '08': 'plano-de-prioridades', '09': 'mapa-estrutural-componentes-e-regras' };
const corpoDocs = {};
for (const [num, nome] of Object.entries(nomesDocs)) {
  const p = `${docsDir}/${num}-${nome}-20-11.md`;
  const p2 = `${docsDir}/${num}-${nome}.md`;
  corpoDocs[num] = existsSync(p) ? readFileSync(p, 'utf8') : existsSync(p2) ? readFileSync(p2, 'utf8') : null;
}
const cobertura = PONTOS.map(([ponto, agulhas, onde, endereco]) => {
  const em = onde.filter((n) => corpoDocs[n] && agulhas.some((a) => corpoDocs[n].toLowerCase().includes(a.toLowerCase())));
  const ausencia = onde.filter((n) => !corpoDocs[n]);
  return { ponto_do_briefing: ponto, agulhas_procuradas: agulhas, documentos_onde_se_espera: onde,
    documentos_onde_a_palavra_aparece: em, ficheiros_em_falta_na_arvore: ausencia, endereco_declarado: endereco,
    estado: em.length === onde.length && ausencia.length === 0 ? 'COBERTO' : em.length > 0 ? 'COBERTO_PARCIAL' : 'NAO_COBERTO' };
});
const pontoInventado = (() => {
  const agulhas = ['satélite artesanal de cobre'];
  const em = Object.keys(nomesDocs).filter((n) => corpoDocs[n] && agulhas.some((a) => corpoDocs[n].includes(a)));
  return { ponto: 'linha de montagem de satélites (controlo negativo)', agulhas, em_espera: ['09'], encontrados: em, estado: 'NAO_COBERTO' };
})();

// ---------- portões ----------
const gates = [];
const G = (nome, cond, detalhe) => gates.push({ nome, veredito: cond ? 'VERDE' : 'VERMELHO', detalhe });
const tagsBU3 = lidos.bu3.tags;
G('o_byte_varrido_e_o_mesmo_certificado_por_bu3_e_bu4',
  md5Bundle === lidos.bu3.bundle.md5 && bytesBundle === lidos.bu3.bundle.bytes && charsBundle === lidos.bu3.bundle.chars && md5Bundle === lidos.bu4.bundle.md5,
  { varrido: { md5: md5Bundle, bytes: bytesBundle, chars: charsBundle }, bu3: lidos.bu3.bundle, bu4: { md5: lidos.bu4.bundle.md5, bytes: lidos.bu4.bundle.bytes } });
G('a_contagem_de_aberturas_bate_com_a_regua_do_produtor', aberturasCruas.length === tagsBU3.aberturas_honoradas + tagsBU3.aberturas_textuais_dentro_de_corpo && fechos.length === tagsBU3.fechos_que_fecharam_elemento,
  { aberturas_cruas: aberturasCruas.length, honoradas_do_produtor: tagsBU3.aberturas_honoradas, textuais_do_produtor: tagsBU3.aberturas_textuais_dentro_de_corpo, fechos_cruas: fechos.length });
G('os_corpos_varridos_sao_os_registrados_pelo_produtor',
  seg.corpos.length + seg.externos.length === tagsBU3.aberturas_honoradas && seg.textuais === tagsBU3.aberturas_textuais_dentro_de_corpo && seg.semFecho === tagsBU3.fechos_sem_abertura,
  { corpos_com_texto: seg.corpos.length, externos: seg.externos.length, textuais: seg.textuais, sem_fecho: seg.semFecho,
    honoradas_do_produtor: tagsBU3.aberturas_honoradas, textuais_do_produtor: tagsBU3.aberturas_textuais_dentro_de_corpo, fechos_sem_abertura_do_produtor: tagsBU3.fechos_sem_abertura });
G('a_soma_de_chars_dos_corpos_bate_com_a_grandeza_que_o_produtor_chama_bytes', charsDeCorpos === tagsBU3.bytes_de_todo_script
  && tagsBU3.bytes_de_todo_script - tagsBU3.bytes_sem_identidade === tagsBU3.bytes_dos_corpos,
  { chars_dos_corpos_aqui: charsDeCorpos, bytes_de_todo_script_do_produtor: tagsBU3.bytes_de_todo_script, delta: charsDeCorpos - tagsBU3.bytes_de_todo_script,
    bytes_dos_corpos_do_produtor: tagsBU3.bytes_dos_corpos, bytes_sem_identidade_do_produtor: tagsBU3.bytes_sem_identidade,
    bytes_utf8_aqui: bytesDeCorpos, nota: 'o rótulo do produtor diz bytes, o valor que bate é a contagem de caracteres; bytes UTF-8 reais medidos aqui são outros' });
const somaClassesComp = classesComp.sem_chamada_no_byte.length + classesComp.chamada_em_um_corpo.length + classesComp.compartilhada_em_dois_ou_mais_corpos.length;
G('as_tres_classes_de_componente_particionam_os_nomes_declarados', somaClassesComp === declaracoes.size && classesComp.compartilhada_em_dois_ou_mais_corpos.length < classesComp.chamada_em_um_corpo.length + classesComp.compartilhada_em_dois_ou_mais_corpos.length,
  { soma: somaClassesComp, distintos: declaracoes.size, sem_chamada: classesComp.sem_chamada_no_byte.length, num_corpo: classesComp.chamada_em_um_corpo.length, dois_ou_mais: classesComp.compartilhada_em_dois_ou_mais_corpos.length });
G('a_classe_compartilhada_e_mais_estreita_que_a_classe_chamada_uma_vez_por_todas_as_ocorrencias',
  classesComp.compartilhada_em_dois_ou_mais_corpos.length > 0 && classesComp.compartilhada_em_dois_ou_mais_corpos.length < [...declaracoes.keys()].filter((n) => (invocacoes.get(n) || 0) > 1).length,
  { por_corpo: classesComp.compartilhada_em_dois_ou_mais_corpos.length, por_ocorrencia: [...declaracoes.keys()].filter((n) => (invocacoes.get(n) || 0) > 1).length });
G('os_ids_duplicados_sao_a_relacao_medida_entre_ocorrencias_e_distintos', idsOcorrencias - idsMap.size === idsDuplicados.reduce((s, d) => s + d.vezes - 1, 0) && idsDuplicados.every((d) => d.vezes > 1),
  { ocorrencias: idsOcorrencias, distintos: idsMap.size, nomes_duplicados: idsDuplicados.length, excesso_somado: idsDuplicados.reduce((s, d) => s + d.vezes - 1, 0) });
const somaDeclaracoes = totalDeclaracoes;
G('as_colisoes_de_nome_batem_com_declaracoes_menos_distintos', somaDeclaracoes - declaracoes.size === colisoes.reduce((s, c) => s + c.declaracoes - 1, 0),
  { declaracoes: somaDeclaracoes, distintos: declaracoes.size, nomes_em_colisao: colisoes.length, excesso_somado: colisoes.reduce((s, c) => s + c.declaracoes - 1, 0), topo: colisoes.slice(0, 6) });
const part = (politicasBanco.r_leitura || 0) + (politicasBanco.a_insercao || 0) + (politicasBanco.w_atualizacao || 0) + (politicasBanco.d_exclusao || 0) + (politicasBanco.estrela_tudo || 0);
G('as_categorias_de_politica_particionam_o_total_lido_do_produto', part === politicasBanco.total && politicasBanco.sem_filtro === 0,
  { soma_das_cinco: part, total_lido: politicasBanco.total, sem_filtro: politicasBanco.sem_filtro, unidade: 'politicas_de_rls_no_catalogo' });
G('as_marcas_de_mecanismo_batem_com_a_soma_do_produtor', somaMecanismos === lidos.bu2c.soma_de_marcas_de_mecanismo,
  { somado_aqui: somaMecanismos, declarado_pelo_produtor: lidos.bu2c.soma_de_marcas_de_mecanismo, politicas_lidas: lidos.bu2c.politicas_lidas });
G('todo_papel_recebe_uma_classe_de_cruzamento_e_as_quatro_classes_sao_impressas',
  cruzamento.length === papeis.length && cruzamento.every((c) => c.classe) && Object.keys(classesCruzamento).length === 4
  && cruzamento.every((c) => c.mesas_distintas_no_banco <= c.pares_mesa_lado_no_banco && c.mesas_distintas_no_banco <= lidos.bu2c.tabelas_total),
  { papeis: papeis.length, contagens_por_classe: Object.fromEntries(Object.entries(classesCruzamento).map(([k, v]) => [k, v.length])),
    tabelas_no_catalogo: lidos.bu2c.tabelas_total,
    maior_uniao: Math.max(...cruzamento.map((c) => c.mesas_distintas_no_banco)), maior_soma_de_lados: Math.max(...cruzamento.map((c) => c.pares_mesa_lado_no_banco)) });
const zeros = vocab.filter(([n]) => tecnologias[n] === 0).map(([n]) => n);
G('as_classes_de_vocabulario_vazias_sao_impressas_com_zero_em_vez_de_suprimidas', zeros.length > 0 && zeros.every((n) => n in tecnologias),
  { classes_com_zero: zeros.length, total_de_classes: vocab.length, nomes_com_zero: zeros });
G('nenhuma_regua_está_morta', fix.every((f) => f.dispara_em_fixture), fix.filter((f) => !f.dispara_em_fixture));
G('nenhum_ponto_do_briefing_fica_sem_cobertura_e_o_ponto_inventado_e_chumbado',
  cobertura.every((c) => c.estado === 'COBERTO') && pontoInventado.encontrados.length === 0,
  { nao_cobertos: cobertura.filter((c) => c.estado !== 'COBERTO').map((c) => `${c.ponto_do_briefing}:${c.estado}:${c.documentos_onde_a_palavra_aparece.join('|') || '-'}`),
    pontos: cobertura.length, controlo_inventado: pontoInventado });
G('os_tokens_de_classe_sao_a_soma_das_contadas_mais_as_descartadas', classeOcorrencias + tokensNaoClasse === tokensBrutos && tokensBrutos > 0,
  { brutos: tokensBrutos, contados: classeOcorrencias, descartados: tokensNaoClasse, formas_descartadas: [...tokenInvalido.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6), interpoladas: classesInterpoladas });

const res = {
  em: new Date().toISOString(), modo: 'read-only', instrumento: 'scripts/bu1-mapa-estrutural-componentes-e-regras-20-11.mjs',
  byte_varrido: { caminho: DOC.replace(DIR + '/', ''), bytes: bytesBundle, chars: charsBundle, md5: md5Bundle },
  fontes: FONTES,
  segmentacao: { aberturas_cruas: aberturasCruas.length, fechos_cruas: fechos.length, corpos_com_texto: seg.corpos.length,
    scripts_externos_no_documento: seg.externos.length, aberturas_textuais: seg.textuais, fechos_sem_abertura: seg.semFecho,
    chars_de_corpo: corpoTexto, chars_soma_dos_corpos: charsDeCorpos, bytes_de_corpo: bytesDeCorpos, do_produtor: tagsBU3 },
  componentes: { nomes_declarados_distintos: declaracoes.size, declaracoes_no_total: somaDeclaracoes,
    por_classe: { sem_chamada_no_byte: classesComp.sem_chamada_no_byte.length, chamada_em_um_corpo: classesComp.chamada_em_um_corpo.length, compartilhada_em_dois_ou_mais_corpos: classesComp.compartilhada_em_dois_ou_mais_corpos.length },
    mais_usados: classesComp.compartilhada_em_dois_ou_mais_corpos.slice(0, 30),
    nunca_invocados: classesComp.sem_chamada_no_byte.slice(0, 40),
    colisoes_de_nome: colisoes.slice(0, 30),
    ids: { ocorrencias: idsOcorrencias, distintos: idsMap.size, duplicados: idsDuplicados },
    classes_css: { tokens_brutos: tokensBrutos, ocorrencias: classeOcorrencias, distintas: classeMap.size, usadas_uma_sozinha: classeSingletons, nao_classe: tokensNaoClasse, interpoladas: classesInterpoladas, topo: classesTopo } },
  tecnologias, origens_externas: origens, scripts_externos: srcs, folhas_e_liga: links,
  regras_de_negocio: { do_banco: { politicas: politicasBanco, funcoes: funcoesBanco, mecanismos, soma_de_marcas: somaMecanismos,
    helpers_no_total: helpers.length, helpers_com_cargo: helpersComCargo, helpers_sem_cargo: helpersSemCargo,
    helpers_topo: helpers.slice().sort((a, b) => b.cargos - a.cargos).slice(0, 20) },
  do_cliente: { comparacoes_de_papel: comparacoesDePapelTotais, literais_por_papel: literaisPorPapel, portas_por_papel: gatesClientePorPapel },
  cruzamento },
  classes_de_cruzamento: classesCruzamento,
  cobertura_do_briefing: cobertura, controlo_negativo_da_cobertura: pontoInventado,
  fixtures_das_reguas: fix,
  veredictos: gates,
};
const vermelhas = gates.filter((g) => g.veredito === 'VERMELHO');
res.veredito_final = vermelhas.length === 0
  ? `BU1_MAPA_VERDE ${gates.length}/0`
  : `BU1_MAPA_VERMELHO ${gates.length - vermelhas.length}/${vermelhas.length} ${vermelhas.map((v) => v.nome).join(',')}`;
res.msd = Date.now() - t0;

writeFileSync(OUT, JSON.stringify(res, null, 2) + '\n');
const txt = [
  `veredito=${res.veredito_final}`,
  `byte=${res.byte_varrido.caminho} md5=${md5Bundle} bytes=${bytesBundle} chars=${charsBundle}`,
  `fontes=${Object.entries(FONTES).map(([k, v]) => `${k}:${v.md5}(${v.bytes}B)`).join(' ')}`,
  `segmentacao=aberturas_cruas:${aberturasCruas.length} fechos:${fechos.length} corpos_com_texto:${seg.corpos.length} externos:${seg.externos.length} textuais:${seg.textuais} sem_fecho:${seg.semFecho} chars:${corpoTexto} soma_chars:${charsDeCorpos} bytes_utf8:${bytesDeCorpos} do_produtor_corpos:${tagsBU3.corpos_de_script_no_documento} do_produtor_bytes:${tagsBU3.bytes_dos_corpos}`,
  `componentes=distintos:${declaracoes.size} declaracoes:${somaDeclaracoes} sem_chamada:${classesComp.sem_chamada_no_byte.length} num_corpo:${classesComp.chamada_em_um_corpo.length} dois_ou_mais:${classesComp.compartilhada_em_dois_ou_mais_corpos.length}`,
  `mais_usados=${classesComp.compartilhada_em_dois_ou_mais_corpos.slice(0, 12).map((c) => `${c.nome}:${c.corpos}c/${c.chamadas}x`).join(',')}`,
  `nunca_invocados=${classesComp.sem_chamada_no_byte.slice(0, 12).join(',')} (total ${classesComp.sem_chamada_no_byte.length})`,
  `colisoes=${colisoes.length} topo=${colisoes.slice(0, 10).map((c) => `${c.nome}:${c.declaracoes}`).join(',')}`,
  `ids=ocorrencias:${idsOcorrencias} distintos:${idsMap.size} duplicados:${idsDuplicados.length} lista=${idsDuplicados.slice(0, 10).map((d) => `${d.id}:${d.vezes}`).join(',')}`,
  `classes_css=ocorrencias:${classeOcorrencias} distintas:${classeMap.size} sozinhas:${classeSingletons} topo=${classesTopo.slice(0, 10).map((c) => `${c.classe}:${c.vezes}`).join(',')}`,
  `vocab=${Object.entries(tecnologias).map(([k, v]) => `${k}:${v}`).join(' ')}`,
  `origens=${origens.join(',')}`,
  `politicas=${JSON.stringify(politicasBanco)} funcoes=${JSON.stringify(funcoesBanco)}`,
  `mecanismos=${Object.entries(mecanismos).map(([k, v]) => `${k}:${v}`).join(' ')} soma=${somaMecanismos} marca_do_produtor=${lidos.bu2c.soma_de_marcas_de_mecanismo}`,
  `helpers=${helpers.length} com_cargo=${helpersComCargo} sem_cargo=${helpersSemCargo.length}:${helpersSemCargo.join(',')} topo=${helpers.slice().sort((a, b) => b.cargos - a.cargos).slice(0, 8).map((h) => `${h.nome}:${h.cargos}`).join(',')}`,
  `cliente=comparacoes:${comparacoesDePapelTotais} portas=${papeis.map((p) => `${p}:${gatesClientePorPapel[p]}`).join(' ')}`,
  `cruzamento_por_papel=${cruzamento.map((c) => `${c.papel}:cliente${c.portas_no_cliente}/pares${c.pares_mesa_lado_no_banco}/distintas${c.mesas_distintas_no_banco}`).join(' ')}`,
  `cruzamento=${Object.entries(classesCruzamento).map(([k, v]) => `${k}[${v.length}]:${v.join('|')}`).join(' ')}`,
  `cobertura=${cobertura.map((c) => `${c.ponto_do_briefing}:${c.estado}:${c.documentos_onde_a_palavra_aparece.join('+') || '-'}`).join(' | ')}`,
  `gates=${gates.map((g) => `${g.nome}:${g.veredito}`).join(' ')}`,
  `node_exit=0 ms=${res.msd}`,
].join('\n') + '\n';
writeFileSync(TXT, txt);
console.log(txt);
