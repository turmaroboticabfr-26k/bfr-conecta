#!/usr/bin/env node
// SM.22 adenda — o fecho do fecho. Nao mede o produto: mede o INSTRUMENTO e a EVIDENCIA do instrumento.
// Tres coisas, todas re-lidas de fontes independentes, nenhuma por memoria:
//  (1) a prova por hash da excecao dos quatro `…_chave` (re-corrida aqui, veredito no artefacto);
//  (2) a captura de portao que provou que `&&` com um contador corta a corrida — o UNICO sinal e que o
//      ficheiro tem `node_exit=` e nenhuma linha de veredicto; copiada para evidence/ com md5 igual;
//  (3) o confisso de que a captura do vermelho «o verificador era o portador» foi ESCRITA POR CIMA por um
//      re-correr meu com o mesmo nome de ficheiro: o que provam hoje sao os dois factos mediveis que
//      restam (0 casamentos no fonte commitado, 1 casamento no fixture composto em runtime), e a perda e
//      registada como perda, nao como se a evidencia existisse.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta/';
const SUF = process.env.SM22_SUF ? '-' + process.env.SM22_SUF : '';
const OUT = REPO + 'evidence/sm22-estado-final-18-11' + SUF + '.json';
const PROVA = REPO + 'evidence/sm22-prova-excecao-chave-18-11' + SUF + '.json';
const CAPTURA = REPO + '.g-sm22-indice4.txt';
const DESTINO = REPO + 'evidence/sm22-captura-portao-indice-nao-correu-so-node-exit-18-11' + SUF + '.txt';
for (const f of [OUT, PROVA, DESTINO]) if (existsSync(f)) throw new Error('ABORTA: ' + f + ' existe — correr com SM22_SUF=novo, nao por cima');
const md5 = (b) => createHash('md5').update(b).digest('hex');
const ler = (p) => readFileSync(p);
const git = (args) => execFileSync('git', args, { cwd: REPO, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });

const SENHA = /(senha|password|passwd|chave)\s*["']?\s*[:=]\s*["']([^"'`${}]{6,24})["']/gi;
const falhas = [];
const g = (nome, cond, detalhe) => { if (!cond) falhas.push(`${nome}: ${detalhe}`); return { nome, verde: !!cond, detalhe }; };

// (1) re-correr a prova da excecao e guardar-lhe o JSON
const stdoutProva = execFileSync('node', ['scripts/sm22-verifica-excecao-chave.mjs'], { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const prova = JSON.parse(stdoutProva.slice(stdoutProva.indexOf('{')));
writeFileSync(PROVA, stdoutProva);

// (2) a captura de 12 bytes: o portao nao correu, e e isso que ela prova
const bytesCaptura = ler(CAPTURA);
copyFileSync(CAPTURA, DESTINO);
const copia = ler(DESTINO);

// (3) o estado atual, medido no INDICE (git show), nao no disco
const fonteVerificador = git(['show', ':scripts/sm22-verifica-excecao-chave.mjs']);
const indice = git(['show', ':scripts/portao-indice.mjs']);
const docs = {};
for (const p of ['docs/auditoria-bfr-conecta.md', 'docs/roadmap-master.md', 'docs/roadmap-painel.html'])
  docs[p] = { bytes: statSync(REPO + p).size, md5: md5(ler(REPO + p)) };
const roadmap = git(['show', ':docs/roadmap-master.md']);
const painel = git(['show', ':docs/roadmap-painel.html']);
const audit = git(['show', ':docs/auditoria-bfr-conecta.md']);
const linhasPen = roadmap.split(/\r?\n/).filter((l) => /^\| PEN-\d+ \|/.test(l));
// A predica do produtor (scripts/ah1-cuenta-pen.mjs): pipe escapado (`\|`) NAO separa celulas. A versa o
// anterior deste ficheiro usava `split("|")` cru, a linha PEN-33 tem tres `\|` num code span, a celula 4
// passava a ser prosa, o `M` perdia um e a soma continuava 37 — o portao verde vinha do defeito.
const BARRA = String.fromCharCode(92) + '|';
const prio = { A: 0, M: 0, B: 0 };
const foraDeForma = [];
for (const l of linhasPen) {
  const c = l.split(BARRA).join('@@').split('|').map((x) => x.trim());
  if (c.length !== 7) { foraDeForma.push(`${l.match(/^\| PEN-\d+/)[0]} colunas=${c.length - 2}`); continue; }
  if (c[4] in prio) prio[c[4]]++; else foraDeForma.push(`${l.match(/^\| PEN-\d+/)[0]} pri=[${c[4]}]`);
}

const out = {
  em: new Date().toISOString(),
  metodo: 'so leitura do INDICE (git show) + re-corrida de scripts ja versionados; zero rede; zero escrita no banco; nenhum segredo impresso',
  commit: { hash: git(['rev-parse', '--short', 'HEAD']).trim(), assunto: git(['log', '-1', '--format=%s']).trim(),
    a_falta_de_origin: Number(git(['rev-list', '--count', 'origin/main..HEAD']).trim()),
    // A coluna 2 do porcelain e o que diz do ARVORE-para-INDICE; a coluna 1 diz do index. Contar a linha
    // toda faria este portao ser verde apenas DEPOIS do commit, o que o inutiliza como pre-condicao.
    arvore_suja_em_frente: git(['status', '--porcelain']).split(/\r?\n/).filter((l) => l && !/^\?\?/.test(l) && l[1] !== ' ').length },
  excecao_dos_quatro_chave: { veredito: prova.veredito, pool_de_rotulos: prova.pool_de_rotulos_extraidos_dos_diretorios,
    vencedores: prova.por_ficheiro.filter((p) => p.n_casado === 1 && p.comprimentos[0] === 15).length,
    chaves_de_sessao_comparadas: prova.chaves_de_sessao_comparadas, regua_discrimina_fixture: prova.regua_discrimina_fixture,
    padrao_identico_ao_do_portao: prova.padrao_identico_ao_do_portao,
    md5_das_quatro_fichas: [...new Set(prova.por_ficheiro.flatMap((p) => p.md5_dos_casados))],
    artefacto: 'evidence/sm22-prova-excecao-chave-18-11.json' },
  cadeia_e_e_corta_o_portao: { ficheiro: DESTINO, bytes: bytesCaptura.length, md5_original: md5(bytesCaptura),
    md5_copia: md5(copia), linhas_no_ficheiro: bytesCaptura.toString('utf8').split(/\r?\n/).filter(Boolean).length,
    tem_veredicto_do_portao: /PORTAO_INDICE_(VERDE|VERMELHO)/.test(bytesCaptura.toString('utf8')),
    o_que_prova: 'um ficheiro de portao com `node_exit=` e nenhuma linha de veredicto nao e um vermelho: e a prova de que o programa nunca foi executado' },
  verificador_deixou_de_ser_portador: { casamentos_no_fonte_commitado: [...fonteVerificador.matchAll(SENHA)].length,
    casamentos_do_fixture_em_runtime: prova.regua_discrimina_fixture === true,
    perda_assumida: 'a captura do vermelho original (`NAO_COBERTA scripts/sm22-verifica-excecao-chave.mjs senha n=1 comprimentos=20`) foi sobrescrita por um re-correr meu com o mesmo nome de ficheiro (.g-sm22-indice3.txt); nao existe evidencia em disco dessa linha, e o confisso e a evidencia' },
  estado_do_documento: { linhas_pen: linhasPen.length, prioridades: prio, linhas_fora_de_forma: foraDeForma.length,
    adenda_no_corpo: /SM\.22 adenda/.test(audit), painelCabecalho: (painel.match(/Pend\u00eancias \((\d+) itens/)||[])[1],
    documentos: docs },
  portoes: [],
};
out.portoes.push(
  g('prova_da_excecao_verde', out.excecao_dos_quatro_chave.veredito === 'EXCECAO_PROVADA_POR_HASH', out.excecao_dos_quatro_chave.veredito),
  g('os_quatro_tem_um_casamento_de_15', out.excecao_dos_quatro_chave.vencedores === 4, `${out.excecao_dos_quatro_chave.vencedores} de 4`),
  g('um_solo_valor_em_circulacao', out.excecao_dos_quatro_chave.md5_das_quatro_fichas.length === 1, JSON.stringify(out.excecao_dos_quatro_chave.md5_das_quatro_fichas)),
  g('regua_do_portao_e_a_regua_da_prova', out.excecao_dos_quatro_chave.padrao_identico_ao_do_portao === true, 'os regex divergiram'),
  g('a_captura_copiada_e_byte_identica', out.cadeia_e_e_corta_o_portao.md5_original === out.cadeia_e_e_corta_o_portao.md5_copia, 'copia divergiu do original'),
  g('a_captura_nao_tem_veredicto', out.cadeia_e_e_corta_o_portao.tem_veredicto_do_portao === false, 'entao o portao correu e a tese esta errada'),
  g('a_captura_so_tem_o_codigo_do_contador', out.cadeia_e_e_corta_o_portao.linhas_no_ficheiro === 1 && /node_exit=1/.test(bytesCaptura.toString('utf8')), `${out.cadeia_e_e_corta_o_portao.linhas_no_ficheiro} linhas`),
  g('o_verificador_commitado_nao_e_portador', out.verificador_deixou_de_ser_portador.casamentos_no_fonte_commitado === 0, `${out.verificador_deixou_de_ser_portador.casamentos_no_fonte_commitado} casamentos`),
  g('as_exceccoes_estam_no_portao_commitado', [...indice.matchAll(/arquivo: 'evidence\/sm22-[^']+\.json', classe: 'senha', n: 1, comprimentos: '15'/g)].length === 4, 'nem as 4 exceccoes estao no indice'),
  g('ledger_de_37_no_indice', out.estado_do_documento.linhas_pen === 37 && out.estado_do_documento.painelCabecalho === '37', `${out.estado_do_documento.linhas_pen} linhas · painel ${out.estado_do_documento.painelCabecalho}`),
  g('prioridades_somam_o_ledger_sem_chave_de_prosa',
    Object.keys(prio).join('') === 'AMB' && prio.A + prio.M + prio.B === linhasPen.length && foraDeForma.length === 0,
    `${JSON.stringify(prio)} · fora de forma ${foraDeForma.length}`),
  g('nada_publicado_nada_aplicado', git(['status', '--porcelain', 'scripts/sm22-motivo-do-grant-anon.mjs']).trim() === '' && out.commit.a_falta_de_origin === 1, `${out.commit.a_falta_de_origin} commit(es) por push`),
  g('nada_modificado_fora_do_indice', out.commit.arvore_suja_em_frente === 0, `${out.commit.arvore_suja_em_frente} ficheiros modificados e nao adicionados ao indice`),
);
out.veredito = falhas.length === 0 ? 'FECHO_MEDIDO' : `VERMELHO: ${falhas.length}`;
out.falhas = falhas;
if (falhas.length) { writeFileSync(OUT.replace(/\.json$/, '-VERMELHO.json'), JSON.stringify(out, null, 2) + '\n');
  for (const f of falhas) console.log('  ' + f); console.log(`SM22_FECHO_VERMELHO · registo ${OUT.replace(/\.json$/, '-VERMELHO.json')}`); process.exit(1); }
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
for (const p of out.portoes) console.log(`  portao ${p.nome}: ${p.verde ? 'VERDE' : 'VERMELHO'}`);
console.log(JSON.stringify({ commit: out.commit.hash, a_falta: out.commit.a_falta_de_origin, excecao: out.excecao_dos_quatro_chave.veredito,
  md5_unico: out.excecao_dos_quatro_chave.md5_das_quatro_fichas[0], captura: { bytes: out.cadeia_e_e_corta_o_portao.bytes, md5: out.cadeia_e_e_corta_o_portao.md5_copia },
  casamentos_no_fonte_do_verificador: out.verificador_deixou_de_ser_portador.casamentos_no_fonte_commitado, ledger: out.estado_do_documento.linhas_pen }, null, 1));
console.log(`SM22_FECHO_OK · registo ${OUT}`);
