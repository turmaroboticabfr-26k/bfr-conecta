#!/usr/bin/env node
// P74-DIFF — o `REVOKE ... FROM PUBLIC` é cego ao papel, por isso a pergunta depois de aplicar a PEN-44 não é
// «o anon perdeu?» (isso o preflight já afirma) mas «PERDEU MAIS ALGUEM?». Este leitor compara dois registos
// VERSIONADOS — o preflight em modo candidata tirado antes de escrever e o mesmo preflight em modo reversão
// tirado depois — nome a nome, e acrescenta um terceiro canal independente: a sonda anónima por HTTP, cujo
// espelho de estados tem de bater com o catálogo. Nada aqui consulta o banco: as três fontes são ficheiros.
// Só-leitura: 0 SQL, 0 escrita fora do registo, 0 browser.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const EV = `${REPO}/evidence`;
const SUF = (process.argv[2] || '21-11a').trim();
const OUT = `${EV}/p74-pen44-diff-antes-depois-${SUF}.json`;
const OUT_R = OUT.replace(/\.json$/, '-VERMELHO.json');
if (existsSync(OUT) || existsSync(OUT_R)) throw new Error('ABORTA: ' + (existsSync(OUT) ? OUT : OUT_R) + ' existe — re-corra com outro sufixo, nunca por cima');

// (1) Os três registos, com o papel de cada um lido do próprio ficheiro e não da minha memória.
const ANTES = JSON.parse(readFileSync(`${EV}/p74-pen44-preflight-candidata-21-11.json`, 'utf8'));
const DEPOIS = JSON.parse(readFileSync(`${EV}/p74-pen44-preflight-reversao-21-11-21-11-pos-pen44.json`, 'utf8'));
const SONDA_ANTES = JSON.parse(readFileSync(`${EV}/p74-pen44-sonda-anonima-21-11.json`, 'utf8'));
const SONDA_DEPOIS = JSON.parse(readFileSync(`${EV}/p74-pen44-sonda-anonima-21-11-21-11-pos.json`, 'utf8'));

// (2) Régua de ACL: o texto do catalogo e `papel=privilgios/grantor`, com a entrada de PUBLIC no grantee VAZIO.
// Um papel que so tinha grau por PUBLIC aparece como `=X/postgres`; um papel preservado passa a nominal.
const leAcl = (s) => {
  const out = {};
  for (const parte of String(s || '').split('|')) {
    const m = /^([^=]*)=([A-Za-z]*)\/(.*)$/.exec(parte.trim());
    if (!m) continue;
    out[m[1] === '' ? 'PUBLIC' : m[1]] = m[2];
  }
  return out;
};
const comX = (s) => Object.entries(leAcl(s)).filter(([, p]) => p.includes('X')).map(([r]) => r).sort();
const NAOMES = (a) => a.filter((r) => r !== 'PUBLIC' && r !== 'anon');
const diffPerda = (antes, depois) => comX(antes).filter((r) => !comX(depois).includes(r));
const diffGanho = (antes, depois) => comX(depois).filter((r) => !comX(antes).includes(r));
const perde_de_verdade = (antes, depois) => diffPerda(antes, depois).filter((r) => r !== 'PUBLIC' && r !== 'anon');
// Fixture obrigatorio: a regua tem de ver a perda de um papel nominal E nao a confundir com a saida de PUBLIC,
// que e precisamente o que a peca faz de proposito. Sem isto, o verde seria cego na unica direcao que importa.
const FIX_PERDA = perde_de_verdade('authenticated=X/postgres|=X/postgres', 'postgres=X/postgres');
const FIX_NADA = perde_de_verdade('authenticated=X/postgres|=X/postgres', 'postgres=X/postgres|authenticated=X/postgres');
const FIX_PUBLIC_SAI = diffPerda('authenticated=X/postgres|=X/postgres', 'postgres=X/postgres|authenticated=X/postgres');
const FIX_GANHO = diffGanho('postgres=X/postgres|=X/postgres', 'postgres=X/postgres|pgbouncer=X/postgres');
if (FIX_PERDA.join(',') !== 'authenticated' || FIX_NADA.length !== 0 || FIX_PUBLIC_SAI.join(',') !== 'PUBLIC' || !FIX_GANHO.includes('pgbouncer')) throw new Error('ABORTA: a regua de ACL nao discrimina nos fixtures — nenhum veredicto pode ser emitido');

const papeisPreservados = [...new Set(DEPOIS.nomes.flatMap((n) => n.preserva || []))].sort();
const nomesAntes = ANTES.nomes.map((n) => n.nome).sort();
const nomesDepois = DEPOIS.nomes.map((n) => n.nome).sort();
const porNomeDepois = Object.fromEntries(DEPOIS.nomes.map((n) => [n.nome + '/' + n.args_no_sql, n]));

const perdas = [], ganhosFora = [], anonNaoPerdeu = [], preservadosSemGrau = [];
for (const n of ANTES.nomes) {
  const chave = n.nome + '/' + n.args_no_sql;
  const d = porNomeDepois[chave];
  if (!d) { perdas.push(`${chave}:AUSENTE_DEPOIS`); continue; }
  const perderam = diffPerda(n.acl, d.acl).filter((r) => r !== 'PUBLIC' && r !== 'anon');
  if (perderam.length) perdas.push(`${chave}=${perderam.join('+')}`);
  const ganharam = diffGanho(n.acl, d.acl).filter((r) => r !== 'PUBLIC' && r !== 'anon');
  const ja_tinha_pelo_public = n.estado.public_X === true;
  for (const r of ganharam) if (!papeisPreservados.includes(r) || !ja_tinha_pelo_public) ganhosFora.push(`${chave}:${r}`);
  if (d.anon_pode_hoje !== 'false') anonNaoPerdeu.push(chave);
  for (const p of (n.preserva || [])) if ((d.hoje_dos_preservados || {})[p] !== true) preservadosSemGrau.push(`${chave}:${p}`);
}

// (3) O terceiro canal: o que o anon recebeu por HTTP antes e depois, nos mesmos nomes.
const estados = (j) => Object.fromEntries((j.chamadas_anonimas_sem_argumentos || []).map((x) => [x.nome, x.status]));
const SA = estados(SONDA_ANTES), SD = estados(SONDA_DEPOIS);
const perdeu2xx = Object.keys(SA).filter((k) => String(SA[k]).startsWith('2'));
const ainda2xx = perdeu2xx.filter((k) => String(SD[k]).startsWith('2'));
const contagens = (e) => Object.values(e).reduce((a, s) => { a[String(s)] = (a[String(s)] || 0) + 1; return a; }, {});

const falhas = []; const portoes = [];
const g = (nome, cond, detalhe) => { portoes.push({ nome, verde: cond === true, detalhe }); if (cond !== true) falhas.push(`${nome} | ${JSON.stringify(detalhe).slice(0, 400)}`); console.log(`  portao ${nome}: ${cond === true ? 'VERDE' : 'VERMELHO'}`); };
const FicheirosFontes = ['p74-pen44-preflight-candidata-21-11.json', 'p74-pen44-preflight-reversao-21-11-21-11-pos-pen44.json', 'p74-pen44-sonda-anonima-21-11.json', 'p74-pen44-sonda-anonima-21-11-21-11-pos.json'];
const fora_do_indice = FicheirosFontes.filter((f) => spawnSync('git', ['-C', REPO, 'ls-files', '--error-unmatch', 'evidence/' + f], { encoding: 'utf8' }).status !== 0);
g('os_quatro_registos_de_partida_estao_no_indice_e_nao_so_em_disco', fora_do_indice.length === 0, fora_do_indice);
g('o_antes_e_candidata_o_depois_e_reversao_e_o_veredicto_de_saida_e_verde', ANTES.modo === 'candidata' && DEPOIS.modo === 'reversao' && /VERDE_REVERSAO/.test(String(DEPOIS.veredito)), { antes_modo: ANTES.modo, depois_modo: DEPOIS.modo, depois_veredito: DEPOIS.veredito });
g('o_antes_e_anterior_ao_depois_em_milissegundos', Date.parse(ANTES.em) < Date.parse(DEPOIS.em) && Date.parse(SONDA_ANTES.em) < Date.parse(SONDA_DEPOIS.em), { antes: ANTES.em, depois: DEPOIS.em, sonda_antes: SONDA_ANTES.em, sonda_depois: SONDA_DEPOIS.em });
g('os_dois_registos_cobrem_os_mesmos_nomes_do_alvo', nomesAntes.join(',') === nomesDepois.join(','), { antes: nomesAntes.length, depois: nomesDepois.length, diferenca: nomesAntes.filter((n) => !nomesDepois.includes(n)) });
g('nenhum_papel_com_nome_perde_grau_so_anon_e_public_perdem', perdas.length === 0, perdas);
g('nenhum_grau_novo_aparece_fora_dos_papeis_preservados_que_ja_o_tinham_por_public', ganhosFora.length === 0, ganhosFora);
g('o_anon_deixa_de_poder_executar_todos_os_nomes_do_alvo', anonNaoPerdeu.length === 0, { nomes_onde_anon_ainda_pode: anonNaoPerdeu, total_alvo: DEPOIS.nomes.length });
g('cada_papel_preservado_continua_a_executar_cada_nome', preservadosSemGrau.length === 0, preservadosSemGrau.slice(0, 20));
g('o_http_confirma_o_catalogo_os_200_de_antes_deixaram_de_ser_200', ainda2xx.length === 0 && perdeu2xx.length > 0, { antes_2xx: perdeu2xx.length, ainda_2xx_depois: ainda2xx, estados_antes: contagens(SA), estados_depois: contagens(SD) });

const out = {
  programa: 'scripts/p74-pen44-diff-antes-depois.mjs', em: new Date().toISOString(),
  pergunta: 'depois de aplicar a PEN-44, perdeu grau alguem que nao o anon e o PUBLIC?',
  metodo: 'compara nome a nome as ACLs de dois registos versionados do mesmo preflight (candidata antes de escrever, reversao depois) e acrescenta a distribuicao de estados HTTP da sonda anonima, tirada duas vezes. Nada consulta o banco.',
  fontes: { antes: 'evidence/p74-pen44-preflight-candidata-21-11.json', depois: 'evidence/p74-pen44-preflight-reversao-21-11-21-11-pos-pen44.json', sonda_antes: 'evidence/p74-pen44-sonda-anonima-21-11.json', sonda_depois: 'evidence/p74-pen44-sonda-anonima-21-11-21-11-pos.json' },
  fixture: { perde_nome_real: FIX_PERDA, saida_de_public_a_sozinha: FIX_PUBLIC_SAI, nada_perde_quando_preservado: FIX_NADA, ganho_de_preservado: FIX_GANHO },
  alvo: nomesAntes.length, papeis_preservados: papeisPreservados,
  catalogo: { nomes_sem_entrada_public_depois: DEPOIS.nomes.filter((n) => n.estado.public_X === false).length, nomes_com_anon_x_antes: ANTES.nomes.filter((n) => n.estado.anon_X === true).length, nomes_com_anon_x_depois: DEPOIS.nomes.filter((n) => n.estado.anon_X === true).length },
  http_anonimo: { distribuicao_antes: contagens(SA), distribuicao_depois: contagens(SD), nomes_que_eram_2xx: perdeu2xx.length, nomes_que_ainda_sao_2xx: ainda2xx },
  portoes, falhas,
  o_que_este_verde_nao_cobre: 'Nao cobre o que um utilizador autenticado ve em sessao real: as ACLs provam grau por papel, nao resposta de aplicacao. Tambem nao cobre as 30 funcoes que exigem argumentos (404 nos dois lados) alem do grau.',
};
out.veredito = falhas.length === 0 ? `P74_PEN44_DIFF_OK ${portoes.length}/0` : `P74_PEN44_DIFF_VERMELHO ${falhas.length} de ${portoes.length}`;
if (falhas.length) writeFileSync(OUT_R, JSON.stringify(out, null, 2) + '\n'); else writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
for (const f of falhas) console.log('  FALTA ' + f);
console.log(`alvo=${out.alvo} · nomes_sem_entrada_public_depois=${out.catalogo.nomes_sem_entrada_public_depois}/${out.alvo} · anon_x antes=${out.catalogo.nomes_com_anon_x_antes} depois=${out.catalogo.nomes_com_anon_x_depois} · http ${JSON.stringify(out.http_anonimo.distribuicao_antes)} -> ${JSON.stringify(out.http_anonimo.distribuicao_depois)}`);
console.log(`${out.veredito} · registo ${falhas.length ? OUT_R : OUT}`);
process.exit(falhas.length ? 1 : 0);
