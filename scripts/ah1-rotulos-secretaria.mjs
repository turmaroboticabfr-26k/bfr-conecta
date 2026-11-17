// Sonda de instrumento, anónima e só de leitura: censo dos NOMES que a superfície da Secretaria usa ao ar,
// e da cobertura real do diário autenticado de 17/11. Por que existe: a pergunta «não achei a aba da
// secretaria de educação» não se responde por memória — tem de medir (1) quantos rótulos distintos a mesma
// superfície tem, (2) onde cada um é emitido, (3) qual deles é sub-aba e qual é só cabeçalho, e (4) o que o
// diário com conta real efetivamente percorreu. Nada aqui escreve no app: é um GET do shell e uma leitura de
// dois ficheiros locais. Não imprime qualquer valor de campo com forma de credencial.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const OUT = `${DIR}/evidence/ah1-rotulos-secretaria-17-11.json`;
const DIARIO = `${DIR}/evidence/ah1-secretaria-navegador-17-11.json`;

if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com outro nome');

const resp = await fetch(URL_APP, { headers: { 'cache-control': 'no-cache' } });
const buf = Buffer.from(await resp.arrayBuffer());
const t = buf.toString('utf8');
const md5 = createHash('md5').update(buf).digest('hex');
const linhaDe = (p) => t.slice(0, p).split('\n').length;

const conta = (s) => t.split(s).length - 1;
const rotulos = {};
for (const nome of ['Secretaria', 'Secretaria digital', 'Secretaria de Educação', 'Centro de Gestão da Educação', 'Atendimento da escola', 'Supervisão Educacional', 'Supervisão']) {
  rotulos[nome] = { ocorrencias_no_shell: conta(nome), primeira_linha: (() => { const p = t.indexOf(nome); return p < 0 ? null : linhaDe(p); })() };
}

const lista = (atributo) => {
  const saida = [];
  let p = -1;
  while ((p = t.indexOf(atributo + '="', p + 1)) !== -1) {
    const rec = t.slice(p, p + 140);
    const m = rec.match(new RegExp(atributo + '="([^"]+)"[^>]*>([^<]{1,44})'));
    if (m) saida.push({ valor: m[1], rotulo: m[2].trim(), linha: linhaDe(p) });
  }
  return saida;
};

const subabas_modulo = lista('data-sec-tab');
const subabas_rede = lista('data-secretary-tab');

const i = t.indexOf('roleSectionAccess');
const inicio = t.indexOf('{', i);
let prof = 0, fim = inicio;
for (let k = inicio; k < t.length; k++) {
  if (t[k] === '{') prof++;
  else if (t[k] === '}') { prof--; if (prof === 0) { fim = k; break; } }
}
const corpo = t.slice(inicio + 1, fim);
const acessos = {};
for (const m of corpo.matchAll(/([A-Za-z_]+):\s*\[/g)) {
  const depois = corpo.slice(m.index + m[0].length);
  const secs = depois.slice(0, depois.indexOf(']')).split(',').map((x) => x.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
  acessos[m[1]] = { n: secs.length, tem_secretaria: secs.includes('secretaria'), tem_supervisao: secs.includes('supervisao'), secoes: secs };
}

const a = t.indexOf('const staff =');
const regra_render = a > 0 ? t.slice(a, a + 220).replace(/\s+/g, ' ') : null;

const chip = (() => {
  const p = t.indexOf('accountLabels = {');
  if (p < 0) return null;
  const rec = t.slice(p, p + 900);
  const m = rec.match(/education_supervisor:\[('[^\]]*')\]/);
  return m ? m[1] : null;
})();

const d = JSON.parse(readFileSync(DIARIO, 'utf8'));
const s = JSON.stringify(d);
// `portoes` neste diário é um NÚMERO (17), não um objeto nem um array: a primeira versão desta sonda
// tratou-o como coleção e emitiu `portoes: 0`, que é uma contagem falsa. Lê-se a forma, não se assume.
const forma = (v) => (Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v);
const tamanho = (v) => (Array.isArray(v) ? v.length : typeof v === 'number' ? v : v && typeof v === 'object' ? Object.keys(v).length : null);

const out = {
  programa: 'scripts/ah1-rotulos-secretaria.mjs',
  em: new Date().toISOString(),
  url: URL_APP,
  o_que_prova: 'quantos nomes distintos a superfície da Secretaria tem no shell servido, onde cada um é emitido, quantas sub-abas tem cada um dos dois workspaces, o que roleSectionAccess atribui a secretary e a education_supervisor, e o que o diário autenticado de 17/11 percorreu',
  o_que_NAO_prova: 'nada executado: nenhuma sub-aba foi clicada num browser com sessão; as posições são linhas do texto descodificado do shell (content-encoding br), e o que o ar serve hoje pode divergir do que o utilizador tem em cache',
  shell: {
    http: resp.status,
    bytes: buf.length,
    caracteres: t.length,
    md5,
    content_encoding: resp.headers.get('content-encoding'),
    unidade_aviso: 'bytes ≠ caracteres: a diferença é o UTF-8 multi-byte do texto, não uma versão diferente do ficheiro',
  },
  rotulos,
  subabas_modulo_secretaria: { atributo: 'data-sec-tab', n: subabas_modulo.length, itens: subabas_modulo },
  subabas_workspace_rede: { atributo: 'data-secretary-tab', n: subabas_rede.length, itens: subabas_rede },
  roleSectionAccess: { linha: linhaDe(i), chaves: Object.keys(acessos).length, secretary: acessos.secretary, education_supervisor: acessos.education_supervisor },
  regra_render_do_workspace: { fonte: 'linha ' + (a > 0 ? linhaDe(a) : '?'), expressao: regra_render },
  chip_da_conta_para_education_supervisor: chip,
  diario_autenticado_17_11: {
    ficheiro: 'evidence/ah1-secretaria-navegador-17-11.json',
    em: d.em,
    largura: d.largura,
    secoes_esperadas: d.secoes_esperadas,
    n_seccoes: d.secoes_esperadas.length,
    portoes: tamanho(d.portoes),
    forma_de_portoes: forma(d.portoes),
    falhas: tamanho(d.falhas),
    forma_de_falhas: forma(d.falhas),
    veredito: d.veredito,
    ocorrencias_de_supervisao_no_diario: (s.match(/supervis/gi) || []).length,
  },
};

out.veredito = {
  nomes_distintos_da_mesma_superficie: Object.keys(rotulos).filter((k) => rotulos[k].ocorrencias_no_shell > 0).length,
  aba_supervisao_existe_no_ar: subabas_modulo.some((x) => x.valor === 'supervisao'),
  aba_supervisao_medida_em_navegador_com_sessao: out.diario_autenticado_17_11.ocorrencias_de_supervisao_no_diario > 0,
  secretarias_de_educacao_e_rotulo_de_aba: subabas_modulo.concat(subabas_rede).some((x) => /Secretaria de Educa/i.test(x.rotulo)),
};

writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log('VEREDITO: ' + JSON.stringify(out.veredito));
console.log('shell: ' + out.shell.bytes + ' B · md5 ' + out.shell.md5 + ' · ' + out.shell.caracteres + ' caracteres');
console.log('sub-abas do módulo: ' + out.subabas_modulo_secretaria.n + ' · do workspace de rede: ' + out.subabas_workspace_rede.n);
console.log('secretary → ' + out.roleSectionAccess.secretary.n + ' seções (supervisao? ' + out.roleSectionAccess.secretary.tem_supervisao + ')');
console.log('education_supervisor → ' + out.roleSectionAccess.education_supervisor.n + ' seções (supervisao? ' + out.roleSectionAccess.education_supervisor.tem_supervisao + ')');
console.log('artefacto: ' + OUT);
