-- P73-PEN-39 — CANDIDATA, NÃO APLICADA. Correr só com OK explícito. Reversão em
-- `scripts/p73-pen39-ddl-reversao.sql`. O que o banco de trabalho dizia era «o agregado municipal só sabe a
-- rede toda»; abaixo está o que foi medido, que é mais concreto e mais incómodo.
--
-- De onde isto vem (medições de 20/11, artefactos versionados):
--   evidence/p73-politicas-municipais-20-11e.json (agregados) → a definição viva de
--     `bfr_municipal_network_totals()` (md5 do texto 4ffde76bdb1243f6b9b3ebe6f2f50716) devolve UMA linha com
--     quatro inteiros — schools, students, classes, municipalities — e não leva argumento nenhum. Não existe
--     hoje nenhuma função que responda «e deste município?».
--   evidence/p73-pen38-alcance-por-concessao-20-11e.json → chamada pelas 4 concessões ativas devolve
--     {0,0,0,0}; chamada pelo `developer` devolve {6,848,27,0}. O «0» dos concedidos não é a rede vazia: é o
--     WHERE da vista, que é o predicado de escopo, com `escolas_com_municipio = 0` em toda a rede.
--   O módulo servido não chama nenhum dos dois agregados (medido em sm23 peça 7 sobre a candidata; a peça
--   `p73-pen39-sonda-uso-dos-agregados.mjs` re-meide no ar de hoje). Sem essa medição, escrever «o painel
--   municipal mostra números errados» seria uma afirmação sobre um ecrã que não está a ser aberto.
--
-- O que esta candidata fecha:
--   §4.1 (distribuição por município, urbana/rural, situação de funcionamento, «quando cadastrada») → blocos A, B
--   §5/§6 (um cargo com concessões em mais de um município precisa de os separar, não de somar tudo)     → bloco A
--   §7.451 (números de escola, nunca nomes de aluno)                                                        → ambos os blocos
--   §12 (o vazio tem de se explicar a si mesmo: a linha `municipio IS NULL` é o depósito das escolas ainda
--   não ligadas, com o seu próprio número, em vez de desaparecer da tabela)                                → bloco A
-- O que NÃO fecha sozinha, e porquê: o consumo no módulo. Os dois agregados vivem do outro lado de uma
-- publicação; escrever o código é parte desta pendência mas o efeito só se mede no ar, e o ar pede OK literal.

BEGIN;
SET LOCAL statement_timeout = '120s';
SET LOCAL lock_timeout = '10s';

--------------------------------------------------------------------------------
-- A) UM LUGAR POR MUNICÍPIO, mais o depósito de «ainda sem município».
--    Assenta na vista `bfr_municipal_school_stats`, cujo WHERE já é o predicado de escopo: quem não tem
--    concessão recebe 0 grupos, não recebe tudo. `e_bucket_sem_municipio` existe para a linha de municipality
--    NULL não ter de ser interpretada — é o que a casa chama «a classe com conjunto vazio imprime-se».
--------------------------------------------------------------------------------
CREATE FUNCTION public.bfr_municipal_municipio_totais()
RETURNS TABLE (municipio uuid, nome text, uf char(2), escolas integer, alunos integer, turmas integer,
               escolas_sem_zona integer, escolas_ativas integer, escolas_fora_de_ativo integer,
               e_bucket_sem_municipio boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $fn$
  SELECT b.municipality_id,
         (SELECT x.name FROM public.bfr_municipalities x WHERE x.id = b.municipality_id),
         (SELECT x.uf   FROM public.bfr_municipalities x WHERE x.id = b.municipality_id),
         count(*)::int,
         coalesce(sum(b.students_total), 0)::int,
         coalesce(sum(b.classes_total), 0)::int,
         count(*) FILTER (WHERE b.zone IS NULL)::int,
         count(*) FILTER (WHERE b.operating_status = 'ativo')::int,
         count(*) FILTER (WHERE b.operating_status IS DISTINCT FROM 'ativo')::int,
         (b.municipality_id IS NULL)
  FROM public.bfr_municipal_school_stats b
  GROUP BY b.municipality_id
  ORDER BY b.municipality_id NULLS LAST;
$fn$;

--------------------------------------------------------------------------------
-- B) A DISTRIBUIÇÃO QUE O §4.1 PIDE, por município e zona, com a zona NULL como categoria visível.
--    Nunca preenchida por suposição: `zone IS NULL` aparece com o seu número e é a resposta honesta a
--    «quantas escolas ainda não disseram se são urbanas ou rurais».
--------------------------------------------------------------------------------
CREATE FUNCTION public.bfr_municipal_distribuicao_por_zona()
RETURNS TABLE (municipio uuid, nome text, zona text, escolas integer, alunos integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $fn$
  SELECT b.municipality_id,
         (SELECT x.name FROM public.bfr_municipalities x WHERE x.id = b.municipality_id),
         b.zone,
         count(*)::int,
         coalesce(sum(b.students_total), 0)::int
  FROM public.bfr_municipal_school_stats b
  GROUP BY b.municipality_id, b.zone
  ORDER BY b.municipality_id NULLS LAST, b.zone NULLS LAST;
$fn$;

COMMENT ON FUNCTION public.bfr_municipal_municipio_totais() IS 'SM4/PEN-39: um agregado POR município (e o depósito das escolas sem município), em vez de um só número para a rede toda.';
COMMENT ON FUNCTION public.bfr_municipal_distribuicao_por_zona() IS 'SM4/PEN-39: §4.1 urbana/rural por município; NULL é categoria impressa, não linha escondida.';

REVOKE ALL ON FUNCTION public.bfr_municipal_municipio_totais() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bfr_municipal_distribuicao_por_zona() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bfr_municipal_municipio_totais() TO authenticated;
GRANT EXECUTE ON FUNCTION public.bfr_municipal_distribuicao_por_zona() TO authenticated;

-- `bfr_municipal_network_totals()` fica como está e continua a responder o que respondia (§11.1/§11.6:
-- substituir um agregado em uso por outro com forma diferente partiria quem já o chama, e ainda não sei se
-- algo o chama no ar — é a medição da sonda de uso, não uma presunção minha).

COMMIT;

-- O que muda depois de aplicar, e como se prova:
--   `SELECT * FROM bfr_municipal_municipio_totais()` chamado por um concedido → linhas uma por município da
--   concessão dele, todas a 0 enquanto a rede não tiver escolas etiquetadas (o que é o número certo, não um
--   defeito), e uma linha de bucket NULL apenas para quem vê escolas sem município pela vista.
--   Chamado por quem não tem concessão nem cargo supervisor → 0 linhas.
--   A régua que distingue «a função nova funciona» de «a vista está vazia» é o `count(*)` do bucket NULL
--   chamado pelo admin de plataforma: hoje mede 6 escolas sem município, logo a função nova tem de devolver
--   uma linha NULL com escolas=6. Este ficheiro não pode ser dado como aplicado sem essa leitura bater.
