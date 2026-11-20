// Regua de assinatura de funcao postgreSQL, partilhada entre o preflight e o seu verificador.
// Motivo (medido 20/11): este servidor devolve pg_get_function_identity_arguments COM os nomes dos
// parametros ("p_school uuid, p_municipality uuid, p_reason text"), por isso uma agulha escrita como
// lista de tipos ("uuid, uuid, text") nunca casava — um portao sem positivo possivel, que deu
// conferencia vermelha sobre uma candidata aplicada correctamente. Aqui a agulha e derivada do proprio
// CREATE FUNCTION da candidata, e a comparacao tolera as duas formas que o servidor pode devolver.
export const partes = (s) => {
  const out = [];
  let prof = 0, actual = '';
  let dentro = false;
  for (const sChar of String(s ?? '').trim()) {
    if (sChar === `'` && !(actual.endsWith('\\'))) dentro = !dentro;
    if (!dentro && sChar === '(') prof++;
    if (!dentro && sChar === ')') prof--;
    if (!dentro && prof === 0 && sChar === ',') { out.push(actual); actual = ''; continue; }
    actual += sChar;
  }
  if (actual.trim() !== '' || out.length) out.push(actual);
  return out.map((x) => x.replace(/\s+/g, ' ').trim()).filter((x, i, a) => !(x === '' && i === a.length - 1 && a.length > 1));
};

// Um segmento de assinatura vale para o tipo `tipo` se for exactamente o tipo, ou se for
// `<nome_de_parametro> <tipo>` — as duas formas que o servidor devolve consoante a build.
export const segmentoCasaTipo = (segmento, tipo) => {
  if (segmento === tipo) return true;
  const i = segmento.indexOf(' ');
  if (i <= 0) return false;
  return segmento.slice(i + 1) === tipo;
};

export const tiposDaAssinatura = (s) => {
  const partesAssin = partes(s);
  if (partesAssin.length === 0) return [];
  return partesAssin.map((p) => {
    const tokens = p.split(' ');
    if (tokens.length < 2) return p;
    if (!/^[a-z_][a-z0-9_$]*$/i.test(tokens[0])) return p;
    const resto = tokens.slice(1).join(' ');
    return /^(table|text|integer|bigint|smallint|boolean|uuid|numeric|real|double|char|character|varchar|timestamp|date|time|json|jsonb|interval|money|bytea|anyelement|anyarray|regclass|void)\b/i.test(resto) ? resto : p;
  });
};

export const tiposDeCreateFunction = (textoSql, nome) => {
  const re = new RegExp('CREATE\\s+FUNCTION\\s+(?:public\\.)?' + nome + '\\s*\\(([^;]*?)\\)\\s+RETURNS', 'i');
  const m = re.exec(textoSql);
  if (!m) return null;
  return tiposDaAssinatura(m[1]);
};

// agulha = lista de tipos esperados (ou null = "so o nome da funcao basta").
export const assinaturaCorresponde = (agulha, lido) => {
  if (agulha == null) return true;
  const lidos = tiposDaAssinatura(lido);
  if (lidos.length !== agulha.length) return false;
  return agulha.every((tipo, i) => segmentoCasaTipo(lidos[i], tipo));
};
