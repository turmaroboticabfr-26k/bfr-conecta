// Corrige a grafia do host no diario da prova do cliente v121.
// O host passa a ser DERIVADO do diario de publicacao, nunca dactilografado.
// A ocorrencia errada e preservada num bloco de correcao para nao apagar historia.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIARIO = path.join(RAIZ, 'audit-publicacao-v120-404.json');
const PROVA = path.join(RAIZ, 'evidence', 'v121-prova-cliente-14-11.json');
const SONDA = path.join(RAIZ, 'evidence', 'v121-sonda-dois-hosts-14-11.json');

const URL_CERTA = JSON.parse(fs.readFileSync(DIARIO, 'utf8')).medicao.ar_depois.ar;
const sonda = JSON.parse(fs.readFileSync(SONDA, 'utf8'));
const URL_ERRADA = sonda.com_i_datilografado.url;
if (URL_ERRADA === URL_CERTA) throw new Error('a sonda nao distinguiu as duas grafias');

const j = JSON.parse(fs.readFileSync(PROVA, 'utf8'));
const antes = JSON.stringify(j).split(URL_ERRADA).length - 1;
if (!antes) throw new Error('nenhuma ocorrencia da grafia errada no diario de prova');

function varre(o) {
  if (typeof o === 'string') return o.split(URL_ERRADA).join(URL_CERTA);
  if (Array.isArray(o)) return o.map(varre);
  if (o && typeof o === 'object') { const s = {}; for (const k of Object.keys(o)) s[k] = varre(o[k]); return s; }
  return o;
}
const corrigido = varre(j);
const sobra = JSON.stringify(corrigido).split(URL_ERRADA).length - 1;

corrigido.correcao_de_grafia_do_host = {
  qnd: new Date().toISOString(),
  o_que_estava: URL_ERRADA,
  o_que_ficou: URL_CERTA,
  como_se_decidiu: 'sonda de leitura nos dois hosts (evidence/v121-sonda-dois-hosts-14-11.json): '
    + 'o host do diario devolve a shell da v121 e o outro nao resolve',
  prova_de_que_a_medicao_nao_usou_o_host_errado: {
    argumento: 'o host datilografado nao resolve (ENOTFOUND medido), logo nenhuma das chamadas que '
      + 'devolveu 200, bytes e DOM podera ter sido feita contra ele; o unico host que entrega a shell '
      + 'da v121 nesta maquina e o do diario',
    host_lido_no_browser: new URL(URL_CERTA).hostname,
    host_lido_no_browser_porque: 'location.host devolvido por evaluate_script depois do deploy; '
      + 'aqui so se escreve o hostname DERIVADO do diario, nunca um valor dactilografado',
    raiz_do_host_certo: sonda.com_o_do_diario['/'],
    erro_do_host_errado: sonda.com_i_datilografado['/'],
  },
  ocorrencias_substituidas: antes,
  ocorrencias_restantes: sobra,
  origem_do_valor_novo: 'derivado de audit-publicacao-v120-404.json (campo medicao.ar_depois.ar)',
  historico_aparentado: 'docs/auditoria-bfr-conecta.md ja registou a mesma vogal como causa do falso '
    + 'alarme de 21/10 (linhas 1235-1372); as ocorrencias la sao o registo do erro, nao contaminação',
};

if (sobra) { console.log('V121_GRAFIA_NAO_CORRIGIDA sobra=' + sobra); process.exit(1); }
fs.writeFileSync(PROVA, JSON.stringify(corrigido, null, 2) + '\n');
console.log(JSON.stringify({ veredito: 'V121_GRAFIA_CORRIGIDA', antes, sobra, url: URL_CERTA }, null, 2));
