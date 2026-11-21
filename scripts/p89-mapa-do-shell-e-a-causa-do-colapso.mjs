#!/usr/bin/env node
// P89 — POR QUE É QUE A ENTRADA COLAPSA A 0×0 NA PERSONA «PROFESSOR»? (21/11, noite) A P81 mediu o desvio e
// não lhe encontrou causa: as duas cópias do botão a 0×0, com `hidden=false`, `munApto="sim"` e
// `teacher_mode=false`. A régua certa não é o atributo `hidden` nem a classe do tema — é o mapa que o próprio
// shell percorre em `syncRoleNavigation`. Este piece lê o mapa dos bytes servidos e diz, por vista, em que
// arrays o `secretaria-municipal` está, e onde o módulo o vai acrescentar. 0 browser, 0 banco, 0 publicação.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = (process.argv[2] || 'a').trim();
const OUT = `${REPO}/evidence/p89-mapa-do-shell-e-a-causa-do-colapso-21-11-${SUF}.json`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — corre com SUF novo, nunca por cima');
const md5 = (b) => createHash('md5').update(Buffer.from(String(b))).digest('hex');
const t0 = Date.now();

// ——— predicações puras, com os dois lados provados ———
const contemSect = (arr, sect) => Array.isArray(arr) && arr.includes(sect);
if (contemSect(['a', 'secretaria-municipal'], 'secretaria-municipal') !== true) throw new Error('ABORTA: contemSect chumba o array que contém a seção');
if (contemSect(['a', 'b'], 'secretaria-municipal') !== false) throw new Error('ABORTA: contemSect dá verde a um array sem a seção');
if (contemSect(undefined, 'secretaria-municipal') !== false) throw new Error('ABORTA: contemSect trata chave inexistente como visível');
// A regra do módulo, transcrita da fonte: `viewRoleDe` e o ramo `admin` que soma psicologia e multiprofissional.
const permitidoPara = (map, view) => (view === 'admin' ? [...new Set([...(map.admin || []), 'psychology', 'multiprofissional'])] : (map[view] || map.parent || []));
if (permitidoPara({ admin: ['x'], parent: ['y'] }, 'admin').includes('x') !== true) throw new Error('ABORTA: permitidoPara não soma o mapa de admin');
if (permitidoPara({ admin: ['x'], parent: ['y'] }, 'secretaria').join() !== 'y') throw new Error('ABORTA: permitidoPara não cai em `parent` quando a vista não tem chave — lido ' + JSON.stringify(permitidoPara({ admin: ['x'], parent: ['y'] }, 'secretaria')));

// ——— o ar publicado: mapa do shell + módulo, extraídos dos mesmos bytes ———
const porVersao = (re) => readdirSync(REPO).filter((f) => re.test(f)).sort((a, b) => parseInt(/(\d+)/.exec(a)[1], 10) - parseInt(/(\d+)/.exec(b)[1], 10));
const DIARIO = porVersao(/^audit-publicacao-v\d+\.json$/).slice(-1)[0];
const V = /v(\d+)/.exec(DIARIO)[1];
const PASTA = porVersao(new RegExp('^bfr-candidata-v' + V + '(?!\\d)')).slice(-1)[0];
if (!PASTA) throw new Error('ABORTA: nenhuma candidata v' + V + ' para censar');
const AR = readFileSync(`${REPO}/${PASTA}/index.html`, 'utf8');
const iniMap = AR.indexOf('roleSectionAccess');
if (iniMap === -1) throw new Error('ABORTA: nenhum `roleSectionAccess` no ar — sem mapa não há causa para nomear');
// Recorto por CONTAGEM de chavetas (a regex do corpo cortaria no primeiro `]}` interno): do `{` do objecto até o
// fechar bater ao mesmo nível.
const iniBrace = AR.indexOf('{', iniMap);
let nivel = 0, fimBrace = -1;
for (let i = iniBrace; i < AR.length; i++) { const c = AR[i]; if (c === '{') nivel++; else if (c === '}') { nivel--; if (nivel === 0) { fimBrace = i; break; } } }
if (fimBrace === -1) throw new Error('ABORTA: o objecto do mapa não fechou — a contagem de chavetas partiu');
const BLOCO = AR.slice(iniBrace, fimBrace + 1);
const PARES = [...BLOCO.matchAll(/([a-z_]+)\s*:\s*\[([^\]]*)\]/g)].map((m) => ({ vista: m[1], itens: [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]) }));
if (PARES.length === 0) throw new Error('ABORTA: 0 vistas lidas do mapa — os portões seriam vacuos');
const MAPA = Object.fromEntries(PARES.map((p) => [p.vista, p.itens]));

const iniMod = AR.indexOf('<script data-bfr-municipal-module="1">');
if (iniMod === -1) throw new Error('ABORTA: ' + PASTA + '/index.html não traz o invólucro municipal');
const MOD = AR.slice(iniMod, AR.indexOf('</script>', iniMod));
const SECT = (/const SECT = '([^']+)'/.exec(MOD) || [])[1];
if (!SECT) throw new Error('ABORTA: nenhum SECT no módulo');
const PAPEIS_MUN = [...((/const PAPEIS_MUNICIPAIS = \[([^\]]*)\]/.exec(MOD) || [])[1] || '').matchAll(/'([^']+)'/g)].map((x) => x[1]);
if (PAPEIS_MUN.length === 0) throw new Error('ABORTA: 0 papéis municipais lidos do módulo — a régua do registo ficaria vacua');
const LINHA_REGISTAR = MOD.split('\n').find((l) => /map\[papel\]\.concat\(SECT\)/.test(l)) || null;
const LINHA_APTO = MOD.split('\n').find((l) => /const papel = \(rt\.profile \|\| \{\}\)\.role/.test(l)) || null;
const LINHA_VIS = MOD.split('\n').find((l) => /b\.style\.display = veredito\.apto \? '' : 'none'/.test(l)) || null;

const vistasComSect = PARES.filter((p) => p.itens.includes(SECT)).map((p) => p.vista);
const vistasSemSect = PARES.filter((p) => !p.itens.includes(SECT)).map((p) => p.vista);
const chavesPatcheadas = PAPEIS_MUN.filter((p) => Array.isArray(MAPA[p]));
const chavesNaoExistentes = PAPEIS_MUN.filter((p) => !Array.isArray(MAPA[p]));
const professor = MAPA.teacher || null;

const falhas = []; const portoes = [];
const g = (nome, cond, dado) => { const v = !!cond; portoes.push({ nome, verde: v, dado }); if (!v) falhas.push(`${nome} | ${JSON.stringify(dado).slice(0, 300)}`); console.log(`${v ? 'VERDE' : 'VERMELHO'}  ${nome}`); };
g('o_mapa_do_shell_resolve_em_bytes_com_vistas', PARES.length >= 5, { ar: PASTA + '/index.html', md5: md5(AR), vistas: PARES.length, bytes_bloco: BLOCO.length });
g('a_secao_nao_esta_em_nenhum_array_estatico_do_mapa', vistasComSect.length === 0, { sect: SECT, vistas_onde_esta: vistasComSect, nota: 'se algum dia estiver, a entrada passa a ser do shell e não do módulo, e esta régua tem de ser re-escrita' });
g('os_papeis_municipais_do_modulo_tem_onde_ser_patcheados', chavesNaoExistentes.length === 0, { papeis: PAPEIS_MUN, com_array: chavesPatcheadas, sem_array: chavesNaoExistentes, nota: 'sem Array.isArray(map[papel]) o registar() salta a chave em silêncio e a entrada nunca aparece para essa vista' });
g('a_causa_do_colapso_na_persona_professor_esta_nomeada', professor !== null && !professor.includes(SECT), { teacher_tem_itens: professor ? professor.length : null, contem_sect: professor ? professor.includes(SECT) : null, LINHA_VIS });
g('o_modulo_decide_pelo_papel_da_sessao_e_nao_pela_persona_bar', !!LINHA_APTO && !!LINHA_REGISTAR, { linha_apto: LINHA_APTO, linha_registar: LINHA_REGISTAR, nota: 'é isto que explica o munApto="sim" junto de uma caixa 0×0 medido pela P81' });
g('as_vistas_que_recebem_a_secao_sao_as_declaradas', chavesPatcheadas.slice().sort().join(',') === PAPEIS_MUN.slice().sort().join(','), { declarados: PAPEIS_MUN, com_array_no_mapa: chavesPatcheadas, total_vistas: PARES.map((p) => p.vista) });

const out = {
  programa: 'scripts/p89-mapa-do-shell-e-a-causa-do-colapso.mjs', em: new Date().toISOString(), duracao_ms: Date.now() - t0,
  pergunta: 'porque é que a P81 mediu a entrada municipal a 0×0 na persona «Professor» com hidden=false e munApto="sim"?',
  metodo: 'extracção estática do `roleSectionAccess` do ar publicado (recorte por contagem de chavetas) e do módulo municipal dos mesmos bytes; 0 browser, 0 banco, 0 publicação.',
  ar: { diario: DIARIO, versao: V, pasta: PASTA, md5: md5(AR), bytes: AR.length },
  mapa_do_shell: { vistas: PARES.length, por_vista_itens: PARES.map((p) => p.vista + '=' + p.itens.length), tem_sect: vistasComSect, teacher_itens: professor ? professor.length : null, teacher_contem_sect: professor ? professor.includes(SECT) : null },
  modulo: { sect: SECT, papeis_municipais: PAPEIS_MUN, chaves_sem_array_no_mapa: chavesNaoExistentes, linha_registar: LINHA_REGISTAR, linha_apto: LINHA_APTO, linha_visibilidade: LINHA_VIS },
  causa_dita_pelos_bytes: 'O `registar()` só acrescenta a seção às chaves declaradas em PAPEIS_MUNICIPAIS. `syncRoleNavigation` esconde o que não estiver em roleSectionAccess[viewRole], e a vista `teacher` não a recebe: daí a caixa 0×0 sem `hidden`. Em simultâneo `aptoParaSessao()` lê rt.profile.role (a SESSÃO), não a persona activa — por isso a P81 viu munApto="sim" na mesma célula.',
  o_que_este_verde_nao_autoriza: 'Nada. Medir a causa não a muda: acrescentar a seção à vista `teacher` é decisão de produto e escreve no bundle (e depois no ar), o que pede OK literal.',
  portoes, falhas,
};
out.veredito = falhas.length === 0 ? 'P89_CAUSA_COLAPSO_PROFESSOR_OK ' + portoes.length + '/0' : `P89_CAUSA_COLAPSO_PROFESSOR_VERMELHO ${falhas.length}`;
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
for (const f of falhas) console.log('  FALTA ' + f);
console.log(`vistas_no_mapa=${PARES.length} com_sect=${vistasComSect.length} teacher_itens=${professor ? professor.length : 'CHAVE_AUSENTE'} papeis_municipais=[${PAPEIS_MUN.join(',')}] com_array=${chavesPatcheadas.length}`);
console.log(`${out.veredito} · ${out.duracao_ms} ms · ${OUT.split('/').pop()}`);
process.exit(falhas.length ? 1 : 0);
