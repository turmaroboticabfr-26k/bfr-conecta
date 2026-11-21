// PEN-35 pede um VALOR no ar, não a promessa de uma régua corrigida. Os 2 460 células históricas da coluna
// `estouro_h` foram medidos contra `window.innerWidth`, que neste chrome se dilata até ao conteúdo e por isso
// nunca dá verdadeiro — o zero deles não prova nada. Esta peça re-tira o valor só das corridas cujo
// `md5_shell` bate com o ar SERVIDO hoje, com a prédica do produtor, e declara as larguras que não cobre.
// Unidade: célula = (papel × largura), e o que se conta são células com lista de estouro NÃO-VAZIA.
// O produtor (`scripts/ah2-mobile2.mjs:378`) escreve `b.estouro = <rotas com estouro_h true>` e o portão dele
// (mesmo ficheiro, `:411`) exige `[]` — logo a régua desta peça é «a lista tem entrada», que pode divergir.
// Só-leitura: 0 escrita fora do registo, 0 rede com sessão, 0 DDL, 0 deploy.
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const EV = `${REPO}/evidence`;
const SUF = (process.argv[2] || '20-11g').trim();
const OUT = `${EV}/p73-estouro-no-ar-atual-${SUF}.json`;
const OUT_R = OUT.replace(/\.json$/, '-VERMELHO.json');
if (existsSync(OUT) || existsSync(OUT_R)) throw new Error('ABORTA: ' + (existsSync(OUT) ? OUT : OUT_R) + ' existe — re-corra com outro sufixo, nunca por cima');

const md5b = (b) => createHash('md5').update(b).digest('hex');
// A URL do ar lê-se do diário versionado da v136 (disco, porque este fecho ainda não está no índice); a
// regex é a mesma do leitor `p73-cobertura-v136.mjs`, para as duas peças não divergirem no destino.
const DIARIO = readFileSync(`${REPO}/audit-publicacao-v136.json`, 'utf8');

// (1) As larguras e os papéis leem-se do PRODUTOR, não desta linha (mesma convenção de p73-cobertura-v136.mjs).
const DRIVER = readFileSync(`${REPO}/scripts/ah2-m5-driver.mjs`, 'utf8');
const m_larg = /const LARGURAS = \[([^\]]*)\]/.exec(DRIVER);
if (!m_larg) throw new Error('ABORTA: LARGURAS não lidas do condutor — a régua passaria a ser minha');
const LARGURAS = [...m_larg[1].matchAll(/(\d+)/g)].map((x) => parseInt(x[1], 10));
const VARREDURA = readFileSync(`${REPO}/scripts/ah2-varredura.mjs`, 'utf8');
const m_papeis = /const TODOS\s*=\s*\[([^\]]*)\]/.exec(VARREDURA);
if (!m_papeis) throw new Error('ABORTA: enum de papéis não lido da varredura');
const PAPEIS = [...m_papeis[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);

// (2) A prédica do produtor, citada por posição (findIndex) e não dactilografrada.
const dlines = readFileSync(`${REPO}/scripts/ah2-mobile2.mjs`, 'utf8').split('\n');
const linhaEmite = dlines.findIndex((l) => /^\s*b\.estouro = /.test(l)) + 1;
const linhaPortao = dlines.findIndex((l) => /0 estouro horizontal/.test(l)) + 1;
if (!linhaEmite || !linhaPortao) throw new Error('ABORTA: posições da régua não encontradas (emite=' + linhaEmite + ' portao=' + linhaPortao + ')');

// (3) O ar de hoje: o esperado versionado, conferido contra a candidata em disco E contra os bytes servidos.
const ESPERADO = JSON.parse(readFileSync(`${REPO}/worker-deploy-v136-secretaria-de-educacao/esperado-v136.json`, 'utf8'));
const AR_ESPERADO = String(ESPERADO.htmlMd5 || '').toLowerCase();
if (!/^[0-9a-f]{32}$/.test(AR_ESPERADO)) throw new Error('ABORTA: o esperado-v136 não expõe um md5 de shell de 32 hex — li o campo errado: ' + JSON.stringify(Object.keys(ESPERADO)));
const CAND = readFileSync(`${REPO}/bfr-candidata-v136-secretaria-de-educacao/index.html`);
if (md5b(CAND) !== AR_ESPERADO) throw new Error('ABORTA: a candidata em disco não bate com o esperado-v136 — ' + md5b(CAND) + ' != ' + AR_ESPERADO);
const URL_APP = (/https:\/\/[a-z0-9.-]+\.workers\.dev/i.exec(DIARIO) || [])[0];
if (!URL_APP) throw new Error('ABORTA: a URL do ar foi lida do diário da v136 e não veio — nada de a dactilografar');
const servido = await (await fetch(URL_APP + '/', { headers: { 'cache-control': 'no-cache' } })).text();
const AR_SERVIDO = md5b(Buffer.from(servido));
if (AR_SERVIDO !== AR_ESPERADO) throw new Error('ABORTA: o ar servido é ' + AR_SERVIDO + ' e o esperado é ' + AR_ESPERADO + ' — re-contar células de um ar que já não é este seria falso');

// (4) A régua, com permitidos medidos e não lembrados: uma célula conta ESTOURO se a lista do produtor tiver
// entrada. O fixture abaixo prova que a função discrimina; sem isto, um 0 em toda a coluna é indistinguível
// de uma sonda cega — que é exatamente o defeito que a PEN-35 descreve.
const tem_estouro = (banda) => Array.isArray(banda && banda.estouro) && banda.estouro.length > 0;
const FIX_COM = { estouro: ['rota-de-prova'] }, FIX_SEM = { estouro: [] };
if (tem_estouro(FIX_COM) !== true || tem_estouro(FIX_SEM) !== false) throw new Error('ABORTA: a régua não discrimina no fixture — nenhum veredicto pode ser emitido');
const FIX_LISTA_AUSENTE = tem_estouro({});
if (FIX_LISTA_AUSENTE !== false) throw new Error('ABORTA: banda sem a chave `estouro` foi contada como estouro — isso é a classe do defeito de 19/11 (chave ausente ≠ medida)');

const ficheiros = readdirSync(EV).filter((f) => /^ah2-mobile2-m5-.*\.json$/.test(f)).sort();
const por_ar = {};
const cobertas = {}, com_estouro = {}, sem_chave = {}, zeradas = {};
for (const f of ficheiros) {
  let j; try { j = JSON.parse(readFileSync(`${EV}/${f}`, 'utf8')); } catch { continue; }
  if (j.ciclo !== 'AH-7b-MOBILE') continue;
  const q = String(j.md5_shell || '(sem-md5)');
  por_ar[q] = por_ar[q] || { ficheiros: 0, celulas_com_lista: 0, celulas_com_estouro: 0, celulas_sem_a_chave: 0, papeis: new Set(), he_o_ar: q === AR_SERVIDO };
  por_ar[q].ficheiros++; por_ar[q].papeis.add(j.papel);
  // A contagem do estouro faz-se para TODOS os ars, antes de qualquer filtro: uma coluna que só é preenchida
  // no ar de hoje é o mesmo 0 estrutural que p73-cobertura-v136.mjs teve de confessar (coerencia depois do
  // continue). O que é do ar atual é o MAPA por célula, porque só esse entra na grelha de fecho.
  for (const [w, b] of Object.entries(j.bandas || {})) {
    const ww = parseInt(w, 10);
    if (!LARGURAS.includes(ww)) continue;
    if (!('estouro' in b)) { por_ar[q].celulas_sem_a_chave++; if (q === AR_SERVIDO) sem_chave[j.papel + '@' + ww] = (sem_chave[j.papel + '@' + ww] || 0) + 1; continue; }
    por_ar[q].celulas_com_lista++;
    if (tem_estouro(b)) por_ar[q].celulas_com_estouro++;
    if (q !== AR_SERVIDO) continue;
    const chave = j.papel + '@' + ww;
    cobertas[chave] = (cobertas[chave] || 0) + 1;
    if (tem_estouro(b)) (com_estouro[chave] = com_estouro[chave] || []).push({ ficheiro: f, rotas: b.estouro });
    else zeradas[chave] = (zeradas[chave] || 0) + 1;
  }
}
const esperadas = PAPEIS.length * LARGURAS.length;
const deste_ar = por_ar[AR_SERVIDO] || { ficheiros: 0, celulas_com_lista: 0, celulas_com_estouro: 0, celulas_sem_a_chave: 0 };
const out = {
  programa: 'scripts/p73-estouro-no-ar-atual.mjs', em: new Date().toISOString(),
  pergunta: 'a coluna estouro_h do ar atual dá estouro em alguma célula? — a versão histórica comparava com innerWidth e por isso não podia dar',
  ar: { url: URL_APP + '/', md5_esperado_de: 'worker-deploy-v136-secretaria-de-educacao/esperado-v136.json', md5: AR_ESPERADO, igual_ao_servido: true },
  leitura_do_produtor: { linha_onde_o_emissor_escreve_a_lista: linhaEmite, emissor: dlines[linhaEmite - 1].trim(), linha_do_portao_do_produtor: linhaPortao, portao: dlines[linhaPortao - 1].trim(), larguras_do_condutor: LARGURAS, papeis_da_varredura: PAPEIS.length },
  unidade: 'celula = (papel × largura); um ficheiro que mede a mesma célula conta uma vez; lista VAZIA = medido sem estouro; chave AUSENTE = não medido (contado à parte, nunca somado ao verde)',
  fixture: { com_lista_nao_vazia_dao_estouro: true, lista_vazia_da_o_zero: true, chave_ausente_nao_conta_como_estouro: true },
  ficheiros_m5_na_disco: ficheiros.length,
  por_ar: Object.fromEntries(Object.entries(por_ar).map(([k, v]) => [k.slice(0, 12), { ficheiros: v.ficheiros, papeis: v.papeis.size, celulas_com_lista: v.celulas_com_lista, celulas_com_estouro: v.celulas_com_estouro, celulas_sem_a_chave: v.celulas_sem_a_chave, he_o_ar_atual: v.he_o_ar }])),
  grelha_declarada_do_produtor: PAPEIS.length + ' papeis x ' + LARGURAS.length + ' larguras = ' + esperadas + ' celulas',
  cobertas_neste_ar: Object.keys(cobertas).length,
  distintas_sem_lista_de_estouro: Object.keys(sem_chave).length,
  distintas_com_lista_vazia: Object.keys(zeradas).length,
  com_estouro: Object.keys(com_estouro).length,
  rotas_em_estouro: com_estouro,
  ocorrencias_neste_ar: { ficheiros: deste_ar.ficheiros, com_lista: deste_ar.celulas_com_lista, com_estouro: deste_ar.celulas_com_estouro, sem_a_chave: deste_ar.celulas_sem_a_chave }
};
out.veredito = out.com_estouro > 0 ? 'HA_ESTOURO_NO_AR'
  : out.cobertas_neste_ar === esperadas && out.distintas_sem_lista_de_estouro === 0 ? 'P35_ESTOURO_MEDIDO_SEM_ESTOURO_NO_AR'
  : 'P35_COBERTURA_PARCIAL_DO_ESTOURO';
out.larguras_fora_da_grelha_que_esta_peca_nao_cobre = ['1280', '1440', '1920 — esta peça só lê a família M5 (larguras móveis); o valor desktop do mesmo ar foi medido a 20/11 por scripts/sm25-cobertura-desktop.mjs (45 células, 0 estouro) e corroborado a 21/11 por scripts/p74-pen35-desktop-resumo.mjs (45/45, 0 estouro) — as passadas de 17/11 continuam sem valor probatório'];
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log('ar=' + AR_ESPERADO + ' · ' + out.grelha_declarada_do_produtor + ' · ficheiros m5 em disco=' + ficheiros.length + ' · emissor:' + out.leitura_do_produtor.linha_onde_o_emissor_escreve_a_lista + ' | portao:' + out.leitura_do_produtor.linha_do_portao_do_produtor);
for (const [k, v] of Object.entries(out.por_ar)) console.log('  ar ' + k + ': fich=' + v.ficheiros + ' papeis=' + v.papeis + ' com_lista=' + v.celulas_com_lista + ' com_estouro=' + v.celulas_com_estouro + ' sem_a_chave=' + v.celulas_sem_a_chave + (v.he_o_ar_atual ? '  <= AR ATUAL' : ''));
console.log('celulas distintas cobertas neste ar=' + out.cobertas_neste_ar + '/' + out.grelha_declarada_do_produtor.split(' = ')[1].replace(' celulas', '') + ' · lista vazia=' + out.distintas_com_lista_vazia + ' · chave ausente=' + out.distintas_sem_lista_de_estouro + ' · com estouro=' + out.com_estouro);
console.log('ocorrencias deste ar: ' + JSON.stringify(out.ocorrencias_neste_ar) + ' · rotas em estouro: ' + JSON.stringify(out.rotas_em_estouro));
console.log(out.veredito);
console.log('artefacto: ' + OUT);
