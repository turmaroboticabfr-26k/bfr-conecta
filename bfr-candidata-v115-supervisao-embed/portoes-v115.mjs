import fs from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';

const dir = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const candPath = `${dir}/bfr-candidata-v115-supervisao-embed/index.html`;
const basePath = `${dir}/bfr-candidata-v114-supervisao/index.html`;
const LIVE_MD5 = '2496a70573cce3bb3ce23633fac40b79';
const md5 = s => crypto.createHash('md5').update(s).digest('hex');

const cand = fs.readFileSync(candPath, 'utf8');
const base = fs.readFileSync(basePath, 'utf8');
const gates = [];
const gate = (name, ok, detail) => { gates.push({ name, ok, detail }); console.log(`${ok ? 'OK ' : 'FAIL'} ${name} :: ${detail}`); };

// 1. candidate md5 + size
const candBuf = fs.readFileSync(candPath);
gate('cand_md5', true, md5(candBuf));
gate('cand_size', candBuf.length === 3488135, `${candBuf.length} bytes (base 3488128 + 7)`);

// 2. base still equals live (comparability ruler)
gate('base_eq_live', md5(base) === LIVE_MD5, `base md5 ${md5(base)}`);

// 3. reverse lineage: revert the single token -> must reproduce live md5
const reverted = cand.replace('school_id,sports_schools(name)', 'school_id,schools(name)');
const revMd5 = md5(reverted);
gate('reverse_lineage', revMd5 === LIVE_MD5, `reverted md5 ${revMd5} == live ${LIVE_MD5}`);
gate('reverse_byte_identical', reverted === base, `reverted === base byte-for-byte`);

// 4. exactly one token changed, one occurrence of the new token
const newTokCount = (cand.match(/sports_schools\(name\)/g) || []).length;
const oldTokCount = (cand.match(/school_id,schools\(name\)/g) || []).length;
gate('new_token_unique', newTokCount === 1, `sports_schools(name) occurrences = ${newTokCount}`);
gate('old_token_gone', oldTokCount === 0, `school_id,schools(name) occurrences = ${oldTokCount}`);

// 5. line-level diff count (only line 23653 differs)
const cl = cand.split('\n'), bl = base.split('\n');
let diffLines = [];
const maxLen = Math.max(cl.length, bl.length);
for (let i = 0; i < maxLen; i++) if (cl[i] !== bl[i]) diffLines.push(i + 1);
gate('one_line_diff', diffLines.length === 1 && diffLines[0] === 23653, `changed lines = [${diffLines.join(',')}]`);
gate('line_count_same', cl.length === bl.length, `candidate ${cl.length} lines == base ${bl.length} lines`);

// 6. syntax of the changed deferred module (bfr-secretary-central.js)
const openTag = '<script type="text/plain" data-bfr-deferred="bfr-secretary-central.js">';
const start = cand.indexOf(openTag);
let syntaxOk = false, syntaxDetail = 'module tag not found';
if (start >= 0) {
  const bodyStart = start + openTag.length;
  const end = cand.indexOf('</script>', bodyStart);
  const code = cand.slice(bodyStart, end);
  try { new vm.Script(code, { filename: 'bfr-secretary-central.js' }); syntaxOk = true; syntaxDetail = `vm.Script parsed ${code.length} chars`; }
  catch (e) { syntaxDetail = `${e.name}: ${e.message}`; }
}
gate('module_syntax', syntaxOk, syntaxDetail);

// 7. HTML script-tag balance preserved by the edit (candidate == base).
// Absolute open===close is NOT a valid premise here: the file carries <script
// substrings inside JS string literals whose closers are escaped as <\/script>,
// so the base itself is 108/103. The invariant is that the edit changed nothing.
const countTags = s => ({ open: (s.match(/<script\b/g) || []).length, close: (s.match(/<\/script>/g) || []).length });
const ct = countTags(cand), bt = countTags(base);
gate('script_tag_balance_preserved', ct.open === bt.open && ct.close === bt.close, `candidate open/close ${ct.open}/${ct.close} == base ${bt.open}/${bt.close}`);

const allOk = gates.every(g => g.ok);
const diary = { cycle: 'v115-supervisao-embed', date: '2026-11-07', base: 'v114', live_md5: LIVE_MD5, candidate_md5: md5(candBuf), candidate_bytes: candBuf.length, fix: 'line 23653 schools(name) -> sports_schools(name)', gates, verdict: allOk ? 'PORTOES_OK' : 'PORTOES_FAIL', published: false };
fs.writeFileSync(`${dir}/bfr-candidata-v115-supervisao-embed/portoes-v115-diary.json`, JSON.stringify(diary, null, 2));
console.log(`\nVERDICT: ${diary.verdict} (${gates.filter(g => g.ok).length}/${gates.length})`);
process.exit(allOk ? 0 : 1);