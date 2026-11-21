-- PEN-43 - reversao do remedio: devolve o EXECUTE ao anon exactamente nos nomes que a candidata revogou.
-- Gerada pelo mesmo programa; a lista e derivada dos mesmos CREATE FUNCTION, nunca recordada.
GRANT EXECUTE ON FUNCTION public.bfr_municipal_scope_diagnostico() TO anon;
GRANT EXECUTE ON FUNCTION public.bfr_municipal_municipio_totais() TO anon;
GRANT EXECUTE ON FUNCTION public.bfr_municipal_distribuicao_por_zona() TO anon;
