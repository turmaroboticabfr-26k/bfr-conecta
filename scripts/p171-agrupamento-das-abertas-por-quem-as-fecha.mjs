// Agrupa as pendencias ABERTAS por quem as fecha, a partir do registro do p133, e nao da minha memoria.
// Uso: node scripts/p171-agrupamento-das-abertas-por-quem-as-fecha.mjs <registro-p133.json> <captura-saida.txt>
//      node scripts/p171-agrupamento-das-abertas-por-quem-as-fecha.mjs --fixtures
// Porque esta peca existe: as contas de agrupamento que citei neste ciclo vieram dum guiao do directorio de sessao
// (sm58-grupos-de-ok.mjs) que ja nao resolve em disco nenhures - procurado no repo, no tmp e no directorio de sessao.
// Uma cifra sem produtor nao e medida, entao o agrupamento passa a ter peca versionada.
// Proveniencia em tres camadas, cada uma com aborta propria:
//   (1) o caminho do registro e argumento obrigatorio, sem default: um default apontado para uma variante superada
//       deixa o artefacto escrito e rebenta mais tarde (a licao do p134 - o input escolhido tem de bater);
//   (2) os nomes do vocabulario (quatro familias de OK, oito de accao nomeada, a etiqueta de nenhum) sao lidos do
//       FICHEIRO do produtor; se la nao estiverem, aborta - esta peca nao re-dactilografa predicados alheios;
//   (3) a identidade do produtor que escreveu o registro e conferida por bytes e md5: o registro declara no proprio
//       emissor_md5 o codigo que o produziu, e eu comparo-o com a fonte de que li o vocabulario. Se divergem, o
//       vocabulario que uso nao e o que produziu as etiquetas que vou contar, e a peca aborta.
// O agrupamento e feito sobre abertas[], que ja traz ok[].exigido e acao[].nome medidos pelo produtor; aqui nao se
// re-escreve nenhuma regex de estado. As quatro faces sao uma particao (disjunta e cobrindo as abertas) e o
// histograma de familias e uma contagem de OCORRENCIAS, nao de linhas: a soma do histograma nao e o numero de
// abertas, porque uma linha pode citar duas familias. Dizer «a soma bate com as linhas» seria a regua do 18/11, sem
// positivo; por isso a mesma grandeza e contada por duas rotas independentes e o portao confere as duas.
// As quatro faces tambem se conferem com vocabulario_de_acao_nomeada.particao_das_quatro_faces do proprio registro:
// o produtor calcula-as sobre as 48 linhas, eu sobre as abertas; o meu conjunto tem de ser subconjunto do dele.
// Antes de sair, a peca pede ao p168 a varredura de cifra dupla sobre a captura que acabou de escrever - a regua
// vive num sitio so. Vermelho ali e motivo de renomear a captura com o defeito no nome, nunca de a sobrescrever.
// Nota de leitura da captura: as linhas do DUO acrescem DEPOIS do meu veredicto, portanto o
// regiao_cobre_o_fim=true que nelas se le descreve o corpo antes do acrescimo e nao o ficheiro final, que passa a ter
// o veredicto do p168 depois do P171_AGRUPAMENTO_MEDIDO. Dizer que a regiao cobre o ficheiro inteiro seria ler mal a
// propria linha que escrevi.
// Toda esta peca e escrita em ASCII: a familia de corruptela letra->glifo ja me partiu dois ficheiros longos.
// Os portoes imprimem-se portao_<nome>=OK ou portao_<nome>=VERMELHO, com o sinal de igual COLADO ao nome. A razao e
// de proveniencia e nao de gosto: a regua de cifra dupla do p168 exclui uma linha pelo PRIMEIRO par chave=valor que
// nela aparece, portanto um espaco antes do veredicto fazia a primeira chave ser 'obtido' e os cinco portoes
// entravam na varredura a repetir 'obtido' e 'esperado' com valores diversos na mesma regiao - foi exactamente o que
// a minha primeira corrida real (sm58b) apanhou, e o remedio foi conformar a emissao, nunca alargar a exclusao do
// p168, que seria mover a regua para me passar o defeito. A conformidade da forma tem fixture nos dois sentidos.
import { readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const REPO = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const PRODUTOR = REPO + '/scripts/p133-inventario-das-pendencias-abertas.mjs';
const REGUA_DUO = REPO + '/scripts/p168-prova-de-edicao-sem-corte.mjs';
const EU = readFileSync(fileURLToPath(import.meta.url), 'utf8');
const EMISSOR = { bytes: Buffer.byteLength(EU, 'utf8'), md5: createHash('md5').update(EU).digest('hex') };
const md5_8 = (s) => createHash('md5').update(s).digest('hex').slice(0, 8);
const FACES = ['so_familia_de_ok', 'familia_de_ok_e_acao_nomeada', 'so_acao_nomeada', 'nenhuma_das_duas'];

function blocoDeArray(fonte, nomeConst) {
  const i = fonte.indexOf('const ' + nomeConst + ' = [');
  if (i < 0) throw new Error('ABORTA: o produtor nao declara a lista ' + nomeConst + ', por isso esta peca nao pode ler o vocabulario');
  const fim = fonte.indexOf('\n];', i);
  if (fim < 0) throw new Error('ABORTA: o bloco ' + nomeConst + ' do produtor nao fecha, o recorte nao e confiavel');
  return fonte.slice(i, fim);
}
function nomesDoBloco(fonte, nomeConst, minimo) {
  const bloco = blocoDeArray(fonte, nomeConst);
  const nomes = Array.from(bloco.matchAll(/^\s*\['([^']+)',/gm), (m) => m[1]);
  if (nomes.length < minimo) throw new Error('ABORTA: li ' + nomes.length + ' nomes do bloco ' + nomeConst + ' do produtor, esperava pelo menos ' + minimo);
  return nomes;
}
function etiquetaDeNenhum(fonte) {
  const m = fonte.match(/const SEM_FAMILIA_DE_OK = '([^']+)'/);
  if (!m) throw new Error('ABORTA: o produtor nao declara SEM_FAMILIA_DE_OK como string simples');
  return m[1];
}
function leVocabulario(caminhoProdutor) {
  const fonte = readFileSync(caminhoProdutor, 'utf8');
  return {
    fonte,
    ok: nomesDoBloco(fonte, 'OK_EXIGIDO', 2),
    acao: nomesDoBloco(fonte, 'ACAO_NOMEADA', 2),
    nenhum: etiquetaDeNenhum(fonte),
    bytes: Buffer.byteLength(fonte, 'utf8'),
    md5_8: md5_8(fonte),
  };
}

const temFamiliaDeOk = (i, nenhum) => i.ok.some((o) => o.exigido !== nenhum);

function classifica(registro, vocab) {
  if (registro.peca !== 'p133-inventario-das-pendencias-abertas.mjs') throw new Error('ABORTA: o registro nao se declara do p133, declara peca=' + registro.peca);
  if (registro.emissor_bytes !== vocab.bytes || registro.emissor_md5 !== vocab.md5_8) {
    throw new Error('ABORTA: identidade do produtor nao conferida: o registro declara emissor_bytes=' + registro.emissor_bytes + ' emissor_md5=' + registro.emissor_md5 + ' e a fonte de que li o vocabulario da ' + vocab.bytes + ' / ' + vocab.md5_8 + '; as etiquetas contadas viriam de outro codigo');
  }
  const abertas = registro.abertas;
  const foraDoVocab = [];
  for (const i of abertas) {
    for (const o of i.ok) if (o.exigido !== vocab.nenhum && !vocab.ok.includes(o.exigido)) foraDoVocab.push(i.id + '.ok=' + o.exigido);
    for (const a of i.acao) if (!vocab.acao.includes(a.nome)) foraDoVocab.push(i.id + '.acao=' + a.nome);
  }
  const faceDe = (i) => {
    const temOk = temFamiliaDeOk(i, vocab.nenhum);
    const temAcao = i.acao.length > 0;
    return temOk && temAcao ? 'familia_de_ok_e_acao_nomeada' : temOk ? 'so_familia_de_ok' : temAcao ? 'so_acao_nomeada' : 'nenhuma_das_duas';
  };
  const porFace = {};
  for (const f of FACES) porFace[f] = [];
  for (const i of abertas) porFace[faceDe(i)].push(i.id);
  const porFamiliaOk = {};
  for (const nome of vocab.ok) porFamiliaOk[nome] = [];
  for (const i of abertas) for (const o of i.ok) if (vocab.ok.includes(o.exigido)) porFamiliaOk[o.exigido].push(i.id);
  const ocorrencias = Object.values(porFamiliaOk).reduce((a, x) => a + x.length, 0);
  const distintasPorLinha = abertas.reduce((a, i) => a + new Set(i.ok.map((o) => o.exigido).filter((x) => x !== vocab.nenhum && vocab.ok.includes(x))).size, 0);
  const comFamilia = abertas.filter((i) => temFamiliaDeOk(i, vocab.nenhum)).map((i) => i.id);
  const semFamilia = abertas.filter((i) => !temFamiliaDeOk(i, vocab.nenhum)).map((i) => i.id);
  const multifamilia = abertas.filter((i) => new Set(i.ok.map((o) => o.exigido).filter((x) => x !== vocab.nenhum)).size > 1).map((i) => i.id);
  const produtorFace = (registro.vocabulario_de_acao_nomeada || {}).particao_das_quatro_faces || null;
  const foraDoConjuntoDoProdutor = produtorFace ? FACES.filter((f) => porFace[f].some((id) => !produtorFace[f].includes(id))) : 'registro_sem_particao_do_produtor';
  return { abertas, porFace, porFamiliaOk, ocorrencias, distintasPorLinha, comFamilia, semFamilia, multifamilia, produtorFace,
    somaDasFaces: FACES.reduce((a, f) => a + porFace[f].length, 0), foraDoVocab, foraDoConjuntoDoProdutor };
}

// Uma linha de portao so e excluida da varredura de cifra dupla do p168 se o PRIMEIRO par chave=valor dela for o
// nome do portao. Esta funcao devolve as linhas de portao fora dessa forma: lista de candidatos, nao veredicto, e os
// fixtures provam que dispara na direccao do defeito que me apanhou na corrida sm58b.
function portoesForaDaForma(texto) {
  return texto.split('\n').filter((l) => l.startsWith('portao_')).filter((l) => !/^portao_[a-z0-9_]+=(OK|VERMELHO) /.test(l));
}
function portoes(r) {
  const p = [];
  const add = (nome, ob, esp) => p.push({ nome, obtido: ob, esperado: esp, ok: JSON.stringify(ob) === JSON.stringify(esp) });
  const n = r.abertas.length;
  add('as_quatro_faces_sao_disjuntas_e_cobrem_as_abertas', [r.somaDasFaces, new Set(FACES.flatMap((f) => r.porFace[f])).size], [n, n]);
  add('nenhuma_etiqueta_fora_do_vocabulario_lido_do_produtor', r.foraDoVocab, []);
  add('o_conjunto_de_cada_face_e_subconjunto_do_do_produtor', r.foraDoConjuntoDoProdutor, []);
  add('ter_ou_nao_ter_familia_de_ok_parte_as_abertas_sem_sobra', r.comFamilia.length + r.semFamilia.length, n);
  add('as_duas_rotas_de_contar_ocorrencias_de_familia_batem', r.distintasPorLinha, r.ocorrencias);
  return p;
}

function corpo(r, vocab, caminhoRegistro, registro) {
  const ps = portoes(r);
  const vermelhos = ps.filter((p) => !p.ok).map((p) => p.nome);
  const L = [];
  L.push('alvo=' + caminhoRegistro);
  L.push('emissor_bytes=' + EMISSOR.bytes + ' emissor_md5=' + EMISSOR.md5);
  L.push('produtor_bytes=' + vocab.bytes + ' produtor_md5_8=' + vocab.md5_8 + ' registro_md5_8=' + registro.emissor_md5);
  L.push('registro_rotulo=' + registro.rotulo + ' registro_em=' + registro.em);
  L.push('vocabulario_lido_do_produtor ok=' + vocab.ok.length + ' acao=' + vocab.acao.length + ' etiqueta_de_nenhum_lida=true');
  L.push('linhas_pen=' + registro.linhas_pen + ' classes=' + JSON.stringify(registro.contagem_por_classe));
  L.push('abertas=' + r.abertas.length + ' soma_das_quatro_faces=' + r.somaDasFaces);
  L.push('faces=' + JSON.stringify(Object.fromEntries(FACES.map((f) => [f, r.porFace[f].length]))));
  L.push('ids_por_face=' + JSON.stringify(Object.fromEntries(FACES.map((f) => [f, r.porFace[f]]))));
  L.push('unidade_do_histograma=ocorrencias_de_familia_em_linha_e_nao_linhas');
  L.push('ocorrencias_contadas_por_familia=' + r.ocorrencias + ' ocorrencias_contadas_por_linha_distinta=' + r.distintasPorLinha);
  L.push('com_familia=' + r.comFamilia.length + ' sem_familia=' + r.semFamilia.length + ' multifamilia=' + r.multifamilia.length);
  L.push('ids_multifamilia=' + JSON.stringify(r.multifamilia));
  L.push('grupos_por_quem_fecha=' + JSON.stringify(r.porFamiliaOk));
  L.push('tamanho_de_cada_grupo_de_ok=' + JSON.stringify(Object.fromEntries(Object.entries(r.porFamiliaOk).map(([k, v]) => [k, v.length]))));
  L.push('etiquetas_fora_do_vocabulario=' + JSON.stringify(r.foraDoVocab));
  L.push('fora_do_conjunto_do_produtor=' + JSON.stringify(r.foraDoConjuntoDoProdutor));
  L.push('faces_do_produtor_lidas=' + (r.produtorFace ? 'sim' : 'nao'));
  for (const p of ps) L.push('portao_' + p.nome + '=' + (p.ok ? 'OK' : 'VERMELHO') + ' obtido=' + JSON.stringify(p.obtido) + ' esperado=' + JSON.stringify(p.esperado));
  L.push('portoes=' + ps.length + ' vermelhos=' + vermelhos.length + ' lista_de_vermelhos=' + JSON.stringify(vermelhos));
  L.push('o_que_prova=' + JSON.stringify('agrupamento das abertas por face e por familia de OK, com o vocabulario lido do ficheiro do produtor e a identidade desse produtor conferida por bytes e md5 contra o registro'));
  L.push('o_que_NAO_prova=' + JSON.stringify('que as familias de OK sejam a unica via de fecho, que a classe ABERTA esteja certa (vem do p133 e esta peca so le o que ele registou), nem quanto cada linha custa em horas ou em risco'));
  L.push('P171_AGRUPAMENTO_MEDIDO abertas=' + r.abertas.length + ' faces=' + FACES.map((f) => f + ':' + r.porFace[f].length).join(','));
  return { texto: L.join('\n') + '\n', vermelhos };
}

function guardaDeSobrescrita(caminho) {
  if (existsSync(caminho)) throw new Error('ABORTA: a captura ' + caminho + ' ja existe; a re-corrida pede sufixo novo, sobrescrever apagaria a corrida que a prosa cita');
}

if (process.argv.includes('--fixtures')) {
  const vocab = { ok: ['OK de publicacao', 'OK de aplicacao de DDL', 'OK de mint ou rotacao de senha', 'decisao humana (produto ou aparelho)'], acao: ['candidata', 'escrita', 'nova_versao'], nenhum: 'nenhum_familia_de_ok_lida', bytes: 100, md5_8: 'abc12345' };
  const mkReg = (abertas, particao) => ({ peca: 'p133-inventario-das-pendencias-abertas.mjs', rotulo: 'f', em: 't', emissor_bytes: 100, emissor_md5: 'abc12345', linhas_pen: 48, contagem_por_classe: { ABERTA: abertas.length }, abertas, vocabulario_de_acao_nomeada: particao ? { particao_das_quatro_faces: particao } : undefined });
  const mkItem = (id, ok, acao) => ({ id, pri: 'M', ok: ok.map((e) => ({ exigido: e, gatilho: 'x' })), acao: acao.map((nome) => ({ nome, ocorrencias: 1, gatilho: 'y' })), registo: null });
  const base = [mkItem('PEN-01', ['nenhum_familia_de_ok_lida'], ['escrita']), mkItem('PEN-02', ['OK de publicacao'], []), mkItem('PEN-03', ['OK de publicacao', 'OK de aplicacao de DDL'], ['candidata']), mkItem('PEN-04', ['nenhum_familia_de_ok_lida'], [])];
  const particaoBase = { so_familia_de_ok: ['PEN-02'], familia_de_ok_e_acao_nomeada: ['PEN-03'], so_acao_nomeada: ['PEN-01'], nenhuma_das_duas: ['PEN-04'] };
  const soEstes = (r, esperados) => { const ps = portoes(r).filter((p) => !p.ok).map((p) => p.nome); if (ps.length !== esperados.length || !esperados.every((x) => ps.includes(x))) throw new Error('PORTOES_DE_MAIS_OU_DE_MENOS: ' + JSON.stringify(ps)); };
  const casos = [];
  const roda = (nome, fn, esperaAborto, marca) => {
    let abortou = false, msg = '';
    try { fn(); } catch (e) { abortou = true; msg = e.message; }
    casos.push({ nome, abortou, esperado: esperaAborto ? abortou && msg.includes(marca) : !abortou, msg });
  };
  roda('positivo_as_quatro_faces_e_as_duas_rotas', () => soEstes(classifica(mkReg(base, particaoBase), vocab), []), false);
  roda('aborta_se_o_registro_nao_for_do_p133', () => { const x = mkReg(base, particaoBase); x.peca = 'outra.cjs'; classifica(x, vocab); }, true, 'nao se declara do p133');
  roda('aborta_se_a_identidade_do_produtor_divergir', () => { const x = mkReg(base, particaoBase); x.emissor_md5 = 'ffff0000'; classifica(x, vocab); }, true, 'identidade do produtor nao conferida');
  // Um portao vermelho nao aborta a peca: nestes casos o que se espera e que a lista de portoes vermelhos seja
  // exactamente a nomeada no fixture, e nenhures mais. Contar estes casos na prosa era uma cifra que envelhecia ao
  // primeiro fixture novo, por isso o que os nomeia e o comportamento, nao o numero.
  // Marcar estes casos como esperaAborto=true foi o meu erro na primeira corrida - o aborta so existe nas tres vias
  // que nao podem continuar (peca estranha ao produtor, identidade divergente, guarda de sobrescrita).
  roda('apanha_etiqueta_fora_do_vocabulario', () => soEstes(classifica(mkReg([mkItem('PEN-09', ['OK de fogo'], [])], { so_familia_de_ok: [], familia_de_ok_e_acao_nomeada: [], so_acao_nomeada: [], nenhuma_das_duas: ['PEN-09'] }), vocab), ['nenhuma_etiqueta_fora_do_vocabulario_lido_do_produtor', 'o_conjunto_de_cada_face_e_subconjunto_do_do_produtor']), false);
  roda('apanha_face_fora_do_conjunto_do_produtor', () => soEstes(classifica(mkReg(base, { so_familia_de_ok: [], familia_de_ok_e_acao_nomeada: ['PEN-03'], so_acao_nomeada: ['PEN-01'], nenhuma_das_duas: ['PEN-04'] }), vocab), ['o_conjunto_de_cada_face_e_subconjunto_do_do_produtor']), false);
  roda('apanha_registro_sem_particao_do_produtor', () => soEstes(classifica(mkReg(base, null), vocab), ['o_conjunto_de_cada_face_e_subconjunto_do_do_produtor']), false);
  roda('apanha_particao_que_nao_cobre_as_abertas', () => { const r = classifica(mkReg(base, particaoBase), vocab); r.somaDasFaces -= 1; soEstes(r, ['as_quatro_faces_sao_disjuntas_e_cobrem_as_abertas']); }, false);
  roda('apanha_linha_que_repete_a_mesma_familia', () => { const r = classifica(mkReg([mkItem('PEN-10', ['OK de publicacao', 'OK de publicacao'], [])], { so_familia_de_ok: ['PEN-10'], familia_de_ok_e_acao_nomeada: [], so_acao_nomeada: [], nenhuma_das_duas: [] }), vocab); if (r.ocorrencias !== 2 || r.distintasPorLinha !== 1) throw new Error('CONTROLO_SEM_POSITIVO: ' + r.ocorrencias + ' / ' + r.distintasPorLinha); soEstes(r, ['as_duas_rotas_de_contar_ocorrencias_de_familia_batem']); }, false);
  // A forma da emissao tem fixture nos dois sentidos: o corpo conforme nao tem candidatos, e o espaco em branco antes
  // do veredicto - o defeito exacto da corrida sm58b, que so se apanhou porque o p168 varreu a captura ja escrita -
  // tem de ser nomeado aqui, senao a proxima peca que eu compus repetiria o erro sem nada que disparasse.
  roda('o_corpo_emite_os_portoes_na_forma_excluida_pelo_p168', () => { const reg = mkReg(base, particaoBase); const off = portoesForaDaForma(corpo(classifica(reg, vocab), vocab, 'f', reg).texto); if (off.length) throw new Error('PORTOES_FORA_DA_FORMA: ' + JSON.stringify(off)); }, false);
  roda('apanha_portao_com_espaco_antes_do_veredicto', () => { const off = portoesForaDaForma('portao_um OK obtido=1 esperado=1\nportao_dois=OK obtido=2 esperado=2\n'); if (off.length !== 1 || off[0].indexOf('portao_um ') !== 0) throw new Error('CONTROLO_SEM_POSITIVO: ' + JSON.stringify(off)); }, false);
  roda('aborta_a_guarda_sobre_um_ficheiro_que_ja_existe', () => { const p = tmpdir() + '/p171-guarda-fixture-' + process.pid + '.txt'; writeFileSync(p, 'x'); try { guardaDeSobrescrita(p); throw new Error('GUARDA_CEGA'); } finally { rmSync(p, { force: true }); } }, true, 'ja existe');
  roda('deixa_passar_um_ficheiro_novo', () => { const p = tmpdir() + '/p171-guarda-fixture-novo-' + process.pid + '.txt'; guardaDeSobrescrita(p); if (existsSync(p)) throw new Error('O_GUARD_ESCRVEU'); }, false);
  const inesperados = casos.filter((c) => !c.esperado);
  console.log(casos.map((c) => c.nome + ' abortou=' + c.abortou + ' veredicto=' + (c.esperado ? 'EXPERADO' : 'INESPERADO') + (c.msg ? ' [' + c.msg.slice(0, 80) + ']' : '')).join('\n'));
  console.log('P171_FIXTURES total=' + casos.length + ' esperados=' + (casos.length - inesperados.length) + ' inesperados=' + inesperados.length);
  if (inesperados.length) throw new Error('ABORTA: ' + inesperados.length + ' fixtures dao o veredicto errado');
  console.log('P171_FIXTURES_OK');
  process.exit(0);
}

const caminhoRegistro = process.argv[2];
const caminhoCaptura = process.argv[3];
if (!caminhoRegistro || !caminhoCaptura) throw new Error('ABORTA: uso - node scripts/p171-agrupamento-das-abertas-por-quem-as-fecha.mjs <registro-p133.json> <captura-saida.txt>; sem default para o registro, porque um default apontado para a variante superada deixaria a captura escrita com o vocabulario errado');
const vocab = leVocabulario(PRODUTOR);
const registro = JSON.parse(readFileSync(caminhoRegistro, 'utf8'));
const r = classifica(registro, vocab);
const saida = corpo(r, vocab, caminhoRegistro, registro);
if (saida.vermelhos.length) throw new Error('ABORTA portoes_vermelhos=' + JSON.stringify(saida.vermelhos) + ' - a captura nao sai por cima dum portao vermelho');
guardaDeSobrescrita(caminhoCaptura);
writeFileSync(caminhoCaptura, saida.texto);
const duo = execFileSync('node', [REGUA_DUO, '--duo', caminhoCaptura], { encoding: 'utf8' });
writeFileSync(caminhoCaptura, saida.texto + duo);
console.log(duo);
if (duo.includes('P168_DUO_FORA_DO_DOMINIO')) throw new Error('ABORTA: o p168 nao encontrou regiao de medida na minha captura, logo a varredura de cifras nao foi feita');
if (duo.includes('P168_DUO_DE_CIFRAS_ACHADO')) {
  const nomePartido = caminhoCaptura.replace(/\.txt$/, '-VERMELHO-cifra-dupla-na-captura.txt');
  writeFileSync(nomePartido, saida.texto + duo);
  rmSync(caminhoCaptura, { force: true });
  throw new Error('ABORTA: a captura ficou com cifra dupla e foi renomeada com o defeito no nome - ' + nomePartido);
}
console.log('P171_ESCRITO em=' + caminhoCaptura + ' abertas=' + r.abertas.length + ' ocorrencias_de_familia=' + r.ocorrencias);
