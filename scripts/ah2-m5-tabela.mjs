// §14 do briefing pede «| Funcionalidade | Perfil | Resultado | Problema | Correção |» com duas ordens
// vincadas: «Não invente resultados» e «se uma função não puder ser testada, marque como NÃO TESTADA».
// Esta tabela é portanto DERIVADA dos artefactos, do shape real que eles têm (confirmado no disco, não na
// memória): por banda `censo.barra`/`censo.gaveta` = as portas que EXISTEM; `seccoes[rota].painel.c` = o que
// cada porta mostrou; `vazias`/`inalcancaveis`/`sem_efeito`/`nao_assentaram`/`estouro`/`dialogos_*` = os
// vermelhos; `declaradas` = o mapa de acessos do papel. Uma largura só conta se a banda for coerente (barra
// montada e ≥1 seção aberta) — bandas ocas são NÃO TESTADA com a causa, nunca um verde emprestado.
// Uma linha por (papel × rota), agregando as 6 larguras do §5. Só-leitura.
// Uso: node scripts/ah2-m5-tabela.mjs [prefixo=m5] [--papel coordinator]
import { readFileSync, readdirSync } from 'node:fs';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const PREFIXO = process.argv[2] || 'm5';
const SO_PAPEL = (process.argv.find((a, i) => process.argv[i - 1] === '--papel') || '').trim() || null;
const LARGURAS = [320, 360, 375, 390, 414, 430];
const fich = readdirSync(`${DIR}/evidence`).filter((f) => new RegExp(`^ah2-mobile2-${PREFIXO}[^/]*\\.json$`).test(f)).sort();
if (!fich.length) throw new Error('ABORTA: sem artefactos ah2-mobile2-' + PREFIXO + '*.json');
// visto[papel][rota][largura] = {estado, ...prova}; portas[papel][largura] = rotas que a navegação oferece
const visto = {}; const portas = {}; const larguras_boas = {}; const bloqueadas = {}; const declaradas = {};
const coerente = (b) => !!b.censo && b.censo.barra_existe !== false && (b.censo.barra || []).some((x) => x.w > 0 && x.h > 0) && (b.abertas || 0) > 0;
for (const f of fich) {
  const j = JSON.parse(readFileSync(`${DIR}/evidence/${f}`, 'utf8'));
  if (j.ciclo !== 'AH-7b-MOBILE' || (SO_PAPEL && j.papel !== SO_PAPEL)) continue;
  const p = j.papel; visto[p] = visto[p] || {}; portas[p] = portas[p] || {}; larguras_boas[p] = larguras_boas[p] || new Set();
  declaradas[p] = j.declaradas || declaradas[p] || [];
  for (const q of j.bloqueadas || []) (bloqueadas[`${p}@${q.largura}`] = bloqueadas[`${p}@${q.largura}`] || []).push(q.causa);
  for (const [w, b] of Object.entries(j.bandas || {})) {
    const L = +w;
    if (b.pela_praga || !coerente(b)) { const k = `${p}@${L}`; if (!bloqueadas[k]) (bloqueadas[k] = bloqueadas[k] || []).push(b.pela_praga ? 'largura cortada pela praga de tempo — por medir' : 'banda oca: barra mobile não montada com shell ready'); continue; }
    larguras_boas[p].add(L);
    const rs = [...new Set([...(b.censo.barra || []), ...(b.censo.gaveta || [])].map((x) => x.route).filter((r) => r && r !== 'more'))];
    portas[p][L] = new Set(rs);
    const semrota = (b.declaradas_sem_rota || []);
    for (const s of semrota) { const c = (visto[p][s] = visto[p][s] || {}); c[L] = { estado: 'sem_rota', prova: 'concedida no mapa do papel, sem botão em parte nenhuma da navegação' }; }
    for (const r of rs) if (!semrota.includes(r) && !b.seccoes[r]) { const c = (visto[p][r] = visto[p][r] || {}); c[L] = { estado: 'por_tocar', prova: 'porta existe, varredura não chegou a tocá-la nesta largura' }; }
    for (const [rota, v] of Object.entries(b.seccoes || {})) {
      const c = (visto[p][rota] = visto[p][rota] || {});
      if (!v.painel) {
        // «sem_botao» tem de se separar dos outros inalcansáveis: os outros (invisivel/fora_do_ecra/tapado)
        // são medidos no alvo, portanto descrevem o ecrã. Este significa «o censo contou esta porta, mas no
        // instante do toque já não havia elemento» — e `renderDrawer()` só reconstrói a lista quando o
        // signature muda (live-presentation.js:184), logo a causa provável é a lista a ser trocada entre o
        // censo e o toque. Sem sonda própria isso não é defeito do produto declarado, é causa por provar.
        const motivo = v.gaveta_nao_abriu ? 'gaveta_nao_abriu' : v.nao_tocavel || 'sem_painel';
        c[L] = motivo === 'sem_botao'
          ? { estado: 'sumiu', prova: 'presente no censo da gaveta, ausente no momento do toque — causa não provada' }
          : { estado: 'inalc', prova: (v.gaveta_nao_abriu ? 'a gaveta não abriu antes deste toque' : motivo) };
        continue;
      }
      const semefeito = (b.sem_efeito || []).some((x) => x.startsWith(rota + ':'));
      const dlg = (b.dialogos || []).find((d) => d.rota === rota);
      c[L] = { estado: v.painel.c > 0 ? (semefeito ? 'sem_efeito' : 'ok') : 'vazio', prova: `${v.painel.id || '?'} ${v.painel.c}c ${v.ms}ms${v.assentou ? '' : ' NAO-ASSENTOU'} ctl=${v.controles}${v.tap ? ' alvos<44=' + v.tap : ''}${v.fonte ? ' fontes<12=' + v.fonte : ''}${v.estouro_h ? ' ESTOURO-H' : ''}${v.via ? ' via ' + v.via : ''}${dlg ? ' | diálogo ' + (dlg.culpado || '') + ' z' + (dlg.z || '-') + (dlg.saida ? ' saída ' + dlg.saida.rot + ' ' + dlg.saida.w + 'x' + dlg.saida.h : ' SEM SAIDA') : ''}` };
    }
  }
}
const linhas = [];
for (const p of Object.keys(visto).sort()) {
  const boas = [...(larguras_boas[p] || [])];
  const rotas = new Set([...Object.keys(visto[p]), ...(declaradas[p] || [])]);
  for (const rota of [...rotas].sort()) {
    const c = visto[p][rota] || {};
    const em = (e) => LARGURAS.filter((w) => c[w] && c[w].estado === e);
    const ok = em('ok'), vazio = em('vazio'), inalc = em('inalc'), sumiu = em('sumiu'), semrota = em('sem_rota'), semefeito = em('sem_efeito'), portocar = em('por_tocar');
    const sem_medir = LARGURAS.filter((w) => !c[w]);
    const provas = [...new Set(LARGURAS.map((w) => c[w] && c[w].estado !== 'ok' && c[w].prova).filter(Boolean))];
    let res;
    if (ok.length === 6) res = 'OK';
    else if (ok.length) res = `PARCIAL (${ok.length}/6 larguras)`;
    else if (semrota.length) res = 'NAO TESTADA — porta inexistente';
    else if (vazio.length) res = 'FALHA — painel vazio';
    else if (inalc.length) res = 'FALHA — inalcansavel a toque';
    else if (sumiu.length) res = `PENDENTE DE CAUSA — porta listada, ausente ao toque (${sumiu.length}/6)`;
    else if (semefeito.length) res = 'FALHA — toque sem efeito';
    else if (portocar.length) res = `PARCIAL (porta existe, ${portocar.length}/6 por tocar)`;
    else res = 'NAO TESTADA';
    linhas.push({ rota, papel: p, res, prob: [...provas, sem_medir.length ? `sem medição coerente em ${sem_medir.join('/')}` : null].filter(Boolean).join(' · ') });
  }
}
console.log('| Funcionalidade | Perfil | Resultado | Problema | Correção |');
console.log('| --- | --- | --- | --- | --- |');
for (const l of linhas) console.log(`| ${l.rota} | ${l.papel} | ${l.res} | ${l.prob} |  |`);
const n = (e) => linhas.filter((l) => l.res.startsWith(e)).length;
console.log(`\n_${linhas.length} linhas · OK absoluto ${n('OK')} · PARCIAL ${n('PARCIAL')} · FALHA ${n('FALHA')} · PENDENTE DE CAUSA ${n('PENDENTE')} · NAO TESTADA ${n('NAO TESTADA')}_`);
console.log('_Legenda: «FALHA — inalcansavel» é medida no alvo (invisível, fora do ecrã ou tapado por outro elemento). «PENDENTE DE CAUSA» é o caso em que a porta aparece no censo da gaveta mas o elemento já não existe na hora do toque — como o `renderDrawer` só reconstrói a lista quando o assinatura muda (bfr-responsive-presentation.js:184), a causa provável é o instrumento, não o produto, e por isso não conta como defeito assinado._');
console.log('_Larguras com banda coerente por papel: ' + Object.keys(larguras_boas).sort().map((p) => p + '=' + [...larguras_boas[p]].sort((a, b) => a - b).join(',')).join(' | ') + '_');
const trav = Object.entries(bloqueadas).sort();
if (trav.length) console.log('_Células travadas com causa: ' + trav.map(([k, v]) => k + ' [' + [...new Set(v)].join('; ') + ']').join(' | ') + '_');
