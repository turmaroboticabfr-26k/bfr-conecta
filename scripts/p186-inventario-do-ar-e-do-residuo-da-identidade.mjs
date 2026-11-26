#!/usr/bin/env node
// P186 — inventário do ar servido para as FASES 2 e 12/13 do «prompt mestre» de 26/11: quantas abas e que
// funcionalidades existem, e que resíduo da identidade antiga fica no que o utilizador recebe. Só-leitura: lê
// o índice do git, o bundle da candidata e os documentos versionados; escreve apenas o seu registo, com guarda
// de sobrescrita. A identidade do ar nunca é lembrada: vem do registo mais novo do seu produtor (a família do
// verificador de versão), pelo carimpo `em` que ele próprio escreveu, e a peça aborta se o candidato não for
// único. Nenhum valor que tenha forma de credencial é gravado: os trechos passam por um redactor com padrão
// declarado e o registo serializado é varrido pelo mesmo padrão antes de sair.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const RAIZ = resolve(import.meta.dirname, '..');
const PROBE = process.argv.includes('--sonda-fixtures');
const SUF = process.env.P186_SUF ? '-' + process.env.P186_SUF : '-26-11';
const OUT = join(RAIZ, `evidence/p186-inventario-do-ar-e-do-residuo${SUF}.json`);
if (!PROBE && existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com P186_SUF=novo, não por cima');
const EVIDENCE = join(RAIZ, 'evidence');
const md5 = (b) => createHash('md5').update(b).digest('hex');

const escolheMaisNovo = (candidatos) => {
  const comCarimpo = candidatos.filter((c) => Number.isFinite(c.ms));
  const semCarimpo = candidatos.filter((c) => !Number.isFinite(c.ms)).map((c) => c.nome);
  if (comCarimpo.length === 0) return { ok: false, motivo: 'nenhum registo com carimpo legivel', total: candidatos.length, semCarimpo };
  const max = Math.max(...comCarimpo.map((c) => c.ms));
  const empatados = comCarimpo.filter((c) => c.ms === max).map((c) => c.nome);
  if (empatados.length > 1) return { ok: false, motivo: 'empate no carimpo mais novo', total: candidatos.length, semCarimpo, empatados };
  const escolhido = comCarimpo.find((c) => c.ms === max);
  return { ok: true, nome: escolhido.nome, em: escolhido.em, total: candidatos.length, semCarimpo };
};
const leFamilia = (prefixo) => {
  const nomes = readdirSync(EVIDENCE).filter((n) => n.startsWith(prefixo) && n.endsWith('.json')).sort();
  const candidatos = nomes.map((nome) => {
    let em;
    try { em = JSON.parse(readFileSync(join(EVIDENCE, nome), 'utf8')).em; } catch { em = undefined; }
    return { nome, em, ms: typeof em === 'string' ? Date.parse(em) : NaN };
  });
  const escolha = escolheMaisNovo(candidatos);
  if (!escolha.ok) throw new Error(`ABORTA família ${prefixo}: ${escolha.motivo} — ${JSON.stringify(escolha)}`);
  return { ...escolha, json: JSON.parse(readFileSync(join(EVIDENCE, escolha.nome), 'utf8')) };
};

const REDACCOES = [
  { nome: 'chave_de_api_de_cliente', re: /AIza[0-9A-Za-z_\-]{20,}/g, marca: '<REDACTADO_CHAVE_DE_API>' },
  { nome: 'token_de_bearer', re: /eyJ[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}/g, marca: '<REDACTADO_TOKEN>' },
  { nome: 'segredo_de_formato_opaco', re: /sk_[A-Za-z0-9]{16,}/g, marca: '<REDACTADO_SEGREDO>' }
];
const redige = (texto) => REDACCOES.reduce((acc, r) => acc.replace(new RegExp(r.re.source, 'g'), r.marca), texto);
const achaRedaccoes = (texto) => REDACCOES.reduce((acc, r) => acc + (texto.match(new RegExp(r.re.source, 'g')) || []).length, 0);

const CLASSES = ['campo_de_identidade_do_navegador', 'url_ou_host', 'chave_de_projecto_ou_config_externa',
  'nome_de_ficheiro_de_activo', 'classe_de_estilo', 'identificador_de_programa', 'chave_de_armazenamento',
  'texto_visivel_ao_utilizador'];

// Os rótulos de <meta> que o navegador devolve como identidade do sítio (separador, ecrã inicial, partilha).
// Um `content` fora desta lista é configuração técnica: foi o que fez duma Content-Security-Policy — cujo único
// texto é uma lista de hosts — um «campo de identidade» na primeira corrida desta peça.
const METAS_DE_IDENTIDADE = ['apple-mobile-web-app-title', 'og:site_name', 'description', 'theme-color'];
const MARCA_NOVA = /uniesco/i;
// A agulha da marca antiga vive uma só vez neste ficheiro. Dactilografada em cada uso, é a mesma raiz do
// «nome lembrado»: um dos sítios pode ganhar uma variante e as contagens deixam de falar da mesma coisa.
const MARCA_ANTIGA = /bfr[\s-]?conecta/i;

// O quadro do classificador é o que a página diz ao navegador, não a janela de caracteres em volta: primeiro
// sabe-se em que bloco a ocorrência vive (marca, script, estilo ou atributo de tag) e só depois se lhe dá
// classe. Uma régua de janela sozinha contava o CSS como texto visível porque o texto minificado não tem
// `<` nem `>` nos primeiros noventa caracteres, e um `lastIndexOf` por ocorrência sobre 3.5 MB é quadrático:
// o documento é tokenizado uma só vez e cada offset resolve por busca binária no segmento que o contém.
// Um `<` solto sem fecho fica no segmento anterior (o tokenizador não lhe dá tipo novo); um `<script>` dentro
// dum literal de JS engana a fronteira do bloco — os dois casos são heurística declarada, não medida.
const NOMES_DE_ESTADO = ['marca', 'tag', 'script', 'style'];
// Map (não WeakMap): em Node uma string não é chave válida de WeakMap, e o texto é precisamente a chave.
const FONTES_DE_QUADRO = new Map();
const quadroDo = (texto) => {
  const jaFeito = FONTES_DE_QUADRO.get(texto);
  if (jaFeito) return jaFeito;
  const inds = [];
  const tps = [];
  const saltos = [0];
  const rx = /<script\b[\s\S]*?<\/script\s*>|<style\b[\s\S]*?<\/style\s*>|<[^>]*>|[^<>]+/gi;
  let m;
  while ((m = rx.exec(texto)) !== null) {
    if (m[0].length === 0) { rx.lastIndex++; continue; }
    let t = 0;
    if (/^<script/i.test(m[0])) t = 2;
    else if (/^<style/i.test(m[0])) t = 3;
    else if (m[0].charCodeAt(0) === 60) t = 1;
    inds.push(m.index);
    tps.push(t);
  }
  for (let i = texto.indexOf('\n'); i >= 0; i = texto.indexOf('\n', i + 1)) saltos.push(i + 1);
  const q = { texto, inds, tps, saltos, tokens: inds.length };
  FONTES_DE_QUADRO.set(texto, q);
  return q;
};
const procura = (v, alvo) => {
  let a = 0;
  let b = v.length - 1;
  while (a < b) {
    const mid = Math.floor((a + b + 1) / 2);
    if (v[mid] <= alvo) a = mid; else b = mid - 1;
  }
  return a;
};
const estadoDe = (q, offset) => {
  if (q.inds.length === 0 || offset < q.inds[0]) return { nome: 'marca', inicio: 0 };
  const i = procura(q.inds, offset);
  return { nome: NOMES_DE_ESTADO[q.tps[i]], inicio: q.inds[i] };
};
const posNaGrade = (q, offset) => {
  const l = procura(q.saltos, offset);
  return { linha: l + 1, coluna: offset - q.saltos[l] + 1 };
};
const classeia = (q, offset, fim) => {
  const texto = q.texto;
  const { nome: estado, inicio } = estadoDe(q, offset);
  const esq = texto.slice(Math.max(0, offset - 140), offset);
  const dir = texto.slice(fim, Math.min(texto.length, fim + 140));
  const antes = (re) => re.test(esq);
  const depois = (re) => re.test(dir);
  if (antes(/(\.innerText|\.textContent|\.innerHTML|\.value)\s*[:=]\s*["'`]?$/i)) return 'texto_visivel_ao_utilizador';
  if (estado === 'style') {
    if (depois(/^[a-zA-Z0-9_.\/-]*\.(jpg|jpeg|png|svg|webp|ico|gif|woff2?)\b/i)) return 'nome_de_ficheiro_de_activo';
    return 'classe_de_estilo';
  }
  if (estado === 'tag') {
    const emTag = texto.slice(inicio + 1, offset);
    const eq = emTag.lastIndexOf('=');
    if (eq < 0) return 'identificador_de_programa';
    const nome = (emTag.slice(0, eq).match(/([a-zA-Z0-9_:.-]+)\s*$/) || [])[1] || '';
    if (/^content$/i.test(nome)) {
      if (antes(/(?:https?:)?\/\/[^"'<>\s]*$/)) return 'url_ou_host';
      const rotulo = ((emTag.match(/\b(?:name|property|http-equiv)\s*=\s*["']([^"']{1,60})["']/i) || [])[1] || '').toLowerCase();
      if (METAS_DE_IDENTIDADE.includes(rotulo)) return 'campo_de_identidade_do_navegador';
      return 'chave_de_projecto_ou_config_externa';
    }
    if (/^(alt|title|aria-label|placeholder)$/i.test(nome)) return 'texto_visivel_ao_utilizador';
    if (/^(class|classname)$/i.test(nome)) return 'classe_de_estilo';
    if (/^(src|href|srcset|poster|data|action)$/i.test(nome)) {
      if (depois(/^[a-zA-Z0-9_.\/-]*\.(jpg|jpeg|png|svg|webp|ico|gif|woff2?|js|css|html|json)\b/i)) return 'nome_de_ficheiro_de_activo';
      return 'url_ou_host';
    }
    return 'identificador_de_programa';
  }
  if (antes(/<\/?title(\s[^<>]*)?>$/i) && depois(/^<\/title/i)) return 'campo_de_identidade_do_navegador';
  if (antes(/(https?:)?\/\/[a-zA-Z0-9.-]*$/)) return 'url_ou_host';
  if (antes(/(localStorage|sessionStorage)\s*\.\s*(set|get|remove)Item\s*\(\s*["'`]?$/i)
    || antes(/(caches\s*\.\s*(open|match|has)|indexedDB\s*\.\s*open)\s*\(\s*["'`]?$/i)) return 'chave_de_armazenamento';
  if (antes(/document\s*\.\s*(getElementById|getElementsBy[A-Za-z]+|querySelector|querySelectorAll|createElement)\s*\(\s*["'`]?$/i))
    return 'identificador_de_programa';
  if (antes(/([a-zA-Z0-9_$.-]+)\s*[:=]\s*["'`]?$/i)) {
    const chave = esq.match(/([a-zA-Z0-9_$.-]+)\s*[:=]\s*["'`]?$/i)[1];
    if (/^(authDomain|projectId|storageBucket|messagingSenderId|appId|apiKey|databaseURL|siteKey|clientId|trackingId)$/i.test(chave))
      return 'chave_de_projecto_ou_config_externa';
    return 'chave_de_armazenamento';
  }
  if (depois(/^\.(?:[a-zA-Z0-9-]+\.)+(com|net|org|dev|io|app|cloud)\b/i)) return 'url_ou_host';
  if (depois(/^[a-zA-Z0-9_.-]*\.(js|css|html|json|png|jpg|jpeg|svg|webp|ico)\b/i)) return 'nome_de_ficheiro_de_activo';
  if (estado === 'script') return 'identificador_de_programa';
  return 'texto_visivel_ao_utilizador';
};

const OCORRENCIAS = (texto, re) => {
  const saida = [];
  const rx = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  let m;
  while ((m = rx.exec(texto)) !== null) {
    saida.push({ i: m.index, fim: m.index + m[0].length, texto: m[0], grupo: m[1] });
    if (m.index === rx.lastIndex) rx.lastIndex++;
  }
  return saida;
};

// O fixture é uma página completa e cada ocorrência é a mesma frase: o que muda é o quadro (marca, estilo,
// script, atributo). As classes esperadas abaixo são medidas por esta sonda, não dactilografadas de memória.
const FIXTURE_PAGINA = '<html><head><title>bfr-conecta</title>'
  + '<style>.a{background:url(bfr-conecta-cover.jpg)}</style>'
  + '<meta name="apple-mobile-web-app-title" content="bfr-conecta">'
  + '<script>var c={authDomain:\'bfr-conecta.firebaseapp.com\'};'
  + 'localStorage.setItem("bfr-conecta-cache", 1);</script>'
  + '<p>Bem-vindo ao bfr-conecta</p>'
  + '<img data-bfr-conecta-fuso="1" src="/bfr-conecta-logo.png">'
  + '<div class="bfr-conecta-rodape" placeholder="Entrar no bfr-conecta"></div>'
  + '<a href="https://bfr-conecta.pages.dev/entrar">entrar</a>'
  + '<meta http-equiv="Content-Security-Policy" content="script-src https://bfr-conecta.workers.dev">'
  + '<meta name="robots" content="noindex bfr-conecta">'
  + '<script>document.getElementById("bfr-conecta-aba").innerText="BFR Conecta";</script></body></html>';

// Os tres exemplos de politica dao as tres caras que o ar pode ter: hosts com esquema, um host escrito sem
// esquema (que uma rota conta e a outra nao), e nenhuma politica. As expectativas do portao saem-me da sonda
// abaixo, corrida por esta peça, e nao da memoria.
const FIXTURES_DA_POLITICA = [
  { nome: 'com_hosts_e_esquemas', texto: '<meta http-equiv="Content-Security-Policy" content="img-src \'self\' data: https:; connect-src https://x.example wss://x.example">' },
  { nome: 'host_sem_esquema', texto: '<meta http-equiv="Content-Security-Policy" content="script-src app.example.com \'unsafe-inline\'">' },
  { nome: 'sem_politica', texto: '<html><head><title>qualquer coisa</title></head><body>nada</body></html>' }
];

// A politica de seguranca servida e uma lista de hosts, e o nome antigo sobrevive num deles. Conto por HOST e
// por TOKEN separadamente, porque `https://x` e `wss://x` sao dois tokens e um host: a palavra «distintos» tem
// de dizer qual dos dois se conta. Palavras-chave ('self', 'none', 'unsafe-*') e esquemas sem host (data:,
// blob:, https:) nao sao hosts e saem da contagem pelo nome. As duas rotas de contar tokens - o parser da
// directiva e a varredura do esquema - sao independentes, e e por isso que a igualdade delas e uma medida.
function politicaDe(texto) {
  const tags = OCORRENCIAS(texto, /<meta\b[^>]*>/gi)
    .filter((o) => /http-equiv\s*=\s*["']?content-security-policy["']?/i.test(o.texto));
  const conteudos = tags.map((t) => ((t.texto.match(/content\s*=\s*(["'])(.*?)\1/i) || [])[2] || ''));
  const PALAVRAS = /^('[^']*'|[a-z][a-z0-9+.-]*:$)/i;
  const directivas = [];
  const hosts = [];
  let palavras_excluidas = 0;
  for (const conteudo of conteudos) {
    for (const parte of conteudo.split(';')) {
      const partes = parte.trim().split(/\s+/).filter((s) => s !== '');
      if (partes.length === 0) continue;
      const fontes = partes.slice(1);
      directivas.push({ nome: partes[0], fontes });
      for (const fonte of fontes) {
        if (PALAVRAS.test(fonte)) { palavras_excluidas++; continue; }
        const host = fonte.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').replace(/^['"]|['"]$/g, '')
          .split('/')[0].split(':')[0];
        if (host) hosts.push(host);
      }
    }
  }
  const por_host = hosts.reduce((acc, h) => { acc[h] = (acc[h] || 0) + 1; return acc; }, {});
  const distintos = Object.keys(por_host);
  return { tags: tags.length, directivas: directivas.length, tokens_de_host: hosts.length,
    tokens_de_host_com_esquema: OCORRENCIAS(conteudos.join(';'), /[a-z][a-z0-9+.-]*:\/\/[^"'<;\s]+/gi).length,
    hosts_distintos: distintos.length, por_host, palavras_e_esquemas_excluidos: palavras_excluidas,
    com_a_marca_antiga: distintos.filter((h) => MARCA_ANTIGA.test(h)),
    com_a_marca_nova: distintos.filter((h) => MARCA_NOVA.test(h)) };
}

if (PROBE) {
  const qF = quadroDo(FIXTURE_PAGINA);
  const occ = OCORRENCIAS(FIXTURE_PAGINA, MARCA_ANTIGA);
  occ.forEach((o, n) => {
    console.log(`#${n} estado=${estadoDe(qF, o.i).nome} offset=${o.i} classe=${classeia(qF, o.i, o.fim)} volta=${JSON.stringify(FIXTURE_PAGINA.slice(Math.max(0, o.i - 34), o.i))} -> ${JSON.stringify(FIXTURE_PAGINA.slice(o.i, o.i + 34))}`);
  });
  console.log(`P186_SONDA_FIXTURES ocorrencias=${occ.length} tokens_do_quadro=${qF.tokens}`);
  {
    const p = politicaDe(FIXTURE_PAGINA);
    console.log(`P186_SONDA_POLITICA pagina_de_classes tags=${p.tags} directivas=${p.directivas} tokens=${p.tokens_de_host} com_esquema=${p.tokens_de_host_com_esquema} distintos=${p.hosts_distintos} excluidos=${p.palavras_e_esquemas_excluidos} antigos=${JSON.stringify(p.com_a_marca_antiga)}`);
  }
  for (const f of FIXTURES_DA_POLITICA) {
    const p = politicaDe(f.texto);
    console.log(`P186_SONDA_POLITICA ${f.nome} tags=${p.tags} directivas=${p.directivas} tokens=${p.tokens_de_host} com_esquema=${p.tokens_de_host_com_esquema} distintos=${p.hosts_distintos} excluidos=${p.palavras_e_esquemas_excluidos} antigos=${JSON.stringify(p.com_a_marca_antiga)} novos=${JSON.stringify(p.com_a_marca_nova)}`);
  }
  process.exit(0);
}

const lidoIdentidade = leFamilia('p116-consistencia-de-versao');
const espera = { md5: lidoIdentidade.json.ar.leituras[0].md5, bytes: lidoIdentidade.json.ar.leituras[0].bytes, diario: lidoIdentidade.json.ar.diario };
const candidatas = readdirSync(RAIZ).filter((n) => /^bfr-candidata-/.test(n) && statSync(join(RAIZ, n)).isDirectory());
const bundles = candidatas.map((dir) => {
  const p = join(RAIZ, dir, 'index.html');
  if (!existsSync(p)) return { dir, md5: null, bytes: 0 };
  const b = readFileSync(p);
  return { dir, md5: md5(b), bytes: b.length };
});
const resolvem = bundles.filter((b) => b.md5 === espera.md5 && b.bytes === espera.bytes);
if (resolvem.length !== 1) {
  throw new Error(`ABORTA: ${resolvem.length} candidatas batem com a pegada ${espera.md5}/${espera.bytes} do registo ${lidoIdentidade.nome} — a identidade do ar nao resolve num so candidato`);
}
const ALVO_DIR = resolvem[0].dir;
const ar = readFileSync(join(RAIZ, ALVO_DIR, 'index.html'), 'utf8');
const Q_AR = quadroDo(ar);
const ar_bytes = Buffer.byteLength(ar, 'utf8');
const ar_md5 = md5(Buffer.from(ar, 'utf8'));

const NAV_RE = /data-section="([a-z0-9-]+)"/;
const abas = (() => {
  const mapa = new Map();
  for (const o of OCORRENCIAS(ar, NAV_RE)) mapa.set(o.grupo, (mapa.get(o.grupo) || 0) + 1);
  return [...mapa.entries()].map(([secao, ocorrencias]) => ({ secao, ocorrencias }))
    .sort((a, b) => b.ocorrencias - a.ocorrencias || a.secao.localeCompare(b.secao));
})();
const abas_varridas = OCORRENCIAS(ar, NAV_RE).length;

const lidoPortas = leFamilia('ah2-sonda-portas-por-papel-');
// O registo mais novo da sonda de portas traz a pegada do shell que ele próprio varreu: se essa pegada não é
// a do ar de agora, as contagens por papel não descrevem este bundle e diz-se isso em vez de calar a sonda.
const chavesPapeis = ['papéis', 'papeis'].filter((k) => k in lidoPortas.json);
if (chavesPapeis.length !== 1) {
  throw new Error(`ABORTA: o registo ${lidoPortas.nome} declara ${JSON.stringify(chavesPapeis)} do campo dos papeis — tem de haver uma so grafia`);
}
const porPapel = lidoPortas.json[chavesPapeis[0]];
const papeisDaSonda = Object.keys(porPapel);
const noDomPorPapel = papeisDaSonda.map((p) => ({ papel: p, data_section_no_dom: porPapel[p].data_section_no_dom ?? null }));
const pegadaDaSonda = lidoPortas.json.md5_shell || null;
const sondaBateComOAr = pegadaDaSonda !== null && pegadaDaSonda === ar_md5;

const CAMPOS_DE_IDENTIDADE = [
  { campo: 'title', re: /<title[^>]*>([\s\S]{0,200}?)<\/title>/i },
  { campo: 'meta_apple_mobile_web_app_title', re: /<meta[^>]*apple-mobile-web-app-title[^>]*content="([^"]*)"/i },
  { campo: 'meta_description', re: /<meta[^>]*name="description"[^>]*content="([^"]*)"/i },
  { campo: 'meta_og_site_name', re: /<meta[^>]*property="og:site_name"[^>]*content="([^"]*)"/i },
  { campo: 'manifest_name', re: /"name"\s*:\s*"([^"]{1,80})"/i },
  { campo: 'manifest_short_name', re: /"short_name"\s*:\s*"([^"]{1,80})"/i },
  { campo: 'meta_theme_color', re: /<meta[^>]*theme-color[^>]*content="([^"]*)"/i }
];
const identidade = CAMPOS_DE_IDENTIDADE.map((p) => {
  const m = ar.match(p.re);
  const valor = m ? m[1] : null;
  return { campo: p.campo, presente: !!m, valor: valor === null ? null : redige(valor),
    marca_antiga: valor ? MARCA_ANTIGA.test(valor) : false, marca_nova: valor ? MARCA_NOVA.test(valor) : false };
});
// O ar referencia manifest e ícones por nome de ficheiro. O que se mede aqui é a referência e a existência
// DENTRO da directora da candidata: se um nome não está lá, isso não prova um 404 no servidor (o deploy pode
// levar mais do que esta directora), por isso a lista de ausentes é um censo impresso, não um veredicto.
const existeNaDirectoria = (dir, href) => existsSync(join(RAIZ, dir, href.replace(/^\.?\//, '')));
const activos_referenciados = OCORRENCIAS(ar, /<link\b[^>]*>/gi).map((o) => {
  const tag = o.texto;
  const href = ((tag.match(/href\s*=\s*["']([^"']{1,200})["']/i) || [])[1] || '').trim();
  const rel = ((tag.match(/rel\s*=\s*["']([^"']{1,60})["']/i) || [])[1] || '').toLowerCase();
  const absoluto = /^(https?:)?\/\//i.test(href) || /^data:/i.test(href);
  return { rel, href, absoluto, existe_na_directoria: (href && !absoluto) ? existeNaDirectoria(ALVO_DIR, href) : null };
}).filter((a) => a.rel !== '');

// As quatro formas sobrepõem-se de propósito (o mesmo `bfr-conecta` é frase e é prefixo de ficheiro), por
// isso cada forma conta as suas ocorrências e a sobreposição é impressa em vez de ser escondida num total.
const FORMAS = [
  { nome: 'frase_da_marca_antiga', re: MARCA_ANTIGA },
  { nome: 'token_BFR_em_maiusculas', re: /BFR[A-Za-z0-9_]*/ },
  { nome: 'prefixo_bfr_hifen', re: /bfr-[a-z0-9-]+/i },
  { nome: 'prefixo_bfr_sublinhado', re: /bfr_[a-z0-9_]+/i }
];
const VISIVEIS = ['texto_visivel_ao_utilizador', 'campo_de_identidade_do_navegador'];
const residuo = FORMAS.map((f) => {
  const ocorrencias = OCORRENCIAS(ar, f.re).map((o) => {
    const pos = posNaGrade(Q_AR, o.i);
    return { offset: o.i, ...pos, texto: redige(o.texto), classe: classeia(Q_AR, o.i, o.fim) };
  });
  const por_classe = CLASSES.reduce((acc, c) => { acc[c] = 0; return acc; }, {});
  for (const o of ocorrencias) por_classe[o.classe] = (por_classe[o.classe] || 0) + 1;
  const por_forma = ocorrencias.reduce((acc, o) => { acc[o.texto] = (acc[o.texto] || 0) + 1; return acc; }, {});
  const visiveis = ocorrencias.filter((o) => VISIVEIS.includes(o.classe));
  return { nome: f.nome, total: ocorrencias.length, offsets_distintos: new Set(ocorrencias.map((o) => o.offset)).size,
    distintas: Object.keys(por_forma).length, por_classe,
    visiveis: visiveis.length,
    top_formas: Object.entries(por_forma).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([forma, n]) => ({ forma, n })),
    ocorrencias_visiveis: visiveis.slice(0, 40).map((o) => ({ offset: o.offset, linha: o.linha, coluna: o.coluna,
      classe: o.classe, texto: o.texto, contexto: redige(ar.slice(Math.max(0, o.offset - 70), o.offset + 90)) })) };
});
const frase = residuo.find((r) => r.nome === 'frase_da_marca_antiga');
// A régua da marca nova tem de casar a grafia que o ar contém. Uma agulha dactilografada da memória — a
// palavra sem o «i» do meio — dava zero no título e um noutro lado qualquer, e o portão ficou vermelho sem
// que nada tivesse mudado no ar. As duas contagens ficam no registo para que a escolha se possa refutar.
const MARCA_NOVA_SEM_I = /unesco/i;
const marcaNova = (() => {
  const ocorrencias = OCORRENCIAS(ar, new RegExp(MARCA_NOVA.source, 'gi')).map((o) => {
    const pos = posNaGrade(Q_AR, o.i);
    return { offset: o.i, ...pos, classe: classeia(Q_AR, o.i, o.fim), grafia: o.texto };
  });
  const por_classe = CLASSES.reduce((acc, c) => { acc[c] = 0; return acc; }, {});
  for (const o of ocorrencias) por_classe[o.classe] = (por_classe[o.classe] || 0) + 1;
  const por_grafia = ocorrencias.reduce((acc, o) => { acc[o.grafia] = (acc[o.grafia] || 0) + 1; return acc; }, {});
  const visiveis = ocorrencias.filter((o) => VISIVEIS.includes(o.classe));
  return { total: ocorrencias.length, offsets_distintos: new Set(ocorrencias.map((o) => o.offset)).size,
    por_classe, por_grafia, visiveis: visiveis.length,
    agulha_sem_i_no_ar: OCORRENCIAS(ar, new RegExp(MARCA_NOVA_SEM_I.source, 'gi')).length,
    casa_o_title_servido: identidade.some((c) => c.campo === 'title' && c.marca_nova) };
})();
const activos = (() => {
  const locais = activos_referenciados.filter((a) => !a.absoluto && a.href !== '');
  return { referenciados: activos_referenciados.length, locais: locais.length,
    sem_nome_de_ficheiro: activos_referenciados.length - locais.length,
    ausentes_na_directoria: locais.filter((a) => a.existe_na_directoria === false).map((a) => `${a.rel || 'sem-rel'}:${a.href}`) };
})();
// O censo de padrões de credencial nos bytes servidos conta ocorrências e nomeia o padrão, nunca reproduz o
// valor: o que se reporta é «uma chave de cliente viaja no ar», não a chave. Contar não prova que o valor seja
// segredo nem que esteja restrito — isso é configuração no provedor, fora do que estes bytes dizem.
const credenciaisNoAr = REDACCOES.map((r) => {
  const ocorrencias = OCORRENCIAS(ar, new RegExp(r.re.source, 'g'));
  const por_classe = ocorrencias.reduce((acc, o) => {
    const c = classeia(Q_AR, o.i, o.fim);
    acc[c] = (acc[c] || 0) + 1;
    return acc;
  }, {});
  return { nome: r.nome, total: ocorrencias.length, por_classe,
    visiveis: ocorrencias.filter((o) => VISIVEIS.includes(classeia(Q_AR, o.i, o.fim))).length };
});
// A politica de seguranca que o utilizador recebe vive num `<meta http-equiv>` destes bytes, nao no cabecalho
// HTTP que o CDN envia: o que aqui se conta e o que o bundle declara. O nome antigo sobrevive num host, e esse
// host e a origem real do worker - por isso a lista se reporta, nao se proibe: um portao que exigisse zero
// hosts com o nome antigo seria um portao contra o proprio ar em producao.
const politica = { origem: 'meta http-equiv nos bytes servidos (o cabecalho HTTP enviado fica fora destes bytes)',
  ...politicaDe(ar) };
const offsetsDasFormas = FORMAS.map((f) => new Set(OCORRENCIAS(ar, f.re).map((o) => o.i)));
const sobreposicoes = [];
for (let a = 0; a < FORMAS.length; a++) {
  for (let b = a + 1; b < FORMAS.length; b++) {
    let n = 0;
    for (const o of offsetsDasFormas[a]) if (offsetsDasFormas[b].has(o)) n++;
    sobreposicoes.push({ par: `${FORMAS[a].nome} x ${FORMAS[b].nome}`, offsets_comuns: n });
  }
}

const divedeCelulas = (linha) => linha.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split(/(?<!\\)\|/).map((c) => c.trim());
const tabelaDeUnidades = (texto) => {
  const linhas = texto.split(/\r?\n/);
  const inicio = linhas.findIndex((l) => /^##\s+2\./.test(l));
  if (inicio < 0) return { declaradas: null, linhas: 0, itens_total: 0, erro: 'cabecalho da seccao 2 nao encontrado', histograma_de_estado: {} };
  const declaradas = (linhas[inicio].match(/\((\d+)\s+unidades\)/) || [])[1];
  const corpo = [];
  for (let i = inicio + 1; i < linhas.length && !/^##\s/.test(linhas[i]); i++) if (/^\s*\|/.test(linhas[i])) corpo.push(linhas[i]);
  const dados = corpo.filter((l) => !/^\s*\|[\s:|-]+\|\s*$/.test(l)).slice(1);
  const itens = dados.map((l) => Number((divedeCelulas(l)[1] || '').match(/^(\d+)/)?.[1] || 0));
  const estados = dados.map((l) => (divedeCelulas(l)[2] || 'SEM_ESTADO').replace(/\*/g, ''));
  return { declaradas: declaradas ? Number(declaradas) : null, linhas: dados.length, itens_total: itens.reduce((a, b) => a + b, 0),
    histograma_de_estado: estados.reduce((acc, e) => { acc[e] = (acc[e] || 0) + 1; return acc; }, {}) };
};
const bu5 = tabelaDeUnidades(readFileSync(join(RAIZ, 'docs/bu-20-11/02-checklist-dos-modulos.md'), 'utf8'));

// O corpo medido monta-se ANTES dos portões, para que a varredura de credenciais julgue o conteúdo que
// efectivamente se grava e não uma lista de campos lembrada por quem escreve o portão. Os portões ficam fora
// deste corpo de propósito: a prosa que descreve um achado é portadora dele, e um portão que varre a si mesmo
// não tem positivo possível.
const corpoMedido = {
  ar: { directora: ALVO_DIR, md5: ar_md5, bytes: ar_bytes, diario: espera.diario, registo_de_procedencia: lidoIdentidade.nome },
  quadro: { tokens: Q_AR.tokens, linhas: Q_AR.saltos.length },
  abas: { distintas: abas.length, ocorrencias: abas_varridas, lista: abas },
  portas_por_papel: { registo: lidoPortas.nome, em: lidoPortas.em, grafia_do_campo: chavesPapeis[0],
    pegada_do_shell_da_sonda: pegadaDaSonda, bate_com_o_ar: sondaBateComOAr,
    papeis: papeisDaSonda.length, por_papel: noDomPorPapel },
  unidades: bu5,
  campos_de_identidade_do_navegador: identidade,
  activos: activos,
  lista_de_activos: activos_referenciados,
  marca_nova: marcaNova,
  politica_de_seguranca: politica,
  credenciais_no_ar: credenciaisNoAr,
  residuo_da_marca: residuo,
  sobreposicoes_das_formas: sobreposicoes,
  classes_declaradas: CLASSES,
  redaccoes_aplicadas: REDACCOES.map((r) => r.nome)
};

const portoes = [];
const reg = (nome, ok, detalhe) => portoes.push({ nome, ok, detalhe });

reg('identidade_do_ar_unicamente_resolvida', resolvem.length === 1 && ar_md5 === espera.md5 && ar_bytes === espera.bytes,
  `${ALVO_DIR} md5 ${ar_md5}/${ar_bytes}B contra ${lidoIdentidade.nome} @${lidoIdentidade.em} (${espera.md5}/${espera.bytes}B, diario ${espera.diario})`);
reg('abas_lidas_do_ar_nao_sao_zero', abas.length > 0, `distintas ${abas.length} · varridas ${abas_varridas}`);
reg('contagem_de_abas_bate_com_a_varredura', abas.reduce((s, a) => s + a.ocorrencias, 0) === abas_varridas,
  `somadas ${abas.reduce((s, a) => s + a.ocorrencias, 0)} · varridas ${abas_varridas}`);
reg('unidades_lidas_do_documento_batem_com_o_cabecalho', bu5.declaradas !== null && bu5.declaradas === bu5.linhas,
  `cabecalho declara ${bu5.declaradas} · tabela tem ${bu5.linhas} · itens ${bu5.itens_total}`);
reg('itens_das_unidades_sao_todos_contados', bu5.linhas > 0 && bu5.itens_total > 0,
  `unidades ${bu5.linhas} · itens ${bu5.itens_total} · estados ${JSON.stringify(bu5.histograma_de_estado)}`);
reg('a_sonda_de_portas_da_familia_declara_papeis', papeisDaSonda.length > 0,
  `registo ${lidoPortas.nome} @${lidoPortas.em} · grafia ${chavesPapeis[0]} · papeis ${papeisDaSonda.length}`);
reg('a_pegada_da_sonda_de_portas_e_impressa_com_a_do_ar', pegadaDaSonda !== null,
  `pegada da sonda ${pegadaDaSonda} · pegada do ar ${ar_md5} · bate ${sondaBateComOAr}`);
reg('os_campos_de_identidade_do_navegador_sao_lidos', identidade.length === CAMPOS_DE_IDENTIDADE.length
  && identidade.every((c) => typeof c.presente === 'boolean'),
  identidade.map((c) => `${c.campo}=${c.presente ? 'sim' : 'NAO'}${c.marca_antiga ? ' MARCA-ANTIGA' : ''}${c.marca_nova ? ' UNIESCO' : ''}`).join(' · '));
reg('nenhum_campo_de_identidade_contem_a_marca_antiga', identidade.every((c) => !c.marca_antiga),
  `campos com marca antiga: ${JSON.stringify(identidade.filter((c) => c.marca_antiga).map((c) => c.campo))}`);
reg('classes_de_cada_forma_estao_todas_na_lista_declarada', residuo.every((r) => Object.keys(r.por_classe).every((c) => CLASSES.includes(c))),
  `fora da lista: ${JSON.stringify(residuo.map((r) => ({ forma: r.nome, fora: Object.keys(r.por_classe).filter((c) => !CLASSES.includes(c)) })))}`);
reg('cada_ocorrencia_tem_a_sua_posicao_e_o_offset_e_distinto', residuo.every((r) => r.offsets_distintos === r.total),
  residuo.map((r) => `${r.nome} offsets_distintos ${r.offsets_distintos} / total ${r.total}`).join(' · '));
reg('a_sobreposicao_das_formas_e_impresa', sobreposicoes.length === (FORMAS.length * (FORMAS.length - 1)) / 2,
  sobreposicoes.map((s) => `${s.par} = ${s.offsets_comuns}`).join(' · '));
reg('nenhum_registro_serializado_contem_credencial', achaRedaccoes(JSON.stringify(corpoMedido)) === 0,
  `ocorrencias de padrao de credencial no corpo medido do registo: ${achaRedaccoes(JSON.stringify(corpoMedido))}`);
reg('o_censo_de_credenciais_do_ar_nomeia_todos_os_padroes_declarados',
  credenciaisNoAr.length === REDACCOES.length && credenciaisNoAr.every((c) => Number.isInteger(c.total)
    && Object.keys(c.por_classe).every((k) => CLASSES.includes(k))),
  `no ar ${JSON.stringify(credenciaisNoAr.map((c) => `${c.nome}=${c.total} visiveis=${c.visiveis}`))} · classes ${JSON.stringify(credenciaisNoAr.map((c) => Object.keys(c.por_classe)))}`);
reg('o_ar_servido_mostra_a_marca_nova', identidade.filter((c) => c.marca_nova).length > 0 && marcaNova.total > 0,
  `campos com a marca nova: ${JSON.stringify(identidade.filter((c) => c.marca_nova).map((c) => c.campo))} · no ar ${marcaNova.total} · no titulo ${marcaNova.casa_o_title_servido}`);
reg('a_agulha_da_marca_nova_e_refutada_nas_duas_grafias',
  MARCA_NOVA.test('UNIESCO') && MARCA_NOVA.test('uniesco') && !MARCA_NOVA.test('bfr-conecta')
    && !MARCA_NOVA.test('unesco') && MARCA_NOVA_SEM_I.test('unesco') && !MARCA_NOVA_SEM_I.test('UNIESCO'),
  `marca nova casa UNIESCO/uniesco e nao a marca antiga nem a palavra sem o i · agulha sem i casa a palavra e nao UNIESCO · no ar ${marcaNova.total} vs ${marcaNova.agulha_sem_i_no_ar}`);
reg('os_activos_locais_referenciados_no_ar_sao_censados',
  activos.referenciados === activos.locais + activos.sem_nome_de_ficheiro && activos.locais > 0
    && existeNaDirectoria(ALVO_DIR, 'index.html') === true && existeNaDirectoria(ALVO_DIR, 'nao-existe-sm75a.png') === false,
  `referenciados ${activos.referenciados} · locais ${activos.locais} · sem nome ${activos.sem_nome_de_ficheiro} · ausentes na directora ${JSON.stringify(activos.ausentes_na_directoria)}`);
reg('a_politica_de_seguranca_servida_e_contada_por_duas_rotas',
  politica.tags >= 1 && politica.directivas >= 1 && politica.hosts_distintos >= 1
    && politica.tokens_de_host === politica.tokens_de_host_com_esquema,
  `tags ${politica.tags} · directivas ${politica.directivas} · tokens pelo parser da directiva ${politica.tokens_de_host} · tokens pela varredura do esquema ${politica.tokens_de_host_com_esquema} · hosts distintos ${politica.hosts_distintos} · excluidos como palavra ou esquema ${politica.palavras_e_esquemas_excluidos} · com a marca antiga ${JSON.stringify(politica.com_a_marca_antiga)} · com a marca nova ${JSON.stringify(politica.com_a_marca_nova)}`);

{
  // As classes esperadas abaixo saem-me de `node scripts/p186… --sonda-fixtures`, não da memória: na primeira
  // sonda havia casos errados (o host dum offset colava `url_ou_host` aos vizinhos, e um valor de atributo
  // terminado em espaço passava por nome de atributo), e só ficaram certos com o quadro lido por tag.
  // As duas linhas de meta acrescentadas depois são o caso que o ar servido tem e o fixture não tinha: um
  // `content=` cuja lista é de hosts (Content-Security-Policy) e um `content=` de configuração sem rótulo de
  // identidade (robots). Contados como campo de identidade, faziam três ocorrências «visíveis» que o
  // utilizador nunca vê; medidos pelo rótulo do meta, são host e configuração externa.
  const ESPERADAS = ['campo_de_identidade_do_navegador', 'nome_de_ficheiro_de_activo', 'campo_de_identidade_do_navegador',
    'chave_de_projecto_ou_config_externa', 'chave_de_armazenamento', 'texto_visivel_ao_utilizador',
    'identificador_de_programa', 'nome_de_ficheiro_de_activo', 'classe_de_estilo', 'texto_visivel_ao_utilizador',
    'url_ou_host', 'url_ou_host', 'chave_de_projecto_ou_config_externa', 'identificador_de_programa',
    'texto_visivel_ao_utilizador'];
  const occFix = OCORRENCIAS(FIXTURE_PAGINA, MARCA_ANTIGA);
  const qFix = quadroDo(FIXTURE_PAGINA);
  const marcadas = occFix.map((o) => classeia(qFix, o.i, o.fim));
  const classesDoFixture = [...new Set(marcadas)].sort();
  const soMarcaNova = OCORRENCIAS('<p>Bem-vindo ao UNIESCO</p><a href="https://unesco.pages.dev">entrar</a>', MARCA_ANTIGA).length;
  // Componho o texto de exemplo em tempo de execução: escrito à letra, este ficheiro passa a conter uma
  // cadeia com a forma duma chave de cliente, e o portão do índice varre os próprios fontes versionados.
  const cru = "x = {apiKey:'" + 'AIza' + 'X'.repeat(25) + "'};";
  const antes = achaRedaccoes(cru);
  const depois = achaRedaccoes(redige(cru));
  // O censo do ar conta por OCORRENCIAS, não por `match`, por isso o positivo do redactor não empresta prova
  // ao censo: as duas rotas têm de disparar e de deixar de disparar sobre o mesmo texto de exemplo.
  const contaCenso = (texto) => REDACCOES.reduce((s, r) => s + OCORRENCIAS(texto, new RegExp(r.re.source, 'g')).length, 0);
  reg('o_classificador_cobre_as_oito_classes_declaradas',
    classesDoFixture.length === CLASSES.length && CLASSES.every((c) => classesDoFixture.includes(c)),
    `no fixture ${classesDoFixture.length}/${CLASSES.length} · fora do fixture ${JSON.stringify(marcadas.filter((c) => !CLASSES.includes(c)))}`);
  reg('os_fixtures_disparam_nas_duas_direccoes',
    marcadas.length === ESPERADAS.length && marcadas.every((c, i) => c === ESPERADAS[i]) && soMarcaNova === 0 && antes === 1 && depois === 0,
    `medidas ${JSON.stringify(marcadas)} · esperadas ${ESPERADAS.length} · marca nova sozinha ${soMarcaNova} · redactor cru ${antes} depois ${depois}`);
  reg('o_censo_de_credenciais_tem_positivo_e_negativo_na_rota_do_censo',
    contaCenso(cru) === 1 && contaCenso(redige(cru)) === 0,
    `cru ${contaCenso(cru)} · redigido ${contaCenso(redige(cru))} · no ar ${JSON.stringify(credenciaisNoAr.map((c) => `${c.nome}=${c.total}`))}`);
  const tabelaPartida = '## 2. X (1 unidades)\n| A | B | C |\n|---|---|---|\n| 5.1 | 3 (IF 3) | **IMPLEMENTADO** |\n';
  const medido = tabelaDeUnidades(tabelaPartida);
  reg('o_leitor_da_tabela_tem_positivo_e_negativo', medido.linhas === 1 && medido.itens_total === 3 && medido.declaradas === 1
    && tabelaDeUnidades('nada aqui').linhas === 0 && tabelaDeUnidades('nada aqui').erro === 'cabecalho da seccao 2 nao encontrado',
    `fixture ${JSON.stringify(medido)} · vazio ${JSON.stringify(tabelaDeUnidades('nada aqui'))}`);
  const escolha = escolheMaisNovo([{ nome: 'a.json', em: '2026-11-20T00:00:00.000Z', ms: Date.parse('2026-11-20T00:00:00.000Z') },
    { nome: 'b.json', em: '2026-11-26T00:00:00.000Z', ms: Date.parse('2026-11-26T00:00:00.000Z') }]);
  const cego = escolheMaisNovo([{ nome: 'c.json', ms: NaN }]);
  const empate = escolheMaisNovo([{ nome: 'd.json', ms: 5 }, { nome: 'e.json', ms: 5 }]);
  reg('o_escolhedor_de_registo_tem_as_tres_caras', escolha.ok === true && escolha.nome === 'b.json' && cego.ok === false
    && empate.ok === false && empate.empatados.length === 2,
    `positivo ${escolha.nome} · sem carimpo ${cego.ok}/${cego.motivo} · empate ${empate.ok}/${JSON.stringify(empate.empatados)}`);
  // As quatro caras medidas pela sonda acima: um host escrito duas vezes com esquemas diferentes conta uma
  // vez nos distintos e duas nos tokens; um host sem esquema é contado pelo parser e não pela varredura, e é
  // por isso que as duas rotas se imprimem lado a lado; e uma página sem política dá zero em tudo.
  const caras = FIXTURES_DA_POLITICA.map((f) => ({ nome: f.nome, p: politicaDe(f.texto) }));
  const pagina = politicaDe(FIXTURE_PAGINA);
  reg('a_contagem_de_hosts_da_politica_tem_as_quatro_caras',
    caras[0].p.directivas === 2 && caras[0].p.tokens_de_host === 2 && caras[0].p.hosts_distintos === 1
      && caras[0].p.tokens_de_host_com_esquema === 2 && caras[0].p.palavras_e_esquemas_excluidos === 3
      && caras[1].p.tokens_de_host === 1 && caras[1].p.tokens_de_host_com_esquema === 0
      && caras[1].p.palavras_e_esquemas_excluidos === 1
      && caras[2].p.tags === 0 && caras[2].p.directivas === 0 && caras[2].p.hosts_distintos === 0
      && pagina.tokens_de_host === 1 && pagina.com_a_marca_antiga.length === 1 && pagina.com_a_marca_nova.length === 0,
    caras.map((c) => `${c.nome}: directivas ${c.p.directivas} tokens ${c.p.tokens_de_host} com_esquema ${c.p.tokens_de_host_com_esquema} distintos ${c.p.hosts_distintos} excluidos ${c.p.palavras_e_esquemas_excluidos}`).join(' · ')
      + ` · pagina de classes: antigos ${JSON.stringify(pagina.com_a_marca_antiga)} novos ${JSON.stringify(pagina.com_a_marca_nova)}`);
}

const proprio = readFileSync(import.meta.filename, 'utf8');
const registo = {
  peca: 'p186-inventario-do-ar-e-do-residuo-da-identidade',
  pergunta: 'quantas abas e funcionalidades ha no ar servido, e que residuos da identidade antiga ficam no que o utilizador recebe?',
  metodo: 'a identidade do ar vem do registo mais novo da familia do verificador de versao, pelo carimpo que ele proprio escreveu; o bundle e resolvido por pegada contra o disco, nunca por nome lembrado; as abas sao lidas do atributo de navegacao dos bytes servidos e confrontadas com a sonda de portas por papel; as unidades e os itens sao lidos da tabela derivada do checklist versionado, com o cabecalho do documento como declaracao a bater; o residuo da marca e contado por forma, com uma posicao e uma classe por ocorrencia, e todo o trecho passa pelo redactor antes de ser gravado; os activos referenciados e os padroes de credencial dos bytes servidos sao censados por nome, nunca por valor, e os hosts da politica de seguranca contam-se por duas rotas independentes (o parser da directiva e a varredura do esquema).',
  em: new Date().toISOString(),
  emissor: 'scripts/p186-inventario-do-ar-e-do-residuo-da-identidade.mjs',
  emissor_chars: proprio.length,
  emissor_bytes: Buffer.byteLength(proprio, 'utf8'),
  emissor_md5: md5(proprio),
  proveniencias: [
    { familia: 'p116-consistencia-de-versao', registo: lidoIdentidade.nome, em: lidoIdentidade.em },
    { familia: 'ah2-sonda-portas-por-papel', registo: lidoPortas.nome, em: lidoPortas.em }
  ],
  ...corpoMedido,
  portoes,
  o_que_prova: 'que a candidata resolvida pela pegada do verificador tem estas abas, estas unidades, estes campos de identidade e estes hosts na politica de seguranca que o proprio bundle declara, e que cada ocorrencia da marca antiga tem uma classe e uma posicao no ficheiro',
  o_que_NAO_prova: 'que a marca antiga nao apareca por dados vindos do banco em tempo de execucao; que as abas servidas sejam alcancaveis em cada papel (isso e a sonda de browser, e a pegada do shell que ela varreu nao bate com este ar); que um identificador tecnico possa ou nao ser migrado; que um activo ausente da directora da candidata seja um 404 no servidor (o pacote publicado pode levar mais do que esta pasta); que os hosts contados aqui sejam os do cabecalho HTTP que o CDN envia (o meta http-equiv e o que estes bytes declaram, e o cabecalho vive fora deles); e que uma ocorrencia contada como padrao de credencial seja um segredo ou esteja restrita no provedor — contar e forma, nao autoridade nem configuracao',
  veredito: `P186_${portoes.every((p) => p.ok) ? 'INVENTARIO_MEDIDO' : 'INVENTARIO_VERMELHO'} ${portoes.filter((p) => p.ok).length}/${portoes.length}`
};
writeFileSync(OUT, JSON.stringify(registo, null, 2) + '\n');
console.log(`P186 registo ${OUT}`);
console.log(`P186 ar ${registo.ar.directora} md5=${registo.ar.md5} bytes=${registo.ar.bytes} diario=${registo.ar.diario}`);
console.log(`P186 abas_distintas=${registo.abas.distintas} ocorrencias=${registo.abas.ocorrencias} portas_papeis=${registo.portas_por_papel.papeis} pegada_sonda=${registo.portas_por_papel.pegada_do_shell_da_sonda} bate=${registo.portas_por_papel.bate_com_o_ar}`);
console.log(`P186 unidades ${bu5.declaradas} declaradas / ${bu5.linhas} lidas · itens ${bu5.itens_total} · estados ${JSON.stringify(bu5.histograma_de_estado)}`);
console.log(`P186 identidade_do_navegador ${identidade.map((c) => `${c.campo}=${c.presente ? 'sim' : 'NAO'}${c.marca_nova ? '(UNIESCO)' : ''}${c.marca_antiga ? '(ANTIGA)' : ''}`).join(' ')}`);
console.log(`P186 residuo ${residuo.map((r) => `${r.nome}=${r.total} visiveis=${r.visiveis} distintas=${r.distintas}`).join(' · ')}`);
console.log(`P186 classes_da_frase ${JSON.stringify(frase.por_classe)}`);
console.log(`P186 marca_nova total=${marcaNova.total} visiveis=${marcaNova.visiveis} grafias=${JSON.stringify(marcaNova.por_grafia)} agulha_sem_i=${marcaNova.agulha_sem_i_no_ar} title=${marcaNova.casa_o_title_servido}`);
console.log(`P186 activos referenciados=${activos.referenciados} locais=${activos.locais} ausentes_na_directoria=${JSON.stringify(activos.ausentes_na_directoria)}`);
console.log(`P186 credenciais_no_ar ${credenciaisNoAr.map((c) => `${c.nome}=${c.total} visiveis=${c.visiveis} classes=${JSON.stringify(c.por_classe)}`).join(' · ')}`);
console.log(`P186 politica_de_seguranca tags=${politica.tags} directivas=${politica.directivas} tokens=${politica.tokens_de_host} com_esquema=${politica.tokens_de_host_com_esquema} distintos=${politica.hosts_distintos} excluidos=${politica.palavras_e_esquemas_excluidos} antigos=${JSON.stringify(politica.com_a_marca_antiga)} novos=${JSON.stringify(politica.com_a_marca_nova)}`);
console.log(`P186 hosts_da_politica ${JSON.stringify(politica.por_host)}`);
console.log(`P186 sobreposicoes ${sobreposicoes.map((s) => `${s.par}=${s.offsets_comuns}`).join(' · ')}`);
console.log(`P186 visiveis_da_frase ${frase.ocorrencias_visiveis.map((o) => `linha ${o.linha}:${o.coluna} ${o.classe} "${o.texto}"`).join(' | ')}`);
console.log(registo.veredito);
for (const f of portoes.filter((p) => !p.ok)) console.log(`FALHA ${f.nome}: ${f.detalhe}`);
if (portoes.some((p) => !p.ok)) process.exit(1);
