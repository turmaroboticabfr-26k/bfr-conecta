#!/usr/bin/env node
// P74-V — prova de que o portão da causa tem dentes nos DOIS sentidos, corrida contra o mesmo código
// que o emissor usa (importado, não copiado). Sem isto, a nova cláusula «cadeia viva» seria só uma
// forma de tornar o portão mais macio. Zero rede, zero escrita no banco: são fixtures sintéticos.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { causaAdmissivel, CAUSAS_SEM_SENHA } from './p74-predicado-da-causa-da-cadeia.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = (process.argv[2] || '21-11').trim();
const OUT = `${REPO}/evidence/p74-verifica-portao-da-causa-${SUF}.json`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — corra com sufixo novo, nunca por cima');

const casos = [
  { nome: 'queimada_sem_falha_de_login', esperado: true, reg: { cadeia_anterior: { http: 400, codigo: 'refresh_token_already_used', ok: false } } },
  { nome: 'sem_cadeia_no_ficheiro', esperado: true, reg: { cadeia_anterior: { http: null, codigo: 'sem_cadeia_no_ficheiro_do_papel', ok: false } } },
  { nome: 'cadeia_viva_access_expirado', esperado: true, reg: { cadeia_anterior: { http: 200, codigo: 'renovou', ok: true } } },
  { nome: 'cadeia_viva_MAS_login_falhou', esperado: false, reg: { falha: 'login HTTP 400 codigo=invalid_credentials', cadeia_anterior: { http: 200, codigo: 'renovou', ok: true } } },
  { nome: 'queimada_MAS_login_falhou', esperado: false, reg: { falha: 'login HTTP 422', cadeia_anterior: { http: 400, codigo: 'refresh_token_already_used', ok: false } } },
  { nome: 'causa_nao_classificada', esperado: false, reg: { cadeia_anterior: { http: 500, codigo: 'Server Error', ok: false } } },
  { nome: 'sem_cadeia_anterior_declarada', esperado: false, reg: {} },
];

const dados = casos.map((c) => { const obtido = causaAdmissivel(c.reg); return { nome: c.nome, esperado: c.esperado, obtido, verde: obtido === c.esperado }; });
const vermelhos = dados.filter((d) => !d.verde);

// O portão tem de estar ligado a ESTE código, senão o verificador prova uma coisa e o emissor decide outra.
const emissor = readFileSync(`${REPO}/scripts/p73-entrar-por-senha-cadeias-20-11.mjs`, 'utf8');
const ligacoes = [
  { nome: 'emissor_importa_o_predicado', verde: /import \{ causaAdmissivel \} from '\.\/p74-predicado-da-causa-da-cadeia\.mjs'/.test(emissor) },
  { nome: 'emissor_usa_o_predicado_no_portao', verde: /causaAdmissivel\(papeis\[p\]\)/.test(emissor) },
  { nome: 'nenhuma_copia_do_predicado_velho_ficou_no_emissor', verde: !/cadeia_anterior\.codigo === 'refresh_token_already_used'/.test(emissor) },
  { nome: 'a_lista_de_causas_e_lida_do_modulo_e_nao_dactilografada_aqui', verde: CAUSAS_SEM_SENHA.length === 2 && CAUSAS_SEM_SENHA.includes('refresh_token_already_used') },
  { nome: 'os_dois_sentidos_estao_ambos_em_fixture', verde: dados.some((d) => d.esperado === true && d.obtido === true) && dados.some((d) => d.esperado === false && d.obtido === false) },
];
const ligVerdes = ligacoes.filter((l) => l.verde).length;
const total = dados.length + ligacoes.length, falhas = vermelhos.length + (ligacoes.length - ligVerdes);

const out = {
  programa: 'scripts/p74-verifica-portao-da-causa.mjs', em: new Date().toISOString(), sufixo: SUF,
  metodo: 'fixtures sintéticos contra `causaAdmissivel` importado do módulo que o emissor também importa; nenhuma rede, nenhuma escrita.',
  casos: dados, ligacoes, total, falhas,
  o_que_prova: 'que o portão aceita as três causas legítimas de cadeia (queimada, sem registo, viva com access expirado) e recusa as quatro que escondem falta de senha ou causa não classificada.',
  o_que_nao_prova: 'não prova nada sobre o ar nem sobre o banco: é a régua da classificação, não a medição.',
  veredito: falhas === 0 ? `P74_PORTAO_DA_CAUSA_OK ${total}/0` : `P74_PORTAO_DA_CAUSA_VERMELHO ${falhas} de ${total}`,
};
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
const TXT = OUT.replace(/\.json$/, '.txt');
writeFileSync(TXT, `${out.veredito}\n${OUT.replace(REPO + '/', '')}\nnode_exit=${falhas === 0 ? 0 : 1}\n`);
for (const d of dados) console.log(`  caso ${d.nome}: esperado=${d.esperado} obtido=${d.obtido} ${d.verde ? 'VERDE' : 'VERMELHO'}`);
for (const l of ligacoes) console.log(`  ligacao ${l.nome}: ${l.verde ? 'VERDE' : 'VERMELHO'}`);
console.log(out.veredito + ' · registo ' + OUT);
process.exit(falhas === 0 ? 0 : 1);
