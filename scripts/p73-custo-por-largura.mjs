// P73-T — duas grandezas diferentes, com dois nomes diferentes, porque a primeira corrida prometeu um nome e
// mediu o outro: (a) `prontidao_ms` = o `ms_ready` que o browser mediu dentro da pagina, util para ver se o
// painel nasceu; (b) `custo_de_parede_ms_por_largura` = o que o varrimento realmente comeu no relogio da maquina,
// lido dos lancamentos do condutor (so dos que correram UM filho: com dois filhos emparelhados o DECORRIDO
// nao pertence a nenhum dos dois). E (b) — nao (a) — que decide o MAX_POR_FILHO, e um tecto de 430 s com (a)
// diria «cabem 1004 larguras» quando o developer chumba a duas. O custo de parede inclui o boot e o login do
// filho, por isso e um LIMITE SUPERIOR por largura; digo-o em vez de o esconder dentro dum numero bonito.
// So-leitura, 0 escrita fora do registo.
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const EV = `${REPO}/evidence`;
const SUF = (process.argv[2] || '19-11').trim();
const OUT = `${EV}/p73-custo-por-largura-${SUF}.json`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — renomeie como ANTERIOR e re-corra');

const dsrc = readFileSync(`${REPO}/scripts/ah2-m5-driver.mjs`, 'utf8');
const linhaCoerencia = dsrc.split('\n').findIndex((l) => /const coerente = !!b\.censo/.test(l)) + 1;
if (!linhaCoerencia) throw new Error('ABORTA: a linha da predica nao esta no condutor');
const eh_coerente = new Function('b', 'return (' + dsrc.split('\n')[linhaCoerencia - 1].replace(/^\s*const coerente =\s*/, '').replace(/;\s*$/, '') + ');');
const md5 = (s) => createHash('md5').update(Buffer.from(s)).digest('hex');
const por_versao = (re) => readdirSync(REPO).filter((f) => re.test(f)).sort((a, b) => parseInt(/v(\d+)/.exec(a)[1], 10) - parseInt(/v(\d+)/.exec(b)[1], 10));
const DIARIO = por_versao(/^audit-publicacao-v\d+\.json$/).slice(-1)[0];
const URL_APP = (/https:\/\/[a-z0-9.-]+\.workers\.dev/i.exec(readFileSync(`${REPO}/${DIARIO}`, 'utf8')) || [])[0] + '/';
const AR_MD5 = md5(await (await fetch(URL_APP, { headers: { 'cache-control': 'no-cache' } })).text());

const por_papel = {};
for (const f of readdirSync(EV).filter((x) => /^ah2-mobile2-m5-.*\.json$/.test(x)).sort()) {
  let j; try { j = JSON.parse(readFileSync(`${EV}/${f}`, 'utf8')); } catch { continue; }
  if (j.ciclo !== 'AH-7b-MOBILE' || j.md5_shell !== AR_MD5) continue;
  const p = (por_papel[j.papel] = por_papel[j.papel] || { artefactos: [], cobertas: [], travadas: [], prontidao_ms_por_largura: {}, larguras_vistas_novo: [] });
  p.artefactos.push(f);
  for (const [w, b] of Object.entries(j.bandas || {})) {
    if (b.pela_praga) continue;
    if (eh_coerente(b)) p.cobertas.push(parseInt(w, 10));
    if (b.ms_ready) (p.prontidao_ms_por_largura[w] = p.prontidao_ms_por_largura[w] || []).push(b.ms_ready);
  }
  for (const b of j.bloqueadas || []) { p.travadas.push(b.largura); if (b.ms_ready) (p.prontidao_ms_por_largura[b.largura] = p.prontidao_ms_por_largura[b.largura] || []).push(b.ms_ready); }
  p.larguras_vistas_novo.push(...Object.keys(j.bandas || {}).map((x) => parseInt(x, 10)));
}
const uniq = (a) => [...new Set(a)].sort((x, y) => x - y);
// (b) Custo de parede por largura, lido dos lancamentos do condutor. So vale quando o lancamento correu UM
// filho: com dois, o `DECORRIDO` e a soma e nao pertence a nenhum papel. O custo por largura e DECORRIDO /
// larguras tentadas e inclui boot + login + o fecho do artefacto — um LIMITE SUPERIOR, dito por extenso.
const parede = {};
for (const f of readdirSync(EV).filter((x) => /^p73-m5-w\d+-.*\.txt$/.test(x)).sort()) {
  const t = readFileSync(`${EV}/${f}`, 'utf8');
  const corridos = parseInt((/CORRIDOS NESTE LANÇAMENTO: (\d+)/.exec(t) || [])[1] || '0', 10);
  const decidido = parseInt((/DECORRIDO: (\d+) s/.exec(t) || [])[1] || '0', 10);
  const cab = /=== m5-[^\n]*:: ([a-z_]+) @ ([\d,]+)/.exec(t);
  if (corridos !== 1 || !cab || !decidido) continue;
  const larguras = cab[2].split(',').filter(Boolean).length;
  const cortado = /PAROU: watchdog/.test(t);
  // Uma corrida em que a largura foi BLOQUEADA não varreu seção nenhuma e acaba em segundos: contá-la no
  // custo por largura seria amortizar o tecto com corridas vazias. Fica registada, mas excluída da média,
  // com o motivo escrito — não com a média calada.
  const bloqueou = (t.match(/BLOQUEADA/g) || []).length;
  (parede[cab[1]] = parede[cab[1]] || []).push({ lancamento: f, larguras_pedidas: larguras, decorrido_s: decidido, filho_cortado_watchdog: cortado, celulas_bloqueadas_n: bloqueou, ms_por_largura: Math.round((decidido * 1000) / larguras) });
}
const saida = { programa: 'scripts/p73-custo-por-largura.mjs', em: new Date().toISOString(), ar_atual: AR_MD5, teto_do_filho_ms: 430000, definicoes: { prontidao_ms: 'o ms_ready medido pelo browser dentro da pagina — nao e o custo do varrimento', custo_de_parede_ms_por_largura: 'DECORRIDO do lancamento / larguras pedidas, so de lancamentos com um filho; inclui boot, login e fecho — limite superior', larguras_que_cabem_no_teto: 'floor(430000 / custo_de_parede_ms_por_largura)' }, por_papel: {} };
for (const [p, v] of Object.entries(por_papel)) {
  const pront = Object.values(v.prontidao_ms_por_largura).map((a) => a.reduce((x, y) => x + y, 0) / a.length);
  const prontidao_mediana = pront.slice().sort((a, b) => a - b)[Math.floor(pront.length / 2)] || null;
  const lanc = parede[p] || [];
  const utilizaveis = lanc.filter((l) => !l.filho_cortado_watchdog && !l.celulas_bloqueadas_n);
  const custo_parede = utilizaveis.length ? Math.round(utilizaveis.reduce((a, l) => a + l.ms_por_largura, 0) / utilizaveis.length) : null;
  saida.por_papel[p] = { artefactos_no_ar_atual: v.artefactos.length, cobertas: uniq(v.cobertas), travadas: uniq(v.travadas), larguras_que_faltam: [320, 360, 375, 390, 414, 430].filter((w) => !uniq(v.cobertas).includes(w) && !uniq(v.travadas).includes(w)), prontidao_ms_por_largura: Object.fromEntries(Object.entries(v.prontidao_ms_por_largura).map(([w, a]) => [w, a])), prontidao_mediana_ms: prontidao_mediana ? Math.round(prontidao_mediana) : null, lancamentos_de_parede: lanc, custo_de_parede_ms_por_largura: custo_parede, larguras_que_cabem_no_teto: custo_parede ? Math.max(1, Math.floor(430000 / custo_parede)) : null };
  console.log(p.padEnd(21) + ' cobertas=[' + uniq(v.cobertas).join(',') + '] travadas=[' + uniq(v.travadas).join(',') + '] faltam=' + saida.por_papel[p].larguras_que_faltam.length + ' · parede=' + (custo_parede ? custo_parede + ' ms/largura → cabem ' + saida.por_papel[p].larguras_que_cabem_no_teto : 'sem lancamento limpo') + ' · prontidao_mediana=' + (prontidao_mediana ? Math.round(prontidao_mediana) : '?') + ' ms');
}
writeFileSync(OUT, JSON.stringify(saida, null, 2) + '\n');
const faltam_total = Object.values(saida.por_papel).reduce((a, v) => a + v.larguras_que_faltam.length, 0);
console.log('CELULAS POR MEDIR NO AR ACTUAL (somando os papeis com artefacto): ' + faltam_total);
console.log('registo ' + OUT);
