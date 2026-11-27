// Instrumento da janela de carga dos indices de memoria.
// Pergunta que ele responde: o fecho corrente esta dentro da janela que o arranque le, e cada linha do
// indice aponta para um corpo que existe? A janela e medida a partir do inicio do ficheiro porque e assim
// que o carregador a le; por isso o indice esta ordenado do verbete mais novo para o mais velho.
// Modes: (sem argumentos) mede | --aplica-mapa escreve o bloco derivado | --selfteste fixtures.
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const SUF = process.env.P181_SUF;
if (!SUF) throw new Error('ABORTA: P181_SUF e obrigatorio -- cada corrida precisa de nome proprio');
const SELFTESTE = process.argv.includes('--selfteste');
const APLICA = process.argv.includes('--aplica-mapa');
const LIMITE = 25000;
const INDICES = [
  'C:/Users/pcmac/.qoder/projects/C--Users-pcmac-Documents-Qoder-2026-11-15-2e9c4296/memory/MEMORY.md',
  'C:/Users/pcmac/.qoder/memory/MEMORY.md',
];
const EU = readFileSync(fileURLToPath(import.meta.url), 'utf8');
const MARCO = '> Mapa derivado das linhas abaixo (nao editado a mao): ';

const md5 = (t) => createHash('md5').update(t, 'utf8').digest('hex');

function nomesDasLinhas(txt) {
  const out = [];
  for (const l of txt.split('\n')) {
    if (!l.startsWith('- [')) continue;
    const k = l.indexOf('](');
    const fim = l.indexOf(')', k);
    if (k < 0 || fim < 0) throw new Error('ABORTA: linha de verbete sem apontador por parente recto -- ' + l.slice(0, 60));
    out.push({ nome: l.slice(k + 2, fim), linha: l, bytes: Buffer.byteLength(l, 'utf8') + 1 });
  }
  return out;
}

function ordemMede(nomes) {
  const ns = nomes.map(numeroDoNome).filter((n) => n !== null);
  if (!ns.length) return 'sem_numero_em_nome_nenhum';
  return ns[0] === Math.max(...ns);
}

function numeroDoNome(nome) {
  const m = /(?:campanha-)?sm(\d{1,3})/i.exec(nome);
  return m ? Number(m[1]) : null;
}

function mede(p) {
  const dir = p.replace(/MEMORY\.md$/, '');
  const txt = readFileSync(p, 'utf8');
  const linhas = txt.split('\n');
  const items = nomesDasLinhas(txt);
  let off = 0, mapaFora = false;
  const mapaLinha = linhas.find((l) => l.startsWith(MARCO));
  const temMapa = mapaLinha !== undefined;
  const dentroIdx = [];
  let cumulative = 0;
  for (let i = 0; i < linhas.length; i++) {
    const b = Buffer.byteLength(linhas[i], 'utf8') + 1;
    if (cumulative + b <= LIMITE) dentroIdx.push(i);
    cumulative += b;
  }
  const posicoesDoVerbete = items.map((it) => linhas.indexOf(it.linha));
  const primeiro = posicoesDoVerbete[0];
  // A janela corta por BYTES, nao por linhas: `verbetes_dentro_da_janela` so conta a linha que cabe inteira, e a
  // que atravessa a fronteira e serve-se pela fraccao que o carregador ve. Sem este campo, `6 dentro / 34 fora`
  // faria crer que nada ha entre a 6.ª e a 7.ª linha, quando a 7.ª pode estar a meio.
  const idxFronteira = dentroIdx.length > 0 ? dentroIdx[dentroIdx.length - 1] + 1 : 0;
  const bytesAteFronteira = dentroIdx.length > 0 ? linhas.slice(0, dentroIdx.length).reduce((s, l) => s + Buffer.byteLength(l, 'utf8') + 1, 0) : 0;
  const linhaFronteira = idxFronteira < linhas.length ? linhas[idxFronteira] : null;
  const bytesDaLinhaFronteira = linhaFronteira === null ? 0 : Buffer.byteLength(linhaFronteira, 'utf8') + 1;
  const sobramNaJanela = Math.max(0, LIMITE - bytesAteFronteira);
  const cortaLinha = linhaFronteira !== null && sobramNaJanela > 0 && sobramNaJanela < bytesDaLinhaFronteira;
  const dentroSet = new Set(dentroIdx);
  const noDisco = readdirSync(dir).filter((f) => f.endsWith('.md') && f !== 'MEMORY.md');
  const conjuntoLinhas = items.map((it) => it.nome);
  const conjuntoMapa = temMapa ? mapaLinha.slice(MARCO.length).split(' · ').map((s) => s.replace(/`/g, '')).filter(Boolean) : null;
  return {
    indice: p,
    bytes: Buffer.byteLength(txt, 'utf8'),
    linhas: linhas.length,
    verbetes: items.length,
    janela: LIMITE,
    verbetes_dentro_da_janela: posicoesDoVerbete.filter((i) => dentroSet.has(i)).length,
    verbetes_fora_da_janela: posicoesDoVerbete.filter((i) => !dentroSet.has(i)).length,
    o_primeiro_verbete_esta_dentro_da_janela: dentroSet.has(primeiro),
    linha_que_a_janela_corta: cortaLinha ? { linha_no_ficheiro: idxFronteira + 1, bytes_da_linha: bytesDaLinhaFronteira, bytes_dentro_da_janela: sobramNaJanela, fraccao_visivel: +(sobramNaJanela / bytesDaLinhaFronteira).toFixed(4), comeca_por_verbete: linhaFronteira.startsWith('- [') } : null,
    o_primeiro_e_o_mais_novo: ordemMede(items.map((it) => it.nome)),
    numeros_de_sm_lidos: items.map((it) => numeroDoNome(it.nome)).filter((n) => n !== null).length,
    nome_do_primeiro_verbete: conjuntoLinhas[0],
    bytes_da_linha_do_primeiro_verbete: items[0].bytes,
    apontadores_partidos: items.filter((it) => !existsSync(dir + it.nome)).map((it) => it.nome),
    ficheiros_no_disco: noDisco.length,
    orfaos_sem_apontador: noDisco.filter((f) => !conjuntoLinhas.includes(f)),
    mapa_presente: temMapa,
    mapa_bate_com_as_linhas: conjuntoMapa === null ? null : JSON.stringify(conjuntoMapa) === JSON.stringify(conjuntoLinhas),
    corpo_dos_verbetes_fora: posicoesDoVerbete.filter((i) => !dentroSet.has(i)).reduce((s, i) => { const n = nomesDaLinha(linhas[i]); return s + (existsSync(dir + n) ? statSync(dir + n).size : 0); }, 0),
  };
}

function nomesDaLinha(l) {
  const k = l.indexOf('](');
  const fim = l.indexOf(')', k);
  return l.slice(k + 2, fim);
}

function geraMapaDoTexto(txt) {
  const items = nomesDasLinhas(txt);
  const mapa = MARCO + items.map((it) => '`' + it.nome + '`').join(' · ');
  const linhas = txt.split('\n');
  const alvo = linhas.findIndex((l) => l.startsWith('- ['));
  if (alvo < 0) throw new Error('ABORTA: o indice nao tem nenhuma linha de verbete, nao ha onde inserir o mapa');
  const jaTem = linhas.findIndex((l) => l.startsWith(MARCO));
  if (jaTem >= 0) linhas.splice(jaTem, 1);
  const novoAlvo = linhas.findIndex((l) => l.startsWith('- ['));
  const semBlanco = linhas[novoAlvo - 1] === '';
  linhas.splice(novoAlvo - (semBlanco ? 1 : 0), 0, mapa);
  return linhas.join('\n');
}

function aplicaMapa(p) {
  const txt = readFileSync(p, 'utf8');
  const saida = geraMapaDoTexto(txt);
  // A guarda de idempotencia e sobre o TEXTO GERADO, nao sobre o que esta no disco: a 1.ª versao comparava
  // `readFileSync(p)` com `txt` -- as duas leituras do mesmo ficheiro -- e por isso devolvia sempre
  // `mapa_ja_estava_igual` sem escrever nada. A corrida sm70e deu `escrito:false` com `mapa_presente:false`
  // no mesmo output, que e a contradicao provada de que o ramo de escrita estava morto.
  if (geraMapaDoTexto(saida) !== saida) throw new Error('ABORTA: escrever o mapa duas vezes nao da o mesmo texto, o inseridor nao e idempotente');
  if (saida === txt) return { escrito: false, nota: 'mapa_ja_estava_igual', verbetes: nomesDasLinhas(txt).length };
  const bytes_antes = Buffer.byteLength(txt, 'utf8');
  writeFileSync(p, saida, 'utf8');
  const relido = readFileSync(p, 'utf8');
  const depois = relido.split('\n');
  if (depois.findIndex((l) => l.startsWith(MARCO)) > depois.findIndex((l) => l.startsWith('- ['))) throw new Error('ABORTA: o mapa nao ficou antes da primeira linha de verbete');
  if (relido !== saida) throw new Error('ABORTA: o texto relido do disco nao bate com o gerado');
  return { escrito: true, bytes_antes, bytes_depois: Buffer.byteLength(relido, 'utf8'), verbetes_antes: nomesDasLinhas(txt).length, verbetes_depois: nomesDasLinhas(relido).length, linhas_de_verbete_inalteradas: JSON.stringify(nomesDasLinhas(txt).map((i) => i.linha)) === JSON.stringify(nomesDasLinhas(relido).map((i) => i.linha)) };
}

function fixtures() {
  const casos = [];
  const mk = (linhas) => linhas.join('\n');
  casos.push({ nome: 'positivo_apontador_que_resolve', fn: () => { const t = mk(['- [T](a.md) — x']); return nomesDasLinhas(t).length === 1 && nomesDasLinhas(t)[0].nome === 'a.md'; } });
  casos.push({ nome: 'aborta_linha_sem_apontador', fn: () => { let abortou = false; try { nomesDasLinhas('- [T] sem link'); } catch (e) { abortou = /sem apontador/.test(e.message); } return abortou; } });
  casos.push({ nome: 'extração_do_nome_por_offset_e_nao_por_travessao', fn: () => { const t = mk(['- [Ciclo X — o titulo tem travessao](f-tema.md) — prosa que nao e o titulo']); return nomesDasLinhas(t)[0].nome === 'f-tema.md'; } });
  // `bytes` e da LINHA do indice (+ o salto de linha), nao do ficheiro apontado -- o instrumento nunca le o
  // ficheiro para este campo, e a 1.ª versao chamava-lhe `bytes_do_primeiro_verbete`, o que prometia o ficheiro
  // e dava 5 426 para um verbete que `wc -c` media em 10 292 no mesmo instante (corrida sm90a, 27/11).
  casos.push({ nome: 'positivo_bytes_sao_da_linha_do_indice_e_nao_do_ficheiro', fn: () => { const L = '- [A](a.md) ' + 'x'.repeat(200); return nomesDasLinhas(mk([L]))[0].bytes === Buffer.byteLength(L, 'utf8') + 1; } });
  casos.push({ nome: 'negativo_bytes_acompanham_o_comprimento_da_linha', fn: () => { const a = nomesDasLinhas(mk(['- [A](a.md) ' + 'x'.repeat(300)]))[0].bytes; const b = nomesDasLinhas(mk(['- [A](a.md) ' + 'x'.repeat(40)]))[0].bytes; return a > b && a - b === 260; } });
  casos.push({ nome: 'mapa_derivate_bate_com_o_conjunto', fn: () => { const itens = nomesDasLinhas(mk(['- [A](a.md) — 1', '- [B](b.md) — 2'])); const mapa = MARCO + itens.map((i) => '`' + i.nome + '`').join(' · '); const re = mapa.slice(MARCO.length).split(' · ').map((s) => s.replace(/`/g, '')); return JSON.stringify(re) === JSON.stringify(itens.map((i) => i.nome)); } });
  casos.push({ nome: 'negativo_mapa_com_uma_linha_a_mais', fn: () => { const mapa = MARCO + '`a.md` · `b.md` · `sobrou.md`'; const re = mapa.slice(MARCO.length).split(' · ').map((s) => s.replace(/`/g, '')); return JSON.stringify(re) !== JSON.stringify(['a.md', 'b.md']); } });
  // A ordem nao e um nome dactilografado (a 1.ª versao tinha `^campanha-sm69` dentro e rebentava no ciclo
  // seguinte): e a grandeza medida `ordemMede`. Os tres casos abaixo dao positivo, negativo e classe legitima.
  casos.push({ nome: 'positivo_ordem_mais_novo_primeiro', fn: () => ordemMede(['campanha-sm70-a.md', 'campanha-sm69-a.md', 'campanha-sm41-a.md']) === true });
  casos.push({ nome: 'negativo_ordem_mais_velho_primeiro', fn: () => ordemMede(['campanha-sm41-a.md', 'campanha-sm69-a.md', 'campanha-sm70-a.md']) === false });
  casos.push({ nome: 'classe_legitima_sem_numero_em_nome_nenhum', fn: () => ordemMede(['feedback-secrets-handling.md', 'user-working-style.md']) === 'sem_numero_em_nome_nenhum' });
  // O ramo de escrita do mapa tambem precisa de positivo e negativo: a 1.ª versao comparava duas leituras do
  // mesmo ficheiro e por isso NUNCA escrevia (sm70e deu `escrito:false` com `mapa_presente:false`).
  const T = mk(['# Indice', '> cabecalho', '', '- [A](a.md) — 1', '- [B](b.md) — 2']);
  casos.push({ nome: 'positivo_insercao_muda_o_texto_e_poe_o_mapa_antes_do_verbete', fn: () => { const s = geraMapaDoTexto(T); return s !== T && s.split('\n').findIndex((l) => l.startsWith(MARCO)) < s.split('\n').findIndex((l) => l.startsWith('- [')) && nomesDasLinhas(s).length === 2; } });
  casos.push({ nome: 'negativo_insercao_duas_vezes_daria_textos_diferentes', fn: () => { const s = geraMapaDoTexto(T); return geraMapaDoTexto(s) === s && geraMapaDoTexto(s) !== T; } });
  casos.push({ nome: 'positivo_mapa_inserido_reproduz_o_conjunto_de_linhas', fn: () => { const s = geraMapaDoTexto(T); const l = s.split('\n').find((x) => x.startsWith(MARCO)); return JSON.stringify(l.slice(MARCO.length).split(' · ').map((x) => x.replace(/`/g, ''))) === JSON.stringify(nomesDasLinhas(s).map((i) => i.nome)); } });
  casos.push({ nome: 'aborta_indice_sem_linha_de_verbete', fn: () => { let abortou = false; try { geraMapaDoTexto('# Indice\n> so cabecalho\n'); } catch (e) { abortou = /nao tem nenhuma linha de verbete/.test(e.message); } return abortou; } });
  // A escolhe-da-leitura para os portoes (`sm70u`): com `--aplica-mapa` o veredicto tem de ser do estado que a
  // corrida DEIXOU, mas sem escrita o `depois` e uma re-leitura identica e a fonte honesta continua a ser a
  // primeira. Os tres casos dao as duas faces e a classe legitima de igualdade.
  casos.push({ nome: 'positivo_aplica_e_o_depois_que_governa', fn: () => { const a = [{ mapa_bate_com_as_linhas: false }], d = [{ mapa_bate_com_as_linhas: true }]; const r = estadoParaOsPortoes(a, d, true); return r.fonte === 'depois' && r.lido === d; } });
  casos.push({ nome: 'negativo_sem_aplica_nada_reescrito_governa', fn: () => { const a = [{ verbetes: 40 }], d = [{ verbetes: 40 }]; const r = estadoParaOsPortoes(a, d, false); return r.fonte === 'antes' && r.lido === a; } });
  casos.push({ nome: 'classe_legitima_aplica_sem_escrita_deixa_de_antes', fn: () => { const a = [{ verbetes: 16 }], d = [{ verbetes: 16 }]; const r = estadoParaOsPortoes(a, d, true); return r.fonte === 'antes_nao_escreveu' && r.lido === d && JSON.stringify(r.lido) === JSON.stringify(a); } });
  return casos;
}

function estadoParaOsPortoes(antes, depois, aplica) {
  if (aplica !== true) return { fonte: 'antes', lido: antes };
  if (JSON.stringify(antes) === JSON.stringify(depois)) return { fonte: 'antes_nao_escreveu', lido: depois };
  return { fonte: 'depois', lido: depois };
}

if (SELFTESTE) {
  const cs = fixtures();
  const faltas = cs.filter((c) => !c.fn());
  cs.forEach((c) => console.log((faltas.includes(c) ? 'FALTA ' : 'OK     ') + c.nome));
  console.log('P181_SELFTESTE ' + cs.length + ' casos · ' + faltas.length + ' faltas · ' + SUF);
  if (faltas.length) throw new Error('ABORTA: selfteste com faltas');
} else {
  const antes = INDICES.map(mede);
  for (const r of antes) console.log('MEDIDA_ANTES=' + JSON.stringify(r));
  if (APLICA) for (const p of INDICES) console.log('MAPA=' + JSON.stringify(Object.assign({ indice: p }, aplicaMapa(p))));
  const depois = APLICA ? INDICES.map(mede) : antes;
  const escolha = estadoParaOsPortoes(antes, depois, APLICA);
  const resultados = escolha.lido;
  console.log('PORTOES_LIDOS_DE=' + escolha.fonte + ' leituras=' + (APLICA ? 2 : 1));
  if (APLICA) for (const r of depois) console.log('MEDIDA_DEPOIS=' + JSON.stringify(r));
  const partidos = resultados.reduce((s, r) => s + r.apontadores_partidos.length, 0);
  const orfaos = resultados.reduce((s, r) => s + r.orfaos_sem_apontador.length, 0);
  const primeirosFora = resultados.filter((r) => !r.o_primeiro_verbete_esta_dentro_da_janela).map((r) => r.indice);
  const mapasRuins = resultados.filter((r) => r.mapa_presente && r.mapa_bate_com_as_linhas !== true).map((r) => r.indice);
  const g = {
    C1_nenhum_apontador_partido: { ok: partidos === 0, obtido: partidos },
    C2_nenhum_ficheiro_de_topicos_sem_apontador: { ok: orfaos === 0, obtido: orfaos },
    C3_o_verbete_mais_novo_cai_dentro_da_janela: { ok: primeirosFora.length === 0, obtido: primeirosFora },
    C4_onde_o_mapa_existe_ele_e_a_copia_do_conjunto_das_linhas: { ok: mapasRuins.length === 0, obtido: mapasRuins },
    C5_a_ordem_e_do_mais_novo_para_o_mais_velho: { ok: resultados.every((r) => r.o_primeiro_e_o_mais_novo === true || r.o_primeiro_e_o_mais_novo === 'sem_numero_em_nome_nenhum'), obtido: resultados.map((r) => r.nome_do_primeiro_verbete + '=' + r.o_primeiro_e_o_mais_novo) },
  };
  Object.keys(g).forEach((k) => console.log('portao_' + k + '=' + (g[k].ok ? 'OK' : 'VERMELHO') + ' obtido=' + JSON.stringify(g[k].obtido)));
  console.log('emissor_chars=' + EU.length + ' emissor_bytes=' + Buffer.byteLength(EU, 'utf8') + ' md5=' + md5(EU));
  console.log('P181_GEOMETRIA ' + Object.keys(g).filter((k) => g[k].ok).length + '/' + Object.keys(g).filter((k) => !g[k].ok).length + ' · ' + SUF);
  if (Object.keys(g).some((k) => !g[k].ok)) throw new Error('ABORTA: geometria do indice com faltas');
}
