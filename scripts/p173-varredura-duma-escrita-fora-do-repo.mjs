// Varredura duma escrita longa fora do repo — a mensagem dum commit, um verbete de memoria — pelas duas familias que
// o teclado do condutor injerta: adjacencia letra-digito e codepoint fora do Latino. A régua NAO e reescrita aqui:
// os dois predicados, as faixas e a limpeza de backticks sao lidos do fonte do produtor (`p169`) e a peça aborta se
// nao os ler, porque uma copia aproximada passa a medir outra coisa consoante o ficheiro.
// O fixturo esta em tempo de execucao e fora do varrido: um fixture escrito a mao seria tambem varrido, e o verde
// dum instrumento que se denuncia a si proprio nao e verde nenhum.
// Uso: node scripts/p173-varredura-duma-escrita-fora-do-repo.mjs <caminho> [<caminho-da-captura>]
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPOReal = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const alvo = process.argv[2];
if (!alvo) throw new Error('ABORTA: passe o caminho da escrita como argv[2]');
const destino = process.argv[3];
if (destino && existsSync(destino)) throw new Error('ABORTA: a captura ja existe, use sufixo novo -- ' + destino + ' tem ' + statSync(destino).size + ' bytes');
const EU = readFileSync(fileURLToPath(import.meta.url), 'utf8');
const capt = [];
const say = (s) => { capt.push(s); console.log(s); };

const produtorCaminho = REPOReal + '/scripts/p169-varredura-letra-digito-do-bloco.mjs';
const produtor = readFileSync(produtorCaminho, 'utf8');
const linhaRE = produtor.split('\n').find((l) => l.startsWith('const RE = '));
const linhaFaixas = produtor.split('\n').find((l) => l.startsWith('const faixasOfensoras = '));
const linhaLimpa = produtor.split('\n').find((l) => l.startsWith('const limpa = '));
if (!linhaRE || !linhaFaixas || !linhaLimpa) throw new Error('ABORTA: a régua do produtor nao foi lida do fonte (RE/faixasOfensoras/limpa), e sem leitura nao ha copia fiel');
const RE = new Function('return ' + linhaRE.slice('const RE = '.length).replace(/;\s*$/, ''))();
const faixasOfensoras = new Function('return ' + linhaFaixas.slice('const faixasOfensoras = '.length).replace(/;\s*$/, ''))();
const limpa = new Function('return ' + linhaLimpa.slice('const limpa = '.length).replace(/;\s*$/, ''))();
const ehOfensora = (c) => faixasOfensoras.some((f) => c >= f[0] && c <= f[1]);
const nomeiaGlifos = (t) => { let s = ''; for (const ch of t) s += ehOfensora(ch.codePointAt(0)) ? 'U+' + ch.codePointAt(0).toString(16).toUpperCase() : ch; return s; };
const ofensoras = (t) => { const a = []; for (let i = 0; i < t.length;) { const c = t.codePointAt(i); if (c > 0x7f && ehOfensora(c)) a.push({ i, cp: 'U+' + c.toString(16).toUpperCase() }); i += c > 0xffff ? 2 : 1; } return a; };

say('regua_lida_de=' + 'scripts/p169-varredura-letra-digito-do-bloco.mjs');
say('produtor_bytes=' + Buffer.byteLength(produtor, 'utf8') + ' produtor_md5_8=' + createHash('md5').update(produtor).digest('hex').slice(0, 8));
say('emissor_p173_bytes=' + Buffer.byteLength(EU, 'utf8') + ' emissor_p173_md5=' + createHash('md5').update(EU).digest('hex'));
say('RE=' + String(RE) + ' FAIXAS_OFENSORAS=' + JSON.stringify(faixasOfensoras));

const FIX_PARTIDO = 'a linha dice 28papeis e 3contas com ' + String.fromCharCode(0x6392, 0x7248) + ' no meio';
const FIX_LIMPO = 'a linha diz 28 papeis e 3 contas, com plicas «» ‘’ “” – — …, setas -> e <=>, matematica ≥ ≤ ≠ ≈ ± × ÷, sinais ✓ ✗ ⚠ † ‡ e o emoji 📷 🏠';
const fixAdj = (limpa(FIX_PARTIDO).match(RE) || []).length;
const fixAdjLimpo = (limpa(FIX_LIMPO).match(RE) || []).length;
const fixFora = ofensoras(FIX_PARTIDO).length;
const fixForaLimpo = ofensoras(FIX_LIMPO).length;
say('PROVA_FIXTURE adjacencia_partido=' + fixAdj + ' adjacencia_limpo=' + fixAdjLimpo + ' naoLatino_partido=' + fixFora + ' naoLatino_limpo=' + fixForaLimpo);
if (fixAdj < 2) throw new Error('ABORTA: a régua de adjacencia nao dispara no fixture partido (' + fixAdj + '), nenhum zero do varrido significaria nada');
if (fixAdjLimpo !== 0) throw new Error('ABORTA: a régua de adjacencia chumba o fixture limpo (' + JSON.stringify(limpa(FIX_LIMPO).match(RE)) + '), a familia nao e a que o produtor declara');
if (fixFora !== 2) throw new Error('ABORTA: a familia do nao-Latino nao deu os dois glifos do fixture, deu ' + JSON.stringify(ofensoras(FIX_PARTIDO).map((o) => o.cp)));
if (fixForaLimpo !== 0) throw new Error('ABORTA: a familia do nao-Latino proibe uma classe legitima, o fixture limpo deu ' + JSON.stringify(ofensoras(FIX_LIMPO).map((o) => o.cp)));
if (nomeiaGlifos(FIX_PARTIDO).indexOf(String.fromCharCode(0x6392)) >= 0) throw new Error('ABORTA: a nomeacao por codepoint deixou ficar o glifo, a captura seria a ofensora');

const bruto = readFileSync(alvo, 'utf8');
const varrido = limpa(bruto);
const achados = varrido.match(RE) || [];
const hist = {};
for (const a of achados) hist[a] = (hist[a] || 0) + 1;
const fora = ofensoras(bruto);
say('alvo=' + alvo + ' bytes=' + Buffer.byteLength(bruto, 'utf8') + ' bytes_md5_8=' + createHash('md5').update(bruto).digest('hex').slice(0, 8) + ' linhas=' + bruto.split('\n').length);
say('chars_cru=' + bruto.length + ' chars_varridos=' + varrido.length + ' spans_de_backtick_retirados=' + (bruto.length - varrido.length));
say('CANDIDATOS_ADJACENCIA=' + achados.length + ' HISTOGRAMA=' + JSON.stringify(hist));
for (const a of achados) say('[' + a + '] x' + hist[a] + ' :: ' + JSON.stringify(nomeiaGlifos(varrido.slice(Math.max(0, varrido.indexOf(a) - 40), varrido.indexOf(a) + 40))));
say('FORA_DO_LATINO=' + fora.length + ' codigo=' + JSON.stringify(fora.map((o) => o.cp)));
for (const o of fora) {
  const ate = bruto.slice(0, o.i);
  say('OFENSOR codepoint=' + o.cp + ' linha=' + ate.split('\n').length + ' coluna=' + (o.i - (ate.lastIndexOf('\n') + 1) + 1) + ' contexto=' + JSON.stringify(nomeiaGlifos(bruto.slice(Math.max(0, o.i - 40), o.i + 40))));
}
if (destino) writeFileSync(destino, capt.join('\n') + '\n');
if (achados.length !== 0 || fora.length !== 0) {
  say('P173_CANDIDATOS_A_LISTAR adjacencia=' + achados.length + ' naoLatino=' + fora.length + ' · a régua e lista de candidatos, nao veredicto');
} else {
  say('P173_ESCRITA_SEM_CANDIDATOS adjacencia=0 naoLatino=0');
}
