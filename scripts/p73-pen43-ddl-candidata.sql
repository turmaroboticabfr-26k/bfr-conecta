-- PEN-43 - candidata de remedio: fecha o grau de EXECUTE do pseudo-papel anon nas funcoes municipais de LEITURA.
-- Gerada por scripts/p73-pen43-gera-candidata.mjs: nomes, tipos e lista de revogados sao lidos dos CREATE FUNCTION
-- das candidatas e da proacl viva, nunca dactilografados. Se uma candidata mudar, este ficheiro e re-gerado ou chumba.
-- Eficacia medida: o grau do anon esta numa entrada EXPLICITA da proacl (nenhuma linha a PUBLIC), por isso o REVOKE
-- por nome e o grau efetivo; se alguma vez passar a vir do default a PUBLIC, o portao da geradora da vermelho.
-- 0 dados tocados: nenhuma linha deste ficheiro escreve em tables. Autorizacao exigida: APLICAR PEN-43 NO BANCO.
-- Transacao unica: um nome em falta aborta os outros, em vez de deixar um grau fechado e dois abertos.

BEGIN;
REVOKE EXECUTE ON FUNCTION public.bfr_municipal_scope_diagnostico() FROM anon;
REVOKE EXECUTE ON FUNCTION public.bfr_municipal_municipio_totais() FROM anon;
REVOKE EXECUTE ON FUNCTION public.bfr_municipal_distribuicao_por_zona() FROM anon;

COMMIT;

-- EM ABERTO (decisao da casa, nao deste ficheiro): public.bfr_school_set_municipality(uuid, uuid, text)
-- e a porta de etiquetagem e tambem hoje executavel por anon. Manter o grau significa receber 42501 de
-- «nao e administrador» em vez de 404 de rota inexistente; revogar significa que um anonimo nem sabe que ela existe.
-- Medido em evidence/p73-sonda-exposicao-anonima-20-11-20-11h.json (4 de 4 com anon=X, escrita nao chamada).
