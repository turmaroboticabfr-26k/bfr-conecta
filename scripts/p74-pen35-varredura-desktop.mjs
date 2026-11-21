#!/usr/bin/env node
// P74-PEN35-DESKTOP — re-medição das bandas desktop 1280/1440/1920 no ar SERVIDO HOJE, com a régua corrigida.
// Derivado de `scripts/ah2-varredura.mjs` (AH-2-V): mesma régua de estouro (`documentElement.clientWidth`,
// §AI.32 — nunca `window.innerWidth`, que se dilata), mesmos portões por banda, mesmo walk de seções
// declaradas pelo bundle. O que muda e porquê, lido da PEN-35: (1) o ar a que a corrida se amarra é o
// esperado MAIS NOVO em disco (a varredura original cita a v123 e as suas bandas desktop mediram a v123 com
// a régua velha — por isso «continuam por re-medir»); (2) cada filho mede UM papel, recebe a sessão por
// AH2_SESSAO (o mestre nunca é tocado por dois processos) e o teto por AH2_TETO_MS; (3) os artefactos saem
// na família `ah2-p35d-*` com ciclo AH-2-VD, fora do alcance dos leitores AH-2-V e m5; (4) modo condutor
// re-lê a cobertura do disco e só lança o que falta — relançar é idempotente.
// Só-leitura: 0 escrita fora do registo, 0 DDL, 0 deploy, 0 captura de tela (as vistas têm nomes de alunos).
// Uso: condutor — node scripts/p74-pen35-varredura-desktop.mjs [orçamento_ms=520000] [papeis|TODOS] [bandas_por_filho=3]
//      filho    — node scripts/p74-pen35-varredura-desktop.mjs <papel> <bandas csv> <rotulo>
//      offline  — node scripts/p74-pen35-varredura-desktop.mjs --selfteste
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, readdirSync, statSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const REPO = `${DIR}/bfr-conecta`;
const EV = `${REPO}/evidence`;
const REF = 'yyzqoxlkcvqpessypfjo';
const HOST = `https://${REF}.supabase.co`;
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const STORAGE_KEY = `sb-${REF}-auth-token`;
const md5 = (b) => createHash('md5').update(Buffer.from(b)).digest('hex');
const CICLO = 'AH-2-VD';
const ARG1 = (process.argv[2] || '').trim();
const MODO_SELFTESTE = ARG1 === '--selfteste';
// Primeiro argumento numérico = condutor (orçamento); caso contrário é o papel do filho.
const MODO_FILHO = !MODO_SELFTESTE && !/^\d+$/.test(ARG1) && ARG1 !== '';

// ——— leitura do produtor vivo: papéis e bandas nunca dactilografados aqui ———
const SRC_VARREDURA = readFileSync(`${REPO}/scripts/ah2-varredura.mjs`, 'utf8');
const leTODOS = (src) => {
  const m = src.match(/const TODOS\s*=\s*\[([^\]]*)\]/);
  if (!m) throw new Error('ABORTA: enum TODOS não encontrado na varredura');
  const lidos = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
  if (!lidos.length || new Set(lidos).size !== lidos.length) throw new Error('ABORTA: TODOS lido vazio ou com duplicados: ' + JSON.stringify(lidos));
  return lidos;
};
const leBandasDesktop = (src) => {
  const m = src.match(/const TODAS_BANDAS\s*=\s*\[([^\]]*)\]/);
  if (!m) throw new Error('ABORTA: TODAS_BANDAS não encontrado na varredura');
  const todas = [];
  for (const item of m[1].split('},')) {
    const nome = /nome:\s*'([^']+)'/.exec(item);
    const w = /w:\s*(\d+)/.exec(item);
    const h = /h:\s*(\d+)/.exec(item);
    const mob = /mobile:\s*(true|false)/.exec(item);
    if (nome && w && h && mob) todas.push({ nome: nome[1], w: parseInt(w[1], 10), h: parseInt(h[1], 10), mobile: mob[1] === 'true' });
  }
  const pedidas = ['1280', '1440', '1920'];
  const desktop = todas.filter((b) => pedidas.includes(b.nome));
  if (desktop.length !== 3 || desktop.some((b) => b.mobile !== false)) throw new Error('ABORTA: as três bandas desktop não saíram como 1280/1440/1920 mobile:false de TODAS_BANDAS: ' + JSON.stringify(desktop));
  return desktop;
};
const PAPEIS = leTODOS(SRC_VARREDURA);
const BANDAS_DESKTOP = leBandasDesktop(SRC_VARREDURA);

// ——— régua do produtor, citada por posição, com a prova de que não regrediu para a velha ———
// Extração por terminação do literal (`;\n) e não por regex do corpo: o MEDIR tem `})();` internos e um
// padrão de corpo não-guloso corta-o ao meio (defeito da onda 1: o evaluate devolveu a metade da string).
const iniMedir = SRC_VARREDURA.indexOf('const MEDIR = `');
const fimMedir = iniMedir === -1 ? -1 : SRC_VARREDURA.indexOf('`;\n', iniMedir + 1);
if (fimMedir === -1) throw new Error('ABORTA: terminação do literal MEDIR não encontrada na varredura');
const MEDIR = SRC_VARREDURA.slice(iniMedir + 'const MEDIR = `'.length, fimMedir);
if (!/documentElement\?\.clientWidth/.test(MEDIR)) throw new Error('ABORTA: a régua do MEDIR não usa documentElement.clientWidth');
if (/window\.innerWidth/.test(MEDIR)) throw new Error('ABORTA: a régua do MEDIR ainda cita window.innerWidth — o defeito da PEN-35 regressou');
if (!/estouro_h/.test(MEDIR)) throw new Error('ABORTA: o MEDIR extraído não chega à régua do estouro — extração truncada');
if (!MEDIR.trim().endsWith('})()')) throw new Error('ABORTA: o MEDIR extraído não fecha com o fim do literal — extração truncada');

// ——— ar servido hoje: diário de publicação mais novo + esperado mais novo (mesma convenção do condutor m5) ———
const por_versao = (re) => readdirSync(REPO).filter((f) => re.test(f)).sort((a, b) => parseInt(/(\d+)/.exec(a)[1], 10) - parseInt(/(\d+)/.exec(b)[1], 10));
const DIARIO = por_versao(/^audit-publicacao-v\d+\.json$/).slice(-1)[0];
if (!DIARIO) throw new Error('ABORTA: nenhum audit-publicacao-v*.json em ' + REPO);
const URL_LIDA = (/https:\/\/[a-z0-9.-]+\.workers\.dev/i.exec(readFileSync(`${REPO}/${DIARIO}`, 'utf8')) || [])[0] + '/';
// O esperado vem da pasta da MESMA versão do diário mais novo, nunca da pasta mais nova em disco: as
// candidatas v137/v138 existem por publicar e o ar servido é o do último diário (v136).
const V_PUBLICADA = /v(\d+)/.exec(DIARIO)[1];
const PASTA_DEPLOY = por_versao(new RegExp('^worker-deploy-v' + V_PUBLICADA + '(?!\\d)')).slice(-1)[0];
if (!PASTA_DEPLOY) throw new Error('ABORTA: nenhum worker-deploy-v' + V_PUBLICADA + ' para o diário ' + DIARIO + ' — candidata em disco sem diário não é ar publicado');
const FICHEIRO_ESPERADO = readdirSync(`${REPO}/${PASTA_DEPLOY}`).filter((f) => /^esperado-v\d+\.json$/.test(f)).sort((a, b) => parseInt(/v(\d+)/.exec(a)[1], 10) - parseInt(/v(\d+)/.exec(b)[1], 10)).slice(-1)[0];
const ESPERADO_MD5 = String(JSON.parse(readFileSync(`${REPO}/${PASTA_DEPLOY}/${FICHEIRO_ESPERADO}`, 'utf8')).htmlMd5 || '').toLowerCase();

// ——— selfteste offline: réguas puras, 0 rede, 0 chrome ———
if (MODO_SELFTESTE) {
  const casos = [];
  const c = (nome, verde, detalhe) => { casos.push({ nome, verde: !!verde, ...(detalhe ? { detalhe } : {}) }); if (!verde) console.log('VERMELHO ' + nome + ' :: ' + JSON.stringify(detalhe)); };
  c('o_enum_de_papeis_vem_da_varredura_com_15_unicos', PAPEIS.length === 15 && new Set(PAPEIS).size === 15 && PAPEIS.includes('monitor') && PAPEIS.includes('education_supervisor'), { lidos: PAPEIS.length });
  c('as_tres_bandas_desktop_saem_de_TODAS_BANDAS_mobile_false', BANDAS_DESKTOP.length === 3 && BANDAS_DESKTOP.every((b) => b.mobile === false) && BANDAS_DESKTOP.map((b) => b.nome).join(',') === '1280,1440,1920', { bandas: BANDAS_DESKTOP });
  let partiu = false; try { leTODOS('const TODOS = [];'); } catch { partiu = true; }
  c('o_leitor_de_TODOS_dispara_num_enum_vazio', partiu === true, { partiu });
  let partiuB = false; try { leBandasDesktop('const TODAS_BANDAS = [];'); } catch { partiuB = true; }
  c('o_leitor_de_bandas_dispara_sem_as_tres_desktop', partiuB === true, { partiuB });
  const estouroDe = (peca) => Object.entries(peca).filter(([, v]) => v.estouro_h).map(([k]) => k);
  c('a_regua_de_estouro_discrimina_true_de_false_no_fixture', JSON.stringify(estouroDe({ a: { estouro_h: true }, b: { estouro_h: false }, c: { estouro_h: true } })) === JSON.stringify(['a', 'c']), { deu: estouroDe({ a: { estouro_h: true }, b: { estouro_h: false } }) });
  c('o_MEDIR_extraido_chega_ao_fim_do_literal_do_produtor', MEDIR.trim().endsWith('})()') && /estouro_h/.test(MEDIR), { fim: MEDIR.trim().slice(-24) });
  c('o_MEDIR_extraido_tem_a_regua_corrigida_e_nao_a_velha', /documentElement\?\.clientWidth/.test(MEDIR) && !/window\.innerWidth/.test(MEDIR), { clientWidth: /documentElement\?\.clientWidth/.test(MEDIR) });
  const AR = 'aaaa0000';
  const coberturaDe = (ficheiros) => {
    const cobertas = new Set(), travadas = new Map(), erros = new Map();
    const persona_errada = (j, banda) => (j.falhas || []).some((x) => String(x).startsWith(`x/${banda}: sessão do papel reconhecida`));
    for (const j of ficheiros) {
      if (j.ciclo !== CICLO || j.papel !== 'x' || j.md5_shell !== AR) continue;
      const st = j.stages?.x || {};
      for (const banda of BANDAS_DESKTOP.map((b) => b.nome)) {
        const r = st[banda];
        if (!r || !r.peca || r.pela_praga) continue;
        if (persona_errada(j, banda)) continue;
        if (r.erro_boot) { const n = (erros.get(banda) || 0) + 1; erros.set(banda, n); if (n >= 2) travadas.set(banda, r.erro_boot); continue; }
        cobertas.add(banda);
      }
    }
    return { cobertas, travadas };
  };
  const bFake = (banda) => ({ peca: { inicio: { estouro_h: false, painel: { id: 'inicioPanel', c: 9 }, ms: 900 } }, erro_boot: null, pela_praga: null });
  const base = { ciclo: CICLO, papel: 'x', md5_shell: AR, stages: { x: {} } };
  const cov1 = coberturaDe([{ ...base, stages: { x: { 1280: bFake('1280'), 1440: bFake('1440') } } }]);
  c('a_cobertura_conta_banda_medida_e_nao_conta_faltante', cov1.cobertas.size === 2 && !cov1.cobertas.has('1920'), { cov: [...cov1.cobertas] });
  const cov2 = coberturaDe([{ ...base, md5_shell: 'bbbb1111', stages: { x: { 1280: bFake('1280') } } }]);
  c('banda_de_outro_ar_nao_conta', cov2.cobertas.size === 0, { cov: [...cov2.cobertas] });
  const cov3 = coberturaDe([{ ...base, stages: { x: { 1280: { peca: { inicio: { estouro_h: false } }, erro_boot: null, pela_praga: ['inicio'] } } } }]);
  c('banda_cortada_pela_praga_nao_conta_como_coberta', cov3.cobertas.size === 0, { cov: [...cov3.cobertas] });
  const cov4 = coberturaDe([{ ...base, stages: { x: { 1280: { peca: {}, erro_boot: 'boot não completou' } } } }, { ...base, stages: { x: { 1280: { peca: {}, erro_boot: 'boot não completou' } } } }]);
  c('erro_de_boot_duas_vezes_conta_travada_e_nao_coberta', cov4.cobertas.size === 0 && cov4.travadas.has('1280'), { cov: [...cov4.cobertas], travadas: [...cov4.travadas.keys()] });
  const cov5 = coberturaDe([{ ...base, stages: { x: { 1280: { peca: {}, erro_boot: 'boot não completou' } } } }]);
  c('erro_de_boot_uma_vez_ainda_e_por_medir', cov5.cobertas.size === 0 && cov5.travadas.size === 0, { cov: [...cov5.cobertas], travadas: [...cov5.travadas.keys()] });
  const cov6 = coberturaDe([{ ...base, falhas: ['x/1280: sessão do papel reconhecida | dado=director | esperado=true'], stages: { x: { 1280: bFake('1280') } } }]);
  c('celula_com_persona_errada_nao_conta_como_coberta', cov6.cobertas.size === 0 && !cov6.travadas.has('1280'), { cov: [...cov6.cobertas] });
  const cov7 = coberturaDe([{ ...base, falhas: ['x/1280: 0 seções cujo conteúdo não assenta em 6 s | dado=[] | esperado=[]'], stages: { x: { 1280: bFake('1280') } } }]);
  c('celula_com_vermelho_de_estabilidade_continua_coberta', cov7.cobertas.size === 1 && cov7.cobertas.has('1280'), { cov: [...cov7.cobertas] });
  const boas = casos.filter((x) => x.verde).length;
  console.log(JSON.stringify({ programa: 'scripts/p74-pen35-varredura-desktop.mjs', selfteste: true, banco: 0, rede: 0, casos, veredito: boas === casos.length ? `P74_PEN35_DESKTOP_SELFTESTE_OK ${casos.length}/0` : `P74_PEN35_DESKTOP_SELFTESTE_VERMELHO ${casos.length - boas}` }, null, 1));
  process.exit(boas === casos.length ? 0 : 1);
}

// ——— condutor: lê a cobertura no disco e lança um filho por papel com as bandas que faltam ———
if (!MODO_FILHO) {
  const BUDGET = parseInt(ARG1 || '520000', 10);
  const PEDIDO = (process.argv[3] || '').trim();
  const MAX_BANDAS = Math.max(1, parseInt(process.argv[4] || '3', 10));
  const BASE_PORTA = parseInt(process.argv[5] || '9381', 10);
  const ALVOS = PEDIDO && PEDIDO !== 'TODOS' ? PEDIDO.split(',').map((x) => x.trim()).filter(Boolean) : PAPEIS;
  for (const p of ALVOS) if (!PAPEIS.includes(p)) throw new Error('ABORTA: papel fora do enum da varredura: ' + p);
  const ficheiro_sessao = (papel) => `${DIR}/ah2-sessao-${papel}.json`;
  const prepara_sessao = (papel) => {
    const mestre = JSON.parse(readFileSync(`${DIR}/ah2-sessions.json`, 'utf8'));
    if (!mestre[papel]) throw new Error('ABORTA: sem sessão de ' + papel + ' no registo mestre');
    const atual = existsSync(ficheiro_sessao(papel)) ? JSON.parse(readFileSync(ficheiro_sessao(papel), 'utf8')) : null;
    if (atual?.[papel]?.refresh_token) { for (const k of Object.keys(mestre)) if (k !== papel && !atual[k]) atual[k] = mestre[k]; writeFileSync(ficheiro_sessao(papel), JSON.stringify(atual, null, 2) + '\n'); return; }
    writeFileSync(ficheiro_sessao(papel), JSON.stringify(mestre, null, 2) + '\n');
  };
  function liberta_porta(porta) {
    const q = spawnSync('netstat', ['-ano', '-p', 'TCP'], { encoding: 'utf8' });
    const pids = new Set();
    for (const linha of String(q.stdout || '').split(/\r?\n/)) {
      if (!new RegExp(':' + porta + '\\s+.*LISTENING', 'i').test(linha)) continue;
      const pid = linha.trim().split(/\s+/).pop();
      if (/^\d+$/.test(pid) && pid !== '0') pids.add(pid);
    }
    for (const p of pids) {
      const dono = spawnSync('powershell', ['-NoProfile', '-Command', `(Get-CimInstance Win32_Process -Filter \"ProcessId=$pid\").Name`], { encoding: 'utf8' });
      const nome = String(dono.stdout || '').trim();
      if (!/chrome/i.test(nome)) { console.log(`PORTA ${porta}: o dono (${pid} ${nome || 'desconhecido'}) não é Chrome nosso — não mato e mudo de porta`); return -1; }
      spawnSync('taskkill', ['/pid', p, '/t', '/f'], { stdio: 'ignore' });
      console.log(`PORTA ${porta}: chrome órfão ${p} parado`);
    }
    return pids.size;
  }
  const shellTxt = await (await fetch(URL_LIDA, { headers: { 'cache-control': 'no-cache' } })).text();
  const AR_MD5 = md5(shellTxt);
  if (AR_MD5 !== ESPERADO_MD5) throw new Error(`ABORTA: o ar servido (${AR_MD5}) não é o esperado de ${PASTA_DEPLOY}/${FICHEIRO_ESPERADO} (${ESPERADO_MD5})`);
  const cobertura = (papel) => {
    const cobertas = new Set(), travadas = new Map(), erros = new Map(); let tentativas = 0;
    // Célula com o portão «sessão do papel reconhecida» vermelho mediu OUTRA persona: o walk não é do papel
    // e não responde à pergunta do estouro — volta a contar como por medir. As outras classes de vermelho
    // (estabilidade, painel vazio) não retiram a célula: a régua do estouro correu na mesma e o agregado
    // reporta-as à parte.
    const persona_errada = (j, banda) => (j.falhas || []).some((x) => String(x).startsWith(`${papel}/${banda}: sessão do papel reconhecida`));
    for (const f of readdirSync(EV)) {
      if (!/^ah2-p35d-/.test(f) || !f.endsWith('.json')) continue;
      let j; try { j = JSON.parse(readFileSync(`${EV}/${f}`, 'utf8')); } catch { continue; }
      if (j.ciclo !== CICLO || j.papel !== papel) continue;
      if (j.md5_shell !== AR_MD5) continue;
      tentativas++;
      const st = j.stages?.[papel] || {};
      for (const banda of BANDAS_DESKTOP.map((b) => b.nome)) {
        const r = st[banda];
        if (!r || !r.peca || r.pela_praga) continue;
        if (persona_errada(j, banda)) continue;
        if (r.erro_boot) { const n = (erros.get(banda) || 0) + 1; erros.set(banda, n); if (n >= 2) travadas.set(banda, r.erro_boot); continue; }
        cobertas.add(banda);
      }
    }
    return { cobertas, travadas, tentativas };
  };
  // Cadeia queimada lê-se do stdout dos filhos (a resposta 400 do GoTrue chega lá escrita). Mas a marca
  // envelhece: um re-login posterior (p73-entrar-por-senha) escreve um artefacto com o papel em `vivas` —
  // a evidência mais NOVA em disco decide, nunca a ordem alfabética.
  const mtime = (f) => { try { return statSync(`${EV}/${f}`).mtimeMs; } catch { return 0; } };
  const cadeia_queimada = (papel) => {
    let queimada_em = 0;
    for (const f of readdirSync(EV)) {
      if (!f.startsWith('ah2-p35d-' + papel + '-') || !f.endsWith('-stdout.txt')) continue;
      try { if (/cadeia de tokens desta conta está queimada/.test(readFileSync(`${EV}/${f}`, 'utf8'))) queimada_em = Math.max(queimada_em, mtime(f)); } catch {}
    }
    if (!queimada_em) return false;
    let viva_em = 0;
    for (const f of readdirSync(EV)) {
      if (!/^p73-entrar-por-senha-.*\.json$/.test(f)) continue;
      try { const j = JSON.parse(readFileSync(`${EV}/${f}`, 'utf8')); if ((j.vivas || []).includes(papel)) viva_em = Math.max(viva_em, mtime(f)); } catch {}
    }
    return viva_em < queimada_em;
  };
  const t0 = Date.now(); let corridos = 0; const queimadas = new Set();
  const resumo = [];
  for (const papel of ALVOS) {
    const { cobertas, travadas, tentativas } = cobertura(papel);
    const por_medir = BANDAS_DESKTOP.filter((b) => !cobertas.has(b.nome) && !travadas.has(b.nome)).map((b) => b.nome);
    const faltam = por_medir.slice(0, MAX_BANDAS);
    resumo.push(`${papel}: ${cobertas.size}/${BANDAS_DESKTOP.length}${travadas.size ? ' + ' + travadas.size + ' travada(s)' : ''}${por_medir.length ? ' faltam ' + por_medir.join('/') + (faltam.length < por_medir.length ? ' (este filho leva ' + faltam.join('/') + ')' : '') : ''}`);
    if (!por_medir.length) continue;
    if (cadeia_queimada(papel)) { console.log(`PULA ${papel}: cadeia de tokens queimada sem re-login mais novo — re-mint exige OK do dono`); queimadas.add(papel); continue; }
    const restante = BUDGET - (Date.now() - t0) - 45000;
    if (restante < 110000) { console.log('ORÇAMENTO INSUFICIENTE para um novo filho — relançar o condutor'); break; }
    const teto = Math.min(430000, restante);
    let porta = BASE_PORTA + PAPEIS.indexOf(papel);
    if (liberta_porta(porta) === -1) porta += PAPEIS.length;
    const rotulo = `p35d-${papel}-${tentativas + 1}`;
    const OUT = `${EV}/ah2-${rotulo}.json`;
    if (existsSync(OUT)) { console.log('ABORTA: ' + OUT + ' existe'); continue; }
    console.log(`\n=== ${rotulo} :: ${papel} @ ${faltam.join(',')} (teto ${Math.round(teto / 1000)} s, porta ${porta}) ===`);
    prepara_sessao(papel);
    const r = spawnSync(process.execPath, [`${REPO}/scripts/p74-pen35-varredura-desktop.mjs`, papel, faltam.join(','), rotulo], { cwd: REPO, encoding: 'utf8', timeout: teto + 150000, maxBuffer: 40 * 1024 * 1024, env: { ...process.env, AH2_TETO_MS: String(teto), AH2_PORT: String(porta), AH2_SESSAO: ficheiro_sessao(papel) } });
    const FICHEIRO_STDOUT = `${EV}/ah2-${rotulo}-stdout.txt`;
    writeFileSync(FICHEIRO_STDOUT, '=== ' + rotulo + ' :: ' + papel + ' @ ' + faltam.join(',') + ' (teto ' + Math.round(teto / 1000) + ' s, porta ' + porta + ', node_exit=' + r.status + (r.error ? ' erro=' + String(r.error.message).slice(0, 120) : '') + ')\n' + String(r.stdout || '') + '\n--- STDERR ---\n' + String(r.stderr || ''));
    console.log('  stdout integral do filho em ' + FICHEIRO_STDOUT.split('/').pop() + ' (' + (r.stdout || '').split('\n').length + ' linhas, node_exit=' + r.status + ')');
    const linhas = String(r.stdout || '').split('\n');
    console.log(linhas.filter((l) => /^(PORTÕES|VERMELHO|[A-Z-]+ \(|  \d+px\/|PAROU:|PRAGA)/.test(l)).slice(-30).join('\n'));
    corridos++;
  }
  const estado = PAPEIS.map((p) => { const { cobertas, travadas } = cobertura(p); return { papel: p, cobertas: [...cobertas].sort((a, b) => a - b), travadas: Object.fromEntries([...travadas.entries()]), queimada: queimadas.has(p) }; });
  console.log(`\nCORRIDOS NESTE LANÇAMENTO: ${corridos}  DECORRIDO: ${Math.round((Date.now() - t0) / 1000)} s`);
  for (const e of estado) console.log(`  ${e.papel}: ${e.cobertas.join('/') || 'nenhuma'}${Object.keys(e.travadas).length ? ' | TRAVADAS ' + Object.keys(e.travadas).join('/') : ''}${e.queimada ? ' | CADEIA QUEIMADA (re-mint com OK)' : ''}`);
  const n_med = estado.reduce((a, e) => a + e.cobertas.length, 0); const n_trav = estado.reduce((a, e) => a + Object.keys(e.travadas).length, 0) + queimadas.size;
  console.log(`CELULAS DESKTOP MEDIDAS: ${n_med}/${PAPEIS.length * BANDAS_DESKTOP.length}  TRAVADAS: ${n_trav}  POR MEDIR: ${PAPEIS.length * BANDAS_DESKTOP.length - n_med - n_trav}`);
  console.log(n_med + n_trav === PAPEIS.length * BANDAS_DESKTOP.length ? (n_trav ? 'P74_PEN35_DESKTOP_GRELHA_COMPLETA_COM_TRAVAS' : 'P74_PEN35_DESKTOP_GRELHA_COMPLETA') : 'P74_PEN35_DESKTOP_PARCIAL — relançar o condutor');
  process.exit(0);
}

// ——— filho: um papel, as bandas pedidas, a régua e os portões da varredura, amarrados ao ar atual ———
const PAPEL = ARG1;
if (!PAPEIS.includes(PAPEL)) throw new Error('ABORTA: papel fora do enum da varredura: ' + PAPEL);
const BANDAS = (process.argv[3] || BANDAS_DESKTOP.map((b) => b.nome).join(',')).split(',').map((x) => x.trim()).filter(Boolean)
  .map((n) => BANDAS_DESKTOP.find((b) => b.nome === n))
  .filter(Boolean);
if (!BANDAS.length) throw new Error('ABORTA: nenhuma das bandas pedidas é desktop 1280/1440/1920');
const ROTULO = process.argv[4] || 'p35d';
const PORT = parseInt(process.env.AH2_PORT || '9352', 10);
const PERFIL = `${DIR}/.ah2-p35d-${ROTULO}-${PORT}`;
const OUT = `${EV}/ah2-${ROTULO}.json`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — rode com outro rótulo');
if (existsSync(PERFIL)) rmSync(PERFIL, { recursive: true, force: true, maxRetries: 5, retryDelay: 400 });
mkdirSync(PERFIL, { recursive: true });
const SESSAO = process.env.AH2_SESSAO || `${DIR}/ah2-sessions.json`;
const TETO = Math.min(455000, Math.max(45000, parseInt(process.env.AH2_TETO_MS || '455000', 10)));
const S = JSON.parse(readFileSync(SESSAO, 'utf8'));
if (!S[PAPEL]?.refresh_token) throw new Error('ABORTA: sem refresh_token de ' + PAPEL + ' em ' + SESSAO);

const shellTxt = await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' } })).text();
const ANON = shellTxt.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["'`]([^"'`]+)["'`]/)[1];
const ini = shellTxt.indexOf('roleSectionAccess = {');
if (ini === -1) throw new Error('ABORTA: roleSectionAccess não está nas bytes servidas — o mapa mudou de forma');
const bloco = shellTxt.slice(ini + 'roleSectionAccess = '.length, shellTxt.indexOf('};', ini) + 1);
const MAPA = {};
for (const m of bloco.matchAll(/'?([a-z_]+)'?\s*:\s*\[([^\]]*)\]/g)) MAPA[m[1]] = [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]);
const exprTraducao = shellTxt.match(/viewRole\s*=\s*[^;]+?role;/)?.[0] || '';
const TRADUCAO = { developer: 'admin', pedagogical: 'teacher', social_work: 'multiprofessional', psychology: 'psychology' };
const secoesDe = (role) => {
  if (role === 'pending') return [];
  const v = TRADUCAO[role] || role;
  if (v === 'admin') return [...new Set([...MAPA.admin, 'psychology', 'multiprofissional'])];
  return MAPA[v] || MAPA.parent;
};

const renova = async (p) => {
  let ultimo = null;
  for (let n = 0; n < 5; n++) {
    try {
      const r = await fetch(`${HOST}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: S[p].refresh_token }), signal: AbortSignal.timeout(45000) });
      const txt = await r.text();
      let j = null; try { j = JSON.parse(txt); } catch { ultimo = `HTTP ${r.status} corpo não-JSON: ${txt.slice(0, 60)}`; await new Promise((rz) => setTimeout(rz, 2000 * (n + 1))); continue; }
      if (!j.access_token) throw new Error(`refresh ${p} HTTP ${r.status} ${JSON.stringify(j).slice(0, 160)} — cadeia de tokens desta conta está queimada, é preciso re-mint`);
      S[p] = { ...S[p], access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at, user: j.user };
      writeFileSync(SESSAO, JSON.stringify(S, null, 2) + '\n');
      if (n > 0) console.log(`  (renova ${p}: ${n + 1}.ª tentativa depois de «${ultimo}»)`);
      return { access_token: j.access_token, token_type: 'bearer', expires_in: j.expires_in, expires_at: j.expires_at, refresh_token: j.refresh_token, user: j.user };
    } catch (err) {
      if (/CADEIA|queimada|invalid_grant/i.test(err.message)) throw err;
      ultimo = err.message; await new Promise((rz) => setTimeout(rz, 2000 * (n + 1)));
    }
  }
  throw new Error(`refresh ${p} falhou 5x (último: ${ultimo})`);
};

const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${PORT}`, `--user-data-dir=${PERFIL}`, '--headless=new', '--window-size=1280,900', '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--ignore-certificate-errors', 'about:blank'], { stdio: 'ignore' });
const abort = (c, m) => {
  try { spawn('taskkill', ['/pid', String(chrome.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {}
  if (m === 'fecho normal') { console.log('PAROU: ' + m); process.exit(c); }
  try { writeFileSync(OUT, JSON.stringify({ ...out, INTERROMPIDA: m, portoes, falhas: falhas.slice(), em_parcial: true }, null, 2) + '\n'); console.log('PARCIAL escrito em ' + OUT.split('/').pop()); }
  catch (e) { try { writeFileSync(OUT, JSON.stringify({ ciclo: CICLO, papel: PAPEL, bandas: BANDAS.map((b) => b.nome), INTERROMPIDA: m, falha_em: String(e.message || e).slice(0, 120), em_parcial: true }, null, 2) + '\n'); } catch {} }
  console.log('PAROU: ' + m); process.exit(c);
};
process.on('unhandledRejection', (e) => abort(7, 'unhandledRejection: ' + String(e?.message || e).slice(0, 170)));
process.on('uncaughtException', (e) => abort(8, 'uncaughtException: ' + String(e?.message || e).slice(0, 170)));
let aperta = false;
setTimeout(() => { aperta = true; console.log(`PRAGA ${TETO} ms: fechar com veredito antes do teto do chamador`); }, TETO);
setTimeout(() => abort(3, `watchdog ${TETO + 90000} ms — a árvore do chrome morre aqui`), TETO + 90000);

let targets = [];
for (let i = 0; i < 60; i++) { try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`, { signal: AbortSignal.timeout(3000) })).json(); if (targets.some((t) => t.type === 'page')) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }
const page = targets.find((t) => t.type === 'page');
if (!page) abort(1, 'sem alvo page no CDP');
let fecho = false;
const ws = new WebSocket(page.webSocketDebuggerUrl);
ws.onclose = () => { if (!fecho) abort(4, 'ws fechado pelo chrome antes do fim'); };
await Promise.race([new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }), new Promise((_, rej) => setTimeout(() => rej(new Error('handshake ws (30 s)')), 30000))]).catch((e) => abort(5, String(e.message || e).slice(0, 120)));
let seq = 0; const pending = new Map();
let consoleErros = [];
let logRede = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); return; }
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') consoleErros.push((m.params.args || []).map((a) => String(a.value ?? a.description ?? '')).join(' ').slice(0, 200));
  if (m.method === 'Runtime.exceptionThrown') consoleErros.push('EXCEPTION: ' + String(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).slice(0, 200));
  if (m.method === 'Log.entryAdded' && m.params.entry?.level === 'error') logRede.push({ fonte: m.params.entry.source, texto: String(m.params.entry.text || '').slice(0, 160), url: String(m.params.entry.url || '').replace(/^https?:\/\/[^/]+/, '').split('?')[0] });
};
const send = (method, params = {}, ms = 25000) => new Promise((res, rej) => {
  const i = ++seq;
  const timer = setTimeout(() => { if (pending.delete(i)) rej(new Error('cdp_timeout ' + method + ' ' + ms + 'ms')); }, ms);
  pending.set(i, { res: (v) => { clearTimeout(timer); res(v); }, rej: (e) => { clearTimeout(timer); rej(e); } });
  try { ws.send(JSON.stringify({ id: i, method, params })); } catch (e) { clearTimeout(timer); rej(e); }
});
const navega = async (url, tentativas = 3) => {
  for (let n = 1; n <= tentativas; n++) {
    const t0 = Date.now();
    try { await send('Page.navigate', { url }, 25000); return { tentativas: n, ms: Date.now() - t0, ok: true }; }
    catch (e) {
      if (!/cdp_timeout/.test(String(e && e.message))) throw e;
      console.log(`  Page.navigate sem resposta (${n}/${tentativas}) — ${e.message}`);
      await send('Page.stopLoading', {}, 8000).catch(() => {});
      await new Promise((r) => setTimeout(r, 2000 * n));
    }
  }
  return { tentativas, ok: false, falha: 'nenhuma resposta a Page.navigate em ' + tentativas + ' tentativas' };
};
const transit = (m) => /navigated or closed|target closed|not attached|Cannot find context/i.test(String(m || ''));
const evalJS = async (e, tentativas = 4) => {
  for (let n = 0; n < tentativas; n++) {
    try {
      const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error('eval: ' + String(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 300));
      return r.result?.value;
    } catch (err) {
      if (/cdp_timeout/.test(String(err.message))) { perdidas++; return null; }
      if (transit(err.message) && n < tentativas - 1) { await new Promise((r) => setTimeout(r, 800)); continue; }
      if (transit(err.message)) { perdidas++; return null; }
      throw err;
    }
  }
};
let perdidas = 0;
const waitFor = async (e, ms = 90000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { let v = false; try { v = await evalJS(e); } catch {} if (v) return Date.now() - t0; await new Promise((r) => setTimeout(r, 400)); } throw new Error('waitFor: ' + e.slice(0, 120)); };

const out = { ciclo: CICLO, em: new Date().toISOString(), papel: PAPEL, bandas: BANDAS.map((b) => b.nome), tetos: { praga_ms: TETO, watchdog_ms: TETO + 90000, estabilizacao_ms: 6000, cdp_timeout_ms: 25000 }, url: URL_APP, md5_shell: md5(shellTxt), mapa_declarado: Object.fromEntries(Object.entries(MAPA).map(([k, v]) => [k, v.length])), traducao_lida_do_bundle: exprTraducao.slice(0, 220), stages: {} };
const falhas = []; let portoes = 0;
const gate = (n, d, e) => { portoes++; const ok = JSON.stringify(d) === JSON.stringify(e); if (!ok) falhas.push(`${n} | dado=${JSON.stringify(d)} | esperado=${JSON.stringify(e)}`); console.log(`${ok ? 'VERDE' : 'VERMELHO'}  ${n}`); return ok; };

await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable'); await send('Page.bringToFront');
const relevantes = () => consoleErros.filter((t) => !/favicon|net::ERR_(404|503)|Google API|installTrigger|Service-Worker|Failed to load resource|WebSocket|chunkloaderror/i.test(t));
gate('o ar varrido é o esperado mais novo em disco (a régua da v123 não serve a esta corrida)', md5(shellTxt), ESPERADO_MD5);
gate('mapa declarado lido do bundle tem as 14 chaves', Object.keys(MAPA).length, 14);
gate('a tradução de rótulos está no bundle (developer/pedagogical/social_work)', ['developer', 'pedagogical', 'social_work'].every((r) => exprTraducao.includes(r)), true);
gate('secretary declarado = as 11 do ciclo AH-1 (duas fontes batem)', MAPA.secretary, ['inicio', 'secretaria', 'comunicados', 'escola-historia', 'notificacoes', 'conteudos', 'comunicacao', 'chat-interno', 'coordenacao-chat', 'jogos-escolares', 'fotos']);
gate('todas as seções declaradas são rótulos não vazios', Object.values(MAPA).flat().filter((s) => typeof s !== 'string' || !s).length, 0);

const declaradas = secoesDe(PAPEL);
out.stages[PAPEL] = { declaradas: declaradas.length, secoes: declaradas };
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
await navega(URL_APP);
await waitFor("!!document.getElementById('loginScreen')", 60000);
for (const banda of BANDAS) {
  if (aperta) { (out.faltaram = out.faltaram || []).push(`${PAPEL}/${banda.nome}`); continue; }
  const t0_banda = Date.now();
  const sessao = await renova(PAPEL);
  const carimbo = { expira_em_s: sessao.expires_at - Math.floor(Date.now() / 1000), acesso_md5_8: md5(sessao.access_token).slice(0, 8) };
  out.stages[PAPEL]['injecao_' + banda.nome] = carimbo;
  await evalJS(`localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, JSON.stringify(${JSON.stringify(sessao)}))`);
  consoleErros = []; logRede = [];
  await send('Emulation.setDeviceMetricsOverride', { width: banda.w, height: banda.h, deviceScaleFactor: 1, mobile: banda.mobile });
  const nav = await navega(URL_APP);
  let ms_ready = null, erro_boot = null;
  const PRONTO = `document.getElementById('appShell')?.classList.contains('ready') || /Aguarde a aprova|ainda está sendo preparado/.test(document.body?.innerText || '')`;
  if (!nav.ok) erro_boot = 'a própria navegação não respondeu: ' + nav.falha + ' (beirada, não app)';
  else try { ms_ready = await waitFor(PRONTO, 75000); } catch (e) { erro_boot = String(e.message).slice(0, 120); }
  const papelReal = await evalJS(`window.BFR_CURRENT_PROFILE?.role ?? null`);
  if (papelReal === null && !erro_boot) erro_boot = 'o browser não respondeu ao Runtime.evaluate em 25 s (main thread ocupado)';
  const estado = (await evalJS(`({ entrou: !!document.getElementById('appShell')?.classList.contains('ready'), aviso_pendencia: /Aguarde a aprova|ainda está sendo preparado/.test(document.body?.innerText || ''), login_visivel: !!(document.getElementById('loginScreen')?.offsetWidth || document.getElementById('loginScreen')?.offsetHeight), nav_visiveis: Array.from(document.querySelectorAll('.sidebar .nav-item[data-section], .mobile-more-option[data-section], button[data-section]')).filter(b => !b.hasAttribute('data-teacher-nav-tab') && (b.offsetWidth || b.offsetHeight)).length })`) || { entrou: null, aviso_pendencia: null, login_visivel: null, nav_visiveis: null });
  const r = { nav, ms_ready, erro_boot, estado, papel_da_sessao: papelReal, botoes_no_dom: await evalJS(`[...new Set(Array.from(document.querySelectorAll('button[data-section]')).filter(b=>!b.hasAttribute('data-teacher-nav-tab')).map(b=>b.dataset.section))].length`), peca: {}, sem_botao: [] };
  if (erro_boot) r.pula_secoes = 'boot não completou — nada para medir';
  for (const s of erro_boot ? [] : declaradas) {
    if (aperta) { r.pela_praga = (r.pela_praga || []).concat(s); break; }
    const tinhaBotao = await evalJS(`!!document.querySelector('button[data-section="${s}"]')`);
    if (tinhaBotao === null) { (r.medicoes_perdidas = r.medicoes_perdidas || []).push(s + ':browser sem resposta'); console.log(`  ${PAPEL}/${banda.nome}/${s}: BROWSER SEM RESPOSTA — não sei se há botão`); continue; }
    if (!tinhaBotao) { r.sem_botao.push(s); continue; }
    const viewAntes = await evalJS(`window.BFR_APP_RUNTIME?.activeView ?? null`);
    await evalJS(`(() => { const m = document.querySelector('[data-mobile-more]'); if (m && m.getAttribute('aria-expanded') !== 'true') m.click(); const b = document.querySelector('button[data-section="${s}"]'); b && b.click(); })()`);
    const m = await evalJS(MEDIR);
    if (!m) { (r.medicoes_perdidas = r.medicoes_perdidas || []).push(s); console.log(`  ${PAPEL}/${banda.nome}/${s}: SEM MEDIÇÃO (evaluate não devolveu — navegação ou context perdido)`); continue; }
    m.view_antes = viewAntes;
    r.peca[s] = m;
    if (m.view_apos && viewAntes && m.view_apos !== viewAntes) {
      (r.trocas_de_persona = r.trocas_de_persona || []).push({ secao: s, de: viewAntes, para: m.view_apos, papel_apos: m.papel_apos });
      await evalJS(`window.BFR_APP_RUNTIME?.setRole(${JSON.stringify(viewAntes)})`);
      await evalJS(`new Promise(rz => setTimeout(rz, 800))`);
      m.view_reposta = await evalJS(`window.BFR_APP_RUNTIME?.activeView ?? null`);
      if (m.view_reposta !== viewAntes) (r.restauros_falhados = r.restauros_falhados || []).push({ secao: s, ficou_em: m.view_reposta });
    }
    if (m.seccao_ativa && m.seccao_ativa !== s && m.botao_attivo !== s) (r.sem_navegacao = r.sem_navegacao || []).push({ secao: s, ativa: m.seccao_ativa, painel: m.painel.id });
    console.log(`  ${PAPEL}/${banda.nome}/${s}: ${m.painel.c > 0 ? m.painel.id + ' ' + m.painel.c + 'c' : 'PAINEL VAZIO'} ctl=${m.controles} tap<${m.tap} fonte<${m.fonte} ${m.ms}ms${m.nao_estabilizou ? ' NAO-ESTABILIZOU' : ''}${m.estouro_h ? ' ESTOURO-H' : ''}`);
  }
  r.erros_console = relevantes().slice(0, 8);
  r.erros_brutos = consoleErros.length;
  r.log_rede_erros = logRede.length;
  r.log_rede_amostra = logRede.slice(0, 6);
  r.falhas_api_rede = logRede.filter((x) => /\/auth\/|\/rest\//.test(x.url) || /err_(timed_out|connection|name_not_resolved|internet)/i.test(x.texto)).slice(0, 6);
  r.erros_brutos_amostra = consoleErros.slice(0, 8);
  r.n_erros = relevantes().length;
  r.painel_vazio = Object.entries(r.peca).filter(([, v]) => v.painel.c === 0).map(([k]) => k);
  r.estouro = Object.entries(r.peca).filter(([, v]) => v.estouro_h).map(([k]) => k);
  r.tap_total = Object.values(r.peca).reduce((a, v) => a + v.tap, 0);
  r.fonte_total = Object.values(r.peca).reduce((a, v) => a + v.fonte, 0);
  r.abertas = Object.keys(r.peca).length;
  const instaveis = Object.entries(r.peca).filter(([, v]) => v.nao_estabilizou).map(([k, v]) => k + '@' + v.ms + 'ms');
  r.instaveis = instaveis;
  r.ms_max = Object.values(r.peca).reduce((a, v) => Math.max(a, v.ms), 0);
  r.ms_de_inicio = r.peca.inicio ? r.peca.inicio.ms : null;
  r.seg_banda = Math.round((Date.now() - t0_banda) / 100) / 10;
  if (r.pela_praga) (out.faltaram = out.faltaram || []).push(`${PAPEL}/${banda.nome}: walk parado em ${r.pela_praga[0]}`);
  out.stages[PAPEL][banda.nome] = r;
  gate(`${PAPEL}/${banda.nome}: sessão do papel reconhecida`, papelReal === PAPEL && !erro_boot, true);
  gate(`${PAPEL}/${banda.nome}: 0 erros de console de aplicação`, r.n_erros, 0);
  gate(`${PAPEL}/${banda.nome}: 0 medições perdidas por navegação`, (r.medicoes_perdidas || []).length, 0);
  gate(`${PAPEL}/${banda.nome}: 0 falhas de rede em /auth/ ou /rest/`, r.falhas_api_rede, []);
  if (PAPEL === 'pending') {
    gate(`${PAPEL}/${banda.nome}: barreira de pendência visível, sem entrar mudo`, estado.aviso_pendencia && !estado.entrou && estado.login_visivel, true);
    gate(`${PAPEL}/${banda.nome}: nenhuma seção declarada (nada exposto antes da aprovação)`, declaradas.length, 0);
  } else if (erro_boot) {
    gate(`${PAPEL}/${banda.nome}: o registo diz que o boot não completou`, r.pula_secoes, 'boot não completou — nada para medir');
  } else {
    gate(`${PAPEL}/${banda.nome}: entrou no shell`, estado.entrou, true);
    gate(`${PAPEL}/${banda.nome}: 0 painéis vazios entre as ${Object.keys(r.peca).length} seções abertas`, r.painel_vazio, []);
    gate(`${PAPEL}/${banda.nome}: 0 estouro horizontal`, r.estouro, []);
    gate(`${PAPEL}/${banda.nome}: toda a troca de persona foi desfeita pela API do app`, (r.restauros_falhados || []).length, 0);
    gate(`${PAPEL}/${banda.nome}: 0 seções cujo conteúdo não assenta em 6 s`, r.instaveis, []);
  }
  writeFileSync(OUT, JSON.stringify({ ...out, portoes, falhas: falhas.slice() }, null, 2) + '\n');
}
await evalJS(`localStorage.removeItem(${JSON.stringify(STORAGE_KEY)})`);
out.portoes = portoes; out.falhas = falhas;
out.medido = { papeis: 1, bandas: Object.keys(out.stages[PAPEL]).filter((k) => out.stages[PAPEL][k] && out.stages[PAPEL][k].peca).length, banda_nomes: BANDAS.map((b) => b.nome), paineis_abertos: Object.values(out.stages[PAPEL]).filter((r) => r && r.peca).reduce((a, r) => a + (r.abertas || 0), 0) };
out.medido.completa = !(out.faltaram || []).length;
out.veredito = (falhas.length ? 'AH2_VARREDURA_DESKTOP_COM_DEFEITOS' : (out.medido.completa ? 'AH2_VARREDURA_DESKTOP_LIMPA' : 'AH2_VARREDURA_DESKTOP_PARCIAL'));
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`\nPORTÕES: ${portoes}  FALHAS: ${falhas.length}  painéis: ${out.medido.paineis_abertos}  completa: ${out.medido.completa}`);
if ((out.faltaram || []).length) console.log('  NÃO CORRIDO NESTA CHAMADA: ' + out.faltaram.join(', '));
falhas.forEach((f) => console.log('  VERMELHO: ' + f));
console.log(out.veredito + ` (${PAPEL})`);
fecho = true;
abort(falhas.length ? 1 : 0, 'fecho normal');
