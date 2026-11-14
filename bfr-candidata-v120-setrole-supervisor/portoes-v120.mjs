// RM-1.7 / PEN-32 — portões da candidata v120 (3 hunks no roteador setRole). SOMENTE LEITURA da candidata.
import fs from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';

const dir = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const basePath = `${dir}/bfr-candidata-v119-supervisao-embed/index.html`;
const candPath = `${dir}/bfr-candidata-v120-setrole-supervisor/index.html`;
const BASE_MD5 = 'a1969cdf023042e7d2a91e7ed9333a05';
const BASE_BYTES = 3489474;
const BASE_LINES = 28661;
const md5 = s => crypto.createHash('md5').update(s).digest('hex');

const baseBuf = fs.readFileSync(basePath);
const candBuf = fs.readFileSync(candPath);
const base = baseBuf.toString('utf8');
const cand = candBuf.toString('utf8');

const H1_OLD = `: role === 'sports_operator' ? ['sports_operator','developer'].includes(currentProfile?.role) : role === 'admin' && currentProfile?.role === 'developer';`;
const H1_NEW = `: role === 'sports_operator' ? ['sports_operator','developer'].includes(currentProfile?.role) : role === 'education_supervisor' ? ['education_supervisor','developer'].includes(currentProfile?.role) : role === 'admin' && currentProfile?.role === 'developer';`;
const H2_OLD = `secretaryView.classList.toggle('hidden', role !== 'secretary');`;
const H2_NEW = `secretaryView.classList.toggle('hidden', role !== 'secretary' && role !== 'education_supervisor');`;
const H3_OLD = `secretary:secretaryView, aee:aeeView,`;
const H3_NEW = `secretary:secretaryView, education_supervisor:secretaryView, aee:aeeView,`;
const hunks = [['H1', 9902, H1_OLD, H1_NEW], ['H2', 9926, H2_OLD, H2_NEW], ['H3', 10145, H3_OLD, H3_NEW]];

const gates = [];
const gate = (name, ok, detail) => { gates.push({ name, ok, detail }); console.log(`${ok ? 'OK  ' : 'FAIL'} ${name} :: ${detail}`); };
const n = (s, t) => s.split(t).length - 1;

// 1-2. identidade da candidata
gate('cand_md5', true, md5(candBuf));
gate('cand_bytes', candBuf.length === BASE_BYTES + 175, `${candBuf.length} B (base ${BASE_BYTES} + ${candBuf.length - BASE_BYTES})`);
gate('base_eq_ruler', md5(baseBuf) === BASE_MD5, `base md5 ${md5(baseBuf)}`);

// 3-5. linhagem reversa: desfazer os 3 hunks reproduz o ar byte a byte
let reverted = cand;
for (const [, , oldS, newS] of hunks) {
  if (n(reverted, newS) !== 1) { reverted = reverted.split(newS).join(oldS); }
  else reverted = reverted.replace(newS, oldS);
}
gate('reverse_lineage', md5(reverted) === BASE_MD5, `revertida md5 ${md5(reverted)} == base ${BASE_MD5}`);
gate('reverse_byte_identical', reverted === base, 'revertida === base byte a byte');
gate('reverse_bytes', Buffer.byteLength(reverted) === BASE_BYTES, `${Buffer.byteLength(reverted)} B`);

// 6-11. troca cirurgica por hunk
for (const [id, line, oldS, newS] of hunks) {
  gate(`${id}_new_unique`, n(cand, newS) === 1, `${id}: token novo ocorrencias ${n(cand, newS)}`);
  gate(`${id}_old_gone`, n(cand, oldS) === 0, `${id}: token velho ocorrencias ${n(cand, oldS)}`);
}

// 12-13. diff restrito as 3 linhas-alvo, contagem intacta
const cl = cand.split('\n'), bl = base.split('\n');
const diffLines = [];
for (let i = 0; i < Math.max(cl.length, bl.length); i++) if (cl[i] !== bl[i]) diffLines.push(i + 1);
gate('diff_only_3_lines', diffLines.join(',') === '9902,9926,10145', `linhas alteradas [${diffLines.join(',')}]`);
gate('line_count_same', cl.length === bl.length && cl.length === BASE_LINES, `candidata ${cl.length} == base ${bl.length} == ${BASE_LINES}`);

// 14. guard: exatamente +1 ramo e a cauda admin/developer continua ultima
const gb = bl[9901], gc = cl[9901];
gate('guard_branch_plus_one', n(gc, "role === '") === n(gb, "role === '") + 1,
  `ramos do guard ${n(gb, "role === '")} -> ${n(gc, "role === '")}`);
gate('guard_tail_still_admin', gc.includes(`: role === 'admin' && currentProfile?.role === 'developer';`) && gc.trim().endsWith(';'),
  `cauda admin/developer intacta; guard comprimento ${gb.length} -> ${gc.length}`);

// 15. o ramo novo aceita exatamente education_supervisor e developer
const ramo = gc.match(/role === 'education_supervisor' \? \[([^\]]*)\]\.includes\(currentProfile\?\.role\)/);
gate('new_ramo_allows', !!ramo && ramo[1] === `'education_supervisor','developer'`, `ramo novo permite [${ramo ? ramo[1] : 'NAO PARSADO'}]`);

// 16-18. contagem do papel e o que ja existia permanece
gate('papel_ocorrencias_mais_4', n(cand, 'education_supervisor') === n(base, 'education_supervisor') + 4,
  `'education_supervisor' ocorrencias base ${n(base, 'education_supervisor')} -> candidata ${n(cand, 'education_supervisor')}`);
gate('setup_secretary_pelo_papel', n(cand, `if (role === 'education_supervisor') setupSecretaryView();`) === 1,
  `chamada :9948 intacta (agora alcancavel) ocorrencias ${n(cand, `if (role === 'education_supervisor') setupSecretaryView();`)}`);
gate('roleSectionAccess_intacto', n(cand, `education_supervisor:['inicio','secretaria'`) === 1,
  `mapa de secoes do papel nao foi tocado (ocorrencias ${n(cand, `education_supervisor:['inicio','secretaria'`)})`);
gate('viewIds_do_papel_intacto', n(cand, `education_supervisor: 'secretaryView'`) === 1,
  `viewIds :18733 intacto (ocorrencias ${n(cand, `education_supervisor: 'secretaryView'`)})`);

// 19-20. o modulo deferred da Secretaria e sua authorization continuam os mesmos
gate('modulo_allowed_inalterado', n(cand, `['secretary','education_supervisor'].includes(role())`) === n(base, `['secretary','education_supervisor'].includes(role())`) && n(cand, `['secretary','education_supervisor'].includes(role())`) >= 1,
  `allowed() do modulo intacta ocorrencias ${n(cand, `['secretary','education_supervisor'].includes(role())`)}`);
gate('embed_v119_vive', n(cand, 'sports_schools(name)') === 1, `sports_schools(name) ocorrencias ${n(cand, 'sports_schools(name)')} (conserto da v119 preservado)`);

// 21. toda tag <script> classica continua parseando (text/plain e src ficam de fora)
const tagRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/g;
let m, idx = 0, parsed = 0, skipped = 0, fails = [];
while ((m = tagRe.exec(base)) !== null) idx++;
const totalBase = idx;
idx = 0;
tagRe.lastIndex = 0;
while ((m = tagRe.exec(cand)) !== null) {
  idx++;
  const attrs = m[1], body = m[2];
  if (/\bsrc\s*=/.test(attrs) || /type\s*=\s*["']text\/plain["']/.test(attrs)) { skipped++; continue; }
  try { new vm.Script(body, { filename: `script#${idx}` }); parsed++; }
  catch (e) { fails.push(`#${idx} ${e.name}: ${String(e.message).slice(0, 80)}`); }
}
gate('todos_scripts_classicos_parseiam', fails.length === 0, `parseados ${parsed}, pulados ${skipped}, total de tags ${idx} (base ${totalBase}); falhas ${fails.length ? fails.join(' | ') : 'nenhuma'}`);

// 22. modulo deferred da Supervisao (o que monta a aba) parseia quando desembrulhado
const openTag = '<script type="text/plain" data-bfr-deferred="bfr-secretary-central.js">';
const start = cand.indexOf(openTag);
let modOk = false, modDetail = 'tag do modulo nao encontrada';
if (start >= 0) {
  const bodyStart = start + openTag.length;
  const end = cand.indexOf('</script>', bodyStart);
  const code = cand.slice(bodyStart, end);
  try { new vm.Script(code, { filename: 'bfr-secretary-central.js' }); modOk = true; modDetail = `vm.Script parseou ${code.length} chars`; }
  catch (e) { modDetail = `${e.name}: ${e.message}`; }
}
gate('modulo_secretary_central_syntax', modOk, modDetail);

// 23-25. hygiene do invólucro: tags balanceadas, CSP intacta, boot router intocado
const countTags = s => ({ open: (s.match(/<script\b/g) || []).length, close: (s.match(/<\/script>/g) || []).length });
const ct = countTags(cand), bt = countTags(base);
gate('script_tag_balance_preserved', ct.open === bt.open && ct.close === bt.close, `candidata open/close ${ct.open}/${ct.close} == base ${bt.open}/${bt.close}`);
const cspOf = s => (s.match(/<meta http-equiv="Content-Security-Policy" content="[^"]*"/) || ['(ausente)'])[0];
gate('csp_meta_intacta', cspOf(cand) === cspOf(base), `meta CSP identica, ${cspOf(base).length} chars`);
gate('boot_router_intacto', n(cand, `setRole(role === 'developer' ? 'admin'`) === 1, `roteador de boot :10443 nao foi tocado`);

const allOk = gates.every(g => g.ok);
const diary = {
  ciclo: 'v120-setrole-supervisor',
  data: '2026-11-13',
  tarefa: '#1158 RM-1.7 / PEN-32',
  base: 'candidata v119 congelada == shell publicado',
  base_md5: BASE_MD5,
  base_bytes: BASE_BYTES,
  candidate_md5: md5(candBuf),
  candidate_bytes: candBuf.length,
  candidate_delta_bytes: candBuf.length - BASE_BYTES,
  hunks: hunks.map(([id, line]) => ({ id, line })),
  escopo: 'candidata + portoes + bancada A/B offline; PUBLICACAO NAO autorizada',
  gates,
  verdict: allOk ? 'PORTOES_OK' : 'PORTOES_FAIL',
  published: false,
};
fs.writeFileSync(`${dir}/bfr-candidata-v120-setrole-supervisor/portoes-v120-diary.json`, JSON.stringify(diary, null, 2));
console.log(`\nVERDICT: ${diary.verdict} (${gates.filter(g => g.ok).length}/${gates.length})`);
process.exit(allOk ? 0 : 1);
