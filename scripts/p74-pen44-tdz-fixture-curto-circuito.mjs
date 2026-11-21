// Fixture offline da causa do `registo:null` da conferencia de saido da PEN-44.
// A linha do HEAD (git show HEAD:scripts/p74-pen44-preflight.mjs, linha 292) e um object literal
// que le `invVivo` dentro do proprio inicializador. `&&` short-circuita: se o `every` da esquerda
// for false (peca POR aplicar), o deref nunca acontece e a corrida escreve registo; se for true
// (peca APLICADA), o deref acontece e rebenta em TDZ. Aqui reproduzo as duas metades com o banco fora.
const build = (anonPodeHoje) => {
  const nomesAlvo = ['a', 'b'];
  const hoje = { a: { anon: anonPodeHoje }, b: { anon: anonPodeHoje } };
  try {
    const invVivo = {
      public_sobrou: [],
      preservados_que_nao_executam: [],
      nomes_sem_leitura: [],
      verde: nomesAlvo.every((n) => hoje[n] && hoje[n].anon === false) && invVivo.public_sobrou.length === 0 && invVivo.preservados_que_nao_executam.length === 0 && invVivo.nomes_sem_leitura.length === 0,
    };
    return { lancou: false, verde: invVivo.verde };
  } catch (e) {
    return { lancou: true, erro: String(e.constructor.name) + ': ' + e.message };
  }
};
const POR_APLICAR = build(true);   // anon ainda pode -> every false -> short-circuit -> sem crash
const APLICADA = build(false);     // anon nao pode  -> every true  -> deref de invVivo -> TDZ
const ok = POR_APLICAR.lancou === false && APLICADA.lancou === true && /Cannot access 'invVivo' before initialization/.test(APLICADA.erro);
console.log(JSON.stringify({ por_aplicar: POR_APLICAR, aplicada: APLICADA, fixture_discrimina: ok }));
process.exit(ok ? 0 : 1);
