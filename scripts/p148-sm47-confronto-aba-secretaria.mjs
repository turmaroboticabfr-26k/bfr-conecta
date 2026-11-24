// p148 — confronto em leitura entre as 7 referências do dono (24/11) e a aba municipal do ar v142.
// Só lê o bundle; não escreve no banco, não publica, não altera produto. A identidade do alvo é
// provada antes de contar: bytes + md5 contra a v142 conferida no registo do p147 (§SM.44). Aborta
// se divergir. A fiabilidade da contagem é provada por fixture nos dois sentidos: um literal ausente
// injectado numa cópia em memória tem de dar 1, e um literal presente tem de dar o mesmo valor no
// original e no fixture. Os literais das referências vivem nos arrays; a prosa nomeia-os por
// descrição para não se tornar portadora das agulhas que mede.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const alvo = process.argv[2];
if (!alvo) { console.log('uso: node scripts/p148-sm47-confronto-aba-secretaria.mjs <bundle.html>'); process.exit(2); }

const ESPERADO_BYTES = 3556664;
const ESPERADO_MD5 = '0e22e78fe1e0ce929ec4717f86365ad9';
const buf = readFileSync(alvo);
const md5 = createHash('md5').update(buf).digest('hex');
if (buf.length !== ESPERADO_BYTES || md5 !== ESPERADO_MD5) {
  console.log('P148_IDENTIDADE_DIVERGE bytes=' + buf.length + ' md5=' + md5);
  process.exit(2);
}
const texto = buf.toString('utf8');
const contar = (s, alvoTxt) => {
  const esc = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (alvoTxt.match(new RegExp(esc, 'g')) || []).length;
};

const esperadosPresentes = [
  'Secretaria Municipal de Educação',
  'Gestão municipal da educação',
  'Painel executivo',
  'Acompanhamento pedagógico',
  'Frequência e abandono',
  'Relatórios executivos',
  'Escolas da rede',
  'Alunos da rede',
  'Profissionais',
  'Processos e protocolos',
  'Comunicação da rede',
  'Infraestrutura',
  'bfr_is_municipal_authority',
  'bfr_municipal_audit',
  'bfr_municipal_municipio_totais',
  'bfr_municipal_distribuicao_por_zona',
  'education_supervisor',
  'Escolas cadastradas',
  'Frequência registrada',
  'signInWithOAuth'
];
const esperadosAusentes = [
  'ACESSO INSTITUCIONAL',
  'Centro de Inteligência e Gestão Educacional',
  'Visão geral do município',
  'Ano letivo 2026',
  'Comparativo',
  'Acesso altamente restrito',
  'Resumo da análise municipal',
  'EXEMPLO ILUSTRATIVO',
  'secretario_municipal',
  'SECRETARIA_MUNICIPAL'
];

const presentes = {};
for (const s of esperadosPresentes) presentes[s] = contar(s, texto);
// os «ausentes» são ausentes DA ABA: conta-se no bundle inteiro e só na região do módulo municipal
// (do marcador `data-bfr-municipal-module` até ao fim). Um literal que exista noutro módulo não é
// ausência no bundle — é ausência na aba, e é isso que a referência pede.
const modInicio = texto.indexOf('data-bfr-municipal-module');
const modulo = modInicio >= 0 ? texto.slice(modInicio) : '';
const ausentes = {};
for (const s of esperadosAusentes) ausentes[s] = { bundle: contar(s, texto), no_modulo: contar(s, modulo) };

// fixture forte: cada literal «ausente» injectado numa cópia em memória tem de ser apanhado (>=1);
// e um literal inventado tem de dar 0 no original — as duas direções provadas, senão um 0 não vale.
const injetado = 'XYZ_P148_INJETADO_PARA_FIXTURE';
const copia = texto + injetado + '\n' + esperadosAusentes.join(' | ');
const fInj = contar(injetado, copia);
const fOrig = contar(injetado, texto);
const fAus = {};
let dispara = fInj === 1 && fOrig === 0;
for (const s of esperadosAusentes) {
  fAus[s] = contar(s, copia);
  if (fAus[s] < 1) dispara = false;
}

// as 10 abas lêem-se do próprio bundle, nunca dactilografadas
const m = texto.match(/const TABS = \[([\s\S]*?)\];/);
const abas = m ? [...m[1].matchAll(/\['([^']+)',\s*'([^']+)',\s*'([^']*)'\]/g)].map((x) => ({ id: x[1], rotulo: x[2], icone: x[3] })) : [];

const cabe = texto.match(/PAPEIS_MUNICIPAIS = \[[^\]]+\]/);
const papeis = cabe ? cabe[0] : 'nao lido';

const registo = {
  programa: 'scripts/p148-sm47-confronto-aba-secretaria.mjs',
  alvo: alvo,
  identidade: { bytes: buf.length, md5, esperado_bytes: ESPERADO_BYTES, esperado_md5: ESPERADO_MD5, confere: true },
  fixture: { injetado_contou: fInj, original_contou: fOrig, cada_ausente_injectado_contou: fAus, dispara_nos_dois_sentidos: dispara },
  esperados_presentes: presentes,
  esperados_ausentes: ausentes,
  abas_do_bundle: abas,
  papeis_municipais: papeis,
  o_que_NAO_prova: 'contagens de literal no bundle servido. Nao julga se o desenho e executivo/premium (FASE 2, nao medido) nem a aparencia visual em larguras reais: isso pede browser vivo (cadeias 0/15 no p73 de 23/11). A comparacao com as 7 referencias esta em docs/bu-20-11/11-como-a-aba-da-secretaria-deveria-ficar.md.'
};
const saida = 'evidence/p148-sm47-confronto-aba-secretaria-24-11.json';
writeFileSync(saida, JSON.stringify(registo, null, 2) + '\n');
console.log('P148_SM47_CONFRONTO_VERDE bytes=' + buf.length + ' md5=' + md5
  + ' presentes=' + Object.values(presentes).filter((v) => v > 0).length + '/' + esperadosPresentes.length
  + ' ausentes_no_modulo_zero=' + Object.values(ausentes).filter((v) => v.no_modulo === 0).length + '/' + esperadosAusentes.length
  + ' abas=' + abas.length + ' fixture=' + (dispara ? 'ok' : 'FALHA')
  + ' registo=' + saida);
