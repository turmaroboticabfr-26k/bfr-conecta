// H4/H5-2 (#1167) — portões da candidata v121 (1 hunk no mapa accountLabels). SOMENTE LEITURA da v120.
import fs from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';

const dir = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const baseDir = `${dir}/bfr-candidata-v120-setrole-supervisor`;
const basePath = `${baseDir}/index.html`;
const candPath = `${dir}/bfr-candidata-v121-rotulos-supervisor/index.html`;
const AR_PATH = `${dir}/evidence/h45-ar-v120-shell.html`;
const REGUA120 = JSON.parse(fs.readFileSync(`${baseDir}/portoes-v120-diary.json`, 'utf8'));
const PUB = JSON.parse(fs.readFileSync(`${dir}/audit-publicacao-v120.json`, 'utf8'));
const MED = JSON.parse(fs.readFileSync(`${dir}/evidence/h45-medicao-diary.json`, 'utf8'));

const md5 = s => crypto.createHash('md5').update(s).digest('hex');
const n = (s, t) => s.split(t).length - 1;
const parsePar = s => { const m = /^(.*?) \((\d+) B\)$/.exec(s); return { md5: m[1], bytes: Number(m[2]) }; };

const baseBuf = fs.readFileSync(basePath);
const candBuf = fs.readFileSync(candPath);
const arBuf = fs.readFileSync(AR_PATH);
const base = baseBuf.toString('utf8');
const cand = candBuf.toString('utf8');

// régua e hunk derivados, não dactilografados
const BASE_MD5 = REGUA120.candidate_md5;
const BASE_BYTES = REGUA120.candidate_bytes;
const BASE_LINES = MED.bytes.candidata_v120.linhas;
const LMapa = MED.h5.linha_accountLabels;
const bl = base.split('\n'), cl = cand.split('\n');
const mapaBase = bl[LMapa - 1] || '';
const parSecretaria = /(secretary:\['[^']*','[^']*'\],)/.exec(mapaBase);
const H_OLD = parSecretaria ? parSecretaria[1] : null;
const rotuloPapel = MED.h5.rotulo_oficial_do_app.rotulo;
const nomeAba = (() => { const j = bl.findIndex(l => l.includes('function supervisaoMarkup(')); const m = /bfr-secretary-label">([^<]+)</.exec(bl[j]); return m ? m[1] : null; })();
const H_NEW = H_OLD ? `${H_OLD} education_supervisor:['${nomeAba}','${rotuloPapel}'],` : null;
const INS = H_NEW ? H_NEW.slice(H_OLD.length + 1) : null;

const gates = [];
const gate = (name, ok, detail) => { gates.push({ name, ok, detail }); console.log(`${ok ? 'OK  ' : 'FAIL'} ${name} :: ${detail}`); };

// 1-4. identidade e o chão em que a candidata pisa
gate('cand_md5', true, md5(candBuf));
gate('cand_bytes', candBuf.length === BASE_BYTES + Buffer.byteLength(INS) + 1, `${candBuf.length} B (base ${BASE_BYTES} + hunk ${Buffer.byteLength(INS)} + 1 espaço)`);
gate('base_eq_ruler_v120', md5(baseBuf) === BASE_MD5 && baseBuf.length === BASE_BYTES, `base md5 ${md5(baseBuf)}`);
gate('base_eq_ar_publicado', md5(baseBuf) === md5(arBuf) && baseBuf.length === arBuf.length && md5(baseBuf) === parsePar(PUB.md5.shell_depois).md5,
  `ar ${arBuf.length} B ${md5(arBuf)} == disco da v120 == publicado ${PUB.md5.shell_depois}`);

// 5-7. linhagem reversa: tirar o espaço + fragmento reproduz a v120 byte a byte (e a v120 já provou voltar à v119)
const FRAG = ` ${INS}`;
const reverted = cand.split(FRAG).join('');
gate('reverse_frag_unique', n(cand, FRAG) === 1 && n(cand, INS) === 1, `fragmento com o espaço ocorre ${n(cand, FRAG)}x, sem espaço ${n(cand, INS)}x`);
gate('reverse_byte_identical', reverted === base, `revertida === base byte a byte: ${reverted === base}`);
gate('reverse_md5', md5(reverted) === BASE_MD5, `revertida md5 ${md5(reverted)} == ${BASE_MD5}`);

// 8-11. troca cirúrgica
gate('h_new_unique', n(cand, H_NEW) === 1, `token novo ocorrencias ${n(cand, H_NEW)}`);
gate('h_old_anchor_preserved', n(cand, H_OLD) === 1, ` ancora do secretary continua la (1x) — o hunk e um insert, nao um replace`);
gate('linha_velha_gone', n(cand, mapaBase) === 0, `linha antiga do mapa ocorre ${n(cand, mapaBase)}x`);
gate('chave_do_papel_unica', n(cl[LMapa - 1], "education_supervisor:['") === 1, `chave no mapa: ${n(cl[LMapa - 1], "education_supervisor:['")}x`);

// 12-13. diff restrito e contagem de linhas intacta
const diffLines = [];
for (let i = 0; i < Math.max(cl.length, bl.length); i++) if (cl[i] !== bl[i]) diffLines.push(i + 1);
gate('diff_only_1_line', diffLines.join(',') === String(LMapa), `linhas alteradas [${diffLines.join(',')}] esperado [${LMapa}]`);
gate('line_count_same', cl.length === bl.length && cl.length === BASE_LINES, `candidata ${cl.length} == base ${bl.length} == ${BASE_LINES}`);

// 14-16. o mapa: 12 chaves viram 13, o par novo é o que foi medido, e o resto não se move
const chavesCand = Array.from(cl[LMapa - 1].matchAll(/(\w+):\[/g)).map(m => m[1]);
const chavesBase = Array.from(mapaBase.matchAll(/(\w+):\[/g)).map(m => m[1]);
gate('mapa_chaves_mais_uma', chavesCand.length === chavesBase.length + 1 && chavesBase.length === MED.h5.total_chaves,
  `chaves ${chavesBase.length} -> ${chavesCand.length}`);
const posEsperado = chavesBase.indexOf('secretary') + 1;
const ordemEsperada = [...chavesBase]; ordemEsperada.splice(posEsperado, 0, 'education_supervisor');
gate('mapa_sem_reordenacao', ordemEsperada.join(',') === chavesCand.join(','),
  `inserido na posicao ${posEsperado}: obtida [${chavesCand.join(',')}]`);
const parNovo = /education_supervisor:\['([^']*)','([^']*)'\]/.exec(cl[LMapa - 1]);
gate('par_novo_bate_medicao', !!parNovo && parNovo[1] === nomeAba && parNovo[2] === rotuloPapel,
  `pares lidos ${JSON.stringify(parNovo && parNovo.slice(1))} esperados ${JSON.stringify([nomeAba, rotuloPapel])}`);

// 17-18. nenhum vocábulo novo: os dois strings já existem nos bytes da v120 (cada um ganha 1 ocorrência)
gate('vocabulo_ja_existe_0', n(base, nomeAba) >= 1 && n(cand, nomeAba) === n(base, nomeAba) + 1,
  `'${nomeAba}' base ${n(base, nomeAba)}x -> candidata ${n(cand, nomeAba)}x`);
gate('vocabulo_ja_existe_1', n(base, rotuloPapel) >= 1 && n(cand, rotuloPapel) === n(base, rotuloPapel) + 1,
  `'${rotuloPapel}' base ${n(base, rotuloPapel)}x -> candidata ${n(cand, rotuloPapel)}x`);

// 19-21. a cadeia de pintura do chip continua a mesma
gate('fallback_pai_intacto', n(cand, `const account = accountLabels[role] || accountLabels.parent;`) === 1, `linha de uso ocorre ${n(cand, 'accountLabels[role] || accountLabels.parent')}x`);
gate('pinta_account1_intacta', n(cand, "textContent = account[1]") === 1 && n(cand, 'account[0]') === 0,
  `account[1] x${n(cand, 'textContent = account[1]')} | account[0] x${n(cand, 'account[0]')}`);
gate('nome_do_chip_intacto', n(cand, 'data-account-display-name') === n(base, 'data-account-display-name'),
  `data-account-display-name base ${n(base, 'data-account-display-name')} -> candidata ${n(cand, 'data-account-display-name')}`);

// 22-23. papel no resto do arquivo: exatamente +1 ocorrência, e o acesso às seções não foi tocado
gate('papel_ocorrencias_mais_1', n(cand, 'education_supervisor') === n(base, 'education_supervisor') + 1,
  `'education_supervisor' base ${n(base, 'education_supervisor')} -> candidata ${n(cand, 'education_supervisor')}`);
gate('roleSectionAccess_intacto', n(cand, `education_supervisor:['inicio','secretaria'`) === 1 && cl[MED.h4.access_education_supervisor.linha - 1] === bl[MED.h4.access_education_supervisor.linha - 1],
  `mapa de secoes :${MED.h4.access_education_supervisor.linha} byte a byte igual`);

// 24. os 3 hunks da v120 (PEN-32) continuam todos vivos na candidata
const h120 = [
  `role === 'education_supervisor' ? ['education_supervisor','developer'].includes(currentProfile?.role)`,
  `secretaryView.classList.toggle('hidden', role !== 'secretary' && role !== 'education_supervisor');`,
  `secretary:secretaryView, education_supervisor:secretaryView, aee:aeeView,`,
];
gate('pen32_tres_hunks_vivos', h120.every((t, i) => n(cand, t) === 1), `hunks da v120 presentes: ${h120.map(t => n(cand, t)).join('/')}`);
const lGuard = REGUA120.hunks[0].line;
gate('guard_setrole_intacto', cl[lGuard - 1] === bl[lGuard - 1] && cl[lGuard - 1].includes(`: role === 'admin' && currentProfile?.role === 'developer';`),
  `:${lGuard} linha do guard byte a byte igual a v120, ${n(cl[lGuard - 1], "role === '")} ocorrencias de "role === '", cauda admin/developer intacta`);

// 25-26. o embed da Supervisão (PEN-31) não se move
gate('embed_v119_vive', n(cand, 'sports_schools(name)') === 1, `sports_schools(name) ocorrencias ${n(cand, 'sports_schools(name)')}`);
gate('modulo_allowed_inalterado', n(cand, `['secretary','education_supervisor'].includes(role())`) === 1,
  `allowed() do modulo intacta ocorrencias ${n(cand, "['secretary','education_supervisor'].includes(role())")}`);

// 27. toda tag <script> clássica continua parseando
const tagRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/g;
let m, idx = 0, parsed = 0, skipped = 0, fails = [];
while ((m = tagRe.exec(cand)) !== null) {
  idx++;
  const attrs = m[1], body = m[2];
  if (/\bsrc\s*=/.test(attrs) || /type\s*=\s*["']text\/plain["']/.test(attrs)) { skipped++; continue; }
  try { new vm.Script(body, { filename: `script#${idx}` }); parsed++; }
  catch (e) { fails.push(`#${idx} ${e.name}: ${String(e.message).slice(0, 80)}`); }
}
const baseTags = (() => { let c = 0; const r = new RegExp(tagRe); while (r.exec(base)) c++; return c; })();
gate('todos_scripts_classicos_parseiam', fails.length === 0 && idx === baseTags,
  `parseados ${parsed}, pulados ${skipped}, total de tags ${idx} (base ${baseTags}); falhas ${fails.length ? fails.join(' | ') : 'nenhuma'}`);

// 28. o módulo deferred da Secretaria parseia quando desembrulhado
const openTag = '<script type="text/plain" data-bfr-deferred="bfr-secretary-central.js">';
const start = cand.indexOf(openTag);
let modOk = false, modDetail = 'tag do modulo nao encontrada';
if (start >= 0) {
  const code = cand.slice(start + openTag.length, cand.indexOf('</script>', start + openTag.length));
  try { new vm.Script(code, { filename: 'bfr-secretary-central.js' }); modOk = true; modDetail = `vm.Script parseou ${code.length} chars`; }
  catch (e) { modDetail = `${e.name}: ${e.message}`; }
}
gate('modulo_secretary_central_syntax', modOk, modDetail);

// 29-32. higiene do invólucro
const countTags = s => ({ open: (s.match(/<script\b/g) || []).length, close: (s.match(/<\/script>/g) || []).length });
const ct = countTags(cand), bt = countTags(base);
gate('script_tag_balance_preserved', ct.open === bt.open && ct.close === bt.close, `candidata open/close ${ct.open}/${ct.close} == base ${bt.open}/${bt.close}`);
const cspOf = s => (s.match(/<meta http-equiv="Content-Security-Policy" content="[^"]*"/) || ['(ausente)'])[0];
gate('csp_meta_intacta', cspOf(cand) === cspOf(base), `meta CSP identica, ${cspOf(base).length} chars`);
gate('boot_router_intacto', n(cand, `setRole(role === 'developer' ? 'admin'`) === 1, `roteador de boot :10443 nao foi tocado`);
gate('hunk_sem_valor_invalido', !/undefined|null\b|NaN/.test(INS), `fragmento: ${INS}`);

const allOk = gates.every(g => g.ok);
const diary = {
  ciclo: 'v121-rotulos-supervisor',
  data: '2026-11-13',
  tarefa: '#1167 H4/H5-2',
  base: 'candidata v120 congelada == shell publicado',
  base_md5: BASE_MD5,
  base_bytes: BASE_BYTES,
  candidate_md5: md5(candBuf),
  candidate_bytes: candBuf.length,
  candidate_delta_bytes: candBuf.length - BASE_BYTES,
  hunks: [{ id: 'H1', line: LMapa, tipo: 'insert', rotulo_lido_0: nomeAba, rotulo_lido_1: rotuloPapel }],
  h4: 'MEDIDO COMO FALSO ALARME na v120 (syncRoleNavigation :10434 re-escreve o menu depois do toggle :10425); nenhuma linha de menu alterada aqui',
  escopo: 'candidata + portoes; PUBLICACAO NAO autorizada; 0 deploy, 0 DDL, 0 escrita, 0 mint',
  medicao_que_origina: 'evidence/h45-medicao-diary.json',
  gates,
  verdict: allOk ? 'ROTULOS_OK' : 'ROTULOS_FAIL',
  published: false,
};
fs.writeFileSync(`${dir}/bfr-candidata-v121-rotulos-supervisor/portoes-v121-diary.json`, JSON.stringify(diary, null, 2));
console.log(`\nVERDICT: ${diary.verdict} (${gates.filter(g => g.ok).length}/${gates.length})`);
process.exit(allOk ? 0 : 1);
