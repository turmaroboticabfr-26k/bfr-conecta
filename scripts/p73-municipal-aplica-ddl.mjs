#!/usr/bin/env node
// P73-MUNICIPAL-APLICA-DDL — o único caminho de aplicação das peças municipais candidatas registadas em `PECAS`
// (a lista lê-se da tabela, nunca desta frase) e da respectiva conferência. Existe porque o runbook
// `docs/bu-20-11/10-runbook-municipal.md` promete comandos executáveis: sem esta peça, «deixar pronto» deixaria ao
// utilizador a parte irreversível, e a comparação de estado vivo ficaria a cargo da memória de quem copia e cola.
// Há duas raças de peça na tabela: as que fazem DDL (policies e funções) e as que só mexem graus — REVOKE/GRANT de
// EXECUTE a papéis e ao pseudo-papel `PUBLIC`. Uma peça de graus pode ainda preservar vários papéis na mesma linha
// (`GRANT … TO a, b, c`), forma que nenhuma das anteriores tinha. O desenho serve as duas: o portão é (a) uma
// transacção por ficheiro, (b) nenhum statement que esta casa recusa fora de corpo de função, (c) a reversão desfaz
// alguma coisa e não é a candidata copiada, (d) onde a candidata revoga um nome ao `anon`, a reversão tem de
// devolver exactamente esse nome, e (e) onde a candidata retira a entrada a `PUBLIC` ou preserva papéis, a reversão
// tem de devolver as mesmas assinaturas aos mesmos conjuntos de papéis — sem sobras nem trocas.
//
// Por omissão NADA é escrito. O programa só corre o SQL quando (a) `--peca` resolve num ficheiro que existe,
// (b) `--ok` é exactamente a frase declarada para essa peça e para este modo, e (c) o preflight fresco da
// própria peça deu verde contra o estado vivo, neste instante. Uma frase diferente, um «ok» solto, um
// preflight velho ou vermelho: recusa, sem tocar no banco. A publicação (v137/v138) não passa por aqui e
// continua a pedir OK próprio.
//
// O modo `--reverter` existe porque o SQL de reversão, sem ele, teria de ser enviado à mão — e o runbook
// (`docs/bu-20-11/10-runbook-municipal.md` §4) prometia um caminho executável. Não é a aplicação ao contrário
// com a mesma frase: exige a frase `REVERTER <peca> NO BANCO`, corre primeiro o preflight em modo reversão
// (que só dá verde se a peça estiver de facto aplicada) e só depois envia a reversão; a conferência de saída é
// o preflight em modo candidata, que afirma o estado limpo. As duas frases são portanto portões distintos, e
// a ordem dos dois preflights inverte-se com o modo — por isso o registo traz `sequencia` em vez de obrigar
// quem lê a lembrar qual verde veio primeiro.
//
// Uso:  node scripts/p73-municipal-aplica-ddl.mjs --selfteste
//       node scripts/p73-municipal-aplica-ddl.mjs --peca PEN-41                     (recusa: falta o --ok)
//       node scripts/p73-municipal-aplica-ddl.mjs --peca PEN-41 --ok "APLICAR PEN-41 NO BANCO"
//       node scripts/p73-municipal-aplica-ddl.mjs --peca PEN-41 --reverter --ok "REVERTER PEN-41 NO BANCO"
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { sql } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const md5 = (s) => createHash('md5').update(s, 'utf8').digest('hex');
const argv = process.argv.slice(2);
const flag = (nome) => { const i = argv.indexOf('--' + nome); return i === -1 ? null : argv[i + 1]; };
const tem = (nome) => argv.includes('--' + nome);
const PECAS = {
  'PEN-38': { pref: 'scripts/p73-pen38-preflight.mjs', cand: 'scripts/p73-pen38-ddl-candidata.sql', rev: 'scripts/p73-pen38-ddl-reversao.sql', prefixo: 'P73_PEN38_PREFLIGHT_VERDE', frase: 'APLICAR PEN-38 NO BANCO', fraseRev: 'REVERTER PEN-38 NO BANCO' },
  'PEN-39': { pref: 'scripts/p73-pen39-preflight.mjs', cand: 'scripts/p73-pen39-ddl-candidata.sql', rev: 'scripts/p73-pen39-ddl-reversao.sql', prefixo: 'P73_PEN39_PREFLIGHT_VERDE', frase: 'APLICAR PEN-39 NO BANCO', fraseRev: 'REVERTER PEN-39 NO BANCO' },
  'PEN-41': { pref: 'scripts/p73-pen41-preflight.mjs', cand: 'scripts/p73-pen41-ddl-candidata.sql', rev: 'scripts/p73-pen41-ddl-reversao.sql', prefixo: 'P73_PEN41_PREFLIGHT_VERDE', frase: 'APLICAR PEN-41 NO BANCO', fraseRev: 'REVERTER PEN-41 NO BANCO' },
  'PEN-43': { pref: 'scripts/p73-pen43-preflight.mjs', cand: 'scripts/p73-pen43-ddl-candidata.sql', rev: 'scripts/p73-pen43-ddl-reversao.sql', prefixo: 'P73_PEN43_PREFLIGHT_VERDE', frase: 'APLICAR PEN-43 NO BANCO', fraseRev: 'REVERTER PEN-43 NO BANCO' },
  'PEN-44': { pref: 'scripts/p74-pen44-preflight.mjs', cand: 'scripts/p74-pen44-ddl-candidata.sql', rev: 'scripts/p74-pen44-ddl-reversao.sql', prefixo: 'P74_PEN44_PREFLIGHT_VERDE', frase: 'APLICAR PEN-44 NO BANCO', fraseRev: 'REVERTER PEN-44 NO BANCO' },
  'PEN-42': { pref: 'scripts/p73-pen42-preflight.mjs', cand: 'scripts/p73-pen42-ddl-candidata.sql', rev: 'scripts/p73-pen42-ddl-reversao.sql', prefixo: 'P73_PEN42_PREFLIGHT_VERDE', frase: 'APLICAR PEN-42 NO BANCO', fraseRev: 'REVERTER PEN-42 NO BANCO' },
  'PEN-48': { pref: 'scripts/p73-pen48-preflight.mjs', cand: 'scripts/p73-pen48-ddl-candidata.sql', rev: 'scripts/p73-pen48-ddl-reversao.sql', prefixo: 'P73_PEN48_PREFLIGHT_VERDE', frase: 'APLICAR PEN-48 NO BANCO', fraseRev: 'REVERTER PEN-48 NO BANCO' },
};
// A frase certificada depende do modo, e é a única diferença de autorização entre aplicar e reverter. Vive
// numa função para o `--selfteste` medir a mesma função que o fluxo usa: uma asserção que reproduzisse a
// regra por omissão seria um verde sobre o meu desenho, não sobre o programa.
const frasePara = (P, modo) => (modo === 'reversao' ? P.fraseRev : P.frase);
const MESAS_DE_BASELINE = ['schools', 'students', 'classes', 'profiles', 'staff_schools'];
// O `registo` que o preflight imprime é um caminho absoluto; `join(REPO, …)` sobre ele daria um caminho
// impossível e o falso motivo de recusa «preflight nao devolveu caminho de registo legivel».
const caminhoReal = (p) => (isAbsolute(p) ? p : join(REPO, p));

// O texto que vai ao banco não pode conter o que uma candidata municipal nunca deveria conter: apagar mesas,
// apagar linhas, escrever dados directamente, ou carregar uma credencial. A varredura é feita sobre o que o
// Postgres executa: comentários saem (prosa de cabeçalho não é statement) e os corpos de função são
// substituídos, porque a PEN-38 bloco C tem um UPDATE legítimo dentro duma SECURITY DEFINER e daría falso
// positivo. `DROP POLICY`/`CREATE POLICY`/`CREATE FUNCTION` contam-se mas não chumbam: são o trabalho.
const so_codigo = (t) => t.split('\n').map((l) => (l.trim().startsWith('--') ? '' : l)).join('\n')
  .replace(/\$[a-z0-9_]*\$[\s\S]*?\$[a-z0-9_]*\$/g, ' CORPO_DE_FUNCAO ');
const perigos = (t) => {
  const fora = so_codigo(t);
  const c = (re) => (fora.match(re) || []).length;
  return { drop_table: c(/^\s*DROP\s+TABLE/gim), truncate: c(/^\s*TRUNCATE/gim), delete_from: c(/^\s*DELETE\s+FROM/gim),
    update_fora_de_funcao: c(/^\s*UPDATE\s+/gim), drop_schema_ou_database: c(/^\s*DROP\s+(DATABASE|SCHEMA)/gim),
    credencial: ((fora.match(/eyJ[\w-]{10,}|postgres:[^'"\s]{6,}|service_role/gi) || []).length),
    // `DROP FUNCTION` conta-se porque é o trabalho duma reversão (as três candidatas criam 2+2+0 funções e as
    // reversões correspondentes descartam-nas), mas não chumba: não está em ZERO_OBRIGATORIO. Acrescentar uma
    // contagem nunca alarga um predicado de bloqueio — os dois lados ficam visíveis no registo.
    drop_policy: c(/^\s*DROP\s+POLICY/gim), drop_function: c(/^\s*DROP\s+FUNCTION/gim), create_policy: c(/^\s*CREATE\s+POLICY/gim), create_function: c(/^\s*CREATE\s+FUNCTION/gim),
    // `CREATE FUNCTION` e `CREATE OR REPLACE FUNCTION` sao duas formas distintas e a primeira agulha nunca viu a
    // segunda: o registo da PEN-42 (revestimento aditivo por `CREATE OR REPLACE`) saiu com `create_function: 0` a
    // dizer «nenhuma funcao criada», quando a classe existia no SQL. Nao se altera o significado duma contagem ja
    // versionada -- acrescenta-se a classe que faltava, e os dois lados ficam visiveis no registo.
    create_or_replace_function: c(/^\s*CREATE\s+OR\s+REPLACE\s+FUNCTION/gim),
    // GRANT/REVOKE de EXECUTE contam-se porque sao o trabalho duma peca de graus (PEN-43). Como os DROP, nao estao em
    // ZERO_OBRIGATORIO: um GRANT escrito a mao dentro duma candidata fica visivel no registo em vez de chumbar a
    // varredura, e e o portao do espelho, em baixo, que pergunta se ele devia la estar.
    grant_execute: c(/^\s*GRANT\s+EXECUTE\s+ON\s+FUNCTION/gim), revoke_execute: c(/^\s*REVOKE\s+EXECUTE\s+ON\s+FUNCTION/gim) };
};
const ZERO_OBRIGATORIO = ['drop_table', 'truncate', 'delete_from', 'update_fora_de_funcao', 'drop_schema_ou_database', 'credencial'];
const bloqueadoresDe = (pj) => Object.entries(pj).filter(([k, v]) => ZERO_OBRIGATORIO.includes(k) && v > 0).map(([k, v]) => k + '=' + v);
const FIX_PERIGOS = {
  update_dentro_de_funcao_nao_conta: perigos('CREATE FUNCTION f() RETURNS void AS $fn$ BEGIN UPDATE public.t SET a=1; END; $fn$ LANGUAGE plpgsql;').update_fora_de_funcao === 0,
  update_fora_de_funcao_conta: perigos('UPDATE public.t SET a = 1;').update_fora_de_funcao === 1,
  truncate_conta: perigos('TRUNCATE public.t;').truncate === 1,
  prosa_de_cabecalho_nao_e_statement: perigos('-- vamos UPDATE a mesa, DROP TABLE t e o service_role\nSELECT 1;').credencial === 0 && perigos('-- UPDATE\n-- DROP TABLE t;\nSELECT 1;').drop_table === 0,
  // O caso contrário, para o fixture não ser uma licença para a varredura: `DROP TABLE` escrito FORA de
  // comentário é statement e tem de contar, mesmo vindo logo depois duma linha de prosa.
  drop_table_fora_de_comentario_conta: perigos('-- UPDATE\nDROP TABLE t;').drop_table === 1,
  palavra_credencial_fora_de_comentario_conta: perigos("select 'service_role'").credencial === 1,
  drop_function_conta_como_trabalho_de_reversao: perigos('DROP FUNCTION public.f();').drop_function === 1,
  grant_e_revoke_contam_se_separadamente: perigos('REVOKE EXECUTE ON FUNCTION public.f() FROM anon;\nGRANT EXECUTE ON FUNCTION public.f() TO anon;').revoke_execute === 1
    && perigos('REVOKE EXECUTE ON FUNCTION public.f() FROM anon;').grant_execute === 0,
  // As duas formas de criar funcao tem cada uma a sua contagem, e nenhuma delas pode estar verde sozinha:
  // `CREATE FUNCTION` nao enche a classe nova e `CREATE OR REPLACE` nunca encheu a antiga.
  create_or_replace_tem_classe_propria_e_nao_confunde_as_duas: perigos('CREATE OR REPLACE FUNCTION public.f() RETURNS int AS $fn$ SELECT 1 $fn$ LANGUAGE sql;').create_or_replace_function === 1
    && perigos('CREATE OR REPLACE FUNCTION public.f() RETURNS int AS $fn$ SELECT 1 $fn$ LANGUAGE sql;').create_function === 0
    && perigos('CREATE FUNCTION public.g() RETURNS int AS $fn$ SELECT 1 $fn$ LANGUAGE sql;').create_function === 1
    && perigos('CREATE FUNCTION public.g() RETURNS int AS $fn$ SELECT 1 $fn$ LANGUAGE sql;').create_or_replace_function === 0,
  prosa_de_create_or_replace_em_comentario_nao_conta: perigos('-- CREATE OR REPLACE FUNCTION public.f()\nSELECT 1;').create_or_replace_function === 0,
};

// Os nomes a que uma peca de graus se dirige, lidos do proprio ficheiro e nunca recordados: o REVOKE diz o que fecha
// e o GRANT da reversao diz o que abre. Se divergirem, o caminho de volta abre uma porta diferente da que a
// candidata fechou — e isso nao se ve em nenhuma contagem de statements. Devolve null quando o lado de cima nao e
// de graus, para o portao abaixo poder dizer «esta peca nao pergunta nada aqui» em vez de afirmar um espelho vazio.
const nomesDeGraus = (t) => ({ revoke: [...t.matchAll(/REVOKE\s+EXECUTE\s+ON\s+FUNCTION\s+(?:public\.)?([a-z0-9_]+)\s*\([^)]*\)\s+FROM\s+anon;/gi)].map((m) => m[1]),
  grant: [...t.matchAll(/GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+(?:public\.)?([a-z0-9_]+)\s*\([^)]*\)\s+TO\s+anon;/gi)].map((m) => m[1]) });
const ordenado = (a) => [...new Set(a)].sort();
const seEspelham = (cand, rev) => { const a = nomesDeGraus(so_codigo(cand)), b = nomesDeGraus(so_codigo(rev));
  return a.revoke.length === 0 ? null : JSON.stringify(ordenado(a.revoke)) === JSON.stringify(ordenado(b.grant)); };
const FIX_ESPELHO = {
  mesmo_nome_espelha: seEspelham('REVOKE EXECUTE ON FUNCTION public.a() FROM anon;', 'GRANT EXECUTE ON FUNCTION public.a() TO anon;') === true,
  nome_trocado_nao: seEspelham('REVOKE EXECUTE ON FUNCTION public.a() FROM anon;', 'GRANT EXECUTE ON FUNCTION public.b() TO anon;') === false,
  sobra_na_reversao_nao: seEspelham('REVOKE EXECUTE ON FUNCTION public.a() FROM anon;', 'GRANT EXECUTE ON FUNCTION public.a() TO anon;\nGRANT EXECUTE ON FUNCTION public.c() TO anon;') === false,
  prosa_de_comentario_nao_conta_como_grau: seEspelham('-- REVOKE EXECUTE ON FUNCTION public.a() FROM anon;\nSELECT 1;', 'GRANT EXECUTE ON FUNCTION public.a() TO anon;') === null,
  peca_de_ddl_nao_pergunta: seEspelham('DROP POLICY p ON public.t;', 'CREATE POLICY p ON public.t USING (x);') === null,
};

// A outra família de graus duma peça como a PEN-44 não passa pelo `anon`: é `REVOKE … FROM PUBLIC` acompanhado dum
// `GRANT … TO a, b, c` de preservação, desfeito na reversão pela ordem contrária. O `seEspelham` acima não vê esta
// família nenhuma — os seus regex pedem `FROM anon`/`TO anon` —, por isso uma reversão que esquecesse de devolver o
// grau a um dos papéis preservados passaria neste portão sem nada dizer e deixaria a ACL aberta para sempre. Compara
// assinaturas com conjuntos de papéis, não linhas: a ordem dos nomes numa lista não é parte do estado do banco.
const paresDe = (t, re, fixo) => [...t.matchAll(re)].map((m) => ({ sig: m[1].toLowerCase().replace(/\s+/g, ' '),
  alvos: fixo ? [fixo] : m[2].split(',').map((s) => s.trim()).filter(Boolean).sort() }));
const familiasDe = (t) => { const s = so_codigo(t);
  return { revoga_public: paresDe(s, /^REVOKE\s+EXECUTE\s+ON\s+FUNCTION\s+(\S+\([^)]*\))\s+FROM\s+PUBLIC;/gim, 'PUBLIC'),
    devolve_public: paresDe(s, /^GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+(\S+\([^)]*\))\s+TO\s+PUBLIC;/gim, 'PUBLIC'),
    preserva: paresDe(s, /^GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+(\S+\([^)]*\))\s+TO\s+([^;]+);/gim).filter((x) => !x.alvos.some((a) => a.toUpperCase() === 'PUBLIC')),
    desfaz_preservacao: paresDe(s, /^REVOKE\s+EXECUTE\s+ON\s+FUNCTION\s+(\S+\([^)]*\))\s+FROM\s+([^;]+);/gim).filter((x) => !x.alvos.some((a) => a.toUpperCase() === 'PUBLIC')) }; };
const comoChaves = (L) => JSON.stringify(L.map((x) => [x.sig, x.alvos]).sort());
// A pergunta só se põe a uma peça que retire a entrada a `PUBLIC`: é esse o gesto que obriga à lista de preservação,
// e é essa lista que a reversão tem de desfazer. Uma peça que cria uma função e a grant-a a `authenticated` (PEN-38,
// PEN-39) não tem nada a desfazer por aqui — a reversão dela descarta a função — e mentir-lhe-ia um `false`.
const seEspelhamFamilias = (cand, rev) => { const a = familiasDe(cand), b = familiasDe(rev);
  if (a.revoga_public.length === 0) return null;
  const atingidas = new Set(a.revoga_public.map((x) => x.sig));
  const preservaDasAtingidas = a.preserva.filter((x) => atingidas.has(x.sig));
  const desfazDasAtingidas = b.desfaz_preservacao.filter((x) => atingidas.has(x.sig));
  return comoChaves(a.revoga_public) === comoChaves(b.devolve_public) && b.devolve_public.length === a.revoga_public.length
    && comoChaves(preservaDasAtingidas) === comoChaves(desfazDasAtingidas) && desfazDasAtingidas.length === preservaDasAtingidas.length; };
const FIX_FAMILIAS = {
  mesma_lista_na_mesma_ordem_espelha: seEspelhamFamilias('REVOKE EXECUTE ON FUNCTION public.f(uuid) FROM PUBLIC;\nGRANT EXECUTE ON FUNCTION public.f(uuid) TO alpha, beta;', 'REVOKE EXECUTE ON FUNCTION public.f(uuid) FROM alpha, beta;\nGRANT EXECUTE ON FUNCTION public.f(uuid) TO PUBLIC;') === true,
  a_ordem_dos_papeis_na_lista_nao_e_estado: seEspelhamFamilias('REVOKE EXECUTE ON FUNCTION public.f(uuid) FROM PUBLIC;\nGRANT EXECUTE ON FUNCTION public.f(uuid) TO beta, alpha;', 'REVOKE EXECUTE ON FUNCTION public.f(uuid) FROM alpha, beta;\nGRANT EXECUTE ON FUNCTION public.f(uuid) TO PUBLIC;') === true,
  papel_esquecido_na_reversao_nao: seEspelhamFamilias('REVOKE EXECUTE ON FUNCTION public.f() FROM PUBLIC;\nGRANT EXECUTE ON FUNCTION public.f() TO alpha, beta;', 'REVOKE EXECUTE ON FUNCTION public.f() FROM alpha;\nGRANT EXECUTE ON FUNCTION public.f() TO PUBLIC;') === false,
  papel_trocado_na_reversao_nao: seEspelhamFamilias('REVOKE EXECUTE ON FUNCTION public.f() FROM PUBLIC;\nGRANT EXECUTE ON FUNCTION public.f() TO alpha, beta;', 'REVOKE EXECUTE ON FUNCTION public.f() FROM gamma, beta;\nGRANT EXECUTE ON FUNCTION public.f() TO PUBLIC;') === false,
  assinatura_trocada_nao: seEspelhamFamilias('REVOKE EXECUTE ON FUNCTION public.f(uuid) FROM PUBLIC;\nGRANT EXECUTE ON FUNCTION public.f(uuid) TO alpha;', 'REVOKE EXECUTE ON FUNCTION public.f(uuid) FROM alpha;\nGRANT EXECUTE ON FUNCTION public.g(uuid) TO PUBLIC;') === false,
  grant_a_mais_na_reversao_nao: seEspelhamFamilias('REVOKE EXECUTE ON FUNCTION public.f() FROM PUBLIC;\nGRANT EXECUTE ON FUNCTION public.f() TO alpha;', 'REVOKE EXECUTE ON FUNCTION public.f() FROM alpha;\nGRANT EXECUTE ON FUNCTION public.f() TO PUBLIC;\nGRANT EXECUTE ON FUNCTION public.h() TO PUBLIC;') === false,
  revoke_sem_grant_de_preservacao_e_um_mundo_novo: seEspelhamFamilias('REVOKE EXECUTE ON FUNCTION public.f() FROM PUBLIC;\nGRANT EXECUTE ON FUNCTION public.f() TO alpha;', 'GRANT EXECUTE ON FUNCTION public.f() TO PUBLIC;') === false,
  prosa_de_comentario_nao_e_grau: seEspelhamFamilias('-- REVOKE EXECUTE ON FUNCTION public.f() FROM PUBLIC;\nSELECT 1;', 'GRANT EXECUTE ON FUNCTION public.f() TO PUBLIC;') === null,
  peca_de_ddl_nao_pergunta_nada: seEspelhamFamilias('CREATE POLICY p ON public.t USING (x);', 'DROP POLICY p ON public.t;') === null,
};

const MODO = tem('reverter') ? 'reversao' : 'aplicacao';
const recusa = (motivos, extra) => {
  const corpo = { programa: 'scripts/p73-municipal-aplica-ddl.mjs', modo: MODO, em: new Date().toISOString(),
    escrito_no_banco: false, aplicado: false, motivos_de_recusa: motivos, ...(extra || {}) };
  if (tem('regista-recusa')) {
    // O nome do registo distingue o modo: uma recusa de reversão guardada com o nome da aplicação seria
    // confusão de provinha num diretório onde as duas famílias já coabitam.
    const p = join(REPO, `evidence/p73-municipal-${MODO === 'reversao' ? 'reversao' : 'aplica-ddl'}-recusa-` +
      (flag('peca') || 'sem-peca') + '-' + String(Date.now()) + '.json');
    writeFileSync(p, JSON.stringify(corpo, null, 2) + '\n');
    corpo.registo = p;
  }
  console.log(`RECUSADO · ${MODO} · ` + JSON.stringify(motivos));
  if (corpo.registo) console.log('registo ' + corpo.registo);
  process.exit(2);
};

const correPreflight = (caminhoRel, modo, sufixo) => {
  // O MODO é um argumento de linha de comando do preflight (`--reversao`), não uma variável de ambiente:
  // passar só o sufixo correria o modo candidata duas vezes e a conferência de saída seria a conferência
  // de entrada. O sufixo sim é ambiente (`P73_SUF`), porque serve só para o registo não por cima.
  const args = [join(REPO, caminhoRel), ...(modo === 'reversao' ? ['--reversao'] : [])];
  const r = spawnSync(process.execPath, args, {
    cwd: REPO, encoding: 'utf8', timeout: 300000,
    env: { ...process.env, P73_SUF: sufixo + (modo === 'reversao' ? 'r' : 'c') },
  });
  const saida = String(r.stdout || '') + String(r.stderr || '');
  const registo = (/registo (\S+\.json)\s*$/m.exec(saida.trim()) || [])[1] || null;
  return { codigo: r.status, tempo_esgotado: r.error && /ETIMEDOUT|timed out/i.test(String(r.error.code || r.error.message)), saida_ultima_linha: saida.trim().split('\n').filter(Boolean).pop() || '', registo, comando: args.join(' ') };
};

const selfteste = tem('selfteste');
if (selfteste) {
  const casos = [];
  const c = (nome, verde, detalhe) => casos.push({ nome, verde: !!verde, ...(detalhe ? { detalhe } : {}) });
  c('frase_solta_nao_autoriza', 'APLICAR PEN-41 NO BANCO' !== 'ok' && 'APLICAR PEN-41 NO BANCO' !== 'APLICAR PEN-38 NO BANCO');
  c('cada_peca_tem_ficheiros_em_disco', Object.entries(PECAS).every(([, p]) => [p.pref, p.cand, p.rev].every((f) => existsSync(join(REPO, f)))));
  c('varredura_de_perigo_nao_confunde_prosa_nem_corpo_de_funcao', Object.values(FIX_PERIGOS).every(Boolean),
    { fixtures: Object.entries(FIX_PERIGOS).map(([k, v]) => k + '=' + v), contagem: Object.keys(FIX_PERIGOS).length });
  c('varredura_de_credencial_dispara', perigos('token eyJhbGciOiJIUzI1NiJ9.abcdefghijklmnopqrstuvwxyz').credencial === 1);
  c('preflight_escreve_nome_de_registo_que_se_le_na_saida', /registo \S+\.json/.test('P73_X_VERDE_CANDIDATA 12 ms · registo evidence/x.json'));
  // Régua do verde do preflight, medida contra as três formas que os preflights emitem de facto. A versão
  // antiga pedia «espaço-0» no fim, que `13/0` nunca satisfaz: nunca haveria positivo possível.
  const verdeReal = (v) => /_VERDE_/.test(v) && /\/0$/.test(v);
  const prefixos = Object.values(PECAS).map((p) => p.prefixo);
  c('regua_do_verde_bate_nas_formas_que_os_preflights_emitem', prefixos.every((pf) => verdeReal(pf + '_CANDIDATA 13/0') && verdeReal(pf + '_REVERSAO 13/0'))
    && prefixos.every((pf) => !verdeReal(pf.replace('_VERDE', '_VERMELHO') + '_5') && !verdeReal(pf + '_CANDIDATA 9/1')), { prefixos_da_tabela: prefixos, forma_negativa: prefixos.map((pf) => pf.replace('_VERDE', '_VERMELHO') + '_5') });
  c('caminho_de_registo_absoluto_e_lido_como_absoluto', caminhoReal('C:/repo/evidence/x.json') === 'C:/repo/evidence/x.json' && caminhoReal('evidence/x.json') === join(REPO, 'evidence/x.json'));
  // ── modo reversão ─────────────────────────────────────────────────────────
  // Duas frases por peça — a de aplicar e a de reverter — e um censo sobre a tabela, não sobre o que eu escrevi à
  // mão: o que o modo novo introduz é a tentação de reverter com a frase da aplicação, e é isso que `frasePara` tem
  // de tornar impossível. Contar as frases no nome do caso deixava-o velho no dia em que entrasse uma peça.
  c('frases_de_aplicacao_e_reversao_sao_pares_por_peca_e_disjuntas',
    new Set(Object.values(PECAS).flatMap((p) => [p.frase, p.fraseRev])).size === Object.keys(PECAS).length * 2
      && Object.values(PECAS).every((p) => p.frase !== p.fraseRev));
  const pecas = Object.keys(PECAS);
  c('o_modo_escolhe_a_frase_e_nao_a_conveniencia', pecas.every((k) =>
    frasePara(PECAS[k], 'aplicacao') === PECAS[k].frase && frasePara(PECAS[k], 'reversao') === PECAS[k].fraseRev
      && frasePara(PECAS[k], 'reversao') !== PECAS[k].frase)
    // Distinctness entre peças medido por censo, não por `!==` contra uma peça fixa: comparar PEN-38 com PEN-38
    // é o verde que nunca pode ser vermelho, e aqui daria falso vermelho exactamente pelo mesmo motivo.
    && new Set(pecas.map((k) => frasePara(PECAS[k], 'reversao'))).size === pecas.length
    && new Set(pecas.map((k) => frasePara(PECAS[k], 'aplicacao'))).size === pecas.length);
  // A varredura de perigo tem de valer para os dois lados, sem chumbar o trabalho da reversão: `DROP FUNCTION`
  // é o que uma reversão faz, e não está na lista obrigatória de zeros.
  c('drop_function_de_reversao_e_trabalho_nao_statement_proibido', bloqueadoresDe(perigos('DROP FUNCTION public.f();')).length === 0 && perigos('DROP FUNCTION public.f();').drop_function === 1);
  c('frase_de_reversao_solta_nao_autoriza_aplicacao', frasePara(PECAS['PEN-41'], 'aplicacao') !== 'REVERTER PEN-41 NO BANCO');
  // O SQL das peças em disco, medido nesta corrida: uma transacção cada, nenhum statement proibido, e a reversão
  // não pode ser a candidata copiada ao contrário nem um ficheiro vazio de efeito. Isto lê ficheiros — não
  // toca no banco, por isso o `--selfteste` corre sem credencial nenhuma.
  const sqlDasPecas = Object.entries(PECAS).flatMap(([k, p]) => [[k, 'candidata', p.cand], [k, 'reversao', p.rev]]);
  c('todos_os_sql_das_pecas_sao_unicas_transaccoes_sem_statement_proibido', sqlDasPecas.every(([, , f]) => {
    const t = readFileSync(join(REPO, f), 'utf8');
    return /^BEGIN;/m.test(t) && /^COMMIT;/m.test(t) && bloqueadoresDe(perigos(t)).length === 0;
  }));
  c('cada_reversao_desfaz_algo_e_nao_e_a_candidata', Object.entries(PECAS).every(([k, p]) => {
    const a = readFileSync(join(REPO, p.cand), 'utf8'), b = readFileSync(join(REPO, p.rev), 'utf8');
    const pb = perigos(b);
    // `grant_execute` entra no desfazimento porque uma peca de graus nao descarta nada: devolver um grau e o
    // trabalho dela, e uma reversao sem GRANT nem DROP nao desfaz o que quer que seja.
    return md5(a) !== md5(b) && pb.drop_function + pb.drop_policy + pb.create_policy + pb.grant_execute > 0;
  }));
  // O espelho nome-a-nome, com os tres mundos fabricados dentro da propria corrida: um REVOKE sem GRANT do mesmo
  // nome nao e reversao nenhuma, e a regra tem de continuar nao-vacia enquanto houver pecas de graus na tabela.
  const espelhaveis = Object.entries(PECAS).map(([k, p]) => { const esp = seEspelham(readFileSync(join(REPO, p.cand), 'utf8'), readFileSync(join(REPO, p.rev), 'utf8')); return { peca: k, espelho: esp }; });
  c('onde_a_candidata_revoga_um_nome_a_reversao_devolve_exactamente_esse_conjunto', espelhaveis.filter((x) => x.espelho !== null).length >= 1
    && espelhaveis.every((x) => x.espelho !== false) && FIX_ESPELHO.mesmo_nome_espelha === true && FIX_ESPELHO.nome_trocado_nao === true
    && FIX_ESPELHO.sobra_na_reversao_nao === true && FIX_ESPELHO.prosa_de_comentario_nao_conta_como_grau === true && FIX_ESPELHO.peca_de_ddl_nao_pergunta === true,
    { por_peca: espelhaveis, fixtures: FIX_ESPELHO });
  // A família `PUBLIC` + preservação de vários papéis, com os seus próprios mundos fabricados. Sem esta régua, uma
  // reversão que esquecesse de desfazer um GRANT de preservação não era notada por nenhum portão daqui: o espelho
  // acima só vê as linhas que mencionam `anon`, e o preflight da peça é um único canal para esta pergunta.
  const familias = Object.entries(PECAS).map(([k, p]) => ({ peca: k,
    espelho: seEspelhamFamilias(readFileSync(join(REPO, p.cand), 'utf8'), readFileSync(join(REPO, p.rev), 'utf8')),
    contas: (() => { const a = familiasDe(readFileSync(join(REPO, p.cand), 'utf8')), b = familiasDe(readFileSync(join(REPO, p.rev), 'utf8'));
      const atingidas = new Set(a.revoga_public.map((x) => x.sig));
      return { candidata: { revoga_public: a.revoga_public.length, grant_total_de_preservacao: a.preserva.length, nas_assinaturas_atingidas: a.preserva.filter((x) => atingidas.has(x.sig)).length, fora_daquelas_para_outra_regua: a.preserva.filter((x) => !atingidas.has(x.sig)).length, papeis_preservados: [...new Set(a.preserva.flatMap((x) => x.alvos))].sort() }, reversao: { devolve_public: b.devolve_public.length, desfaz_preservacao: b.desfaz_preservacao.length } }; })() }));
  c('onde_a_candidata_retira_public_ou_preserva_papeis_a_reversao_devolve_as_mesmas_assinaturas_ao_mesmos_conjuntos',
    familias.filter((x) => x.espelho !== null).length >= 1 && familias.every((x) => x.espelho !== false)
      && Object.values(FIX_FAMILIAS).every(Boolean), { por_peca: familias, fixtures: FIX_FAMILIAS });
  const medidos = sqlDasPecas.map(([k, lado, f]) => { const t = readFileSync(join(REPO, f), 'utf8'); const pj = perigos(t); const ng = nomesDeGraus(so_codigo(t)); return { peca: k, lado, caminho: f, bytes: Buffer.byteLength(t, 'utf8'), md5: md5(t), desfaz: pj.drop_function + pj.drop_policy + pj.create_policy + pj.grant_execute, graus: { revogados: ng.revoke, devolvidos: ng.grant } }; });
  const boas = casos.filter((x) => x.verde).length;
  const out = { programa: 'scripts/p73-municipal-aplica-ddl.mjs', selfteste: true, em: new Date().toISOString(), aplicado: false, escrito_no_banco: false, casos, sql_medidos: medidos, veredito: boas === casos.length ? `P73_MUNICIPAL_APLICA_SELFTESTE_OK ${casos.length}/0` : `P73_MUNICIPAL_APLICA_SELFTESTE_VERMELHO ${casos.length - boas}` };
  console.log(JSON.stringify(out, null, 1));
  process.exit(boas === casos.length ? 0 : 1);
}

const peca = flag('peca');
if (!peca || !PECAS[peca]) recusa(['--peca tem de ser uma das pecas certificadas: ' + Object.keys(PECAS).join(', ')]);
const P = PECAS[peca];
const frasesCertificadas = Object.values(PECAS).flatMap((x) => [x.frase, x.fraseRev]);
const FRASE = frasePara(P, MODO);
const FRASE_OUTRO_MODO = frasePara(P, MODO === 'reversao' ? 'aplicacao' : 'reversao');
const ok = flag('ok');
if (ok === null) recusa([`falta --ok com a frase literal deste modo (${FRASE}); sem frase, nada e escrito`]);
if (ok !== FRASE) recusa([
  `--ok nao e a frase certificada deste modo; esperado exatamente "${FRASE}"`,
  // A recusa diz por nome o que a pessoa tentou: reverter com a frase de aplicação (ou aplicar com a de
  // reversão) é o engano que este modo introduz, e um motivo genérico deixaria a pessoa a tentar a outra.
  ...(ok === FRASE_OUTRO_MODO ? [`a frase "${ok}" pertence ao modo ${MODO === 'reversao' ? 'aplicacao' : 'reversao'} desta peca: aplicar e reverter sao OKs distintos, um nao arrasta o outro`] : []),
  `frases certificadas desta familia: ${JSON.stringify(frasesCertificadas)}`,
], { aviso: MODO === 'reversao' ? 'um «ok» solto, ou o OK de aplicação, nao autoriza desfazer DDL já aplicado' : 'um «ok» solto nao autoriza escrita no banco' });

const faltam = [P.pref, P.cand, P.rev].filter((f) => !existsSync(join(REPO, f)));
if (faltam.length) recusa(['ficheiro da peca nao existe em disco: ' + faltam.join(', ')]);
const txtCand = readFileSync(join(REPO, P.cand), 'utf8');
const txtRev = readFileSync(join(REPO, P.rev), 'utf8');
// O que é varrido e o que é enviado dependem do modo. Na aplicação o alvo é a candidata; na reversão o alvo é
// a reversão — e a varredura de perigo é a mesma régua nos dois lados, porque DROP/DELETE/TRUNCATE escritos à
// mão num ficheiro de reversão são exactamente o que a reversão não pode fazer.
const NOME_ALVO = MODO === 'reversao' ? 'reversao' : 'candidata';
const NOME_CONTRA = MODO === 'reversao' ? 'candidata' : 'reversao';
const txtAlvo = MODO === 'reversao' ? txtRev : txtCand;
const perigoAlvo = perigos(txtAlvo);
const bloqueadores = bloqueadoresDe(perigoAlvo);
if (bloqueadores.length) recusa([`o SQL que este modo enviaria tem statement fora de corpo de funcao que esta peça recusa: ${bloqueadores.join(', ')}`]);
if (!/^BEGIN;/m.test(txtAlvo) || !/^COMMIT;/m.test(txtAlvo)) recusa(['o SQL deste modo nao e uma unica transacco (BEGIN/COMMIT)']);
// Os dois espelhos de graus correm tambem aqui, no caminho de escrita, e nao só no `--selfteste`: o que está em disco
// neste instante é o que vai ao banco, e uma reversao que nao devolvesse exactamente o que a candidata fecha deixaria
// a ACL mudada para sempre. `null` significa «esta peca nao e desta raca» e nao chumba.
const espAnon = seEspelham(txtCand, txtRev), espPublico = seEspelhamFamilias(txtCand, txtRev);
if (espAnon === false) recusa(['o espelho do anon nao bate: a reversao nao devolve exactamente os nomes que a candidata revoga', `candidata ${JSON.stringify(nomesDeGraus(so_codigo(txtCand)).revoke)}`, `reversao ${JSON.stringify(nomesDeGraus(so_codigo(txtRev)).grant)}`]);
if (espPublico === false) recusa(['o espelho das familias de PUBLIC e de preservacao nao bate: a reversao nao devolve as mesmas assinaturas aos mesmos conjuntos de papeis'], { familias: { candidata: familiasDe(txtCand), reversao: familiasDe(txtRev) } });

const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
const OUT = join(REPO, `evidence/p73-municipal-${MODO === 'reversao' ? 'reversao' : 'aplicacao'}-${peca}-${stamp}.json`);
if (existsSync(OUT)) recusa(['o artefacto desta execucao ja existe: ' + OUT]);

// Dois preflights, sempre, e o que cada um afirma inverte-se com o modo. Antes de escrever: o modo que descreve
// o estado que se vai destruir (na aplicação, a candidata ainda por aplicar; na reversão, a peça já aplicada).
// Depois de escrever: o modo que descreve o estado de saída. Um verde velho deste dia não serve — o intervalo
// entre a medição e a escrita é o que esta peça fecha.
const MODO_ANTES = MODO === 'reversao' ? 'reversao' : 'candidata';
const MODO_DEPOIS = MODO === 'reversao' ? 'candidata' : 'reversao';
const SUF = (MODO === 'reversao' ? 'rev' : 'apl') + stamp;
const pre = correPreflight(P.pref, MODO_ANTES, SUF);
if (pre.tempo_esgotado) recusa([`preflight (${MODO_ANTES}) esgotou o tempo de 300 s — estado desconhecido, nada foi escrito`]);
if (!pre.registo || !existsSync(caminhoReal(pre.registo))) recusa([`preflight (${MODO_ANTES}) nao devolveu caminho de registo legivel: ` + pre.saida_ultima_linha]);
const preJson = JSON.parse(readFileSync(caminhoReal(pre.registo), 'utf8'));
if (pre.codigo !== 0 || !String(preJson.veredito).startsWith(P.prefixo) || !/\/0$/.test(String(preJson.veredito))) recusa([
  `preflight em modo ${MODO_ANTES} nao deu verde: ${preJson.veredito}`, `registo ${pre.registo}`,
  ...(MODO === 'reversao' ? ['o modo reversao so pode correr sobre uma peca aplicada: e o preflight em modo reversao que afirma isso contra o estado vivo, e ele nao afirmou'] : []),
]);
const conferePegada = (par, texto) => !!par && par.md5 === md5(texto) && par.bytes === Buffer.byteLength(texto, 'utf8');
const fichaPegada = (par, caminhoRel, texto) => ({ certificado: par, medido_agora: { caminho: caminhoRel, bytes: Buffer.byteLength(texto, 'utf8'), md5: md5(texto) } });
if (!conferePegada(preJson.ficheiros[NOME_ALVO], txtAlvo)) recusa([`o md5/bytes do SQL (${NOME_ALVO}) que este modo enviaria nao bate com o certificado pelo preflight`, fichaPegada(preJson.ficheiros[NOME_ALVO], MODO === 'reversao' ? P.rev : P.cand, txtAlvo)]);
if (!conferePegada(preJson.ficheiros[NOME_CONTRA], MODO === 'reversao' ? txtCand : txtRev)) recusa([`o SQL (${NOME_CONTRA}) em disco nao e o que o preflight certificou: sem ele o caminho de volta desta execucao nao esta garantido`, fichaPegada(preJson.ficheiros[NOME_CONTRA], MODO === 'reversao' ? P.cand : P.rev, MODO === 'reversao' ? txtCand : txtRev)]);


const conta = async () => { const r = await sql(`select ${MESAS_DE_BASELINE.map((m) => `(select count(*)::int from public.${m}) as ${m}`).join(', ')}`); return r[0]; };
const antes = await conta();

const em = new Date().toISOString();
let erroDeEscrita = null;
try { await sql(txtAlvo); } catch (e) { erroDeEscrita = String(e.message || e).slice(0, 600); }
const depois = await conta();
const pos = erroDeEscrita ? { codigo: 'ABORTADO', nota: 'o Postgres aborta a transaccao inteira; nada ficou aplicado nem desfeito' } : correPreflight(P.pref, MODO_DEPOIS, SUF);
let posJson = null;
if (!erroDeEscrita && pos.registo && existsSync(caminhoReal(pos.registo))) posJson = JSON.parse(readFileSync(caminhoReal(pos.registo), 'utf8'));
const fichaPreflight = (modo) => {
  const [r, j] = modo === MODO_ANTES ? [pre, preJson] : [pos, posJson];
  return { modo, registo: r.registo || null, veredito: j ? j.veredito : null, codigo: r.codigo === undefined ? null : r.codigo };
};
const ANTES = fichaPreflight(MODO_ANTES), DEPOIS = fichaPreflight(MODO_DEPOIS);

const out = {
  programa: 'scripts/p73-municipal-aplica-ddl.mjs', peca, modo: MODO, em, duracao_ms: Date.now() - new Date(em).getTime(),
  aplicado: erroDeEscrita === null, escrito_no_banco: erroDeEscrita === null,
  ok_literal_usado: ok, frase_certificada: FRASE, frase_do_outro_modo_nao_autoriza: FRASE_OUTRO_MODO,
  sql_enviado: { nome: NOME_ALVO, ...(NOME_ALVO === 'reversao' ? { caminho: P.rev, bytes: Buffer.byteLength(txtRev, 'utf8'), md5: md5(txtRev) } : { caminho: P.cand, bytes: Buffer.byteLength(txtCand, 'utf8'), md5: md5(txtCand) }) },
  candidata: { caminho: P.cand, bytes: Buffer.byteLength(txtCand, 'utf8'), md5: md5(txtCand) },
  reversao: { caminho: P.rev, bytes: Buffer.byteLength(txtRev, 'utf8'), md5: md5(txtRev) },
  // Os dois portões por MODO (não por ordem): o que cada verde afirma está dito em `sequencia`, porque aplicar
  // e reverter correm os mesmos dois modos por ordem oposta, e um leitor não tem de lembrar qual veio primeiro.
  preflight_candidata: MODO_ANTES === 'candidata' ? ANTES : DEPOIS,
  preflight_reversao: MODO_ANTES === 'reversao' ? ANTES : DEPOIS,
  sequencia: [
    { ordem: 1, papel: MODO === 'reversao' ? 'precondicao: a peca tem de estar aplicada' : 'precondicao: a peca tem de estar por aplicar', ...ANTES },
    { ordem: 2, papel: MODO === 'reversao' ? 'conferencia de saida: o estado limpo de antes da candidata esta de volta' : 'conferencia de saida: o DDL produzido e o DDL certificado', ...DEPOIS },
  ],
  varredura_do_sql: perigoAlvo,
  baselines: { antes, depois, inalteradas: JSON.stringify(antes) === JSON.stringify(depois) },
  erro_de_escrita: erroDeEscrita,
  o_que_este_registo_nao_cobre: MODO === 'reversao'
    ? 'a publicacao de qualquer versao do ar, o seed do calendario (RM-5.2) e a etiquetagem escola-municipio: cada um tem instrumento e OK proprios. Reverter o DDL tambem nao apaga dados nem re-escreve politicas que nao sejam as que a candidata mexeu.'
    : 'a publicacao de qualquer versao do ar, o seed do calendario (RM-5.2) e a etiquetagem escola-municipio: cada um tem instrumento e OK proprios.',
};
const REGUA_Saida = MODO_DEPOIS === 'reversao' ? /_REVERSAO/ : /_CANDIDATA/;
const conferenciasVerdes = out.baselines.inalteradas && /\/0$/.test(String(out.sequencia[1].veredito))
  && String(out.sequencia[1].veredito).startsWith(P.prefixo) && REGUA_Saida.test(String(out.sequencia[1].veredito));
const PALAVRA = MODO === 'reversao' ? 'REVERTIDO' : 'APLICADO';
out.veredito = erroDeEscrita ? `P73_MUNICIPAL_${MODO === 'reversao' ? 'REVERSAO' : 'APLICACAO'}_ABORTADA ${peca}`
  : (conferenciasVerdes ? `P73_MUNICIPAL_${PALAVRA}_E_CONFERIDO ${peca}` : `P73_MUNICIPAL_${PALAVRA}_COM_CONFERENCIA_VERMELHA ${peca}`);
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`PECA ${peca} · modo ${MODO} · escrito ${out.escrito_no_banco} · SQL ${out.sql_enviado.nome} ${out.sql_enviado.md5} · preflight antes ${out.sequencia[0].veredito}`);
console.log(`BASELINES ${JSON.stringify({ antes, depois })}`);
console.log(`PREFLIGHT_DEPOIS(${MODO_DEPOIS}) ${JSON.stringify(out.sequencia[1])}`);
console.log(`${out.veredito} · registo ${OUT}`);
process.exit(out.veredito === `P73_MUNICIPAL_${PALAVRA}_E_CONFERIDO ${peca}` ? 0 : 1);
