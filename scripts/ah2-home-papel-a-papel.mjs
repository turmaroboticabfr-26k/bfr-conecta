// §6 do briefing pede a CAUSA REAL da demora ao abrir a página inicial depois de clicar no ícone Home, e
// pede-a antes de mexer na estrutura. Dois instrumentos já correram para o coordinator e fecharam a causa
// (evidence/ah2-home-causa-17-11.json: pintura mediana 407 ms, estável mediana 2273 ms, cpu mediana 438 ms,
// pedidos de rede medianos 0; evidence/ah2-home-nodos-17-11b.json: 0 nós acumulados por clique, heap estável
// em 8.5 MB, 11 painéis sempre — diagnóstico gravado: «re-construir a vista a cada clique, não rede nem DOM
// acumulado»). O que faltava era o resto das pessoas, e isso não precisa de browser: a varredura desktop já
// mediu o `inicio` de cada perfil nas três larguras. Este programa lê isso do disco.
// Duas coisas que este programa não esconde: (1) a rota Home do professor chama-se `professor-inicio`, não
// `inicio`, por isso a chave é procurada com prefixo; (2) o amostrador do MEDIR dorme 600 ms entre amostras
// e exige duas — logo o número mais pequeno que ele pode devolver é ~1.82 s, e «1.82 s» significa «assentou à
// primeira verificação», não «demorou 1.82 s». Só-leitura: 0 browser, 0 escrita em base.
// Uso: node scripts/ah2-home-papel-a-papel.mjs [rotulo]
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const ROTULO = process.argv[2] || 'v1';
const OUT = `${DIR}/evidence/ah2-home-papel-a-papel-${ROTULO}.json`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — usar outro rótulo');
const ALVO = ['1366', '1440', '1920'];
const fich = readdirSync(`${DIR}/evidence`).filter((f) => /^ah2-varredura-.*\.json$/.test(f));
// Para (papel × largura) ganha o artefacto que mediu mais seções: é prova a mais, não escolha de número.
const melhor = {};
const md5 = new Set();
for (const f of fich) {
  const j = JSON.parse(readFileSync(`${DIR}/evidence/${f}`, 'utf8'));
  if (j.ciclo !== 'AH-2-V') continue;
  if (j.md5_shell) md5.add(j.md5_shell);
  for (const [p, st] of Object.entries(j.stages || {})) {
    for (const b of j.bandas || []) {
      if (!ALVO.includes(String(b))) continue;
      const d = st[b];
      if (!d || !(d.abertas > 0)) continue;
      const peso = Object.keys(d.peca || {}).length;
      const k = `${p}@${b}`;
      if (!melhor[k] || peso > melhor[k].peso) melhor[k] = { peso, d, ficheiro: f };
    }
  }
}
const CHAVES_HOME = ['inicio', 'professor-inicio'];
const procura = (peca) => { for (const c of CHAVES_HOME) if (peca && peca[c]) return { rota_home: c, ...peca[c] }; return null; };
const mediana = (a) => { const s = a.filter((x) => typeof x === 'number').sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
const linhas = [];
for (const p of [...new Set(Object.keys(melhor).map((k) => k.split('@')[0]))].sort()) {
  const por_banda = {}; const ms = [];
  for (const b of ALVO) {
    const e = melhor[`${p}@${b}`];
    if (!e) { por_banda[b] = null; continue; }
    const pc = procura(e.d.peca);
    if (!pc) { por_banda[b] = { sem_leitura: true, amostra_de_rotas: Object.keys(e.d.peca || {}).slice(0, 6) }; continue; }
    por_banda[b] = { rota_home: pc.rota_home, ms: pc.ms, painel: pc.painel, assentou: !pc.nao_estabilizou, controles: pc.controles, estouro: !!pc.estouro_h };
    ms.push(pc.ms);
  }
  const med = mediana(ms);
  linhas.push({ papel: p, mediana_ms: med, max_ms: ms.length ? Math.max(...ms) : null, bandas: por_banda,
    leitura: med === null ? 'sem leitura de Home' : med <= 1850 ? 'assentou à 1.ª verificação (piso do amostrador)' : med > 4800 ? 'platô acima de 5 s — a vista não cabe no teto de 6 s com margem' : 'platô intermediário, re-construção visível' });
}
linhas.sort((a, b) => (b.mediana_ms || 0) - (a.mediana_ms || 0));
// O discriminante que separa «re-construção» de «rede»: se o tempo do Home seguisse o número de controlos
// pintados, é trabalho de render; se seguisse os pedidos de rede, é dados. Calculado sobre as 14 leituras,
// com Pearson simples — e escrito no artefacto para que a afirmação do relatório seja um número, não uma
// opinião. Os erros de rede da mesma banda entram como segunda variável porque um 404 também custa tempo.
const pearson = (xs, ys) => {
  const n = xs.length; if (n < 3) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2; }
  return (sxx && syy) ? +(sxy / Math.sqrt(sxx * syy)).toFixed(3) : null;
};
const par = [];
for (const l of linhas) {
  if (l.mediana_ms === null) continue;
  const bs = ALVO.map((b) => l.bandas[b]).filter((x) => x && x.ms);
  if (!bs.length) continue;
  const ctl = mediana(bs.map((x) => x.controles || 0));
  const e = melhor[`${l.papel}@${ALVO.find((b) => l.bandas[b] && l.bandas[b].ms)}`];
  const rede = (e.d.log_rede_erros || 0) + (e.d.falhas_api_rede || []).length;
  par.push({ papel: l.papel, ms: l.mediana_ms, controles: ctl, erros_rede: rede });
}
const correlacao = {
  n: par.length,
  ms_contra_controles: pearson(par.map((x) => x.ms), par.map((x) => x.controles)),
  ms_contra_erros_rede: pearson(par.map((x) => x.ms), par.map((x) => x.erros_rede)),
  leitura: null,
};
correlacao.leitura = correlacao.ms_contra_controles !== null && Math.abs(correlacao.ms_contra_controles) > Math.abs(correlacao.ms_contra_erros_rede || 0)
  ? 'o tempo do Home segue a quantidade de controlos pintados, não os erros de rede: é render/re-construção'
  : 'o tempo do Home não segue os controlos; ver a variável de rede antes de concluir';
const saida = { ciclo: 'AH-6-HOME-PAPEL-A-PAPEL', em: new Date().toISOString(), larguras: ALVO, md5_shell: [...md5],
  piso_do_amostrador_ms: 1820, nota_piso: 'MEDIR dorme 600 ms e exige 2 amostras estáveis: 1820 é o valor mínimo possível, não uma medição de tempo real. Para tempo real ver ah2-home-causa-17-11.json (pintura/estável por clique).',
  correlacao, pares: par,
  causa_ja_fechada_para: 'coordinator', linhas, veredito: null };
saida.veredito = `${linhas.filter((l) => l.mediana_ms !== null).length}/${linhas.length} perfis com leitura de Home · mediana global ${mediana(linhas.map((l) => l.mediana_ms))} ms · pior ${linhas[0].papel} ${linhas[0].mediana_ms} ms · sem_leitura ${linhas.filter((l) => l.mediana_ms === null).map((l) => l.papel).join(' ') || 'nenhum'}`;
writeFileSync(OUT, JSON.stringify(saida, null, 2) + '\n');
console.log(saida.veredito);
console.log(`  Pearson ms×controlos=${correlacao.ms_contra_controles}  ms×erros de rede=${correlacao.ms_contra_erros_rede}  (n=${correlacao.n}) — ${correlacao.leitura}`);
for (const l of linhas) console.log(`  ${l.papel.padEnd(21)} ${String(l.mediana_ms).padStart(5)} ms  max=${String(l.max_ms).padStart(5)}  ${l.leitura}`);
console.log('ESCRITO: ' + OUT.split('/').pop());
