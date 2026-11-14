// V121-4 — confere o diario da prova do cliente: JSON valido + URL derivada do diario, nao dactilografada.
// (a memoria regista um falso alarme antigo causado por grafia de hostname)
import fs from 'node:fs';

const dir = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const d404 = JSON.parse(fs.readFileSync(`${dir}/audit-publicacao-v120-404.json`, 'utf8'));
const URL_AR = d404.medicao.ar_depois.ar;
const f = `${dir}/evidence/v121-prova-cliente-14-11.json`;
const txt = fs.readFileSync(f, 'utf8');
let j = null, erro = null;
try { j = JSON.parse(txt); } catch (e) { erro = e.message; }

// O bloco de correcao cita de proposito a grafia errada; varrer so as mediacoes.
const corpo = j ? JSON.stringify({ ...j, correcao_de_grafia_do_host: undefined }) : txt;
const urlNoDiario = [...new Set((corpo.match(/https:\/\/[a-z0-9.-]+\.workers\.dev/g) || []))];
console.log(`json_valido=${!!j}${erro ? ' erro=' + erro : ''}`);
console.log(`url_do_diario=${URL_AR}`);
console.log(`urls_no_diario_de_prova=${JSON.stringify(urlNoDiario)}`);
const errado = urlNoDiario.filter(u => u !== URL_AR);
console.log(`urls_d divergentes=${errado.length}${errado.length ? ' -> ' + errado.join(', ') : ''}`);
if (j?.correcao_de_grafia_do_host) {
  const c = j.correcao_de_grafia_do_host;
  console.log(`correcao_registada=${c.ocorrencias_substituidas} sobra=${c.ocorrencias_restantes} qnd=${c.qnd}`);
}
if (j) console.log(`veredito=${j.veredito} portoes=${j.totais?.portoes_medidos} vermelhos=${j.totais?.vermelhos} nao_tentados=${j.totais?.nao_tentados}`);
process.exit(erro || errado.length ? 1 : 0);
