#!/usr/bin/env node
// P163 — CONFERENCIA DOS MATERIAIS FORA DO BUNDLE (24/11).
// Le os 5 templates de email, o exemplo FCM e os dois textos de loja em uniesco-fora-do-bundle/ e mede:
// placeholders GoTrue por template, branding (UNIESCO + slogan + cores + logo), ausencia do nome antigo
// visivel, e os limites das lojas (Play: name<=30, short<=80, full<=4000; Apple: name<=30, subtitle<=30,
// promotional<=170, description<=4000). Nao publica nada, nao escreve nada fora de evidence/.
// Guarda de sobrescrita: um sufixo so corre uma vez.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = process.argv[2];
if (!SUF) { console.error('uso: node scripts/p163-verifica-materiais-fora-do-bundle.mjs <sufixo>'); process.exit(2); }
const OUT_JSON = `${REPO}/evidence/p163-materiais-fora-do-bundle-24-11-${SUF}.json`;
const OUT_TXT = `${REPO}/evidence/p163-materiais-fora-do-bundle-24-11-${SUF}.txt`;
if (existsSync(OUT_JSON) || existsSync(OUT_TXT)) throw new Error('ABORTA: saida p163 com sufixo ' + SUF + ' ja existe — nunca se sobrescreve');

const rd = (p) => readFileSync(`${REPO}/${p}`, 'utf8');
const SLOGAN = 'Conexão que transforma aprendizado, relações e futuro.';
const LOGO_URL = 'https://bfr-conecta.turmaroboticabfr.workers.dev/bfr-app-logo.png';
const ICON_URL = 'https://bfr-conecta.turmaroboticabfr.workers.dev/uniesco-icon-192.png';
// "Conexao" do slogan nao casa em "Conecta"; bfr-app-logo.png e o host sao tecnicos e nao casam (\s+ exige espaco)
const NOME_ANTIGO = /BFR\s+CONECTA|BFR\s+Conecta|bfr\s+conecta|Conecta/g;
const TEMPLATES = {
  'confirm-signup.html': ['{{ .ConfirmationURL }}', '{{ .Email }}'],
  'invite-user.html': ['{{ .ConfirmationURL }}', '{{ .Email }}'],
  'magic-link.html': ['{{ .ConfirmationURL }}'],
  'change-email.html': ['{{ .ConfirmationURL }}', '{{ .Email }}', '{{ .NewEmail }}'],
  'reset-password.html': ['{{ .ConfirmationURL }}', '{{ .Email }}'],
};
const STORE_RULES = {
  'play-store-listing.json': { name: 30, short_description: 80, full_description: 4000 },
  'apple-store-listing.json': { name: 30, subtitle: 30, promotional_text: 170, description: 4000 },
};

const contagens = { verdes: 0, vermelhos: 0 };
const falhas = [];
const g = (nome, cond, dado) => {
  const v = cond === true;
  if (v) contagens.verdes++; else { contagens.vermelhos++; falhas.push(nome + ' | ' + JSON.stringify(dado).slice(0, 300)); }
  console.log(`${v ? 'VERDE' : 'VERMELHO'}  ${nome}${v ? '' : ' | ' + JSON.stringify(dado).slice(0, 200)}`);
};
const achou = (t) => (t.match(NOME_ANTIGO) || []);

const medido = { templates: {}, fcm: {}, stores: {} };
for (const [nome, placeholders] of Object.entries(TEMPLATES)) {
  const html = rd(`uniesco-fora-do-bundle/email-templates/${nome}`);
  const faltam = placeholders.filter((p) => !html.includes(p));
  const branding = html.includes('UNIESCO') && html.includes(SLOGAN) && html.includes('#00399b') && html.includes('#3fb80a') && html.includes(LOGO_URL);
  const velho = achou(html);
  g(`template_${nome}_placeholders`, faltam.length === 0, { faltam });
  g(`template_${nome}_branding`, branding, { uniesco: html.includes('UNIESCO'), slogan: html.includes(SLOGAN), azul: html.includes('#00399b'), verde: html.includes('#3fb80a'), logo: html.includes(LOGO_URL) });
  g(`template_${nome}_sem_nome_antigo`, velho.length === 0, { encontrados: velho });
  medido.templates[nome] = { bytes: Buffer.byteLength(html), placeholders_medidos: placeholders, nome_antigo_encontrado: velho };
}
{
  const fcm = JSON.parse(rd('uniesco-fora-do-bundle/fcm/exemplo-payload-fcm-v1.json'));
  const n = (fcm.message && fcm.message.notification) || {};
  const w = (fcm.message && fcm.message.webpush && fcm.message.webpush.notification) || {};
  g('fcm_titulo_e_corpo_uniesco', n.title === 'UNIESCO' && n.body === SLOGAN, { title: n.title, body: n.body });
  g('fcm_icone_e_badge_do_worker', w.icon === ICON_URL && w.badge === ICON_URL, { icon: w.icon, badge: w.badge });
  g('fcm_sem_nome_antigo', achou(JSON.stringify(fcm)).length === 0, {});
  medido.fcm = { title: n.title, body: n.body, icon: w.icon, badge: w.badge, topic: fcm.message && fcm.message.topic };
}
for (const [nome, limites] of Object.entries(STORE_RULES)) {
  const loja = JSON.parse(rd(`uniesco-fora-do-bundle/stores/${nome}`));
  const fora = Object.entries(limites)
    .filter(([campo, teto]) => typeof loja[campo] === 'string' && loja[campo].length > teto)
    .map(([campo, teto]) => ({ campo, medido: loja[campo].length, teto }));
  g(`loja_${nome}_limites`, fora.length === 0, { fora });
  const texto = JSON.stringify(loja);
  g(`loja_${nome}_branding_e_sem_nome_antigo`, texto.includes('UNIESCO') && texto.includes(SLOGAN) && achou(texto).length === 0, {});
  medido.stores[nome] = Object.fromEntries(Object.entries(limites).map(([campo, teto]) => [campo, { texto: loja[campo], chars: loja[campo].length, teto }]));
}

const veredito = `P163_MATERIAIS_FORA_DO_BUNDLE_${falhas.length === 0 ? 'OK' : 'VERMELHO'} ${contagens.verdes}/${contagens.vermelhos}`;
const saida = { veredito, total: { verdes: contagens.verdes, falha: contagens.vermelhos }, medido, falhas, node_exit: 0 };
writeFileSync(OUT_JSON, JSON.stringify(saida, null, 2) + '\n');
writeFileSync(OUT_TXT, veredito + ' · templates ' + Object.keys(TEMPLATES).length + ' · fcm 1 · stores ' + Object.keys(STORE_RULES).length + '\n');
console.log(veredito);
process.exit(0);
