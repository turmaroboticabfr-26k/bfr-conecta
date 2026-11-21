#!/usr/bin/env node
// P74-PEN35-DESKTOP-RESUMO — o fecho da pergunta da PEN-35 para as bandas desktop: com a régua corrigida
// (`documentElement.clientWidth`, §AI.32) e o ar servido hoje, há estouro horizontal em alguma célula
// (papel × largura) de 1280/1440/1920? Só-leitura: 0 rede com sessão, 0 escrita fora do registo, 0 DDL.
// A régua é a do produtor (p74-pen35-varredura-desktop.mjs escreve `r.estouro` = seções com estouro_h) e a
// do leitor móvel (p73-estouro-no-ar-atual.mjs): lista com entrada = estouro; lista vazia = medido sem
// estouro; chave ausente = não medido (nunca somado ao verde).
// Uso: node scripts/p74-pen35-desktop-resumo.mjs [sufixo=21-11a]   (P35D_SUF também serve)
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const EV = `${REPO}/evidence`;
const SUF = (process.argv[2] || process.env.P35D_SUF || '21-11a').trim();
const OUT = `${EV}/p74-pen35-desktop-21-11-${SUF}.json`;
const OUT_R = OUT.replace(/\.json$/, '-VERMELHO.json');
if (existsSync(OUT) || existsSync(OUT_R)) throw new Error('ABORTA: ' + (existsSync(OUT) ? OUT : OUT_R) + ' existe — corra com outro sufixo');

const por_versao = (re) => readdirSync(REPO).filter((f) => re.test(f)).sort((a, b) => parseInt(/(\d+)/.exec(a)[1], 10) - parseInt(/(\d+)/.exec(b)[1], 10));
const DIARIO = por_versao(/^audit-publicacao-v\d+\.json$/).slice(-1)[0];
const URL_LIDA = (/https:\/\/[a-z0-9.-]+\.workers\.dev/i.exec(readFileSync(`${REPO}/${DIARIO}`, 'utf8')) || [])[0] + '/';
// Mesma regra do produtor: esperado da pasta da MESMA versão do diário mais novo (v137/v138 são candidatas
// em disco por publicar — o ar servido é o do último diário).
const V_PUBLICADA = /v(\d+)/.exec(DIARIO)[1];
const PASTA = por_versao(new RegExp('^worker-deploy-v' + V_PUBLICADA + '(?!\\d)')).slice(-1)[0];
if (!PASTA) throw new Error('ABORTA: nenhum worker-deploy-v' + V_PUBLICADA + ' para o diário ' + DIARIO);
const FICH_ESP = readdirSync(`${REPO}/${PASTA}`).filter((f) => /^esperado-v\d+\.json$/.test(f)).sort((a, b) => parseInt(/v(\d+)/.exec(a)[1], 10) - parseInt(/v(\d+)/.exec(b)[1], 10)).slice(-1)[0];
const AR = String(JSON.parse(readFileSync(`${REPO}/${PASTA}/${FICH_ESP}`, 'utf8')).htmlMd5 || '').toLowerCase();
if (!/^[0-9a-f]{32}$/.test(AR)) throw new Error('ABORTA: o esperado não expõe md5 de 32 hex — li o campo errado');

// Papéis e bandas desktop lidos do condutor (que por sua vez os lê da varredura) — nenhum enum dactilografado.
const SRC_VARREDURA = readFileSync(`${REPO}/scripts/ah2-varredura.mjs`, 'utf8');
const PAPEIS = (() => { const m = SRC_VARREDURA.match(/const TODOS\s*=\s*\[([^\]]*)\]/); return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]); })();
const BANDAS = (() => { const m = SRC_VARREDURA.match(/const TODAS_BANDAS\s*=\s*\[([^\]]*)\]/); const l = []; for (const item of m[1].split('},')) { const n = /nome:\s*'([^']+)'/.exec(item); if (n && ['1280', '1440', '1920'].includes(n[1])) l.push(n[1]); } return l; })();
// O MEDIR lê-se do produtor vivo pela mesma regra do condutor (terminação do literal, nunca regex do corpo).
const iniMedir = SRC_VARREDURA.indexOf('const MEDIR = `');
const fimMedir = iniMedir === -1 ? -1 : SRC_VARREDURA.indexOf('`;\n', iniMedir + 1);
if (fimMedir === -1) throw new Error('ABORTA: terminação do literal MEDIR não encontrada na varredura');
const MEDIR_LIDO = SRC_VARREDURA.slice(iniMedir + 'const MEDIR = `'.length, fimMedir);
if (!/documentElement\?\.clientWidth/.test(MEDIR_LIDO)) throw new Error('ABORTA: a régua do produtor não usa documentElement.clientWidth');
if (/window\.innerWidth/.test(MEDIR_LIDO)) throw new Error('ABORTA: a régua do produtor ainda cita window.innerWidth');
if (!MEDIR_LIDO.trim().endsWith('})()')) throw new Error('ABORTA: o MEDIR extraído está truncado — não fecha com o fim do literal');

const tem_estouro = (r) => Array.isArray(r && r.estouro) && r.estouro.length > 0;
if (tem_estouro({ estouro: ['x'] }) !== true || tem_estouro({ estouro: [] }) !== false || tem_estouro({}) !== false) throw new Error('ABORTA: a régua de estouro não discrimina no fixture');

const ficheiros = readdirSync(EV).filter((f) => /^ah2-p35d-.*\.json$/.test(f)).sort();
const celula = {};
const por_ar = {};
for (const f of ficheiros) {
  let j; try { j = JSON.parse(readFileSync(`${EV}/${f}`, 'utf8')); } catch { continue; }
  if (j.ciclo !== 'AH-2-VD') continue;
  const q = String(j.md5_shell || '(sem-md5)');
  por_ar[q] = por_ar[q] || { ficheiros: 0, papeis: new Set(), he_o_ar: q === AR };
  por_ar[q].ficheiros++; por_ar[q].papeis.add(j.papel);
  if (q !== AR) continue;
  const st = j.stages?.[j.papel] || {};
  for (const banda of BANDAS) {
    const r = st[banda];
    const chave = j.papel + '@' + banda;
    celula[chave] = celula[chave] || { ocorrencias: 0, medido: false, estouro: null, pela_praga: 0, erro_boot: 0, persona_errada: 0, falhas_do_ultimo: [], em: [] };
    celula[chave].ocorrencias++;
    celula[chave].em.push(j.em || '(sem-em)');
    if (!r || !r.peca || r.pela_praga) { if (r && r.pela_praga) celula[chave].pela_praga++; continue; }
    if ((j.falhas || []).some((x) => String(x).startsWith(`${j.papel}/${banda}: sessão do papel reconhecida`))) { celula[chave].persona_errada++; continue; }
    if (r.erro_boot) { celula[chave].erro_boot++; continue; }
    celula[chave].medido = true;
    celula[chave].falhas_do_ultimo = (j.falhas || []).filter((x) => String(x).startsWith(j.papel + '/' + banda + ':'));
    if (tem_estouro(r)) celula[chave].estouro = r.estouro;
    else if (celula[chave].estouro === null) celula[chave].estouro = [];
  }
}
const esperadas = PAPEIS.length * BANDAS.length;
const resumo = {};
for (const p of PAPEIS) for (const b of BANDAS) {
  const k = p + '@' + b;
  const c = celula[k] || { ocorrencias: 0, medido: false, estouro: null, pela_praga: 0, erro_boot: 0, persona_errada: 0, falhas_do_ultimo: [] };
  resumo[k] = { medido: c.medido, ocorrencias: c.ocorrencias, estouro: c.estouro, travado_por_boot_2_ou_mais: c.erro_boot >= 2 && !c.medido, persona_errada: c.persona_errada, pela_praga_sem_medir: c.pela_praga > 0 && !c.medido, falhas_do_ultimo: c.falhas_do_ultimo };
}
const medidos = Object.values(resumo).filter((c) => c.medido);
const com_estouro = medidos.filter((c) => Array.isArray(c.estouro) && c.estouro.length > 0);
const com_falhas_nao_persona = medidos.filter((c) => c.falhas_do_ultimo.length > 0);
const travados = Object.values(resumo).filter((c) => c.travado_por_boot_2_ou_mais);
const por_medir = esperadas - medidos.length - travados.length;
const out = {
  programa: 'scripts/p74-pen35-desktop-resumo.mjs', em: new Date().toISOString(),
  pergunta: 'PEN-35 bandas desktop: com a régua corrigida (clientWidth) e o ar servido, há estouro horizontal em 1280/1440/1920?',
  ar: { url: URL_LIDA, md5_esperado_de: PASTA + '/' + FICH_ESP, md5: AR },
  produtor: { ficheiro: 'scripts/p74-pen35-varredura-desktop.mjs', regua_tem_clientWidth: true, regua_sem_innerWidth: true, papeis_lidos: PAPEIS.length, bandas_lidas: BANDAS },
  unidade: 'celula = papel x largura; uma ocorrencia por ficheiro; lista vazia = medido sem estouro; chave ausente = nao medido (fora do verde); erro_boot em 2+ ficheiros sem medicao = travada',
  ficheiros_p35d_em_disco: ficheiros.length,
  por_ar: Object.fromEntries(Object.entries(por_ar).map(([k, v]) => [k.slice(0, 12), { ficheiros: v.ficheiros, papeis: v.papeis.size, he_o_ar_atual: v.he_o_ar }])),
  grelha_declarada: PAPEIS.length + ' papeis x ' + BANDAS.length + ' larguras = ' + esperadas + ' celulas',
  medidos_neste_ar: medidos.length,
  com_lista_vazia: medidos.filter((c) => Array.isArray(c.estouro) && c.estouro.length === 0).length,
  com_estouro: com_estouro.length,
  com_falhas_nao_persona: com_falhas_nao_persona.length,
  travados_por_boot: travados.length,
  por_medir,
  mapa: resumo
};
out.veredito = com_estouro.length > 0 ? 'P35_DESKTOP_HA_ESTOURO_NO_AR'
  : medidos.length === esperadas && travados.length === 0 ? 'P35_DESKTOP_ESTOURO_MEDIDO_SEM_ESTOURO_45_45'
  : 'P35_DESKTOP_COBERTURA_PARCIAL';
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log('ar=' + AR + ' · ' + out.grelha_declarada + ' · ficheiros p35d=' + ficheiros.length);
console.log('medidos=' + medidos.length + ' lista_vazia=' + out.com_lista_vazia + ' com_estouro=' + com_estouro.length + ' com_falhas_nao_persona=' + com_falhas_nao_persona.length + ' travados=' + travados.length + ' por_medir=' + por_medir);
if (com_estouro.length) for (const [k, v] of Object.entries(resumo)) if (Array.isArray(v.estouro) && v.estouro.length) console.log('  ESTOURO ' + k + ': ' + v.estouro.join(','));
console.log(out.veredito);
console.log('artefacto: ' + OUT);
