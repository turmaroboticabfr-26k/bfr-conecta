// §14 do briefing exige uma tabela «Funcionalidade | Perfil | Resultado | Problema | Correção» e diz para
// NÃO INVENTAR resultados e marcar NÃO TESTADA o que não pôde ser testado. Este programa não mede nada:
// lê os artefactos da grelha mobile (ah2-mobile2-<prefixo>-*.json), reconstrói a matriz 15 perfis × 6
// larguras, e separa o que é defeito do que é buraco de medição. As células que faltam saem à superfície
// como NÃO TESTADA em vez de desaparecerem num verde médio. Só-leitura: escreve um único ficheiro de
// síntese. Uso: node scripts/ah2-m5-consolidador.mjs [prefixo=m5] [rotulo]
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const PREFIXO = process.argv[2] || 'm5';
const ROTULO = process.argv[3] || 'parcial';
const LARGURAS = [320, 360, 375, 390, 414, 430];
const OUT = `${DIR}/evidence/ah2-m5-consolidado-${ROTULO}.json`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — rode com outro rótulo');

const src = readFileSync(`${DIR}/scripts/ah2-varredura.mjs`, 'utf8');
const m = src.match(/const TODOS\s*=\s*\[([^\]]*)\]/);
const PAPEIS = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
if (PAPEIS.length < 10) throw new Error('ABORTA: enum de perfis não lido do código da varredura');

const fich = readdirSync(`${DIR}/evidence`).filter((f) => new RegExp(`^ah2-mobile2-${PREFIXO}[^/]*\\.json$`).test(f)).sort();
if (!fich.length) throw new Error('ABORTA: nenhum artefacto ah2-mobile2-' + PREFIXO + '*.json em evidence/');
const celulas = {}; const md5 = new Set(); const definicao = {}; const ocaso = {}; const bloqueadas = {};
for (const f of fich) {
  const j = JSON.parse(readFileSync(`${DIR}/evidence/${f}`, 'utf8'));
  if (j.ciclo !== 'AH-7b-MOBILE') continue;
  md5.add(j.md5_shell); definicao[j.papel] = j.declaradas;
  for (const [w, b] of Object.entries(j.bandas || {})) {
    if (b.pela_praga) continue;
    // «Banda escrita» não é «célula medida». Duas assinaturas de célula oca estavam a contar como medido e a
    // gerar falsos vermelhos: barra inexistente com shell ready (o módulo de apresentação não montou o
    // cromo mobile — pedagogical@320/360) e abertas=0 (pending, que nem shell tem). Uma célula só entra na
    // conta se a barra do censo tem botões com caixa E se pelo menos uma seção abriu a toque.
    const coerente = !!b.censo && b.censo.barra_existe !== false && (b.censo.barra || []).some((x) => x.w > 0 && x.h > 0) && (b.abertas || 0) > 0;
    if (!coerente) { const k = `${j.papel}@${w}`; (ocaso[k] = ocaso[k] || []).push(`banda oca: barra_existe=${b.censo ? b.censo.barra_existe : 'sem censo'}, abertas=${b.abertas}`); continue; }
    const c = { ficheiro: f, abertas: b.abertas, vazias: b.vazias || [], inalcancaveis: b.inalcancaveis || [], sem_efeito: b.sem_efeito || [], nao_assentaram: b.nao_assentaram || [], estouro: b.estouro || [], tap: b.tap_miudo, fonte: b.fonte_miuda, erros: b.erros || [], declaradas_sem_rota: b.declaradas_sem_rota || [], rotas_fora_do_mapa: b.rotas_fora_do_mapa || [], dialogos: (b.dialogos || []).map((d) => ({ rota: d.rota, culpado: d.culpado, z: d.z, saida: d.saida ? `${d.saida.rot} ${d.saida.w}x${d.saida.h}${d.saida.alvo_miudo ? ' <44px' : ''}` : null, fechou: d.fechou_a_toque })), barra_miuda: (b.censo?.barra || []).filter((x) => x.w > 0 && Math.min(x.w, x.h) < 44).map((x) => `${x.route}:${x.w}x${x.h}`), gaveta: b.gaveta_aberta_a_toque, modal: b.modal_fechou_a_toque };
    celulas[`${j.papel}@${w}`] = c;
  }
  // Células que o instrumento TRAVOU de propósito, com a causa escrita pelo próprio ah2-mobile2: a conta em
  // análise sem shell e a largura em que o módulo de apresentação não montou a barra mesmo após rechegar.
  // Não são «por medir» (relançar não muda nada) nem «medidas» (não se varreu navegação nenhuma).
  for (const q of j.bloqueadas || []) { const k = `${j.papel}@${q.largura}`; (bloqueadas[k] = bloqueadas[k] || []).push(q.causa); }
}
const linhas = []; const nao_testadas = []; const defeitos = {};
const empurra = (chave, papel, w, detalhe) => { (defeitos[chave] = defeitos[chave] || []).push(`${papel}@${w}${detalhe ? ' ' + detalhe : ''}`); };
for (const papel of PAPEIS) {
  for (const w of LARGURAS) {
    const c = celulas[`${papel}@${w}`];
    const k = `${papel}@${w}`;
    if (!c) { const motivo = bloqueadas[k] || ocaso[k]; nao_testadas.push(motivo ? `${k} — ${[...new Set(motivo)].join(' / ')}` : k); continue; }
    for (const s of c.barra_miuda) empurra('botão da barra com alvo < 44 px', papel, w, s);
    for (const s of c.declaradas_sem_rota) empurra('seção declarada sem rota tocável no telemóvel', papel, w, s);
    for (const s of c.rotas_fora_do_mapa) empurra('link de navegação fora do mapa do papel', papel, w, s);
    for (const s of c.inalcancaveis) empurra('rota inalcancável a toque', papel, w, s);
    for (const s of c.vazias) empurra('painel vazio', papel, w, s);
    for (const s of c.sem_efeito) empurra('toque sem efeito', papel, w, s);
    for (const s of c.nao_assentaram) empurra('conteúdo não assentou em 6 s', papel, w, s);
    for (const s of c.estouro) empurra('estouro horizontal', papel, w, s);
    for (const d of c.dialogos) if (!d.fechou) empurra('diálogo de ecrã inteiro sem saída tocável', papel, w, d.rota + ':' + d.culpado);
    for (const d of c.dialogos) if (d.saida && /<44px/.test(d.saida)) empurra('saída do diálogo com alvo < 44 px', papel, w, d.rota + ':' + d.saida);
    if (c.erros.length) empurra('erros de consola de aplicação', papel, w, c.erros.length + ' msg');
    if (c.gaveta === false) empurra('gaveta não abre a toque', papel, w);
    if (c.modal === false) empurra('modal de primeiro acesso não fecha a toque', papel, w);
    linhas.push({ papel, largura: w, abertas: c.abertas, declaradas: (definicao[papel] || []).length, vazias: c.vazias.length, inalcancaveis: c.inalcancaveis.length, alvos_miudos: c.tap, fontes_miudas: c.fonte, estouro: c.estouro.length, erros: c.erros.length });
  }
}
const saida = { ciclo: 'AH-7b-M5-CONSOLIDADO', em: new Date().toISOString(), prefixo: PREFIXO, ficheiros: fich, md5_shell: [...md5], celulas_medidas: Object.keys(celulas).length, total_celulas: PAPEIS.length * LARGURAS.length, linhas, defeitos, nao_testadas, veredito: null };
saida.veredito = `${saida.celulas_medidas}/${saida.total_celulas} celulas medidas · ${Object.keys(defeitos).length} classes de defeito · ${nao_testadas.length} por medir`;
console.log(saida.veredito);
console.log('md5 das shells medidas: ' + [...md5].join(' '));
for (const [k, v] of Object.entries(defeitos).sort((a, b) => b[1].length - a[1].length)) console.log(`  [${String(v.length).padStart(3)} celulas] ${k}\n      ${v.slice(0, 12).join(', ')}${v.length > 12 ? ' …' : ''}`);
console.log('NAO TESTADAS (' + nao_testadas.length + '): ' + (nao_testadas.slice(0, 40).join(' ') || 'nenhuma'));
writeFileSync(OUT, JSON.stringify(saida, null, 2) + '\n');
console.log('ESCRITO: ' + OUT.split('/').pop());
