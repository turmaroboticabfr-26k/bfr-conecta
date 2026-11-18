// AH-M6 consolidador V134 — le os 15 papeis nas rondas numeradas v134a/v134b (re-varredura a 390 contra
// o ar depois de a v134
// ter tirado da shell o bloco bfr-mobile-nav-sm8-fix) e aplica a MESMA prédica de cobertura do m5 e do
// v133: banda coerente = barra do censo com botões a caixa, sem praga, pelo menos uma secção aberta a
// toque, 0 estouro horizontal, 0 falhas do instrumento. A única coisa acrescentada é a coluna que este
// ciclo veio medir — sidebar_caixa, que na v133 deu true em 12/12 bandas — e a conferência da pega da
// shell servida. Não inventa linhas: papel sem artefacto conta como FALTA, não como verde, e a prédica
// não se afrouxa para chegar ao verde.
// Uso: node scripts/ah2-m6-consolida-v134.mjs
import { readFileSync, existsSync, writeFileSync } from 'node:fs';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const EV = `${DIR}/evidence`;
const OUT = `${EV}/ah2-m6-v134-consolidado-18-11.json`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — renomeie como ANTERIOR e re-corra');
const ESP = JSON.parse(readFileSync(`${DIR}/worker-deploy-v134-sidebar/esperado-v134.json`, 'utf8'));

const src = readFileSync(`${DIR}/scripts/ah2-varredura.mjs`, 'utf8');
const m = src.match(/const TODOS\s*=\s*\[([^\]]*)\]/);
if (!m) throw new Error('ABORTA: enum de perfis não encontrado em ah2-varredura.mjs');
const PAPEIS = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
if (PAPEIS.length < 10) throw new Error('ABORTA: enum lido tem só ' + PAPEIS.length + ' perfis');

const out = { ciclo: 'AH-7b-M6-V134-SWEEP', em: new Date().toISOString(), largura: 390,
  shell_esperada: { md5: ESP.htmlMd5, bytes: ESP.htmlBytes }, papeis: [], faltas: [], vermelhos: [], bloqueados: [], shells_medidas: [] };
// Duas rondas numeradas como no m5: a 2.ª (v134b) so existe para os papeis cuja 1.ª tentativa nao
// mediu a banda 390. Medido nos artefactos: pending e monitor escrevem a banda como BLOQUEADA com
// causa propria do instrumento («conta em analise: barreira de pendencia…» e «shell ready sem
// #bfrMobileBottomNav apos rechegar…»), e e assim ha 10 e 9 corridas respetivamente, contadas a
// partir do campo `papel` de cada artefacto — nao e aborto de cronometro nem corrida perdida.
// A predica de coerencia e a MESMA nas duas rondas; o que a 2.ª muda e o numero de tentativas.
const TENTATIVAS = ['v134a', 'v134b'];
for (const papel of PAPEIS) {
  const tentativas_vistas = [];
  let escolhido = null;
  const sem_banda = [];
  for (const t of TENTATIVAS) {
    const f = `${EV}/ah2-mobile2-${t}-${papel}.json`;
    if (!existsSync(f)) continue;
    const j = JSON.parse(readFileSync(f, 'utf8'));
    if (j.ciclo !== 'AH-7b-MOBILE' || j.papel !== papel) { tentativas_vistas.push(`${t}:artefacto_de_outro_ciclo`); continue; }
    if (!out.shells_medidas.includes(j.md5_shell)) out.shells_medidas.push(j.md5_shell);
    tentativas_vistas.push(t);
    const b = j.bandas?.['390'];
    if (b && !b.pela_praga) { escolhido = { t, f, j, b }; break; }
    sem_banda.push({ t, f, motivo: b ? 'praga' : 'sem_banda_390', j });
  }
  if (!escolhido) {
    // A falta nomeia TODAS as tentativas: «sem banda» numa corrida e uma tentativa, em duas e uma
    // propriedade reproduzida. A causa nao e dactilografada — sai do campo `bloqueadas[].causa` do
    // proprio artefacto, que e quem mediu.
    out.faltas.push(`${papel}:${sem_banda.length ? sem_banda.map((s) => s.t + '-' + s.motivo).join('+') : 'sem_artefacto'}`);
    if (sem_banda.length) {
      const bl = (sem_banda[0].j.bloqueadas || [])[0] || null;
      out.bloqueados.push({ papel, artefactos: sem_banda.map((s) => s.f.split('/').pop()),
        causa: bl ? bl.causa : 'sem registo de bloqueio no artefacto', estado: bl && bl.estado ? bl.estado : null,
        censo: bl && bl.censo ? { presentation: bl.censo.presentation, barra_existe: bl.censo.barra_existe, sidebar_escondida: bl.censo.sidebar_escondida } : null });
    }
    continue;
  }
  const { t, f, j, b } = escolhido;
  const coerente = b.censo && b.censo.barra_existe !== false
    && (b.censo.barra || []).some((x) => x.w > 0 && x.h > 0)
    && (b.abertas || 0) > 0 && !(b.estouro || []).length && !(j.falhas || []).length;
  out.papeis.push({ papel, coerente, tentativa: t, tentativas: tentativas_vistas.length,
    abertas: b.abertas || 0, estouro: (b.estouro || []).length,
    sidebar_caixa: b.censo?.sidebar_caixa, presentation: b.censo?.presentation,
    gaveta_aberta_a_toque: b.gaveta_aberta_a_toque === true,
    rotas_barra: (b.censo?.barra || []).length, rotas_gaveta: (b.censo?.gaveta || []).length,
    falhas: (j.falhas || []).slice(0, 6), artefacto: f.split('/').pop() });
  if (!coerente) out.vermelhos.push(papel);
}
out.totais = { papeis: PAPEIS.length, coerentes: out.papeis.filter((p) => p.coerente).length,
  faltas: out.faltas.length, vermelhos: out.vermelhos.length,
  bandas_medidas: out.papeis.length,
  da_2a_tentativa: out.papeis.filter((p) => p.tentativa !== 'v134a').length,
  sidebar_caixa_true: out.papeis.filter((p) => p.sidebar_caixa === true).length,
  sidebar_caixa_false: out.papeis.filter((p) => p.sidebar_caixa === false).length,
  sidebar_caixa_indefinida: out.papeis.filter((p) => p.sidebar_caixa !== true && p.sidebar_caixa !== false).length,
  gaveta_aberta_a_toque: out.papeis.filter((p) => p.gaveta_aberta_a_toque).length,
  bloqueados: out.bloqueados.length };
out.conferencia_shell = out.shells_medidas.length === 1 && out.shells_medidas[0] === ESP.htmlMd5;
// O veredicto da promessa deste ciclo e separado do veredicto de cobertura: a barra do desktop tem de
// estar escondida em todas as bandas medidas; defeitos de conteudo pre-existentes continuam a contar
// como vermelhos de cobertura e nao se apagam para dar verde a promessa.
// A regra da promessa exige o FALSO medido em cada banda: `sidebar_caixa_true === 0` so, sem exigir
// o false, daria verde a uma banda onde o censo nao devolveu valor nenhum (a ausencia nao e prova).
out.promessa = { esperado: 'sidebar_caixa=false na banda 390 de cada papel medido (nem true, nem oco)',
  cumprida: out.totais.bandas_medidas > 0 && out.totais.sidebar_caixa_true === 0 && out.totais.sidebar_caixa_indefinida === 0
    && out.totais.sidebar_caixa_false === out.totais.bandas_medidas,
  papeis_que_ainda_mostram_a_sidebar: out.papeis.filter((p) => p.sidebar_caixa === true).map((p) => p.papel),
  papeis_sem_valor_medido: out.papeis.filter((p) => p.sidebar_caixa !== true && p.sidebar_caixa !== false).map((p) => p.papel) };
out.veredito = out.totais.vermelhos ? (out.promessa.cumprida ? 'AH7b_V134_PROMESSA_CUMPRIDA_COM_DEFEITOS_PRE_EXISTENTES' : 'AH7b_V134_COM_DEFEITOS')
  : (out.totais.faltas ? 'AH7b_V134_INCOMPLETO' : 'AH7b_V134_390_LIMPO');
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`${out.veredito} — coerentes ${out.totais.coerentes}/${PAPEIS.length}, faltas ${out.faltas.length}, vermelhos ${out.vermelhos.length}`);
console.log(`PROMESSA: ${out.promessa.cumprida ? 'CUMPRIDA' : 'NAO_CUMPRIDA'} — sidebar_caixa false ${out.totais.sidebar_caixa_false} / true ${out.totais.sidebar_caixa_true} nas ${out.totais.bandas_medidas} bandas medidas; gaveta a toque ${out.totais.gaveta_aberta_a_toque}/${out.totais.bandas_medidas}`);
console.log(`SHELL MEDIADA: ${out.shells_medidas.join(', ')} · esperada ${ESP.htmlMd5} · conferencia ${out.conferencia_shell}`);
if (out.vermelhos.length) console.log('VERMELHOS: ' + out.vermelhos.join(', '));
if (out.faltas.length) console.log('FALTAM: ' + out.faltas.join(', '));
process.exit(out.totais.vermelhos || out.totais.faltas ? 1 : 0);
