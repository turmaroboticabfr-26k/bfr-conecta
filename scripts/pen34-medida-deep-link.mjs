// PEN-34 — medir se o 404 recém-publicado do RM-6.9 atinge um deep link que o app realmente usa.
// Somente leitura: uma sonda ao ar + contagens no shell servido. Nada é escrito fora do diário.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const md5 = (b) => createHash('md5').update(b).digest('hex');
const lerJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

const diarios = readdirSync('.')
  .filter((f) => /^audit-publicacao-v\d+(-404)?\.json$/.test(f))
  .map((f) => ({ f, v: Number(f.match(/v(\d+)/)[1]) + (/404/.test(f) ? 0.1 : 0) }))
  .sort((a, b) => b.v - a.v);
const reg = lerJson(diarios[0].f);
const AR = reg.deploy.url;

const count = (s, re) => (s.match(new RegExp(re.source, re.flags)) || []).length;
const contavezs = (s, lit) => s.split(lit).length - 1;

const alvo = ['/aluno', '/coordenacao', '/direcao', '/professor'];
const rotas = {};
for (const p of alvo) {
  const r = await fetch(`${AR}${p}`, { headers: { 'cache-control': 'no-cache' } });
  const body = await r.text();
  rotas[p] = { http: r.status, ct: r.headers.get('content-type'), bytes: Buffer.byteLength(body), md5: md5(Buffer.from(body)) };
}

const shell = await (await fetch(`${AR}/`, { headers: { 'cache-control': 'no-cache' } })).text();

const marcas = {
  location_pathname: count(shell, /location\.pathname/g),
  location_hash: count(shell, /location\.hash/g),
  pushState: count(shell, /history\.pushState/g),
  replaceState: count(shell, /history\.replaceState/g),
  popstate: count(shell, /['"]popstate['"]/g),
  href_com_hash: count(shell, /href\s*=\s*["'`]#/g),
  data_route: count(shell, /data-route=/g),
  nav_item: count(shell, /class="nav-item/g),
  addEventListener_click_delegado: count(shell, /addEventListener\(\s*['"]click/g),
  setRoute_por_string: count(shell, /setRoute\s*\(\s*['"]/g),
  rota_aluno_string: contavezs(shell, "'aluno'"),
  rota_coordenacao_string: contavezs(shell, "'coordenacao'"),
  caminho_absoluto_no_html: count(shell, /(?:href|src)="\/(?!\/)[a-zA-Z0-9._-]+"/g),
};

const exemplos_caminhos = [...new Set([...shell.matchAll(/(?:href|src)="(\/[^"]+)"/g)].map((m) => m[1]))].slice(0, 20);

const out = {
  em: new Date().toISOString(),
  tarefa: 'PEN-34 — deep link de SPA: o 404 publicado do RM-6.9 atinge um caminho que o app usa?',
  metodo: `shell servido lido de ${AR} (URL derivada de ${diarios[0].f}, nunca dactilografada) + 4 sondas GET a caminhos de rota interna; contagens por regex no corpo servido, sem interpretar nada`,
  diario_de_origem: diarios[0].f,
  versao_esperada_no_ar: reg.deploy.version_id,
  shell: { bytes: Buffer.byteLength(shell), md5: md5(Buffer.from(shell)) },
  rotas_internas_sondadas: rotas,
  marcas_no_shell: marcas,
  exemplos_caminhos_em_href_ou_src: exemplos_caminhos,
  leitura: {
    porque_faz_a_diferenca: 'se o app navega por estado interno e não por caminho de URL, o 404 do RM-6.9 só é visível em URLs partilhadas/escritas à mão e a PEN-34 é de produto (escolha de design), não de regressão',
    o_que_esta_provado_aqui: 'apenas o que o shell faz hoje com o caminho do URL — medido por contagem, não por execução de navegação',
    o_que_NAO_prova: 'não prova que abrir /aluno a partir de um link interno exista como fluxo; não corre nenhuma navegação autenticada; não mede o comportamento do SW diante de um deep link (isso exige o browser)',
  },
};

const resumo = Object.entries(marcas).map(([k, v]) => `${k}=${v}`).join('  ');
console.log(resumo);
console.log('\nrotas internas sondadas:');
for (const [p, r] of Object.entries(rotas)) console.log(`  ${p.padEnd(14)} ${r.http} ${r.ct} ${r.bytes} B ${r.md5}`);
console.log('\ncaminhos em href/src do shell:', exemplos_caminhos.join(' '));
console.log(`\nshell ${out.shell.bytes} B md5 ${out.shell.md5}`);
writeFileSync('evidence/pen34-deep-link-14-11.json', JSON.stringify(out, null, 2));
console.log('-> evidence/pen34-deep-link-14-11.json');
