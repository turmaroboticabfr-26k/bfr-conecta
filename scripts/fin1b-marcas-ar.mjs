// FIN-1b — SOMENTE LEITURA: censo de marcas publicadas nos bytes SERVIDOS do ar, e conferência
// do HTML servido contra o literal `const HTML` decodificado de cada worker-deploy-*.
// Nasceu de dois contadores zero no FIN-1 (loadSchoolContent, displayName) — a pergunta é:
// o ar de hoje ainda contém os hunks das v107/v108/v109, ou a cadeia v114→v118 trocou a base?
// 0 escrita, 0 DDL, 0 deploy. Artefacto: evidence/fin1b-marcas-ar.json
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const AR = 'https://bfr-conecta.turmaroboticabfr.workers.dev';
const md5 = (s) => createHash('md5').update(s).digest('hex');
const conta = (t, re) => (t.match(re) || []).length;

// Marcas NOMINAIS de cada publicação, tiradas das linhas de memória/diário correspondentes.
const MARCAS = {
  'v107 item 85 (Escola/dock lêem announcements e school_events)': [
    [/async function loadSchoolContent/g, 'def loadSchoolContent'],
    [/schoolContent\.(loading|loaded)/g, 'guarda de voo schoolContent'],
    [/renderHomeDock/g, 'renderHomeDock'],
    [/from\('announcements'\)/g, "from('announcements')"]],
  'v108 item 86 (nome derivado igual ao shell)': [
    [/displayName/g, 'displayName'],
    [/custom_display_name/g, 'custom_display_name']],
  'v109 item 91 (Meu Espaço não apaga painel carregado)': [
    [/partialMsg/g, 'partialMsg'],
    [/\(!state\.loaded \|\| !state\.linked\)/g, 'guarda do pintor de erro'],
    [/if \(state\.loading\) return;/g, 'guarda de voo load()']],
  'v105 item 84 (escola-historia)': [[/escola-historia/g, 'escola-historia']],
  'v114/v115 Supervisão (embed pela FK certa)': [
    [/supervision_requests/g, 'supervision_requests'],
    [/sports_schools\(name\)/g, 'sports_schools(name)'],
    [/schools\(name\)/g, 'schools(name)']],
  'v116 botões mobile': [
    [/bindTrigger/g, 'bindTrigger'],
    [/dispatchEvent\(\s*new MouseEvent\(/g, "dispatchEvent(new MouseEvent('click'))"]],
  'v117/v118 modal de horários + SW': [
    [/\bhorariosModal\b|modalHorarios|#scheduleModal/g, 'modal de horários'],
    [/addEventListener\(\s*['"]click['"]\s*,\s*fecharModal|\bfecharModal\b/g, 'fecharModal']],
  'item 77 chrome mobile no app-ready': [[/bfr:app-ready/g, 'bfr:app-ready'],
    [/\bpintaSozinho\b/g, 'pintaSozinho']],
};

const r = await fetch(AR + '/', { headers: { 'cache-control': 'no-cache' } });
const buf = Buffer.from(await r.arrayBuffer());
const t = buf.toString('utf8');
const out = { em: new Date().toISOString(), tarefa: 'FIN-1b marcas publicadas no ar',
  metodo: 'somente leitura', ar: { http: r.status, bytes: buf.length, md5: md5(buf) },
  marcas: {}, linhagem_html: [], total: { com_marca: 0, sem_marca: 0, grupos_inteiros: 0, com_falta: 0 } };

for (const [grupo, listas] of Object.entries(MARCAS)) {
  const med = listas.map(([re, nome]) => ({ nome, ocorrências: conta(t, re) }));
  const zero = med.filter((m) => m['ocorrências'] === 0).map((m) => m.nome);
  out.marcas[grupo] = { medido: med, ausentes: zero };
  out.total[zero.length ? 'com_falta' : 'grupos_inteiros'] += 1;
  zero.forEach(() => out.total.sem_marca += med.filter((m) => m['ocorrências'] === 0).length);
  out.total.com_marca += med.filter((m) => m['ocorrências'] > 0).length;
}

// O HTML servido == o literal decodificado de qual worker? (armadilha 405: md5 do literal decodificado)
const dirs = readdirSync('.').filter((d) => /^worker-deploy-v\d+/.test(d)).sort();
for (const d of dirs) {
  let w; try { w = readFileSync(`${d}/worker.mjs`, 'utf8'); } catch { continue; }
  const nomes = [...w.matchAll(/^const\s+([A-Z]+)\s*=\s*["`]/gm)].map((m) => m[1]);
  const lit = w.match(/const\s+HTML\s*=\s*(".*?"|`[\s\S]*?`)\s*;/m);
  let decod = null, m = null;
  if (lit) { try { decod = JSON.parse(lit[1]); m = md5(Buffer.from(decod, 'utf8')); } catch { decod = null; } }
  out.linhagem_html.push({ dir: d, consts: nomes, literal_HTML_encontrado: !!lit,
    md5_literal: m, md5_literal_igual_ao_servido: m ? m === out.ar.md5 : null,
    bytes_literal_decodificado: decod ? Buffer.byteLength(decod, 'utf8') : null });
}
// Arquivo de disco declarado como base do shell (para não afirmar por memória)
try {
  const shellDisk = readFileSync('ar-shell.html');
  out.disco_ar_shell_html = { bytes: shellDisk.length, md5: md5(shellDisk), igual_ao_ar: md5(shellDisk) === out.ar.md5 };
} catch { out.disco_ar_shell_html = null; }

writeFileSync('evidence/fin1b-marcas-ar.json', JSON.stringify(out, null, 2) + '\n');
console.log(`ar HTTP ${out.ar.http} ${out.ar.bytes} B md5 ${out.ar.md5}`);
for (const [g, v] of Object.entries(out.marcas))
  console.log(`${v.ausentes.length ? 'FALTA' : 'ok   '} ${g} → ${v.medido.map((m) => `${m.nome} ${m['ocorrências']}`).join(' | ')}${v.ausentes.length ? `  [ausentes: ${v.ausentes.join(', ')}]` : ''}`);
console.log(`grupos: ${out.total.grupos_inteiros} inteiros / ${out.total.com_falta} com falta · marcas presentes ${out.total.com_marca} / ausentes ${out.total.sem_marca}`);
console.log('linhagem do HTML (md5 do literal decodificado vs servido):');
out.linhagem_html.forEach((l) => console.log(`  ${l.dir}: consts ${JSON.stringify(l.consts)} igual_ao_ar=${l.md5_literal_igual_ao_servido} literal ${l.bytes_literal_decodificado ?? '-'} B md5 ${l.md5_literal ?? '-'}`));
console.log(`ar-shell.html em disco: ${out.disco_ar_shell_html ? `${out.disco_ar_shell_html.bytes} B ${out.disco_ar_shell_html.md5} igual_ao_ar=${out.disco_ar_shell_html.igual_ao_ar}` : 'AUSENTE'}`);
