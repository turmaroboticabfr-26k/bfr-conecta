// Leitor de cobertura PEN-35 desktop: agrega os 45 artefactos (15 papéis × 1280/1440/1920) do
// instrumento ah2-mobile2 (ciclo AH-7b) e aplica as regras do produtor:
//  - a régua de estouro é a corrigida (document.body.scrollWidth > documentElement.clientWidth+1),
//    e o vermelho dela aparece nas falhas como «0 estouro horizontal»;
//  - «0 estouro horizontal» com célula bloqueada (bandas vazio + bloqueadas presente) é a prédica do
//    produtor sobre uma régua que NÃO correu: a célula entra como BLOQUEADA com rótulo numerado,
//    nunca como verde de estouro;
//  - célula medida com presentation=web é MEDIDA_WEB (a régua correu sobre a página como servida);
//  - os vermelhos de pré-condição mobile (app declarou-se mobile, barra com caixa, etc.) a largura
//    desktop são o estado honesto do produto (presentation web ≥800 px) e ficam registados, não
//    contam como estouro.
// Só leitura: 0 deploy, 0 escrita no ar. Única escrita: evidence/sm25-cobertura-desktop-20-11.*.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const EV_OUT = `${DIR}/evidence/sm25-cobertura-desktop-20-11.json`;
const EV_TXT = `${DIR}/evidence/sm25-cobertura-desktop-20-11.txt`;
const EV_OUT_V = `${DIR}/evidence/sm25-cobertura-desktop-20-11-VERMELHO.json`;
const EV_TXT_V = `${DIR}/evidence/sm25-cobertura-desktop-20-11-VERMELHO.txt`;
if ([EV_OUT, EV_TXT, EV_OUT_V, EV_TXT_V].some((f) => existsSync(f)))
  throw new Error('ABORTA: artefacto de evidência já existe — renomeie como ANTERIOR e re-corra');

const PAPEIS = ['pending', 'parent', 'student', 'pedagogical', 'developer', 'monitor', 'gatekeeper',
  'coordinator', 'secretary', 'aee', 'director', 'psychology', 'social_work', 'sports_operator', 'education_supervisor'];
const LARGURAS = ['1280', '1440', '1920'];
const SHELL_MD5 = '9e236a23eed978cf7c2a2743d449b307'; // a shell publicada (v136 «Secretaria de Educação»)
const total = { celulas: 0, medida_web: 0, bloqueada: 0, falta: 0, estouro_vermelho: 0, shell_diverge: 0,
  vereditos: { 'AH7b_MOBILE_LIMPO': 0, 'AH7b_MOBILE_PARCIAL': 0, 'AH7b_MOBILE_COM_DEFEITOS': 0 } };
const celulas = [];
let rotuloFalta = 0;
for (const largura of LARGURAS) for (const papel of PAPEIS) {
  const f = `${DIR}/evidence/ah2-mobile2-sm25-${papel}-${largura}.json`;
  total.celulas++;
  if (!existsSync(f)) {
    rotuloFalta++;
    total.falta++;
    celulas.push({ papel, largura, classe: 'FALTA', rotulo: `F${rotuloFalta}`, artefacto: 'evidence/' + f.split('/').pop() });
    continue;
  }
  const a = JSON.parse(readFileSync(f, 'utf8'));
  const banda = (a.bandas || {})[largura];
  const bloqueada = Array.isArray(a.bloqueadas) && a.bloqueadas.length > 0;
  const estouroFalha = (a.falhas || []).some((x) => String(x).includes('estouro horizontal'));
  const classe = banda && banda.censo ? 'MEDIDA_WEB' : bloqueada ? 'BLOQUEADA' : 'FALTA';
  if (classe === 'FALTA') rotuloFalta++;
  if (classe === 'MEDIDA_WEB') total.medida_web++;
  if (classe === 'BLOQUEADA') total.bloqueada++;
  if (classe === 'FALTA') total.falta++;
  if (estouroFalha) total.estouro_vermelho++;
  if (a.md5_shell !== SHELL_MD5) total.shell_diverge++;
  total.vereditos[a.veredito] = (total.vereditos[a.veredito] || 0) + 1;
  const censo = banda?.censo || a.bloqueadas?.[0]?.censo || null;
  celulas.push({
    papel, largura, classe,
    rotulo: classe === 'FALTA' ? `F${rotuloFalta}` : undefined,
    artefacto: 'evidence/' + f.split('/').pop(),
    em: a.em, veredito: a.veredito, md5_shell: a.md5_shell,
    presentation: censo ? censo.presentation : undefined,
    body_mobile: censo ? censo.body_mobile : undefined,
    barra_rotas: banda?.censo?.barra?.length ?? (bloqueada ? 0 : undefined),
    gaveta_rotas: banda?.censo?.gaveta?.length ?? (bloqueada ? 0 : undefined),
    estouro_h: banda ? (Array.isArray(banda.estouro) ? banda.estouro : []) : undefined,
    estouro_vermelho: estouroFalha,
    abriu_paineis: banda?.abertas ?? 0,
    ms_ready: a.bloqueadas?.[0]?.ms_ready,
    causa_bloqueio: a.bloqueadas?.[0]?.causa,
  });
}

const porLargura = Object.fromEntries(LARGURAS.map((l) => [l, {
  celulas: celulas.filter((c) => c.largura === l).length,
  medida_web: celulas.filter((c) => c.largura === l && c.classe === 'MEDIDA_WEB').length,
  bloqueada: celulas.filter((c) => c.largura === l && c.classe === 'BLOQUEADA').length,
  falta: celulas.filter((c) => c.largura === l && c.classe === 'FALTA').length,
  estouro_vermelho: celulas.filter((c) => c.largura === l && c.estouro_vermelho).length,
  shell_diverge: celulas.filter((c) => c.largura === l && c.classe !== 'FALTA' && c.md5_shell !== SHELL_MD5).length,
}]));

const out = {
  em: new Date().toISOString(), leitor: 'scripts/sm25-cobertura-desktop.mjs',
  pen: 'PEN-35 — cobertura das bandas desktop 1280/1440/1920 × 15 papéis com a régua de estouro corrigida',
  regua_do_produtor: 'document.body.scrollWidth > documentElement.clientWidth + 1 (ah2-mobile2.mjs:195)',
  shell_esperada: SHELL_MD5, papéis: PAPEIS.length, larguras: LARGURAS,
  total, porLargura: Object.fromEntries(LARGURAS.map((l) => [l, {
    celulas: celulas.filter((c) => c.largura === l).length,
    medida_web: celulas.filter((c) => c.largura === l && c.classe === 'MEDIDA_WEB').length,
    bloqueada: celulas.filter((c) => c.largura === l && c.classe === 'BLOQUEADA').length,
    falta: celulas.filter((c) => c.largura === l && c.classe === 'FALTA').length,
    estouro_vermelho: celulas.filter((c) => c.largura === l && c.estouro_vermelho).length,
    shell_diverge: celulas.filter((c) => c.largura === l && c.classe !== 'FALTA' && c.md5_shell !== SHELL_MD5).length,
  }])),
  celulas,
  portoes: {
    C0_45_celulas_presentes: total.celulas === 45 && total.falta === 0,
    C1_shell_publicada_em_todas_as_celulas_medidas: total.shell_diverge === 0,
    C2_zero_estouro_horizontal_vermelho: total.estouro_vermelho === 0,
    C3_nenhuma_celula_falta: total.falta === 0,
    C4_vereditos_registados_por_celula: celulas.every((c) => c.classe === 'FALTA' || typeof c.veredito === 'string'),
  },
};
out.portoes_resumo = `${Object.values(out.portoes).filter(Boolean).length}/${Object.values(out.portoes).filter((v) => !v).length}`;
out.veredito = Object.values(out.portoes).every(Boolean)
  ? `SM25_COBERTURA_DESKTOP_OK ${Object.values(out.portoes).filter(Boolean).length}/${Object.values(out.portoes).filter((v) => !v).length}`
  : `SM25_COBERTURA_DESKTOP_FALHOU ${Object.values(out.portoes).filter(Boolean).length}/${Object.values(out.portoes).filter((v) => !v).length}`;

const linhas = [
  out.veredito,
  `celulas=${total.celulas} medida_web=${total.medida_web} bloqueada=${total.bloqueada} falta=${total.falta} estouro_vermelho=${total.estouro_vermelho} shell_diverge=${total.shell_diverge}`,
  `vereditos=${JSON.stringify(total.vereditos)}`,
  ...LARGURAS.map((l) => `${l}px: ${JSON.stringify(out.porLargura[l])}`),
];
const passou = Object.values(out.portoes).every(Boolean);
writeFileSync(passou ? EV_OUT : EV_OUT_V, JSON.stringify(out, null, 2) + '\n');
writeFileSync(passou ? EV_TXT : EV_TXT_V, linhas.join('\n') + `\nnode_exit=${passou ? 0 : 1}\n`);
console.log(linhas.join('\n'));
process.exit(passou ? 0 : 1);
