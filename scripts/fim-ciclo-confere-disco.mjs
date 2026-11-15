// FIM-CICLO: conferencia de disco antes de escrever a secao W do diario.
// Le as reguas dos proprios diarios (nunca dactilografadas) e compara com o disco.
import fs from 'node:fs';
import crypto from 'node:crypto';

const dir = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const md5 = b => crypto.createHash('md5').update(b).digest('hex');
const sz = f => Buffer.byteLength(fs.readFileSync(f));
const h = f => md5(fs.readFileSync(f));
const die = m => { console.error(`ABORTO: ${m}`); process.exit(1); };

const gates = [];
const gate = (nome, valor, esperado) => { gates.push({ nome, valor, esperado, ok: valor === esperado }); };

// --- RM-1.5: diario da candidata do SW ---
const dSw = JSON.parse(fs.readFileSync(`${dir}/bfr-candidata-v122-push-sw/portoes-v122-diary.json`, 'utf8'));
gate('diario_sw_verdict', dSw.verdict, 'V122_SW_ESTRUTURAL_OK');
gate('diario_sw_published', dSw.published, false);
gate('sw_candidata_md5', h(`${dir}/bfr-candidata-v122-push-sw/sw-v4.js`), dSw.candidata.swMd5);
gate('sw_candidata_bytes', sz(`${dir}/bfr-candidata-v122-push-sw/sw-v4.js`), dSw.candidata.swBytes);
gate('sw_reversa_md5_e_a_base', h(`${dir}/bfr-candidata-v122-push-sw/sw-v4-reversa.js`), dSw.base.swMd5);

// --- RM-1.5: diario da bancada ---
const dB = JSON.parse(fs.readFileSync(`${dir}/bfr-candidata-v122-push-sw/portoes-v122-bancada.json`, 'utf8'));
gate('bancada_verdict', dB.verdict, 'V122_BANCADA_OK');
gate('bancada_published', dB.published, false);
const tp = dB.portoes ? dB.portoes.filter(g => g.ok).length : -1;
const tt = dB.portoes ? dB.portoes.length : -1;
gate('bancada_portoes_29_29', `${tp}/${tt}`, '29/29');

// --- monta do worker v122 ---
const dW = JSON.parse(fs.readFileSync(`${dir}/worker-deploy-v122-push/esperado-v122.json`, 'utf8'));
gate('esperado_v122_ok_literal', dW.ok_literal, 'publicar v122');
gate('worker_v122_md5', h(`${dir}/worker-deploy-v122-push/worker.mjs`), dW.workerMd5 ?? dW.worker?.md5);
gate('worker_v122_bytes', sz(`${dir}/worker-deploy-v122-push/worker.mjs`), dW.workerBytes ?? dW.worker?.bytes);

// --- RM-6.8: SQL continua so escrito, nao aplicado; a regua vem do diario do passo 0 ---
const dEst = JSON.parse(fs.readFileSync(`${dir}/evidence/rm15-estado-ar-14-11.json`, 'utf8'));
const achaRm68 = (o, alvo = []) => {
  if (o && typeof o === 'object') {
    if (o.caminho === 'scripts/rm68-fail-closed-por-policy.sql') alvo.push(o);
    for (const k of Object.keys(o)) achaRm68(o[k], alvo);
  }
  return alvo;
};
const rm68regua = achaRm68(dEst)[0];
if (!rm68regua) die('regua do rm68 nao localizada no diario do passo 0');
gate('rm68_sql_md5_e_o_da_regua', h(`${dir}/scripts/rm68-fail-closed-por-policy.sql`), rm68regua.md5);
gate('rm68_sql_bytes', sz(`${dir}/scripts/rm68-fail-closed-por-policy.sql`), rm68regua.bytes);
gate('rm68_diario_nao_aplicada', rm68regua.nota, 'RM-6.8 fail-closed, NÃO aplicada');

// --- candidatas de PDF (as do ar sao HTML de 1477823 B) ---
const dP = JSON.parse(fs.readFileSync(`${dir}/bfr-candidata-v122-horarios-pdf/portoes-horarios-pdf-diary.json`, 'utf8'));
gate('pdf_diary_porta_ok', dP.porta_ok, true);
gate('pdf_diary_nao_sobrescreve', dP.nao_sobrescreve, true);
for (const a of dP.alvos) {
  gate(`pdf_${a.pdf.replace(/\.pdf$/, '')}_md5`, h(`${dir}/bfr-candidata-v122-horarios-pdf/${a.pdf}`), a.pdfMd5);
  gate(`pdf_${a.pdf.replace(/\.pdf$/, '')}_bytes`, sz(`${dir}/bfr-candidata-v122-horarios-pdf/${a.pdf}`), a.pdfBytes);
}

// --- PEN-34: a medida datada (14/11) e os factos ---
const p34 = JSON.parse(fs.readFileSync(`${dir}/evidence/pen34-deep-link-14-11.json`, 'utf8'));
gate('pen34_versao_do_ar', p34.versao_esperada_no_ar, '5ba82c35-7c46-42ea-9c1d-30573370f563');
gate('pen34_shell_da_v121', p34.shell.md5, 'd418e7fc917f1fbb1437054b7b531f9b');
gate('pen34_pushState_zero', p34.marcas_no_shell.pushState, 0);
gate('pen34_caminho_absoluto_zero', p34.marcas_no_shell.caminho_absoluto_no_html, 0);
gate('pen34_aluno_404_9b', p34.rotas_internas_sondadas['/aluno'].md5, '9e076f5885f5cc16a4b5aeb8de4adff5');

const falhas = gates.filter(g => !g.ok);
for (const g of gates) console.log(`  ${g.ok ? 'OK' : 'FALHA'}  ${g.nome} valor=${g.valor} esperado=${g.esperado}`);
if (falhas.length) die(`${falhas.length} conferencia(s) vermelha(s)`);
console.log(`\nCONFERENCIA DE DISCO OK — ${gates.length}/${gates.length}`);
