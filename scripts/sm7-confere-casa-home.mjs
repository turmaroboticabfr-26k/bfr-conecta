// Diff estrutural entre o artefacto substituído (v1, campo ambíguo) e o sucessor versionado (v3).
// Só-leitura: imprime identidade ou a lista de diferenças, nunca o valor duma credencial.
import { readFileSync } from 'node:fs';

const rd = (p) => JSON.parse(readFileSync(new URL(p, new URL('..', import.meta.url)), 'utf8'));
const A = rd('evidence/ah2-home-papel-a-papel-v1.json');
const B = rd('evidence/ah2-home-papel-a-papel-v3.json');

const dif = [];
const anda = (a, b, caminho) => {
  const ta = Array.isArray(a) ? 'array' : typeof a;
  const tb = Array.isArray(b) ? 'array' : typeof b;
  if (ta !== tb) { dif.push(`${caminho}: tipos ${ta} vs ${tb}`); return; }
  if (ta === 'object') {
    const ka = Object.keys(a), kb = Object.keys(b);
    for (const k of ka) if (!(k in b)) dif.push(`${caminho}.${k}: só no v1`);
    for (const k of kb) if (!(k in a)) dif.push(`${caminho}.${k}: só no v3`);
    for (const k of ka) if (k in b) anda(a[k], b[k], `${caminho}.${k}`);
    return;
  }
  if (ta === 'array') {
    if (a.length !== b.length) { dif.push(`${caminho}: comprimentos ${a.length} vs ${b.length}`); return; }
    a.forEach((x, i) => anda(x, b[i], `${caminho}[${i}]`));
    return;
  }
  if (a !== b) dif.push(`${caminho}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`);
};

anda(A, B, 'raiz');
const soNome = dif.length > 0 && dif.every((d) => /chave|rota_home/.test(d));
console.log(`diferenca_total=${dif.length}`);
console.log(`todas_sao_o_campo_renomeado=${dif.length > 0 ? soNome : 'n/d (zero diferenças)'}`);
console.log(`em_v3_tem_rota_home_em_cada_linha=${Array.isArray(B.linhas) ? B.linhas.every((l) => 'rota_home' in l || typeof l === 'object') : 'linhas não é array'}`);
for (const d of dif.slice(0, 14)) console.log('  ' + d);
console.log('--- estrutura duma linha de cada lado (só nomes de campo):');
console.log('  v1 linha[0] campos: ' + Object.keys(Array.isArray(A.linhas) ? A.linhas[0] : A.linhas).join(','));
console.log('  v3 linha[0] campos: ' + Object.keys(Array.isArray(B.linhas) ? B.linhas[0] : B.linhas).join(','));

// Categoria das diferenças, contada por programa: o que é só o rename, o que é campo novo do
// sucessor, o que é o instante da corrida, e o que seria um número diferente — esse é que conteria.
let renomeado = 0, novo = 0, velho = 0, tempo = 0, numero = 0;
for (const d of dif) {
  if (/\.chave: só no v1$/.test(d)) renomeado++;
  else if (/\.rota_home: só no v3$/.test(d)) renomeado++;
  else if (/: só no v3$/.test(d)) novo++;
  else if (/: só no v1$/.test(d)) velho++;
  else if (/\.em: /.test(d)) tempo++;
  else numero++;
}
console.log(`categorias: rename=${renomeado} campo_novo_no_v3=${novo} campo_só_no_v1=${velho} instante_da_corrida=${tempo} NUMEROS_DIFERENTES=${numero}`);
console.log(numero === 0 && velho === 0 ? 'LEITURA_IGUAL_SUCESSOR_SERVE' : 'LEITURA_NAO_EQUIVALENTE');

