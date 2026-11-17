// Porque este programa existe: a tabela de §5 imprime 25 linhas `NAO TESTADA — porta inexistente`, e essa
// frase é uma afirmação sobre o PRODUTO dita por um LEITOR de artefactos. Antes de assinar «estado do
// produto, não buraco de campanha» (que §AI.21 ponto 5 assinou sem números) é preciso separar três coisas
// que a linha única mistura, e depois ir ver se a casa existe:
//   (a) o papel nunca chegou a ter banda coerente nessa largura → não há medição nenhuma;
//   (b) a rota está no mapa de acessos do papel mas não está no censo da navegação → é aqui que «porta
//       inexistente» pode ser verdade;
//   (c) a rota está no censo mas o varrimento não a tocou → buraco de campanha, não produto.
// A pergunta «a casa existe?» responde-se com as bytes que estão no ar, não com `app/index.html`: o mesmo
// `md5_shell` da grelha (d418e7…) e as mesmas contagens por seletor. Se `data-section="X"` aparece 0 vezes
// na shell servida, nenhum código de apresentação montou botão para X — e aí «porta inexistente» deixa de
// ser inferência. Uma secção pode ainda existir montada por JS (o botão criado em runtime): por isso o
// script conta também a palavra nos módulos servidos e declara o limite na saída, em vez de calar.
// Só-leitura: `fetch` da shell e dos módulos, leitura de `evidence/`. Não escreve em base, não faz DDL.
// Uso: node scripts/ah2-confere-portas.mjs [prefixo=m5]
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const PREFIXO = process.argv[2] || 'm5';
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const LARGURAS = [320, 360, 375, 390, 414, 430];
const SEM_EFEITO = (x, rota) => (x || []).some((s) => String(s).startsWith(rota + ':'));
const coerente = (b) => !!b.censo && b.censo.barra_existe !== false && (b.censo.barra || []).some((x) => x.w > 0 && x.h > 0) && (b.abertas || 0) > 0;

const fich = readdirSync(`${DIR}/evidence`).filter((f) => new RegExp(`^ah2-mobile2-${PREFIXO}[^/]*\\.json$`).test(f)).sort();
if (!fich.length) throw new Error('ABORTA: sem artefactos');
// Reconstrói as células com as MESMAS regras do produtor (mesma `coerente`, mesmo `inacesso`, mesmo alias de
// `declaradas_sem_rota`) — este script existe para perguntar ao ar o que a tabela já decidiu, portanto tem
// de chegar às mesmas linhas que ela.
const celulas = {}, larguras_por_papel = {};
for (const f of fich) {
  const j = JSON.parse(readFileSync(`${DIR}/evidence/${f}`, 'utf8'));
  if (j.ciclo !== 'AH-7b-MOBILE') continue;
  const p = j.papel;
  for (const [w, b] of Object.entries(j.bandas || {})) {
    const L = +w;
    if (b.pela_praga || !coerente(b)) continue;
    (larguras_por_papel[p] = larguras_por_papel[p] || new Set()).add(L);
    const portas = new Set([...(b.censo.barra || []), ...(b.censo.gaveta || [])].map((x) => x.route).filter((r) => r && r !== 'more'));
    for (const s of (b.declaradas_sem_rota || [])) (celulas[`${p}|${s}`] = celulas[`${p}|${s}`] || { causas: new Set(), larguras: new Set() }).causas.add('sem_rota_no_censo');
    for (const r of portas) if (!(b.declaradas_sem_rota || []).includes(r) && !b.seccoes[r]) { const c = (celulas[`${p}|${r}`] = celulas[`${p}|${r}`] || { causas: new Set(), larguras: new Set() }); c.causas.add('por_tocar'); c.larguras.add(L); }
    for (const [rota, v] of Object.entries(b.seccoes || {})) {
      const c = (celulas[`${p}|${rota}`] = celulas[`${p}|${rota}`] || { causas: new Set(), larguras: new Set() });
      c.larguras.add(L);
      if (v.painel) { if (!(v.painel.c > 0)) c.causas.add('painel_vazio'); else if (SEM_EFEITO(b.sem_efeito, rota)) c.causas.add('toque_sem_efeito'); else c.causas.add('ok'); }
      else c.causas.add(v.gaveta_nao_abriu ? 'gaveta_nao_abriu' : v.nao_tocavel || 'sem_painel');
    }
  }
}
const linhas = Object.entries(celulas).map(([k, c]) => ({ papel: k.split('|')[0], rota: k.split('|')[1], causas: [...c.causas], larguras: [...c.larguras].sort((a, b) => a - b) }))
  .filter((l) => !l.causas.includes('ok') && !l.causas.includes('sem_rota_no_censo') && !l.causas.includes('por_tocar'))
  .filter((l) => l.causas.every((c) => c === 'sem_painel' || c === 'sem_botao' || c === 'gaveta_nao_abriu'));
// As 25 da tabela são as que o PRODUTOR já rotulou de «porta inexistente»; aqui recorto-as pela mesma
// condição (todas as larguras coerentes sem painel e sem porta no censo).
const candidatas = Object.entries(celulas).map(([k, c]) => ({ papel: k.split('|')[0], rota: k.split('|')[1], causas: [...c.causas], larguras: [...c.larguras] }))
  .filter((l) => l.causas.length === 1 && (l.causas[0] === 'sem_rota_no_censo' || l.causas[0] === 'por_tocar'));
const rotas_a_ver = [...new Set(candidatas.filter((c) => c.causas[0] === 'sem_rota_no_censo').map((c) => c.rota))];

const shell = await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' } })).text();
const createHash = (await import('node:crypto')).createHash;
console.log('md5_shell=' + createHash('md5').update(shell).digest('hex') + ' bytes=' + shell.length + ' (a grelha media d418e7fc917f1fbb1437054b7b531f9b)');
const modulos = [...shell.matchAll(/<script[^>]+src="([^"]+\.js[^"]*)"/g)].map((m) => m[1]);
const corpo_modulos = [];
for (const src of modulos) { try { corpo_modulos.push(await (await fetch(new URL(src, URL_APP), { headers: { 'Cache-Control': 'no-cache' } })).text()); } catch {} }
console.log('modulos servidos lidos: ' + corpo_modulos.length + ' de ' + modulos.length + ' (' + modulos.map((m) => m.split('/').pop().split('?')[0]).join(', ') + ')');
const NO_AR = corpo_modulos.join('\n') + shell;
// Além de impressa, a contagem por rota fica em artefacto: `scripts/relatorio-14.mjs` junta-a ao censo por
// papel (`ah2-sonda-portas-por-papel-pp5.json`) para poder dizer, por linha, se a porta não existe no bundle
// ou se só não existe para aquele papel — e um leitor não pode ir buscar isto à minha memória.
const no_ar_por_rota = {};
console.log('\n| rota | data-section no ar | botão de navegação no ar | palavra no código | o que isto permite dizer |');
console.log('| --- | --- | --- | --- | --- |');
for (const r of rotas_a_ver.sort()) {
  const sec = (NO_AR.match(new RegExp('data-section="' + r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"', 'g')) || []).length;
  const btn = (NO_AR.match(new RegExp('data-bfr-(?:mobile|drawer)-route="' + r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"', 'g')) || []).length;
  const palavra = (NO_AR.match(new RegExp('\\b' + r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g')) || []).length;
  const dito = sec === 0 && btn === 0 && palavra === 0 ? 'nem o nome aparece nas bytes servidas — a secção não é montada por este bundle'
    : sec === 0 && btn === 0 ? 'sem casa nem botão declarados; o nome aparece ' + palavra + '× em código (a verificar se é montagem em runtime)'
    : 'EXISTE no ar (' + sec + '× data-section, ' + btn + '× botão) — a linha «porta inexistente» é do INSTRUMENTO, não do produto';
  console.log(`| \`${r}\` | ${sec} | ${btn} | ${palavra} | ${dito} |`);
  no_ar_por_rota[r] = { data_section: sec, botao: btn, palavra, dito };
}
writeFileSync(`${DIR}/evidence/ah2-confere-portas-17-11.json`, JSON.stringify({
  ciclo: 'AH-CONFERE-PORTAS', em: new Date().toISOString(), url: URL_APP,
  md5_shell: createHash('md5').update(shell).digest('hex'), bytes_shell: shell.length,
  modulos_lidos: corpo_modulos.length, modulos_totais: modulos.length, celulas_sem_rota: candidatas.filter((c) => c.causas[0] === 'sem_rota_no_censo').map((c) => c.papel + '/' + c.rota).sort(),
  no_ar_por_rota,
  limite: 'contagens das bytes servidas; uma secção montada em runtime com o nome partido não casa nestes padrões'
}, null, 2) + '\n');
console.log('ESCRITO: evidence/ah2-confere-portas-17-11.json');
console.log('\ncélulas «porta inexistente» por papel×rota: ' + candidatas.filter((c) => c.causas[0] === 'sem_rota_no_censo').map((c) => c.papel + '/' + c.rota).sort().join(', '));
console.log('células «porta existe, varrimento não tocou»: ' + candidatas.filter((c) => c.causas[0] === 'por_tocar').map((c) => c.papel + '/' + c.rota + '@' + c.larguras.join('/')).sort().join(', ') || 'nenhuma');
console.log('papéis sem NENHUMA largura coerente: ' + [...new Set(fich.map((f) => JSON.parse(readFileSync(`${DIR}/evidence/${f}`, 'utf8')).papel))].filter((p) => !larguras_por_papel[p]).join(', ') || 'nenhum');
console.log('_LIMITE: as contagens acima são das bytes servidas. Uma secção montada em runtime por `createElement`/innerHTML com o nome partido em pedaços não casa nestes padrões; o «0×» autoriza dizer «nada neste bundle a monta», não «a base não tem a tabela»._');
