// P73-T-L — o corpo de interceptação que a sonda do timer injecta no browser, isolado num módulo para que o
// instrumento e o fixture do verificador importem o MESMO texto. A agulha (`bfr-responsive-presentation`) vive
// só aqui: se eu a escrevesse também no fixture, o varredor que procura agulhas de código de apresentação
// passaria a ser o ofensor (regra da casa: compor o fixture em tempo de execução, nunca dactilografar-lhe a
// agulha dentro).
// A filtragem é dupla e tem de poder falhar das duas vezes: delay === PISO (lido do módulo servido, não um 60
// lembrado) E pilha do chamador a nomear o ficheiro do módulo de apresentação. Timer de 60 ms de outra
// origem conta como `outros` e NÃO entra nos armados — é isso que distingue «o módulo arma muito» de
// «a app tem muitos timers curtos».
export const NOME_DO_MODULO = 'bfr-responsive-presentation';
export const PATCH_SRC = (piso, nome = NOME_DO_MODULO) => `(() => {
  if (window.__p73t) return 'ja_instalado';
  var PISO = ${piso};
  var NOME = ${JSON.stringify(nome)};
  window.__p73t = { armados: 0, venceu: 0, cancelados: 0, outros: 0, marcas: [], t_armados: [] };
  window.__p73t_erros = [];
  var _set = window.setTimeout, _clear = window.clearTimeout;
  var ids = new Map();
  var pilha = function () { try { return new Error().stack || ''; } catch (e) { return ''; } };
  window.setTimeout = function (fn, d) {
    var args = Array.prototype.slice.call(arguments, 2);
    var eh = (d === PISO) && (typeof fn === 'function');
    if (eh) {
      if (pilha().indexOf(NOME) === -1) window.__p73t.outros++;
      else {
        window.__p73t.armados++;
        window.__p73t.t_armados.push(Math.round(performance.now()));
        if (window.__p73t.t_armados.length > 4000) window.__p73t.t_armados.splice(0, 2000);
        var rec = { criado: performance.now(), venceu: null };
        var id = _set.call(window, function () {
          rec.venceu = performance.now();
          ids.delete(id);
          window.__p73t.venceu++;
          window.__p73t.marcas.push(rec.criado);
          if (window.__p73t.marcas.length > 200) window.__p73t.marcas.splice(0, 100);
          fn.apply(undefined, args);
        }, d);
        ids.set(id, rec);
        return id;
      }
    }
    return _set.apply(window, [fn, d].concat(args));
  };
  window.clearTimeout = function (id) {
    var rec = ids.get(id);
    if (rec) { if (rec.venceu === null) window.__p73t.cancelados++; ids.delete(id); }
    return _clear.apply(window, [id]);
  };
  if (window.addEventListener) window.addEventListener('error', function (e) { window.__p73t_erros.push(String(e.message || e).slice(0, 140)); });
  return 'instalado';
})()`;
