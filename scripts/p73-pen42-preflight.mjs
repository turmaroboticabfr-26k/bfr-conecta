#!/usr/bin/env node
// P73-PEN42-PREFLIGHT — só leitura. A candidata `scripts/p73-pen42-ddl-candidata.sql` ADDIRA uma função
// (`register_gate_checkin_v2`) que a bundle servida já chama mas o catálogo não tem. Nada do que a candidata
// promete sobre o estado vivo fica em prosa no SQL: é medido aqui, e o verde deste programa é condição
// necessária (não suficiente) para qualquer OK de aplicação.
// Uso: node scripts/p73-pen42-preflight.mjs            (modo candidata: exige a ausência do nome no catálogo)
//      node scripts/p73-pen42-preflight.mjs --reversao (modo reversao: exige que a aplicação já tenha acontecido)
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sql } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const MODO = process.argv.includes('--reversao') ? 'reversao' : 'candidata';
const SUF = process.env.P73_SUF ? '-' + process.env.P73_SUF : '';
const OUT = join(REPO, `evidence/p73-pen42-preflight-${MODO}-21-11${SUF}.json`);
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com P73_SUF=novo, não por cima');
const CAM_CAND = 'scripts/p73-pen42-ddl-candidata.sql';
const CAM_REV = 'scripts/p73-pen42-ddl-reversao.sql';
const CAM_BUNDLE = 'bfr-candidata-v142-painel-na-troca/index.html';
const CAM_RUNBOOK = 'docs/bu-20-11/10-runbook-municipal.md';
const NOME = 'register_gate_checkin_v2';
const VIVA = 'register_gate_checkin';
const BUNDE_ESPERADA = { bytes: 3556664, md5: '0e22e78fe1e0ce929ec4717f86365ad9' };
for (const c of [CAM_CAND, CAM_REV, CAM_BUNDLE]) if (!existsSync(join(REPO, c))) throw new Error('ABORTA: falta a peça ' + c);

const md5 = (s) => createHash('md5').update(s).digest('hex');
const cru = (p) => readFileSync(join(REPO, p), 'utf8');
const semComentarios = (t) => t.split(/\r?\n/).map((l) => l.replace(/--.*$/, '')).join('\n');
const rawCand = cru(CAM_CAND), rawRev = cru(CAM_REV);
const textoCand = semComentarios(rawCand);
const textoRev = semComentarios(rawRev);
const conta = (re, t) => [...t.matchAll(re)].length;

// ---- normalizadores, uma prédica por classe -------------------------------------
// O catálogo devolve `nome tipo` separados por vírgula, sem DEFAULT; a candidata declara DEFAULTs e escreve
// tipos de duas palavras (`timestamp with time zone`). Comparar as duas formas cruas daria vermelho da sonda,
// por isso cada classe tem o seu normalizador e os dois são verificados contra o mesmo fixture.
const separa = (t) => t.split(',').map((x) => x.trim().replace(/\s+/g, ' ')).filter(Boolean).join(', ');
const argsDeDeclaracao = (t) => {
  const m = new RegExp(`CREATE OR REPLACE FUNCTION public\\.${NOME}\\(([\\s\\S]*?)\\)\\s*RETURNS`, 'm').exec(t);
  if (!m) throw new Error('CANDIDATA_SEM_DECLARACAO_DE_ARGS');
  return separa(m[1].split(',').map((a) => a.replace(/DEFAULT[\s\S]*$/i, '').trim()).filter(Boolean).join(','));
};
const nomesDeDeclaracao = (t) => argsDeDeclaracao(t).split(', ').map((a) => a.split(' ')[0]).sort().join(',');
const colunasDeDeclaracao = (t) => {
  const m = /RETURNS\s+TABLE\(([\s\S]*?)\)\s*LANGUAGE/.exec(t);
  if (!m) throw new Error('CANDIDATA_SEM_RETURNS_TABLE');
  return separa(m[1]);
};
const colunasDoCatalogo = (resultado) => {
  const m = /\(([\s\S]*)\)/.exec(String(resultado).replace(/\s+/g, ' '));
  if (!m) throw new Error('CATALOGO_SEM_TABELA_DE_COLUNAS');
  return separa(m[1]);
};
// Os papéis a que uma candidata concede execução lêem-se da linha `GRANT` dela, nunca de uma lista recordada:
// é essa string que o portão compara com o conjunto medido na viva, e um `GRANT` a mais num fixture tem de
// aparecer aqui para o vermelho ter positivo.
const papeisDeDeclaracao = (t) => {
  const m = /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.[a-z0-9_]+\([^)]*\)\s+TO\s+([a-z0-9_,\s]+);/i.exec(t);
  if (!m) throw new Error('CANDIDATA_SEM_GRANT_DE_EXECUTE');
  return [...new Set(m[1].split(',').map((x) => x.trim()).filter(Boolean))].sort().join(',');
};

// ---- estado vivo ----------------------------------------------------------------
const viva = await sql(`select p.oid, p.prosecdef as definer, coalesce(array_to_string(p.proconfig,';'),'<sem set>') as config,
    p.provolatile as volatilidade, pg_get_function_identity_arguments(p.oid) as identidade,
    pg_get_function_result(p.oid) as resultado, coalesce(array_to_string(p.proacl,','),'<nenhum>') as acl
  from pg_proc p join pg_namespace nn on nn.oid=p.pronamespace
  where nn.nspname='public' and p.proname='${VIVA}'`);
if (viva.length !== 1) throw new Error(`ABORTA: esperava uma ${VIVA} no catálogo, li ${viva.length}`);
const v = viva[0];
const identidadeViva = String(v.identidade).replace(/\s+/g, ' ');
const colunasVivas = colunasDoCatalogo(v.resultado);
const dono = (await sql(`select pg_get_userbyid(p.proowner) as dono from pg_proc p
  join pg_namespace nn on nn.oid=p.pronamespace where nn.nspname='public' and p.proname='${VIVA}'`))[0].dono;
const linhasV2 = (await sql(`select count(*)::int as n from pg_proc p join pg_namespace nn on nn.oid=p.pronamespace
  where nn.nspname='public' and p.proname='${NOME}'`))[0].n;
// O corpo da viva, byte a byte: a candidata promete «zero toque na função viva», e essa promessa só é medida se
// alguém voltar a ler a definição. A régua compara com o par (bytes, md5) que o CABECALHO da candidata declara —
// ler o esperado da prova versionada, não do número lembrado por quem escreve o portão. Os dois md5 (o do
// Postgres e o do Node sobre a mesma string) entram separados: se divergirem é a codificação que mudou, e isso
// tem de ter nome neste registo, não ser um verde por coincidência de arredondamento.
const corpoViva = (await sql(`select p.xmin::text as xmin, md5(pg_get_functiondef(p.oid)) as md5_sql,
    octet_length(pg_get_functiondef(p.oid))::int as bytes, pg_get_functiondef(p.oid) as def
  from pg_proc p join pg_namespace nn on nn.oid=p.pronamespace where nn.nspname='public' and p.proname='${VIVA}'`))[0];
const md5VivaNode = md5(corpoViva.def);
// O privilégio efectivo dos três papéis de sessão, lido do catálogo: `proacl` diz o que foi escrito,
// `has_function_privilege` diz o que resultou. A candidata escolheu ser mais estreita do que a viva de propósito
// (só `authenticated`), e é isso — não a linha do ficheiro — que tem de estar no registo. O `PUBLIC` lê-se do
// `proacl` pela mesma régua da viva (uma entrada que comece por `=`), porque pseudo-papel não é papel e
// `has_function_privilege('PUBLIC', …)` não é o caminho que esta casa já validou.
const privs = (await sql(`select p.xmin::text as xmin, coalesce(array_to_string(p.proacl,','),'<nenhum>') as acl,
    has_function_privilege('anon'::regrole, p.oid, 'EXECUTE') as anon_pode,
    has_function_privilege('authenticated'::regrole, p.oid, 'EXECUTE') as authenticated_pode,
    has_function_privilege('service_role'::regrole, p.oid, 'EXECUTE') as service_role_pode
  from pg_proc p join pg_namespace nn on nn.oid=p.pronamespace where nn.nspname='public' and p.proname='${NOME}'`))[0] || null;
const aclViva = String(v.acl).split(',').map((x) => x.trim()).filter(Boolean);
const papeisDe = (acl) => [...new Set(String(acl).split(',').map((x) => x.trim().split('=')[0]).filter((r) => r && r !== '<nenhum>'))].sort();
const papeisVivos = [...new Set(aclViva.map((x) => x.split('=')[0]))].filter(Boolean).sort();
const vivaTemPublic = aclViva.some((x) => x.startsWith('='));

// ---- estrutura das duas peças ---------------------------------------------------
const estrutura = (t) => ({
  create_function: conta(/^\s*CREATE\s+(OR\s+REPLACE\s+)?FUNCTION/gim, t),
  drop_function: conta(/^\s*DROP\s+FUNCTION/gim, t),
  alter: conta(/^\s*ALTER/gim, t),
  drop_policy: conta(/^\s*DROP\s+POLICY/gim, t),
  create_policy: conta(/^\s*CREATE\s+POLICY/gim, t),
  grant_execute: conta(/^\s*GRANT\s+EXECUTE/gim, t),
  revoke: conta(/^\s*REVOKE/gim, t),
  comment: conta(/^\s*COMMENT\s+ON/gim, t),
  insert: conta(/\binsert\s+into\b/gi, t),
  update: conta(/\bupdate\s+public\./gi, t),
  delete: conta(/\bdelete\s+from\b/gi, t),
});
const estCand = estrutura(textoCand);
const estRev = estrutura(textoRev);
// A transacção conta-se nos bytes CRUS, com a mesma regex com que o aplicador a exige (`/^BEGIN;/m`,
// `/^COMMIT;/m`): se fosse contada no texto sem comentários, o verde do preflight e a recusa do aplicador
// podiam discordar, e é o segundo que decide a escrita.
const trans = (t) => ({ begin: conta(/^BEGIN;/gm, t), commit: conta(/^COMMIT;/gm, t) });
const trCand = trans(rawCand), trRev = trans(rawRev);
// A pegada certificada é a dos bytes crus, porque é essa string e só essa que o aplicador volta a ler para
// comparar antes de enviar: um md5 tirado do texto sem comentários seria um verde sobre o meu normalizador,
// não sobre o ficheiro que vai ao banco. Os dois lados (crú e normalizado) ficam no registo para a divergência
// se poder ler, não reconstruir.
const pegada = (caminho, texto) => ({ caminho, bytes: Buffer.byteLength(texto, 'utf8'), md5: md5(texto) });
const fich = { candidata: pegada(CAM_CAND, rawCand), reversao: pegada(CAM_REV, rawRev) };

// O corpo do revestimento: tem de chamar a viva, qualificada, e nunca a si próprio. Os nomes passados por
// notação nomeada têm de ser exactamente os seis declarados, e nenhum pode colidir com uma coluna devolvida —
// em `LANGUAGE sql` uma colisão dessas seria resolvida pela coluna, não pelo parâmetro.
const corpoCand = (() => { const m = /\bAS\s+\$fn\$([\s\S]*?)\$fn\$/m.exec(textoCand); return m ? m[1] : ''; })();
const chamaViva = conta(/public\.register_gate_checkin\s*\(/g, corpoCand);
const chamaSelf = conta(new RegExp(`\\b${NOME}\\s*\\(`, 'g'), corpoCand);
const nomesEncaminhados = [...corpoCand.matchAll(/([a-z_]+)\s*=>/g)].map((m) => m[1]).sort().join(',');
const colunasSelecionadas = ((m) => (m ? separa(m[1]) : ''))(/SELECT([\s\S]*?)FROM\s+public\.register_gate_checkin/i.exec(corpoCand));
const nomesDeColunasVivas = colunasVivas.split(', ').map((c) => c.split(' ')[0]);
const nomesSelecionados = colunasSelecionadas.split(', ').map((c) => c.replace(/^c\./, ''));
const colisaoComColunas = nomesDeDeclaracao(textoCand).split(', ').filter((n) => nomesDeColunasVivas.includes(n)).join(',');

// ---- o que o front servido promete (medido nos bytes, não na memória) -----------
const html = cru(CAM_BUNDLE);
const chamadasV2 = conta(new RegExp(`rpc\\(\\s*'${NOME}'`, 'g'), html);
const chamadasViva = conta(new RegExp(`rpc\\(\\s*'${VIVA}'`, 'g'), html);
const chavesDasChamadas = (() => {
  const i = html.indexOf(`rpc('${NOME}',params)`);
  if (i < 0) throw new Error('BUNDE_SEM_O_RAMO_MEDIDO');
  const chave = (de) => {
    const a = html.indexOf('{', de);
    if (a < 0) return null;
    let fundo = a, prof = 0;
    for (let k = a; k < html.length; k += 1) {
      if (html[k] === '{') prof += 1;
      else if (html[k] === '}') { prof -= 1; if (prof === 0) { fundo = k; break; } }
    }
    const corpo = html.slice(a + 1, fundo);
    return [...corpo.matchAll(/(?:^|,)\s*([a-z_]+):/g)].map((m) => m[1]);
  };
  const sitios = [];
  let p = i;
  for (let n = 0; n < 2; n += 1) { p = html.indexOf('registerGateCheckin(client,', p + 1); if (p < 0) break; sitios.push(p); }
  if (sitios.length !== 2) throw new Error(`BUNDE_COM_${sitios.length}_CHAMADORES_DO_RAMO_NAO_LEGADO`);
  const tudo = [...new Set(sitios.flatMap((s) => chave(s) || []))].sort().join(',');
  return { nomes: tudo, sitios: sitios.join(',') };
})();
const ramoLegado = (() => {
  const i = html.indexOf(`rpc('${NOME}',params)`);
  const recorte = html.slice(Math.max(0, i - 320), i + 120);
  return { legado_chama_viva: /gateLegacyMode\(\)\s*\?\s*client\.rpc\('register_gate_checkin'/.test(recorte), bytes_ancora: i };
})();
// Cada sitio do nome vivo é ou o ramo legado da condicional que também chama o nome ausente, ou uma chamada
// directa do módulo antigo (que declara `registerGateCheckin(token, source = 'manual')` e nunca viu o sufixo).
// Um sitio que não caiba nas duas classes é código novo a chamar a viva por um caminho que este preflight não
// conhece, e é isso que `nao_classificados` apanha — a contagem crua dos sitios não é promessa de nada.
const inicioModuloNovo = html.indexOf('function gateLegacyMode()');
// Concatenação explícita em vez de interpolação dentro de template: escrever `\\${VIVA}` produz `\` + o nome,
// e o regex recebe `\r` (entrada de carro) no meio do identificador — a sonda deixaria de ver sitios nenhum e
// o portão passaria verde sobre um conjunto vazio. Foi exactamente assim que este portão esteve vermelho.
const RE_SITIO_VIVA = new RegExp("rpc\\('" + VIVA + "'", 'g');
const sitiosVivos = [...html.matchAll(RE_SITIO_VIVA)].map((m) => {
  const antes = html.slice(Math.max(0, m.index - 160), m.index);
  // A agulha só pode olhar para o que fica ANTES do match: `rpc('<nome>'` já foi consumido, e exigi-lo aqui
  // dava ramo_legado zero e um sitio «NAO_CLASSIFICADO» — o vermelho que esta corrida apanhou.
  if (/gateLegacyMode\(\)\s*\?\s*client\.$/.test(antes)) return { bytes: m.index, classe: 'ramo_legado' };
  if (inicioModuloNovo > 0 && m.index < inicioModuloNovo) return { bytes: m.index, classe: 'modulo_antigo' };
  return { bytes: m.index, classe: 'NAO_CLASSIFICADO' };
});
const porClasse = (c) => sitiosVivos.filter((s) => s.classe === c).length;

// ---- fixtures: a régua tem de chumbar com o falso -------------------------------
const FIX_ARG_OK = 'target_badge_token uuid, gate_direction text, visual_confirmation boolean, intake_source text, target_shift text, exception_reason text';
const FIX_TIPO_TROCADO = FIX_ARG_OK.replace('visual_confirmation boolean', 'visual_confirmation text');
const FIX_ARIDADE = FIX_ARG_OK.replace(', exception_reason text', '');
const FIX_DEFAULT_PRESO = "target_badge_token uuid, gate_direction text DEFAULT 'entry'::text";
const FIX_COLUNAS_DUAS_PALAVRAS = 'checked_at timestamp with time zone, entry_status text';
const FIX_COLUNA_A_MAIS = colunasVivas + ', nada_toque text';
// Dois fixtures de grau: um `GRANT` só para `anon`, e um que acrescenta `anon` ao papel legítimo. O primeiro
// prova que o extractor lê o que está escrito; o segundo prova que a prédica de subconjunto tem positivo,
// porque é exactamente o caso que o portão tem de apanhar.
const FIX_GRANT_SO_ANON = 'GRANT EXECUTE ON FUNCTION public.register_gate_checkin_v2(uuid, text, boolean, text, text, text) TO anon;';
const FIX_GRANT_ANON_E_LEGITIMO = 'GRANT EXECUTE ON FUNCTION public.register_gate_checkin_v2(uuid, text, boolean, text, text, text) TO authenticated, anon;';
const papeisDaViva = papeisVivos;
const alargamentoDe = (t) => papeisDeDeclaracao(t).split(',').filter((r) => !papeisDaViva.includes(r)).join(',');
const alargamentoCand = alargamentoDe(textoCand);
// O `service_role_pode === false` que esteve escrito aqui não tinha positivo: o censo do catálogo de 21/11 mede
// 163 de 163 funções de `public` executáveis por `service_role`, logo a cláusula estaria vermelha para qualquer
// objecto da casa. A forma falsificável da mesma promessa é relativa: «o revestimento não concede EXECUTE a um
// papel que a viva não conceda», lida das duas entradas explícitas de `proacl`, e é essa a que abre em baixo.
const alargamentoDeclarado = () => { const s = alargamentoDe(textoCand); return s === '' ? [] : s.split(',').sort(); };

// ---- conferência de saída (só tem objeto a medir no modo reversão) --------------
// O par (bytes, md5) do corpo da viva lê-se do RUNBOOK versionado, não do cabeçalho da candidata: a candidata
// está bloqueada por byte — o registo de aplicação de 21/11 certifica `3d2a3860…`, por isso corrigir-lhe um
// número escreveria um registo de aplicação que já não descreve o banco. A frase do runbook é o lado que pode
// ser corrigido por medida, e é dela que o esperado se deriva; desapareceu a frase, isto é aborta, não verde.
const corpoDeclarado = (() => {
  const t = cru(CAM_RUNBOOK).replace(/\s+/g, ' ');
  const m = /CORPO-DA-VIVA · register_gate_checkin — pg_get_functiondef ([\d ]+) B, md5 ([0-9a-f]{32})/.exec(t);
  if (!m) throw new Error('RUNBOOK_SEM_FRASE_CORPO-DA-VIVA — o esperado desta régua tem de vir de prova versionada');
  return { bytes: Number(m[1].trim().replace(/\s+/g, '')), md5: m[2], frase: m[0] };
})();
// O `xmin` é a prova de que o DDL não reescreveu a viva, e não depende de nenhum hash declarado: um tuplo
// atualizado ganha `xmin` da transacção que o escreveu, e a transacção que criou o revestimento é a mesma que
// criou o tuplo de `register_gate_checkin_v2`. `viva < revestimento` quer dizer «a viva é anterior à aplicação».
const conferenciaDeSaida = (m) => [m.authenticated_pode === true, m.anon_pode === false,
  m.alargamento_de_papeis.length === 0,
  m.tem_public === false, m.corpo_bytes === corpoDeclarado.bytes, m.corpo_md5 === corpoDeclarado.md5,
  m.md5_node === m.md5_sql, Number(m.xmin_viva) < Number(m.xmin_revestimento)];
const mundoMedido = privs === null ? null : { authenticated_pode: privs.authenticated_pode, anon_pode: privs.anon_pode,
  service_role_pode: privs.service_role_pode, tem_public: String(privs.acl).split(',').map((x) => x.trim()).some((x) => x.startsWith('=')),
  corpo_bytes: corpoViva.bytes, corpo_md5: corpoViva.md5_sql, md5_node: md5VivaNode, md5_sql: corpoViva.md5_sql,
  xmin_viva: corpoViva.xmin, xmin_revestimento: privs.xmin, acl: privs.acl, papeis_viva: papeisVivos,
  papeis_revestimento: papeisDe(privs.acl),
  alargamento_de_papeis: papeisDe(privs.acl).filter((r) => !papeisVivos.includes(r)) };
const saidaReal = mundoMedido === null ? null : conferenciaDeSaida(mundoMedido);
// Os mundos fabricados compõem-se em tempo de execução a partir do que a candidata DECLARA, nunca do que foi
// medido: se a base fosse a medição, um dia em que o mundo estivesse errado o fixture «como declarado» herdaria
// o erro e os dentes desapareceriam. Cada um abre UMA cláusula, que é o que dá positivo a cada vermelho abaixo.
const MUNDO_DECLARADO = { authenticated_pode: true, anon_pode: false,
  tem_public: false, corpo_bytes: corpoDeclarado.bytes, corpo_md5: corpoDeclarado.md5, md5_node: corpoDeclarado.md5, md5_sql: corpoDeclarado.md5,
  xmin_viva: '1', xmin_revestimento: '2', alargamento_de_papeis: alargamentoDeclarado() };
const FIX_MUNDOS = {
  como_declerado: MUNDO_DECLARADO,
  auth_tambem_para_anon: Object.assign({}, MUNDO_DECLARADO, { anon_pode: true }),
  service_role_restituido: Object.assign({}, MUNDO_DECLARADO, { alargamento_de_papeis: ['service_role'] }),
  public_reaberto: Object.assign({}, MUNDO_DECLARADO, { tem_public: true }),
  corpo_da_viva_um_byte_fora: Object.assign({}, MUNDO_DECLARADO, { corpo_bytes: corpoDeclarado.bytes + 1 }),
  corpo_da_viva_reescrito: Object.assign({}, MUNDO_DECLARADO, { corpo_md5: 'f'.repeat(32) }),
  canais_de_md5_divergentes: Object.assign({}, MUNDO_DECLARADO, { md5_node: '0'.repeat(32) }),
  viva_reescrita_pela_aplicacao: Object.assign({}, MUNDO_DECLARADO, { xmin_viva: '3', xmin_revestimento: '2' }),
};

const falhas = [];
const portoes = [];
const gate = (nome, obtido, esperado) => {
  portoes.push(nome);
  const o = JSON.stringify(obtido), e = JSON.stringify(esperado);
  if (o !== e) falhas.push({ portao: nome, obtido: o, esperado: e });
};

gate('o_estado_vivo_bate_com_o_que_este_modo_pressupoe',
  [MODO === 'candidata' ? linhasV2 === 0 : linhasV2 >= 1, v.definer === true,
    v.config.includes('search_path=""'), v.volatilidade === 'v', dono],
  [true, true, true, true, 'postgres']);
gate('a_identidade_declarada_na_candidata_e_a_identidade_medida_da_viva',
  [argsDeDeclaracao(textoCand) === identidadeViva, identidadeViva === FIX_ARG_OK,
    argsDeDeclaracao(textoCand) === FIX_ARG_OK, nomesDeDeclaracao(textoCand) === nomesEncaminhados],
  [true, true, true, true]);
gate('as_colunas_devolvidas_batem_na_ordem_e_o_tipo_de_duas_palavras_preserva_se',
  [colunasDeDeclaracao(textoCand) === colunasVivas, /timestamp with time zone/.test(colunasVivas),
    nomesSelecionados.length === 11, nomesSelecionados.join(',') === nomesDeColunasVivas.join(',')],
  [true, true, true, true]);
gate('a_candidata_e_somente_aditiva_e_a_reversao_somente_retira',
  [estCand.create_function, estCand.alter, estCand.drop_function, estCand.drop_policy, estCand.create_policy,
    estCand.insert, estCand.update, estCand.delete, estCand.grant_execute, estCand.revoke,
    estRev.create_function, estRev.drop_function, estRev.alter, estRev.grant_execute, estRev.revoke],
  [1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0]);
// As duas condições estruturais que o aplicador verifica antes de enviar seja o que for, medidas aqui com as
// mesmas strings: `BEGIN;`/`COMMIT;` no cru, e o md5/bytes que ele vai comparar. Um verde que não dissesse
// isto deixaria o aplicador recusar por um motivo que este instrumento podia ter provado e não provou.
gate('cada_peca_e_uma_sola_transacco_nos_bytes_que_o_aplicador_le',
  [trCand.begin, trCand.commit, trRev.begin, trRev.commit],
  [1, 1, 1, 1]);
gate('a_pegada_certificada_e_a_do_ficheiro_crudo_e_nao_a_do_texto_normalizado',
  [fich.candidata.md5 === md5(rawCand), fich.reversao.md5 === md5(rawRev),
    fich.candidata.bytes === Buffer.byteLength(rawCand, 'utf8'),
    md5(textoCand) !== md5(rawCand), md5(textoRev) !== md5(rawRev)],
  [true, true, true, true, true]);
gate('o_revestimento_chama_a_viva_qualificada_e_nunca_a_si_proprio',
  [chamaViva, chamaSelf, corpoCand.length > 40, colunasSelecionadas.split(', ').every((c) => /^c\./.test(c)),
    nomesSelecionados.length === nomesDeColunasVivas.length],
  [1, 0, true, true, true]);
gate('nenhum_parametro_colide_com_uma_coluna_devolvida',
  [colisaoComColunas, /public\.register_gate_checkin\(/.test(corpoCand)], ['', true]);
gate('os_graus_declerados_sao_subconjunto_dos_medidos_na_viva_e_nao_abrem_public_nem_anon',
  [estCand.grant_execute, estCand.revoke, papeisDeDeclaracao(textoCand),
    /REVOKE ALL ON FUNCTION public\.register_gate_checkin_v2\([^)]*\) FROM PUBLIC/.test(textoCand),
    alargamentoCand, /(^|,)anon(,|$)/.test(papeisDeDeclaracao(textoCand)), /(^|,)public(,|$)/.test(papeisDeDeclaracao(textoCand)),
    papeisVivos.join(','), vivaTemPublic],
  [1, 1, 'authenticated', true, '', false, false, 'authenticated,postgres,service_role', false]);
gate('a_predica_de_graus_tem_dentes_contra_os_dois_grants_falsos',
  [papeisDeDeclaracao(FIX_GRANT_SO_ANON), alargamentoDe(FIX_GRANT_SO_ANON),
    papeisDeDeclaracao(FIX_GRANT_ANON_E_LEGITIMO), alargamentoDe(FIX_GRANT_ANON_E_LEGITIMO)],
  ['anon', 'anon', 'anon,authenticated', 'anon']);
// Só o modo reversão tem objeto para medir — em candidata a função ainda não existe, e um `false` fixo seria um
// verde sobre nada. Em vez de mentir no vetor, este portão é `null` no modo que não pressupõe a peça aplicada, e
// os sete mundos fabricados abaixo correm nos DOIS modos, pelo que a régua não fica adormecida enquanto espera.
gate('em_modo_reversao_a_saida_medida_e_a_acl_declarada_e_a_viva_continua_intacta',
  MODO === 'candidata' ? null : [linhasV2, ...saidaReal],
  MODO === 'candidata' ? null : [1, true, true, true, true, true, true, true, true]);
const falsos = Object.keys(FIX_MUNDOS).filter((k) => k !== 'como_declerado');
gate('a_conferencia_de_saida_tem_dentes_e_cada_mundo_falso_abre_uma_sola_clausula',
  [conferenciaDeSaida(FIX_MUNDOS.como_declerado).every((x) => x === true),
    falsos.every((k) => conferenciaDeSaida(FIX_MUNDOS[k]).includes(false)),
    falsos.map((k) => conferenciaDeSaida(FIX_MUNDOS[k]).filter((x) => x === false).length),
    conferenciaDeSaida(FIX_MUNDOS.como_declerado).length],
  [true, true, falsos.map(() => 1), 8]);
gate('o_front_servido_chama_o_nome_ausente_exactamente_uma_vez',
  [chamadasV2, Buffer.byteLength(html), md5(html), ramoLegado.legado_chama_viva],
  [1, BUNDE_ESPERADA.bytes, BUNDE_ESPERADA.md5, true]);
// A relação que importa não é «quantos sitios», é «cada sitio do nome vivo pertence a uma das duas classes
// conhecidas, e o unico sitio legado existe porque existe um sitio do nome ausente». Um sitio novo que não
// caiba em nenhuma das duas classes, ou um ramo legado sem contrapartida, chumba aqui.
gate('todos_os_sitios_do_nome_vivo_estao_classificados_e_o_legado_tem_par_do_ausente',
  [porClasse('NAO_CLASSIFICADO'), porClasse('ramo_legado') === chamadasV2, porClasse('modulo_antigo') >= 1,
    sitiosVivos.length === porClasse('ramo_legado') + porClasse('modulo_antigo') + porClasse('NAO_CLASSIFICADO'),
    inicioModuloNovo > 0],
  [0, true, true, true, true]);
gate('as_chaves_que_o_chamador_passa_batem_com_os_seis_argumentos',
  [chavesDasChamadas.nomes, chavesDasChamadas.nomes.split(',').length], [nomesDeDeclaracao(textoCand), 6]);
gate('a_regua_tem_dentes_contra_os_seis_falsos', [
  FIX_ARG_OK === FIX_TIPO_TROCADO,
  FIX_ARG_OK === FIX_ARIDADE,
  FIX_DEFAULT_PRESO === identidadeViva,
  separa(FIX_COLUNAS_DUAS_PALAVRAS) === 'checked_at timestamp with time zone, entry_status text',
  colunasDeDeclaracao(textoCand) === FIX_COLUNA_A_MAIS,
  new RegExp(`\\b${NOME}\\s*\\(`, 'g').test(corpoCand) === (chamaSelf > 0)],
  [false, false, false, true, false, true]);
gate('nenhum_identificador_pessoal_nem_token_entra_neste_registo', (() => {
  const probe = JSON.stringify({ identidadeViva, colunasVivas, papeisVivos, chaves: chavesDasChamadas.nomes, estCand, estRev, corpoCand });
  return [/eyJ[A-Za-z0-9_-]{10,}/.test(probe), /(senha|password|passwd)\s*[:=]\s*["'][^"']{6,}/i.test(probe), /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(probe)];
})(), [false, false, false]);

const saida = {
  programa: 'scripts/p73-pen42-preflight.mjs', modo: MODO, em: new Date().toISOString(),
  metodo: 'pg_proc e pg_get_function_* pela Management API (sem JWT de sessão, logo sem RLS e sem escrita); a identidade esperada lê-se da declaração da candidata e confirma-se contra o catálogo; as chamadas contam-se nos bytes do bundle servido',
  // `ficheiros` é o nome do campo que o aplicador lê (`preJson.ficheiros[candidata|reversao]`) para conferir a
  // pegada antes de enviar: chamá-lo `pecas` aqui seria um verde que o caminho de escrita não consegue ler.
  ficheiros: { candidata: fich.candidata, reversao: fich.reversao, bundle: pegada(CAM_BUNDLE, html) },
  viva: { oid: v.oid, nome: VIVA, dono, definer: v.definer, config: v.config, volatilidade: v.volatilidade, identidade: identidadeViva, colunas: colunasVivas, papeis: papeisVivos, tem_public: vivaTemPublic },
  ausente_no_catalogo: { nome: NOME, linhas_em_pg_proc: linhasV2 },
  // Em modo candidata `medido` é `null` porque não há objeto; as oito cláusulas e os dois md5 imprimem-se sempre,
  // porque a régua dos dentes corre nos dois modos e o leitor tem de poder ver o que ela comparou. O esperado do
  // par (bytes, md5) vem do runbook (`CORPO-DA-VIVA`), não da candidata: os bytes dela estão bloqueados pelo
  // registo de aplicação, e uma régua que lesse o esperado do ficheiro que ela própria valida seria tautologia.
  conferencia_de_saida: { modo_em_que_mede: 'reversao', corpo_declarado_no_runbook: corpoDeclarado,
    medido: mundoMedido, clausulas: saidaReal,
    mundos_fabricados: Object.fromEntries(Object.entries(FIX_MUNDOS).map(([k, m]) => [k, conferenciaDeSaida(m)])) },
  estrutura: { candidata: estCand, reversao: estRev },
  transacco: { candidata: trCand, reversao: trRev, regex_do_aplicador: '/^BEGIN;/m e /^COMMIT;/m sobre os bytes crus' },
  front: { chamadas_ao_nome_ausente: chamadasV2, chamadas_a_viva: chamadasViva, chaves_passadas: chavesDasChamadas.nomes,
    sitios_do_chamador: chavesDasChamadas.sitios, ramo_legado_chama_viva: ramoLegado.legado_chama_viva, indice_do_ramo_medido: ramoLegado.bytes_ancora,
    sitios_vivos_classificados: sitiosVivos, por_classe: { ramo_legado: porClasse('ramo_legado'), modulo_antigo: porClasse('modulo_antigo'), nao_classificados: porClasse('NAO_CLASSIFICADO') },
    inicio_do_modulo_novo: inicioModuloNovo },
  o_que_este_verde_nao_autoriza: 'nada: é leitura. Aplicar a candidata, publicar seja o que for, escrever no banco e git push continuam a pedir cada um a sua frase literal.',
  o_que_este_verde_nao_prova: 'que a aplicação da candidata faça a portaria funcionar de ponta a ponta: isso só se mede depois, no browser. E a frase que aqui estava antes de 21/11 estava invertida contra os bytes, pelo que fica corrigida por medida: `gateLegacyMode()` é `state.loaded && (state.errors.includes("configuração de turnos") || state.errors.includes("calendário letivo"))`, e o estado medido de hoje — `B_hoje_200_com_zero_linhas` em `evidence/p73-rm52-estado-calendario-20-11.txt` — tem as mesas criadas a devolver 200 com zero linhas, logo nenhuma das duas etiquetas entra e o check-in já chama o nome ausente com `lanca=true`. O ramo legado só tinha valor no estado A, antes do DDL do calendário, quando o fetch das mesas rebentava. Também não prova nada sobre `bfr_confirm_school_calendar` nem `correct_gate_attendance`, que este instrumento não abre.',
  portoes, falhas,
};
saida.veredito = falhas.length === 0
  ? `P73_PEN42_PREFLIGHT_VERDE_${MODO.toUpperCase()} ${portoes.length}/0`
  : `P73_PEN42_PREFLIGHT_VERMELHO_${MODO.toUpperCase()} ${falhas.length} de ${portoes.length} portoes`;
writeFileSync(OUT, JSON.stringify(saida, null, 2) + '\n');
console.log(`MODO ${MODO} · candidata ${saida.ficheiros.candidata.md5} ${saida.ficheiros.candidata.bytes} B · reversao ${saida.ficheiros.reversao.md5} ${saida.ficheiros.reversao.bytes} B`);
console.log(`VIVA oid=${saida.viva.oid} dono=${saida.viva.dono} definer=${saida.viva.definer} config=${saida.viva.config} papeis=${JSON.stringify(saida.viva.papeis)}`);
console.log(`IDENTIDADE_VIVA ${identidadeViva}`);
console.log(`IDENTIDADE_CANDIDATA ${argsDeDeclaracao(textoCand)}`);
console.log(`COLUNAS ${colunasVivas}`);
console.log(`AUSENTE ${NOME} linhas_em_pg_proc=${linhasV2}`);
console.log(`SAIDA declarado=${JSON.stringify(corpoDeclarado)} medido=${JSON.stringify(mundoMedido)} clausulas=${JSON.stringify(saidaReal)} dentes=${JSON.stringify(Object.fromEntries(falsos.map((k) => [k, conferenciaDeSaida(FIX_MUNDOS[k]).filter((x) => x === false).length])))}`);
console.log(`FRONT chamadas_v2=${chamadasV2} chamadas_viva=${chamadasViva} classes=${JSON.stringify(saida.front.por_classe)} chaves=${saida.front.chaves_passadas}`);
console.log(`ESTRUTURA candidata ${JSON.stringify(estCand)}`);
console.log(`ESTRUTURA reversao ${JSON.stringify(estRev)}`);
for (const f of falhas) console.log(`  FALHA ${f.portao} obtido=${f.obtido} esperado=${f.esperado}`);
console.log(`${saida.veredito} · ${portoes.length} portoes · registo ${OUT}`);
process.exit(falhas.length === 0 ? 0 : 1);
