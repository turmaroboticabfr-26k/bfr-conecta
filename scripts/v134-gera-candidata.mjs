// V134 — candidata que remove da shell o bloco <style id="bfr-mobile-nav-sm8-fix">, a única
// alteração da v133 que violou o contrato mobile do app (o asset bfr-responsive-presentation.js
// impõe `#appShell.ready>.sidebar{display:none!important}` em <=800px; o bloco, com a mesma
// especificidade e declarado depois, ganhava o empate e ressuscitava a barra do desktop).
// Nothing else changes: módulo municipal, fecharGaveta e safe-area fix ficam byte-a-byte.
// Aborta se a candidata já existe. Só-leitura fora do seu próprio directório de saída.
import fs from 'node:fs';
import crypto from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const DE = `${DIR}/bfr-candidata-v133-secretaria-municipal`;
const PARA = `${DIR}/bfr-candidata-v134-sidebar-escondida`;
const MARK = '<style id="bfr-mobile-nav-sm8-fix">';
const md5 = (b) => crypto.createHash('md5').update(b).digest('hex');
const regua = (s) => `${md5(s)} (${Buffer.byteLength(s)} B)`;
const count = (t, needle) => t.split(needle).length - 1;

const antes = fs.readFileSync(`${DE}/index.html`, 'utf8');
const saidaHtml = `${PARA}/index.html`;
let portao = 0; const falhas = [];
const G = (nome, ok, dado) => { portao++; if (!ok) { falhas.push({ nome, dado }); console.log(`VERMELHO ${nome} :: ${JSON.stringify(dado).slice(0, 200)}`); } else console.log(`verde ${nome} :: ${JSON.stringify(dado).slice(0, 160)}`); };

const ini = antes.indexOf(MARK);
const fimTag = antes.indexOf('</style>', ini);
const fim = fimTag < 0 ? -1 : fimTag + '</style>'.length;
G('V134_C1_bloco_presente_uma_vez_na_v133', ini >= 0 && count(antes, MARK) === 1, { ini, ocorrencias: count(antes, MARK) });
if (ini < 0 || fim < 0) { console.log(`FALHA_BLOCO ${portao}/${falhas.length}`); process.exit(1); }
const bloco = antes.slice(ini, fim);
G('V134_C2_o_corte_e_um_style_puro', bloco.startsWith('<style') && bloco.endsWith('</style>'), { abre: bloco.slice(0, 40), fecha: bloco.slice(-30) });

const depois = antes.slice(0, ini) + antes.slice(fim);
G('V134_C3_bloco_fora_da_candidata', count(depois, 'bfr-mobile-nav-sm8-fix') === 0, { ocorrencias: count(depois, 'bfr-mobile-nav-sm8-fix') });
const chaves = ['bfr-mobile-nav-safe-area-fix', 'fecharGaveta', 'data-bfr-municipal-nav', 'mun-tab', 'bfrMunicipalView', 'bfr-responsive-presentation.js'];
const diff = chaves.map((k) => ({ chave: k, antes: count(antes, k), depois: count(depois, k) }));
G('V134_C4_restante_preservado_por_chave', diff.every((d) => d.antes === d.depois), diff);
const tagDiff = ['<style', '</style>', '<div', '</div>', '<script', '</script>'].map((t) => ({ t, d: count(depois, t) - count(antes, t) }));
G('V134_C5_so_este_par_de_tags_mudou', JSON.stringify(tagDiff) === JSON.stringify([{ t: '<style', d: -1 }, { t: '</style>', d: -1 }, { t: '<div', d: 0 }, { t: '</div>', d: 0 }, { t: '<script', d: 0 }, { t: '</script>', d: 0 }]), tagDiff);
G('V134_C6_delta_igual_ao_bloco', Buffer.byteLength(antes) - Buffer.byteLength(depois) === Buffer.byteLength(bloco), { delta: Buffer.byteLength(antes) - Buffer.byteLength(depois), bloco: Buffer.byteLength(bloco) });
G('V134_C7_prefixo_e_sufixo_byte_a_byte', depois.startsWith(antes.slice(0, ini)) && depois.endsWith(antes.slice(fim)), { corte: [ini, fim] });

let escrita = 'verificado_sem_reescrever';
if (fs.existsSync(PARA)) {
  const ja = fs.readFileSync(saidaHtml, 'utf8');
  G('V134_C8_directorio_ja_existia_verificado_igual', ja === depois, { md5_disco: regua(Buffer.from(ja, 'utf8')), md5_novo: regua(Buffer.from(depois, 'utf8')) });
} else {
  fs.mkdirSync(PARA, { recursive: true });
  fs.writeFileSync(saidaHtml, depois);
  for (const f of fs.readdirSync(DE).filter((x) => x !== 'index.html')) fs.copyFileSync(`${DE}/${f}`, `${PARA}/${f}`);
  escrita = 'agora';
  G('V134_C8_escrita_e_leitura_bate', fs.readFileSync(saidaHtml, 'utf8') === depois, { bytes: Buffer.byteLength(depois) });
}
const out = {
  version: 'v134', em: new Date().toISOString(), escrita,
  origem: { dir: DE.split('/').pop(), index_md5: md5(Buffer.from(antes, 'utf8')), bytes: Buffer.byteLength(antes) },
  saida: { dir: PARA.split('/').pop(), index_md5: md5(Buffer.from(depois, 'utf8')), bytes: Buffer.byteLength(depois) },
  bloco_removido: { md5: md5(Buffer.from(bloco, 'utf8')), bytes: Buffer.byteLength(bloco), abre: bloco.slice(0, 60), regras: bloco.split('{').length - 1 },
  preservado_por_chave: diff,
  portoes: `${portao}/${falhas.length}`, veredito: falhas.length ? `V134_CANDIDATA_FALHOU ${portao}/${falhas.length}` : `V134_CANDIDATA_OK ${portao}/${falhas.length}`,
};
fs.writeFileSync(`${PARA}/portoes-v134-candidata.json`, JSON.stringify(out, null, 2) + '\n');
console.log(`escrito ${PARA}/portoes-v134-candidata.json`);
console.log(out.veredito + '  md5=' + out.saida.index_md5 + '  ' + out.saida.bytes + ' B  (v133 md5=' + out.origem.index_md5 + ' ' + out.origem.bytes + ' B, bloco=' + out.bloco_removido.bytes + ' B)');
process.exit(falhas.length ? 1 : 0);
