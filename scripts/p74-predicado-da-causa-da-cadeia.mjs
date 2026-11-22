// P74-M — o predicado da causa, separado do emissor para que o verificador possa testar exactamente
// o mesmo código que decide o portão, e não uma cópia dactilografada.
// Estados legítimos de uma cadeia antes do re-login por senha:
//   'refresh_token_already_used'  — queimada por outra corrida (o caso de 19/11, 14 papéis)
//   'sem_cadeia_no_ficheiro_do_papel' — nunca houve registo deste papel no ficheiro
//   ok === true ('renovou')       — a cadeia ainda rodava; o que expirou foi só o access token (21/11, monitor)
// Qualquer outro código é causa não classificada, e um `falha` definido quer dizer que o próprio login por
// senha falhou — isso é falta de senha, que é precisamente o que este portão existe para apanhar.
export const CAUSAS_SEM_SENHA = ['refresh_token_already_used', 'sem_cadeia_no_ficheiro_do_papel'];

export function causaAdmissivel(reg) {
  const c = (reg && reg.cadeia_anterior) || {};
  if (reg && reg.falha !== undefined) return false;
  if (CAUSAS_SEM_SENHA.includes(c.codigo)) return true;
  return c.ok === true;
}
