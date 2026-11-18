// FIXTURE do SM-7-C: injecções deliberadamente partidas, uma por classe de defeito, mais um
// seletor e uma colisão de identificador de topo. O portão só vale se esta peça o puser a
// vermelho (`SM7_INJECOES_VERMELHAS`): é-meia que se prova que a régua dispara.
const evalJS = async (e) => e;
const cliqueReal = async (s) => s;

// (1) aspa a mais depois da interpolação — o defeito que rebentou na corrida sup1366
await evalJS(`(() => { const x = document.querySelectorAll(${JSON.stringify('a[b="c"]')}'); return x.length; })()`);
// (2) backtick dentro de um comentário que vive dentro do template — o que partiu o --check em 263
await evalJS(`(() => { // reparar o `estado` custa sempre
  return 1; })()`);
// (3) parênteses desequilibrados em código injectado
await evalJS(`(() => { return ((1 + 2); })()`);
// (4) seletor com aspas ímpares
await cliqueReal(`[data-mun-tab="escolas]'`);

// (5) colisão de identificador de topo: não é erro de sintaxe, é erro de carregamento do módulo,
//     e foi o que fez a corrida sup1366d rebentar antes de abrir browser nenhum.
const REGISTO = 'ah2-sessions.json';
const OUT = 'x.json';
const REGISTO2 = 'nada'; // (este não)
const REGISTO_DECLARADO_DE_MAIS = 'x';
function usa() { const REGISTO = 'sombra local: a varredura só conta os de topo, por isto não aparece'; return REGISTO; }
// a colisão verdadeira, com o mesmo nome de topo:
const OUT = 'y.json';
