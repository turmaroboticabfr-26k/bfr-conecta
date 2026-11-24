#!/usr/bin/env node
// P151 — CANDIDATA v144: BFR CONECTA -> UNIESCO (24/11). Nome global, logo oficial, cores institucionais, splash novo.
//
// Regra do utilizador (24/11): «NÃO PODE SOBRAR NENHUMA REFERÊNCIA VISUAL OU TEXTUAL AO NOME BFR CONECTA NA
// EXPERIÊNCIA DO USUÁRIO» — com a única exceção declarada no próprio brief: identificadores técnicos, integrações,
// nomes de tabelas e códigos internos. Por isso a passagem do nome protege só o que a regex delimita como
// identificador (window.BFR_MUNICIPAL, classes bfr-*, URLs, value="bfr", nomes de RPC); consola e comentários,
// que não são identificadores, passam a dizer UNIESCO como tudo o resto.
//
// Medido na origem (sonda de enumeração, 24/11): 211 ocorrências do padrão delimitado; 0 `bfr` minúsculo visível;
// `bfr-app-logo.png` 10 referências; `#10295f` x109 (navy antigo). A paleta e os activos vêm do registo do P150.
//
// Regras: 0 deploy, 0 DDL, 0 escrita no banco, 0 publicação. Escreve só bfr-candidata-v144-uniesco/ e evidence/.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Script } from 'node:vm';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const PASTA_ORIGEM = 'bfr-candidata-v142-painel-na-troca';
const PASTA_NOVA = 'bfr-candidata-v144-uniesco';
const ORIGEM = `${REPO}/${PASTA_ORIGEM}/index.html`;
const PORTOES_ORIGEM = JSON.parse(readFileSync(`${REPO}/${PASTA_ORIGEM}/portoes-v142-candidata.json`, 'utf8'));
const P150 = JSON.parse(readFileSync(`${REPO}/marca-uniesco/registo-p150.json`, 'utf8'));
const SAIDA = `${REPO}/${PASTA_NOVA}/index.html`;
const REGISTO = `${REPO}/${PASTA_NOVA}/portoes-v144-candidata.json`;
const SUF = (process.argv[2] || 'a').trim();
const EV = `${REPO}/evidence/p151-gera-candidata-v144-24-11-${SUF}.json`;
if ([SAIDA, REGISTO, EV].some((f) => existsSync(f))) throw new Error('ABORTA: ja existe saida da v144 — use nome novo, nunca por cima');
const md5 = (b) => createHash('md5').update(Buffer.isBuffer(b) ? b : Buffer.from(String(b))).digest('hex');
const B = (s) => Buffer.byteLength(s);
const n = (t, x) => t.split(x).length - 1;
const RE = /(?<![A-Za-z0-9_$@#.-])(BFR|Conecta|CONECTA|Bfr)(?![A-Za-z0-9_$@#.-])/g;
const t0Corrida = Date.now();

const txt0 = readFileSync(ORIGEM, 'utf8');
if (!/^P102_CANDIDATA_V142_PAINEL_NA_TROCA_OK/.test(String(PORTOES_ORIGEM.veredito))) throw new Error('ABORTA: a origem nao tem veredito da v142: ' + PORTOES_ORIGEM.veredito);
if (String((PORTOES_ORIGEM.destino || {}).md5) !== md5(txt0)) throw new Error('ABORTA: md5 da origem nao bate com o registo do P102 — a v142 foi tocada depois de gerada');
const MATCHES_ORIGEM = [...txt0.matchAll(new RegExp(RE.source, 'g'))];
if (MATCHES_ORIGEM.length !== 200) throw new Error('ABORTA: ' + MATCHES_ORIGEM.length + ' ocorrencias do nome na origem — a enumeracao das sondas mediu 200 frases distintas (o 211 do resumo contava outra coisa); a regua nao mede o que pretende');
// Auditoria dos matches: o perigo e' so o acesso computado ['BFR'] / colagem a )+]. Um `[BFR Coordenacao]`
// de prefixo de consola e' literal inofensivo. O lookbehind nao exclui `[`; este aborto cobre o que ele deixa passar.
const colados = [];
for (const m of MATCHES_ORIGEM) {
  const antes = txt0[m.index - 1] || '';
  const depois = txt0[m.index + m[0].length] || '';
  if (depois === ')' || depois === '+' || depois === ']' || antes === '.' || (antes === '[' && ('\'"'.includes(depois)))) colados.push({ byte: m.index, match: m[0], antes, depois });
}
if (colados.length) throw new Error('ABORTA: ' + colados.length + ' matches do nome colados a identificador/acesso: ' + JSON.stringify(colados) + ' — substituir quebraria o codigo, decida-o explicitamente');

// ——— contraste, com fixture (a regua tem de falhar com NaN e acertar o par branco/preto = 21) ———
const relLum = (hex) => { const f = (i) => { const v = parseInt(hex.slice(i, i + 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(1) + 0.7152 * f(3) + 0.0722 * f(5); };
const contraste = (a, b) => { const l1 = relLum(a), l2 = relLum(b); if (Number.isNaN(l1) || Number.isNaN(l2)) return NaN; const hi = Math.max(l1, l2), lo = Math.min(l1, l2); return (hi + 0.05) / (lo + 0.05); };
if (Math.abs(contraste('#ffffff', '#000000') - 21) > 0.05) throw new Error('ABORTA: fixture do contraste (branco/preto=21) nao bate');
if (!Number.isNaN(contraste('#zzz', '#ffffff'))) throw new Error('ABORTA: o contraste com hex invalido devia ser NaN e o fixture nao o apanhou');
const NAVY = P150.paleta_medida.navy_institucional;
const VERDE = P150.paleta_medida.verde_da_marca;
if (NAVY !== '#00399b' || VERDE !== '#3fb80a') throw new Error('ABORTA: a paleta lida do registo do P150 nao e a medida em 24/11: ' + JSON.stringify(P150.paleta_medida));

// ——— substituicoes explicitas (antes da passagem do nome; cada uma casa um numero exacto de vezes) ———
const RELEASE_NOVO = 'function __release(){if(!__g.classList.contains("bfr-paint-hold")||__g.classList.contains("uniesco-splash-out"))return;__g.classList.add("uniesco-splash-out");setTimeout(function(){__g.classList.remove("bfr-paint-hold");__g.classList.remove("uniesco-splash-out");},240);}';
const SPLASH_EXTRA = 'html.bfr-paint-hold::before{content:none}'
  + '@keyframes uniescoSplashIn{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}'
  + 'html.uniesco-splash-out::after{animation:uniescoSplashOut .24s ease-in both}'
  + 'html.bfr-paint-hold.uniesco-splash-out body{visibility:visible!important}'
  + '@keyframes uniescoSplashOut{from{opacity:1}to{opacity:0}}'
  + '@media (prefers-reduced-motion:reduce){html.bfr-paint-hold::after,html.uniesco-splash-out::after{animation:none}}';

let txt = txt0;
const PARES = [];
const substituicoes = [];
const sub = (nome, de, para, esperado = 1) => { const vezes = n(txt, de); if (vezes !== esperado) throw new Error('ABORTA: ' + nome + ' casa ' + vezes + ' vezes (esperava ' + esperado + ')'); txt = txt.split(de).join(para); PARES.push([de, para]); substituicoes.push({ nome, vezes, delta_bytes: B(para) - B(de) }); };

sub('splash_degrade_velho_por_logo_centreada', 'html.bfr-paint-hold::after{content:"";position:fixed;inset:0;z-index:2147483000;background:linear-gradient(150deg,#0d2a63 0%,#1256b0 55%,#17a2e7 100%)}', 'html.bfr-paint-hold::after{content:"";position:fixed;inset:0;z-index:2147483000;background:#fff url(\'bfr-app-logo.png\') center/min(60vw,38vh) auto no-repeat;animation:uniescoSplashIn .5s ease-out both}');
sub('splash_texto_velho_por_regras_novas', 'html.bfr-paint-hold::before{content:"BFR CONECTA";position:fixed;top:50%;left:0;right:0;z-index:2147483001;transform:translateY(-50%);text-align:center;color:#fff;font:700 20px/1 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;letter-spacing:.18em}', SPLASH_EXTRA);
sub('release_do_splash_com_saida_suave', 'function __release(){__g.classList.remove("bfr-paint-hold");}', RELEASE_NOVO);
sub('favicon_para_icone_192', '<link rel="icon" type="image/png" href="bfr-app-logo.png">', '<link rel="icon" type="image/png" sizes="192x192" href="uniesco-icon-192.png">');
sub('apple_touch_para_icone_180', '<link rel="apple-touch-icon" href="bfr-app-logo.png">', '<link rel="apple-touch-icon" sizes="180x180" href="uniesco-icon-180.png">');
sub('metas_de_nome_do_aplicativo', '<meta name="apple-mobile-web-app-capable" content="yes">', '<meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="UNIESCO"><meta name="application-name" content="UNIESCO">');
sub('descricao_do_portal', '<meta name="description" content="Portal escolar da Escola', '<meta name="description" content="Portal escolar UNIESCO da Escola');
sub('login_logo_para_simbolo_192', '<img class="login-logo" src="bfr-app-logo.png"', '<img class="login-logo" src="uniesco-icon-192.png"');
sub('school_symbol_para_simbolo_192', '<img class="school-symbol" src="bfr-app-logo.png"', '<img class="school-symbol" src="uniesco-icon-192.png"');
sub('app_logo_para_simbolo_192', '<img class="app-logo" src="bfr-app-logo.png"', '<img class="app-logo" src="uniesco-icon-192.png"');
sub('js_que_forca_o_src_dos_logos', "image.src = 'bfr-app-logo.png'", "image.src = 'uniesco-icon-192.png'");
sub('alt_do_simbolo', 'alt="Símbolo da Escola Benício Ferreira Reis"', 'alt="Símbolo da UNIESCO"');
sub('nome_do_ficheiro_dos_boletins', 'boletins-bfr-conecta.pdf', 'boletins-uniesco.pdf');
sub('navy_antigo_pelo_navy_da_marca', '#10295f', NAVY, 109);

// ——— a passagem do nome, em DUAS fases: "BFR Conecta" e uma so UNIESCO (as duas palavras casam uma vez cada e
// duplicar o nome seria defeito de produto); depois as sobras simples (BFR, CONECTA). Identificadores ficam de fora
// pelos delimitadores. ———
const RE2 = /(?<![A-Za-z0-9_$@#.-])BFR\s+[Cc]onecta(?![A-Za-z0-9_$@#.-])/g;
const coladosPassagem = [];
for (const m of [...txt.matchAll(new RegExp(RE2.source, 'g')), ...txt.matchAll(new RegExp(RE.source, 'g'))]) {
  const antes = txt[m.index - 1] || '';
  const depois = txt[m.index + m[0].length] || '';
  if (depois === ')' || depois === '+' || depois === ']' || antes === '.' || (antes === '[' && ('\'"'.includes(depois)))) coladosPassagem.push({ byte: m.index, match: m[0], antes, depois });
}
if (coladosPassagem.length) throw new Error('ABORTA: ' + coladosPassagem.length + ' matches do nome colados a identificador/acesso: ' + JSON.stringify(coladosPassagem) + ' — substituir quebraria o codigo, decida-o explicitamente');
const matchesPrePassagemRE = [...txt.matchAll(new RegExp(RE.source, 'g'))].length;
const matchesPrePassagem = matchesPrePassagemRE + [...txt.matchAll(new RegExp(RE2.source, 'g'))].length;
const uniescoIntroduzidoPelasSubs = PARES.reduce((a, [, para]) => a + n(para, 'UNIESCO'), 0);
let replaySemPass = txt0;
for (const [de, para] of PARES) replaySemPass = replaySemPass.split(de).join(para);
const passoComposto = [...txt.matchAll(new RegExp(RE2.source, 'g'))].length;
txt = txt.replace(new RegExp(RE2.source, 'g'), 'UNIESCO');
const passoSimples = [...txt.matchAll(new RegExp(RE.source, 'g'))].length;
txt = txt.replace(new RegExp(RE.source, 'g'), 'UNIESCO');

// ——— simulacao do __release com DOM falso (o comportamento novo e provado, o velho e a referencia) ———
const simula = (fonte, cenario) => {
  const cls = new Set(['bfr-paint-hold']);
  const fila = [];
  const el = { classList: { contains: (c) => cls.has(c), add: (c) => cls.add(c), remove: (c) => cls.delete(c) } };
  const api = new Function('__g', 'setTimeout', fonte + '\nreturn __release;')(el, (fn, ms) => fila.push({ fn, ms }));
  const estado = () => ['bfr-paint-hold', 'uniesco-splash-out'].filter((c) => cls.has(c)).join('+') || 'livre';
  return cenario(api, fila, estado);
};
const RELEASE_VELHO = 'function __release(){__g.classList.remove("bfr-paint-hold");}';
const simNovo = simula(RELEASE_NOVO, (release, fila, estado) => {
  release();
  const a = { estado_ao_soltar: estado(), timeouts: fila.map((f) => f.ms) };
  release();
  const duplicou = fila.length !== 1;
  fila[0].fn();
  const b = { estado_final: estado() };
  release();
  return { ...a, duplicou_timeout: duplicou, ...b, neutro_ja_livre: estado() === 'livre' && fila.length === 1 };
});
const simVelho = simula(RELEASE_VELHO, (release, fila, estado) => { release(); return { estado_final: estado() }; });

// ——— monogramas: as 3 funcoes de iniciais avaliadas com 'UNIESCO' (regista o que o utilizador ve no avatar) ———
const monogramas = [];
const exprArrow = [...txt.matchAll(/const initials = value => String\(value \|\| 'UNIESCO'\)\.split\([^;]+;/g)];
const exprParts = [...txt.matchAll(/const initials = parts\.length > 1 \?[^;]+;/g)];
for (const m of exprArrow) monogramas.push(String(new Function('value', 'return (' + m[0].slice('const initials = '.length, -1) + ')(value)')('UNIESCO')));
for (const m of exprParts) monogramas.push(String(new Function('parts', 'return (' + m[0].slice('const initials = '.length, -1) + ')')(['UNIESCO'])));
if (exprArrow.length !== 2 || exprParts.length !== 1) throw new Error('ABORTA: ' + exprArrow.length + ' initials por value e ' + exprParts.length + ' por parts — a sonda dos monogramas nao resolve o que a passagem mudou');

// ——— compilacao dos scripts inline, antes e depois, com dente ———
const corpos = (src) => [...src.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].filter((m) => {
  if (/\bsrc\s*=/.test(m[1])) return false;
  const ty = (/\btype\s*=\s*"([^"]*)"/.exec(m[1]) || /\btype\s*=\s*'([^']*)'/.exec(m[1]) || [null, ''])[1];
  return !ty || ty === 'text/javascript' || ty === 'module';
}).map((m) => m[2]);
const falhasDe = (src) => corpos(src).filter((c) => { try { new Script(c); return false; } catch (e) { return true; } }).length;
const falhas0 = falhasDe(txt0), falhasN = falhasDe(txt);
const temDente = (() => { try { new Script('function {'); return false; } catch (e) { return true; } })();

// ——— identificadores: o diff do multiconjunto de tokens com bfr tem de ser exactamente o do replay das subs ———
const tokens = (src) => { const o = {}; for (const m of src.matchAll(/[A-Za-z0-9_$-]+/g)) { const t = m[0]; if (t.length > 3 && /bfr/i.test(t)) o[t] = (o[t] || 0) + 1; } return o; };
const diffDe = (a, b) => { const d = {}; const chaves = new Set([...Object.keys(a), ...Object.keys(b)]); for (const k of chaves) { const v = (b[k] || 0) - (a[k] || 0); if (v !== 0) d[k] = v; } return d; };
const replay = tokens((() => { let s = txt0; for (const [de, para] of PARES) s = s.split(de).join(para); return s.replace(new RegExp(RE2.source, 'g'), 'UNIESCO').replace(new RegExp(RE.source, 'g'), 'UNIESCO'); })());
const diffTokens = diffDe(tokens(txt0), tokens(txt));
const CLASSE_TECNICA_PERMITIDA = ['boletins-bfr-conecta', 'bfr-app-logo', 'bfr-paint-hold'];
const diffSoDaClasse = Object.keys(diffTokens).every((k) => CLASSE_TECNICA_PERMITIDA.includes(k));

// ——— portoes ———
const falhas = [];
const g = (nome, cond, dado) => { const v = cond === true; if (!v) falhas.push(nome + ' | ' + JSON.stringify(dado).slice(0, 300)); console.log(`${v ? 'VERDE' : 'VERMELHO'}  ${nome}`); };
g('u1_a_origem_e_a_v142_certificada', md5(txt0) === PORTOES_ORIGEM.destino.md5 && B(txt0) === PORTOES_ORIGEM.destino.bytes, { lido: { md5: md5(txt0), bytes: B(txt0) }, registado: PORTOES_ORIGEM.destino });
g('u2_a_passagem_trocou_tudo_e_sobrou_zero', [...txt.matchAll(new RegExp(RE.source, 'g'))].length === 0 && [...txt.matchAll(new RegExp(RE2.source, 'g'))].length === 0 && n(txt, 'UNIESCO') === passoComposto + passoSimples + uniescoIntroduzidoPelasSubs, { compostas_trocadas: passoComposto, simples_trocadas: passoSimples, uniesco_introduzido_pelas_subs: uniescoIntroduzidoPelasSubs, uniesco_total: n(txt, 'UNIESCO'), nome_velho_restante: [...txt.matchAll(new RegExp(RE.source, 'g'))].length + [...txt.matchAll(new RegExp(RE2.source, 'g'))].length });
g('u3_nenhuma_variacao_do_nome_velho', !/bfr\s*conecta|conecta\s*bfr/i.test(txt) && n(txt, 'UNIESCO.EDUCA') === 0, { uniesco_educa: n(txt, 'UNIESCO.EDUCA') });
g('u4_o_navy_e_o_da_marca_com_AAA', n(txt, NAVY) === 109 && n(txt, '#10295f') === 0 && contraste(NAVY, '#ffffff') >= 7 && contraste('#ffffff', NAVY) >= 7, { novo: n(txt, NAVY), velho: n(txt, '#10295f'), contraste_navy_branco: Number(contraste(NAVY, '#ffffff').toFixed(2)), velho_media: P150.contraste_com_branco.navy_antigo_10295f });
g('u5_o_verde_nao_entra_em_texto_sem_AA', contraste(VERDE, '#ffffff') < 4.5, { verde_branco: Number(contraste(VERDE, '#ffffff').toFixed(2)), decisao: 'o nome como texto fica navy solido; o degrada azul->verde vive so na logo oficial (imagem)' });
g('u6_splash_novo_presente_e_velho_morto', n(txt, 'uniescoSplashIn') === 2 && n(txt, 'uniescoSplashOut') === 2 && n(txt, '#0d2a63') === 0 && n(txt, '#1256b0') === 0 && n(txt, '#17a2e7') === 0 && n(txt, 'uniesco-splash-out') === 6, { splash_in_animacao_e_keyframes: n(txt, 'uniescoSplashIn'), splash_out_animacao_e_keyframes: n(txt, 'uniescoSplashOut'), classe_out: n(txt, 'uniesco-splash-out'), degrades_velhos: [n(txt, '#0d2a63'), n(txt, '#1256b0'), n(txt, '#17a2e7')] });
g('u7_o_body_visivel_na_saida_vem_depois_da_regra_do_hold', txt.indexOf('html.bfr-paint-hold.uniesco-splash-out body{visibility:visible!important}') > txt.indexOf('html.bfr-paint-hold body{visibility:hidden!important}'), { hold_em: txt.indexOf('html.bfr-paint-hold body{'), saida_em: txt.indexOf('html.bfr-paint-hold.uniesco-splash-out body{') });
g('u8_o_release_prova_os_quatro_estados', simNovo.estado_ao_soltar === 'bfr-paint-hold+uniesco-splash-out' && simNovo.timeouts.length === 1 && simNovo.timeouts[0] === 240 && simNovo.duplicou_timeout === false && simNovo.estado_final === 'livre' && simNovo.neutro_ja_livre === true && simVelho.estado_final === 'livre', { novo: simNovo, velho: simVelho });
g('u9_cabecalho_com_o_nome_novo', n(txt, '<title>UNIESCO | Escola Benício Ferreira Reis</title>') === 1 && n(txt, '<meta property="og:title" content="UNIESCO | Escola Benício Ferreira Reis">') === 1 && n(txt, 'name="application-name" content="UNIESCO"') === 1 && n(txt, 'name="apple-mobile-web-app-title" content="UNIESCO"') === 1 && n(txt, '<link rel="manifest" href="manifest.json">') === 1, { title: n(txt, '<title>UNIESCO |'), og: n(txt, 'og:title" content="UNIESCO'), manifest: n(txt, 'rel="manifest"') });
g('u10_as_logos_mudam_e_as_referencias_tecnicas_ficam', n(txt, 'uniesco-icon-192.png') === 5 && n(txt, 'uniesco-icon-180.png') === 1 && n(txt, 'bfr-app-logo.png') === 7 && n(txt, 'boletins-uniesco.pdf') === 1, { icone192: n(txt, 'uniesco-icon-192.png'), icone180: n(txt, 'uniesco-icon-180.png'), bfr_app_logo_restantes: n(txt, 'bfr-app-logo.png'), nota_restantes: 'login-product-logo x2, cartao escondido, fetch do schoolLogoDataUrl, splash novo, 2 fixadores webp', boletins: n(txt, 'boletins-uniesco.pdf') });
g('u11_o_diff_de_identificadores_e_so_o_declarado_e_replay_bate', diffSoDaClasse && JSON.stringify(diffTokens) === JSON.stringify(diffDe(tokens(txt0), replay)) && n(txt, 'window.BFR_MUNICIPAL') === n(txt0, 'window.BFR_MUNICIPAL') && n(txt, 'window.BFR_LIA_AVATAR_PATH') === n(txt0, 'window.BFR_LIA_AVATAR_PATH') && n(txt, 'window.BFRStudentRegistrationQuick') === n(txt0, 'window.BFRStudentRegistrationQuick') && n(txt, 'value="bfr"') === n(txt0, 'value="bfr"') && n(txt, 'data-bfr-municipal-module') === n(txt0, 'data-bfr-municipal-module'), { diff: diffTokens, esperado_pelo_replay: diffDe(tokens(txt0), replay), bfr_municipal: [n(txt0, 'window.BFR_MUNICIPAL'), n(txt, 'window.BFR_MUNICIPAL')], value_bfr: [n(txt0, 'value="bfr"'), n(txt, 'value="bfr"')] });
g('u12_a_escrita_no_banco_nao_muda', ['fetch(', '.insert(', '.update(', '.delete(', '.rpc(', '.from(', '.auth.', 'createClient('].every((x) => n(txt, x) === n(txt0, x)), { contagens: ['fetch(', '.insert(', '.update(', '.delete(', '.rpc(', '.from(', '.auth.', 'createClient('].map((x) => x + '=' + n(txt, x)) });
g('u13_os_scripts_inline_compilam_igual_ao_antes_e_a_regua_tem_dente', falhasN === falhas0 && temDente, { falhas_antes: falhas0, falhas_depois: falhasN, dente: temDente, scripts: corpos(txt).length });
g('u14_o_delta_de_bytes_fecha_a_conta', B(txt) - B(txt0) === substituicoes.reduce((a, s) => a + s.delta_bytes, 0) + (B(txt) - B(replaySemPass)), { delta_total: B(txt) - B(txt0), soma_das_substituicoes: substituicoes.reduce((a, s) => a + s.delta_bytes, 0), delta_da_passagem: B(txt) - B(replaySemPass) });
g('u15_os_monogramas_do_avatar_sao_UN_ou_U', monogramas.length === 3 && monogramas.every((mX) => mX === 'UN' || mX === 'U'), { monogramas });
g('u16_os_activos_da_marca_existem_com_o_md5_do_P150', ['uniesco-logo-800.png', 'uniesco-simbolo-512.png', 'uniesco-simbolo-192.png', 'uniesco-simbolo-180.png'].every((fX) => { try { return md5(readFileSync(`${REPO}/marca-uniesco/${fX}`)) === P150.ficheiros[fX].md5; } catch (e) { return false; } }), { md5: Object.fromEntries(['uniesco-logo-800.png', 'uniesco-simbolo-192.png', 'uniesco-simbolo-180.png', 'uniesco-simbolo-512.png'].map((fX) => [fX, P150.ficheiros[fX].md5])) });

if (falhas.length) {
  const RED = `${REPO}/evidence/p151-gera-candidata-v144-24-11-${SUF}-VERMELHO.json`;
  if (existsSync(RED)) throw new Error('ABORTA: ' + RED + ' existe — use outro sufixo, nunca por cima');
  writeFileSync(RED, JSON.stringify({ veredito: 'P151_CANDIDATA_V144_VERMELHO ' + falhas.length, sufixo: SUF, falhas, substituicoes }, null, 2) + '\n');
  for (const f of falhas) console.log('  FALTA ' + f);
  process.exit(1);
}
mkdirSync(`${REPO}/${PASTA_NOVA}`, { recursive: true });
writeFileSync(SAIDA, txt);
const relido = readFileSync(SAIDA, 'utf8');
if (md5(relido) !== md5(txt)) throw new Error('ABORTA: a candidata re-lida nao bate com a corrida');
const registo = {
  programa: 'scripts/p151-gera-candidata-v144-uniesco.mjs', em: new Date().toISOString(), duracao_ms: 0,
  pergunta: 'o nome BFR Conecta desaparece de toda a experiencia do utilizador e a identidade passa a ser UNIESCO com a logo oficial, sem tocar em identificadores tecnicos?',
  origem: { pasta: PASTA_ORIGEM, md5: md5(txt0), bytes: B(txt0), veredito_portoes: PORTOES_ORIGEM.veredito },
  destino: { pasta: PASTA_NOVA, md5: md5(txt), bytes: B(txt), delta_bytes: B(txt) - B(txt0) },
  substituicoes, passagem: { nome_velho_ocorrencias: MATCHES_ORIGEM.length, frases_compostas_trocadas: passoComposto, sobras_simples_trocadas: passoSimples, removidas_pelas_subs: MATCHES_ORIGEM.length - matchesPrePassagemRE, trocadas_no_total: passoComposto + passoSimples, restantes: 0 },
  identificadores_tecnicos_poupados: diffTokens, cores: { navy: NAVY, navy_contraste_branco: Number(contraste(NAVY, '#ffffff').toFixed(2)), velho_10295f_media: P150.contraste_com_branco.navy_antigo_10295f, verde_texto_decidido_nao_usado_porque_contraste: Number(contraste(VERDE, '#ffffff').toFixed(2)) },
  splash: simNovo, monogramas, scripts: { total: corpos(txt).length, falhas_antes: falhas0, falhas_depois: falhasN },
  pendentes_fora_destas_bytes: ['manifest.json e icones publicos sao do bundle (P152)', 'templates de e-mail/FCM do Supabase fora do repo', 'publicacao/deploy tem de pedir OK proprio'],
  portoes: { total: 16, falhas: 0 }, veredito: '',
};
registo.veredito = 'P151_CANDIDATA_V144_UNIESCO_OK 16/0';
writeFileSync(REGISTO, JSON.stringify(registo, null, 2) + '\n');
writeFileSync(EV, JSON.stringify({ ...registo, duracao_ms: Date.now() - t0Corrida }, null, 2) + '\n');
console.log(`${registo.veredito} · ${B(txt)} B (delta ${B(txt) - B(txt0)}) · ${md5(txt)} · nome_velho=0`);
