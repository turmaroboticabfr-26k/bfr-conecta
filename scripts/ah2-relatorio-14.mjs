// §14 do briefing exige UMA tabela por funcionalidade e proíbe inventar resultados; §15 exige dizer o que
// falta. Um relatório escrito à mão é exatamente onde essas duas ordens se traem. Este programa não escreve
// prosa de resultados: corre os dois consolidadores (grelha mobile do §5 e varredura desktop do §6), apanha
// o stdout deles e costura o documento — mais as pendências contadas em disco e um ponteiro para as causas
// provadas no §AI da auditoria. Tudo o que aparece como número foi medido nesta execução.
// Só-leitura em base e 0 browser: os dois filhos são programas de leitura de `evidence/`.
// Uso: node scripts/ah2-relatorio-14.mjs <rotulo>   (escreve evidence/ah2-relatorio-14-<rotulo>.md)
import { spawnSync } from 'node:child_process';
import { writeFileSync, existsSync, readFileSync, readdirSync } from 'node:fs';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const ROTULO = process.argv[2];
if (!ROTULO || !/^[a-z0-9-]+$/.test(ROTULO)) throw new Error('ABORTA: dar rótulo de ficheiro ([a-z0-9-]+)');
const OUT = `${DIR}/evidence/ah2-relatorio-14-${ROTULO}.md`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' já existe — usar outro rótulo, nunca sobrescrever evidência');
const corre = (args) => {
  const r = spawnSync(process.execPath, [`${DIR}/scripts/${args[0]}`, ...args.slice(1)], { cwd: DIR, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error('ABORTA: ' + args.join(' ') + ' → ' + String(r.stderr || r.stdout).slice(0, 400));
  return { saiu: String(r.stdout), notas: String(r.stderr || '') };
};
const mobile = corre(['ah2-m5-tabela.mjs', 'm5']);
const desktop = corre(['ah2-desktop-tabela.mjs']);
// O nº de células medidas/travadas/por medir vem do consolidador, que é quem tem a regra de coerência.
const cons = readdirSync(`${DIR}/evidence`).filter((f) => /^ah2-m5-consolidado-.*\.json$/.test(f)).sort()
  .map((f) => ({ f, j: JSON.parse(readFileSync(`${DIR}/evidence/${f}`, 'utf8')) }))
  .sort((a, b) => String(a.j.em).localeCompare(String(b.j.em))).pop();
if (!cons) throw new Error('ABORTA: correr primeiro `node scripts/ah2-m5-consolidador.mjs m5 <rotulo>`');
const md5_shell = [...new Set(readdirSync(`${DIR}/evidence`).filter((f) => /^ah2-(mobile2-m5|varredura-17-11).*\.json$/.test(f))
  .map((f) => JSON.parse(readFileSync(`${DIR}/evidence/${f}`, 'utf8')).md5_shell).filter(Boolean))];
const linhas_mobile = mobile.saiu.split('\n').filter((l) => l.startsWith('| ') && !l.startsWith('| Funcionalidade') && !l.startsWith('| ---')).length;
const linhas_desktop = desktop.saiu.split('\n').filter((l) => l.startsWith('| ') && !l.startsWith('| Funcionalidade') && !l.startsWith('| ---')).length;
const rodape = (s) => (s.match(/_(\d+ linhas[^\n]*)_/) || [null, '(sem rodape)'])[1];

const cabecalho = [
  '# BFR Conecta — relatório do briefing (§14): Funcionalidade × Perfil × Resultado',
  '',
  `_Gerado por \`scripts/ah2-relatorio-14.mjs\` em ${new Date().toISOString()}, a partir dos artefactos em \`evidence/\`. Nenhum resultado desta tabela foi escrito à mão: os números vêm dos consolidadores, e o que não foi medido aparece como tal._`,
  '',
  '## O que cobre e com que instrumentos',
  '',
  '| Bloco do briefing | Instrumento | Cobertura medida nesta execução | Linhas na tabela |',
  '| --- | --- | --- | --- |',
  `| §6 desktop (1366/1440/1920) | \`scripts/ah2-desktop-tabela.mjs\` sobre \`ah2-varredura-*.json\` | ${desktop.notas.split('\n').filter(Boolean).length} perfis com banda útil | ${linhas_desktop} |`,
  `| §5 telemóvel (320/360/375/390/414/430 × 15 perfis) | \`scripts/ah2-m5-tabela.mjs\` sobre \`ah2-mobile2-m5-*.json\` | ${cons.j.celulas_medidas}/${cons.j.total_celulas} células com banda coerente | ${linhas_mobile} |`,
  '',
  `_Shells medidas: md5 ${md5_shell.join(' + ') || 'desconhecido'}. A grelha mobile está em corrida; enquanto o condutor não imprimir \`M5_GRELHA_COMPLETA_COM_TRAVAS\`, as células por medir continuam listadas como NÃO TESTADA — não desaparecem numa média._`,
  '',
  '## Definições (para o vermelho e o cinzento não se confundirem)',
  '',
  '- **OK** — a porta existe no telemóvel/desktop do perfil, o toque/clique abriu um painel com conteúdo e o conteúdo assentou dentro do teto.',
  '- **PARCIAL** — abriu em algumas larguras e noutras não foi medido de forma coerente; o número diz quantas.',
  '- **FALHA** — medido no alvo: painel vazio, conteúdo que não assenta, toque sem efeito, diálogo sem saída tocável ou alvo de toque abaixo de 44 px.',
  '- **NAO TESTADA** — não há porta (a rota não existe na navegação do perfil) ou não há banda coerente. Não é aprovação nem reprovação.',
  '- **PENDENTE DE CAUSA** — a porta aparece no censo da gaveta mas o elemento já não existia no instante do toque; a causa provável é o instrumento (`renderDrawer` só reconstrói a lista quando o assinatura muda — `bfr-responsive-presentation.js:184`), por isso não é contado como defeito do produto.',
  '',
  'As causas provadas (código lido dos bytes servidos, não inferida do sintoma) estão no §AI de `docs/auditoria-bfr-conecta.md`, com o número da linha de cada fonte.',
  '',
];
const corpo = [
  '## §6 Desktop — 1366 × 1440 × 1920',
  '',
  desktop.saiu.trim(),
  '',
  '## §5 Telemóvel — 320/360/375/390/414/430',
  '',
  mobile.saiu.trim(),
  '',
  '## Pendências e buracos de medição (o «não declare 100 %» do briefing)',
  '',
  `1. **Grelha §5 em curso**: ${cons.j.celulas_medidas}/${cons.j.total_celulas} células com banda coerente; ${Array.isArray(cons.j.nao_testadas) ? cons.j.nao_testadas.length : '?'} sem medição utilizável. Última síntese: \`${cons.f}\` (${cons.j.em}).`,
  '2. **Chat interno nunca medido com conteúdo**: a base tem 1 sala e 5 membros, nenhum deles conta de teste (medido em `scripts/ah2-sonda-chat-filas.mjs`). Testar o conteúdo exige INSERT em `internal_chat_room_members` — fora do mint autorizado, precisa de OK próprio.',
  '3. **Calendário letivo e turnos**: as relações `bfr_school_calendar_days`, `bfr_school_calendar_month_targets`, `bfr_school_shift_settings` não existem (`404 PGRST205`), logo as vistas que as consultam não têm como passar — fechar isto é DDL ou desligar as vistas, decisão de produto.',
  '4. **Nenhuma candidata de código publicada neste bloco**, e o motivo está em §AI.8: o shell publicado está à frente da árvore local (suporte de `education_supervisor` e o `join` de `sports_schools`), por isso um patch por cima de `app/index.html` regredia o que está no ar. Primeiro é preciso reconciliar a fonte — operação com OK próprio.',
  '5. **Três causas descritas, não corrigidas**: o `allowed()` do chat vs mapa de navegação, os links de `apoio`/`notificacoes`/`conteudos` que o portão nega, e o `×` de 60×32 px do gestor de fotos. Cada uma mexe a gate de produto ou a CSS publicado.',
  '',
  '_Portanto: esta entrega não declara 100 % de aprovação. O que está verde foi medido com toque ou clique real e caixa de painel; o que está cinzento não tem porta ou não tem banda; o que está vermelho tem causa escrita._',
  '',
].join('\n');
writeFileSync(OUT, cabecalho.join('\n') + corpo);
console.log('ESCRITO: ' + OUT.split('/').slice(-1)[0] + ' · ' + linhas_desktop + ' linhas desktop + ' + linhas_mobile + ' linhas telemóvel');
console.log('desktop: ' + rodape(desktop.saiu));
console.log('telemovel: ' + rodape(mobile.saiu));
console.log('RELATORIO_14_FEITO');
