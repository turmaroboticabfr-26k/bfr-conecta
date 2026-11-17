// AH-2-S4 — sonda só-leitura: qual é o mapa «seção → painel» que o próprio app usa ao navegar?
// Motivo: a varredura media «o painel visível com mais caracteres» depois de cada clique. Se duas
// seções devolvem o MESMO painel com o MESMO número de caracteres, ou o app mostra a mesma vista a
// Propósito das duas (sub-aba), ou o clique não navegou e a régua deu verde à toa. Só o código do app
// decide isto; nada aqui escreve seja o que for.
import { writeFileSync } from 'node:fs';

const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const OUT = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta/evidence/ah2-sonda-mapa-paineis-17-11.json';
const t = await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' } })).text();
const out = { em: new Date().toISOString(), bytes: Buffer.byteLength(t), achados: {} };

// 1) a função de navegação: como decide o que mostrar
const iNav = t.search(/function navigateToSection|navigateToSection\s*=\s*(async\s*)?\(/);
out.achados.navegacao_existe = iNav >= 0;
if (iNav >= 0) out.achados.navegacao_corpo = t.slice(iNav, iNav + 2600);

// 2) toda a lista de ids de painel mencionados (termos que aparecem como '...Panel' / '...View')
const ids = [...new Set([...t.matchAll(/['"]([A-Za-z][A-Za-z0-9]*(?:Panel|View|Screen))['"]/g)].map((m) => m[1]))].sort();
out.achados.ids_painel_mencionados = ids;
out.achados.ids_para_secoes = Object.fromEntries(['comunicacao', 'fotos', 'aee', 'direcao', 'resultados-aprendizagem', 'cadastro-alunos', 'jogos-escolares', 'escola-historia', 'coordenacao-chat'].map((s) => {
  const cand = ids.filter((x) => x.toLowerCase().includes(s.split('-')[0])).slice(0, 6);
  return [s, cand.slice(0, 6)];
}));

// 3) o mapa declarativo seção→elemento: procura dicionários com chaves de seção e valores de id
const mapaPalavras = {};
for (const chave of ['direcao', 'resultados-aprendizagem', 'fotos', 'comunicacao', 'aee']) {
  const re = new RegExp(`['"]${chave}['"]\\s*[:,]?[^\\n]{0,160}`, 'g');
  mapaPalavras[chave] = [...new Set([...t.matchAll(re)].map((m) => m[0].replace(/\s+/g, ' ').slice(0, 170)))].slice(0, 8);
}
out.achados.contexto_de_cada_secao = mapaPalavras;

// 4) como o app esconde painéis: procura as classes/atributos usados junto a hidden/display
out.achados.esconder = [...new Set([...t.matchAll(/(?:classList\.(?:add|remove|toggle)\([^)]{0,60}\)|hidden\s*=\s*(?:true|false))/g)].map((m) => m[0].replace(/\s+/g, ' ')))].slice(0, 25);
// 5) a lista canónica painel-ids (muitos apps têm um array secções→ids)
const iLista = t.search(/sectionPanel|panelForSection|SECTION_PANEL|sectionViews|viewForSection/);
out.achados.indicio_mapa_explicito = iLista >= 0 ? t.slice(iLista - 80, iLista + 700) : null;
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log('bytes=' + out.bytes + ' navigacao_existe=' + out.achados.navegacao_existe + ' ids_painel=' + ids.length);
console.log(JSON.stringify(out.achados.ids_para_secoes, null, 1));
console.log('--- corpo da navegação (primeiros 1500) ---');
console.log(String(out.achados.navegacao_corpo || '').slice(0, 1500));
console.log('--- esconder ---');
console.log(JSON.stringify(out.achados.esconder, null, 1));
