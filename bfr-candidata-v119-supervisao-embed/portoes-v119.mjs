import fs from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';

const dir = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const candPath = `${dir}/bfr-candidata-v119-supervisao-embed/index.html`;
const basePath = `${dir}/ar-shell.html`;
const LIVE_MD5 = 'ae59d35346b685b2fbf9d18ade4fa5cd';
const LIVE_BYTES = 3489467;
const OLD = 'school_id,schools(name)';
const NEW = 'school_id,sports_schools(name)';
const md5 = s => crypto.createHash('md5').update(s).digest('hex');

const cand = fs.readFileSync(candPath, 'utf8');
const base = fs.readFileSync(basePath, 'utf8');
const gates = [];
const gate = (name, ok, detail) => { gates.push({ name, ok, detail }); console.log(`${ok ? 'OK  ' : 'FAIL'} ${name} :: ${detail}`); };

// 1-2. candidata: hash e tamanho (+7 bytes sobre o ar)
const candBuf = fs.readFileSync(candPath);
gate('cand_md5', true, md5(candBuf));
gate('cand_size', candBuf.length === LIVE_BYTES + 7, `${candBuf.length} bytes (ar ${LIVE_BYTES} + 7)`);

// 3. a régua continua valendo: a base é byte a byte o que está no ar
gate('base_eq_live', md5(base) === LIVE_MD5, `base md5 ${md5(base)}`);

// 4-5. linhagem reversa: desfazer o unico token tem de reproduzir o ar
const reverted = cand.replace(NEW, OLD);
const revMd5 = md5(reverted);
gate('reverse_lineage', revMd5 === LIVE_MD5, `reverted md5 ${revMd5} == ar ${LIVE_MD5}`);
gate('reverse_byte_identical', reverted === base, 'reverted === base byte a byte');

// 6-7. troca de token cirurgica e completa
gate('new_token_unique', (cand.match(/sports_schools\(name\)/g) || []).length === 1,
  `sports_schools(name) ocorrencias = ${(cand.match(/sports_schools\(name\)/g) || []).length}`);
gate('old_token_gone', (cand.match(/school_id,schools\(name\)/g) || []).length === 0,
  `school_id,schools(name) ocorrencias = ${(cand.match(/school_id,schools\(name\)/g) || []).length}`);

// 8-9. diff de uma linha so, contagem de linhas intacta
const cl = cand.split('\n'), bl = base.split('\n');
const diffLines = [];
for (let i = 0; i < Math.max(cl.length, bl.length); i++) if (cl[i] !== bl[i]) diffLines.push(i + 1);
gate('one_line_diff', diffLines.length === 1 && diffLines[0] === 23684, `linhas alteradas = [${diffLines.join(',')}]`);
gate('line_count_same', cl.length === bl.length, `candidata ${cl.length} linhas == base ${bl.length} linhas`);

// 10. a linha alterada e só a insercao de "sports_" antes de schools(name) (nada mais no select)
const at = bl[23683].indexOf(OLD) + 'school_id,'.length;
const shaped = bl[23683].slice(0, at) + 'sports_' + bl[23683].slice(at);
gate('supervision_line_shape', cl[23683] === shaped,
  `insercao unica em char ${at}; comprimento ${bl[23683].length} -> ${cl[23683].length}`);

// 11. a linha 23685 (dropdown 'escolas' sobre schools) fica INTENCIONALMENTE intacta (gap LOW, sem evidencia)
gate('linha_23685_intacta', cl[23684] === bl[23684] && bl[23684].includes(`safeQuery('escolas',client.from('schools')`),
  `23685 inalterada: ${bl[23684].slice(0, 60)}...`);

// 12. sintaxe do modulo deferred que carrega a aba
const openTag = '<script type="text/plain" data-bfr-deferred="bfr-secretary-central.js">';
const start = cand.indexOf(openTag);
let syntaxOk = false, syntaxDetail = 'tag do modulo nao encontrada';
if (start >= 0) {
  const bodyStart = start + openTag.length;
  const end = cand.indexOf('</script>', bodyStart);
  const code = cand.slice(bodyStart, end);
  try { new vm.Script(code, { filename: 'bfr-secretary-central.js' }); syntaxOk = true; syntaxDetail = `vm.Script parseou ${code.length} chars`; }
  catch (e) { syntaxDetail = `${e.name}: ${e.message}`; }
}
gate('module_syntax', syntaxOk, syntaxDetail);

// 13. HTML script-tag balance preservado (a base nao e 50/50: ha <\/script> escapado em literal JS)
const countTags = s => ({ open: (s.match(/<script\b/g) || []).length, close: (s.match(/<\/script>/g) || []).length });
const ct = countTags(cand), bt = countTags(base);
gate('script_tag_balance_preserved', ct.open === bt.open && ct.close === bt.close,
  `candidata open/close ${ct.open}/${ct.close} == base ${bt.open}/${bt.close}`);

// 14. o CSP publicado (meta http-equiv no shell) sobrevive intacto ao hunk
const cspOf = s => (s.match(/<meta http-equiv="Content-Security-Policy" content="[^"]*"/) || ['(ausente)'])[0];
gate('csp_meta_intacta', cspOf(cand) === cspOf(base), `comprimento do meta CSP ${cspOf(base).length} chars`);

// 15. a query de supervision_requests continua a pedir os mesmos campos (so a FK/embed muda)
const numOf = s => (s.match(/from\('supervision_requests'\)\.select\('([^']*)'/) || ['', ''])[1].split(',').length;
gate('select_fields_count_same', numOf(cand) === numOf(base), `campos solicitados ${numOf(base)} -> ${numOf(cand)}`);

const allOk = gates.every(g => g.ok);
const diary = {
  cycle: 'v119-supervisao-embed',
  date: '2026-11-13',
  base: 'ar v118-csp (medido 13/11)',
  live_md5: LIVE_MD5,
  live_bytes: LIVE_BYTES,
  candidate_md5: md5(candBuf),
  candidate_bytes: candBuf.length,
  fix: 'linha 23684 school_id,schools(name) -> school_id,sports_schools(name)',
  defect: 'PEN-31 / RM-1.6: embed 400 PGRST200 no ar (FK supervision_requests.school_id -> sports_schools)',
  evidence_source: 'evidence/fin1f-item91-e-schools.json (postgrest.embed_ar_schools 400 / embed_v115_sports 200)',
  gates,
  verdict: allOk ? 'PORTOES_OK' : 'PORTOES_FAIL',
  published: false,
};
fs.writeFileSync(`${dir}/bfr-candidata-v119-supervisao-embed/portoes-v119-diary.json`, JSON.stringify(diary, null, 2));
console.log(`\nVERDICT: ${diary.verdict} (${gates.filter(g => g.ok).length}/${gates.length})`);
process.exit(allOk ? 0 : 1);
