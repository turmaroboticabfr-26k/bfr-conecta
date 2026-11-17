// §6 do briefing pede o desktop nas três larguras (1366×768, 1440×900, 1920×1080) e §14 pede a tabela
// «| Funcionalidade | Perfil | Resultado | Problema | Correção |» sem resultados inventados. Este programa é
// o equivalente desktop do ah2-m5-tabela: lê os artefactos da varredura (shape real, confirmado no disco —
// stages.<papel>[<banda>].peca.<rota> = {painel:{id,c}, ms, controles, nao_estabilizou, …} e por banda
// sem_botao/painel_vazio/estouro/instaveis/abertas/erro_boot) e deriva uma linha por (papel × rota).
// Regras de honestidade, as mesmas da grelha mobile: (1) uma (papel × largura) só conta como medida se a
// banda abriu ≥1 painel e o boot não falhou; (2) quando há vários artefactos para a mesma célula, ganha o
// que mediu mais seções (empate: o mais recente) — é prova a mais, não escolha de resultado; (3) o que não
// tem porta sai NAO TESTADA, não FALHA. Só-leitura: 0 escrita em base, 0 browser, 0 deploy.
// Uso: node scripts/ah2-desktop-tabela.mjs [--papel coordinator]
import { readFileSync, readdirSync } from 'node:fs';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
// `--papel X` ou `--papel=X`; sem flag, todos os perfis. (Sem a guarda do indexOf, a ausência da flag apanhava
// o argv[0] — «node» — e o programa não imprimia uma linha.)
const i_papel = process.argv.indexOf('--papel');
const SO_PAPEL = (process.argv.find((a) => a.startsWith('--papel=')) || '').split('=')[1] || (i_papel > 0 ? process.argv[i_papel + 1] : '');
const ALVO = ['1366', '1440', '1920'];
const fich = readdirSync(`${DIR}/evidence`).filter((f) => /^ah2-varredura-.*\.json$/.test(f)).sort();
if (!fich.length) throw new Error('ABORTA: sem artefactos ah2-varredura-*.json em evidence/');

// celula[papel][banda] = o objeto de banda do melhor artefacto, com a origem
const celula = {}; const origem = {};
for (const f of fich) {
  const j = JSON.parse(readFileSync(`${DIR}/evidence/${f}`, 'utf8'));
  if (j.ciclo !== 'AH-2-V') continue;
  for (const [p, st] of Object.entries(j.stages || {})) {
    if (SO_PAPEL && p !== SO_PAPEL) continue;
    for (const b of j.bandas || []) {
      const d = st[b]; if (!d) continue;
      const peso = Object.keys(d.peca || {}).length;
      const atual = celula[p]?.[b];
      const melhor = !atual || peso > atual._peso || (peso === atual._peso && String(j.em) > String(atual._em));
      if (melhor) { ((celula[p] = celula[p] || {})[b] = { ...d, _peso: peso, _em: j.em }); ((origem[p] = origem[p] || {})[b] = f); }
    }
  }
}
const papais = Object.keys(celula).sort();
if (!papais.length) throw new Error('ABORTA: nenhum stage de desktop lido');
// Uma célula conta como medida: boot do shell do papel + pelo menos um painel aberto. `pending` não tem
// shell por desenho (barreira de pendência), e isso é estado do produto, não buraco de medição.
const medida = (d) => !!d && (d.abertas || 0) > 0 && !d.erro_boot;
const linhas = [];
const resumo = { OK: 0, PARCIAL: 0, FALHA: 0, NAO: 0, PENDENTE: 0 };
for (const p of papais) {
  const boas = ALVO.filter((b) => medida(celula[p][b]));
  const ocos = ALVO.filter((b) => celula[p][b] && !medida(celula[p][b]));
  const faltam = ALVO.filter((b) => !celula[p][b]);
  const rotas = new Set();
  for (const b of ALVO) for (const r of Object.keys(celula[p]?.[b]?.peca || {})) rotas.add(r);
  for (const b of ALVO) for (const r of celula[p]?.[b]?.sem_botao || []) rotas.add(r);
  for (const rota of [...rotas].sort()) {
    const prova = []; let ok = 0, vazio = 0, semrota = 0, instavel = 0, estouro = 0;
    for (const b of ALVO) {
      const d = celula[p]?.[b]; if (!medida(d)) continue;
      const pc = (d.peca || {})[rota];
      if ((d.sem_botao || []).includes(rota)) { semrota++; prova.push(`${b}: seção declarada sem botão no DOM (${d.botoes_no_dom} botões)`); continue; }
      if (!pc) continue;
      const id = pc.painel?.id || '?', c = pc.painel?.c ?? -1;
      if (c > 0 && !pc.nao_estabilizou) { ok++; if (pc.estouro_h) { estouro++; prova.push(`${b}: ${id} estouro horizontal`); } continue; }
      if (c <= 0) { vazio++; prova.push(`${b}: ${id} ${c}c ${pc.ms}ms ctl=${pc.controles} VAZIO`); }
      if (pc.nao_estabilizou) { instavel++; prova.push(`${b}: ${id} não assentou em 6 s (${pc.ms}ms)`); }
    }
    let res;
    if (ok === ALVO.length) res = 'OK';
    else if (ok) res = `PARCIAL (${ok}/${ALVO.length} larguras)`;
    else if (instavel) res = 'FALHA — conteúdo não assenta';
    else if (vazio) res = 'FALHA — painel vazio';
    else if (semrota) res = 'NAO TESTADA — porta inexistente';
    else res = 'NAO TESTADA';
    if (estouro) res += ' + estouro horizontal';
    const buraco = []; if (ocos.length) buraco.push(`largura(s) ${ocos.join('/')} sem banda útil`); if (faltam.length) buraco.push(`sem corrida em ${faltam.join('/')}`);
    const prob = [...new Set([...prova, ...(buraco.length ? [buraco.join(' · ')] : [])])].join(' · ');
    const chave = res.startsWith('OK') ? 'OK' : res.startsWith('PARCIAL') ? 'PARCIAL' : res.startsWith('FALHA') ? 'FALHA' : res.startsWith('NAO') ? 'NAO' : 'PENDENTE';
    resumo[chave]++;
    linhas.push(`| ${rota} | ${p} | ${res} | ${prob} |  |`);
  }
  const detalhe = ALVO.map((b) => { const d = celula[p]?.[b]; return `${b}=${medida(d) ? (d.abertas || 0) + 'ab/' + (d.ms_max || 0) + 'ms' : d ? 'OCUA' : 'por-correr'}`; }).join(' ');
  console.error(`_bandas de ${p}: ${detalhe} · origem ${[...new Set(Object.values(origem[p] || {}))].length} ficheiro(s)_`);
}
console.log('| Funcionalidade | Perfil | Resultado | Problema | Correção |');
console.log('| --- | --- | --- | --- | --- |');
for (const l of linhas) console.log(l);
console.log(`\n_${linhas.length} linhas · OK ${resumo.OK} · PARCIAL ${resumo.PARCIAL} · FALHA ${resumo.FALHA} · NAO TESTADA ${resumo.NAO} · perfis ${papais.length}/15_`);
console.log(`_Larguras do §6: ${ALVO.join(' ')} (as corridas a 1280/390 existem em disco mas não entram aqui porque o briefing pede estas três)_`);
const sem_banda = papais.flatMap((p) => ALVO.filter((b) => !celula[p]?.[b]).map((b) => p + '@' + b));
console.log(`_Células sem nenhuma corrida desktop: ${sem_banda.length}` + (sem_banda.length ? ' — ' + sem_banda.slice(0, 40).join(' ') : '') + '_');
