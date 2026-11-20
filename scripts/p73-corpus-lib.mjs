// P73-C-L — o andador e o corpus partilhados pelos dois leitores de corpos (p73-classifica-corpode-preflight.mjs
// e p73-extrai-corpo-unico-preflight.mjs). Vive num módulo só para que a prédica de «este byte já está no
// índice» não tenha duas versões: quando os dois scripts escreveram a regra cada um na sua linha, o veredicto
// do segundo podia divergir do primeiro sem que nada o avisasse — é o defeito que estava no `19/11` do
// `ah2-classifica-dirs-ANTERIOR-casador-por-nome.mjs` (casava por nome, aceitava homónimos doutro ramo).
// O corpus É MEDIDO, não filtrado por extensão: `git ls-tree -r HEAD --long` dá o tamanho de cada bolbo
// rastreado, e só os bolbos >= limite são hasheados (é o conjunto que uma cópia de 3,5 MB pode encher). A
// versão de 20/11 lia `git ls-files *.html`, por isso um PDF servido cujo texto vive no artefacto era declarado
// «único» quando os bytes dele estão versionados há ciclos — ver §SM.24, defeito 7.
// Duas formas de acerto, porque um corpo injectado pode ser um RENDER lossy:
//   direto      — md5(bytes utf8 do render) == md5(dos bytes do bolbo). Vale para texto injetado sem perdas.
//   declarado   — o objeto pai do corpo traz `md5`/`bytes` da grandeza que mediu (o `medido_antes.pdf.md5` é o
//                 md5 dos 202 349 B do fio, não do render de 362 632 B); se essa declaração bate com um bolbo
//                 rastreado, o byte já está no índice e o render é cópia derivada, não prova nova.
// Uso: importado; não corre sozinho.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const md5b = (b) => createHash('md5').update(b).digest('hex');

export const corpus_de_git = (repo, limite) => {
  const listado = execFileSync('git', ['ls-tree', '-r', 'HEAD', '--long'], { cwd: repo, encoding: 'utf8' })
    .split(/\r?\n/).map((l) => /^\S+ blob (\w{40})\s+(\d+)\t(.+)$/.exec(l)).filter(Boolean)
    .map((m) => ({ sha: m[1], bytes: parseInt(m[2], 10), caminho: m[3] }));
  const alvos = listado.filter((x) => x.bytes >= limite);
  const por_md5 = new Map();
  for (const x of alvos) {
    let b; try { b = execFileSync('git', ['cat-file', 'blob', x.sha], { cwd: repo, encoding: 'buffer', maxBuffer: 256 * 1024 * 1024 }); } catch { continue; }
    const q = md5b(b);
    if (!por_md5.has(q)) por_md5.set(q, { ...x, md5: q });
  }
  const por_extensao = {};
  for (const v of por_md5.values()) { const e = (/\.[a-z0-9]+$/i.exec(v.caminho) || ['.sem-ext'])[0].toLowerCase(); por_extensao[e] = (por_extensao[e] || 0) + 1; }
  if (por_md5.size < 3) throw new Error('ABORTA: o corpus de bolbos >= ' + limite + ' B tem só ' + por_md5.size + ' pegadas (de ' + listado.length + ' ficheiros rastreados, ' + alvos.length + ' acima do limite) — régua sem lados onde acasar');
  return { total_rastreados: listado.length, acima_do_limite: alvos.length, pegadas_distintas: por_md5.size, por_md5, por_extensao };
};

// Varre um objeto JSON e devolve cada string com bytes >= limite, já com o pai pequeno (os campos de medição
// que dão sentido ao corpo) para a conferência por declaração.
export const varre_corpos = (o, chave, limite, fora = []) => {
  if (o && typeof o === 'object' && !Array.isArray(o)) {
    for (const [k, v] of Object.entries(o)) {
      const c = chave ? chave + '.' + k : k;
      if (typeof v === 'string') { const bytes = Buffer.byteLength(v); if (bytes >= limite) fora.push({ chave: c, bytes, md5_render: md5b(Buffer.from(v)), texto: v, pai: { md5: typeof o.md5 === 'string' ? o.md5 : null, bytes: typeof o.bytes === 'number' ? o.bytes : null, caminho: typeof o.caminho === 'string' ? o.caminho : null, http: o.http ?? null, content_type: typeof o.content_type === 'string' ? o.content_type : null } }); }
      else varre_corpos(v, c, limite, fora);
    }
    return fora;
  }
  if (Array.isArray(o)) { o.forEach((v, i) => varre_corpos(v, chave + '[' + i + ']', limite, fora)); return fora; }
  return fora;
};

// As duas formas de acerto, numeradas separadamente para o leitor ver qual delas sustenta o veredicto.
export const classifica_corpo = (c, corpus) => {
  const direto = corpus.por_md5.get(c.md5_render) || null;
  const declarado = c.pai.md5 && /^[0-9a-f]{32}$/.test(c.pai.md5) ? (corpus.por_md5.get(c.pai.md5) || null) : null;
  return { direto, declarado, ja_no_indice: !!(direto || declarado), porque: direto ? 'md5 do render bate com bolbo rastreado' : declarado ? 'o pai declara md5/bytes que batem com bolbo rastreado (o corpo e um render derivado)' : 'nenhuma das duas formas casou: este byte so existe neste artefacto' };
};
