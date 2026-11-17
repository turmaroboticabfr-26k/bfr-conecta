// AF-1 banda 2 — cruzamento das 11 quals PUBLIC entre os DOIS instrumentos, por CONTEÚDO.
// Nunca por hash: os três espaços de pegada deste projecto não são comparáveis entre si.
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const A = `${DIR}/evidence/af1-auditoria-final-16-11.json`;
const B = `${DIR}/evidence/af1b-rm68-recon-quals-16-11.json`;
const OUT = `${DIR}/evidence/af1c-cruzamento-quals-16-11.json`;
for (const f of [A, B]) if (!existsSync(f)) throw new Error(`falta ${f}`);
if (existsSync(OUT)) throw new Error(`guard: ${OUT} já existe`);
const a = JSON.parse(readFileSync(A, 'utf8'));
const b = JSON.parse(readFileSync(B, 'utf8'));

const normCmd = (c) => ({ r: 'SELECT', a: 'INSERT', w: 'UPDATE', d: 'DELETE', '*': 'ALL' }[c] || c);
const limpa = (s) => String(s || '').replace(/\s+/g, ' ').trim();

// instrumento 1: af1 (pg_policy, polcmd por letra, qual/with_check por pg_get_expr)
const deA = new Map();
for (const linha of a.rls_no_ar.assinaturas_publicas) {
  const [tabela, politica, cmd, using_, with_check] = linha.split('|');
  deA.set(`${tabela}/${politica}`, { tabela, politica, cmd: normCmd(cmd), using_: limpa(using_), with_check: limpa(with_check) });
}
// instrumento 2: rm68-recon-quals (pg_policy, cmd por palavra, roles NULL quando PUBLIC)
const pubs = b.policies.filter((p) => p.roles === null || p.roles === '(public)');
const deB = new Map();
for (const p of pubs) {
  deB.set(`${p.tablename}/${p.policyname}`, { tabela: p.tablename, politica: p.policyname, cmd: normCmd(p.cmd), using_: limpa(p.qual), with_check: limpa(p.with_check) });
}
const soEmA = [...deA.keys()].filter((k) => !deB.has(k)).sort();
const soEmB = [...deB.keys()].filter((k) => !deA.has(k)).sort();
const emAmbos = [...deA.keys()].filter((k) => deB.has(k)).sort();
const diferem = [];
for (const k of emAmbos) {
  const x = deA.get(k), y = deB.get(k);
  const campos = ['cmd', 'using_', 'with_check'].filter((c) => x[c] !== y[c]);
  if (campos.length) diferem.push({ politica: k, campos, A: x, B: y });
}
const chamadasA = emAmbos.map((k) => [...new Set([...(deA.get(k).using_ + ' ' + deA.get(k).with_check).match(/(?<![\w.])([a-z_][a-z0-9_]*)\s*\(/gi) || []].map((s) => s.replace(/\s*\($/, '').toLowerCase()))]).sort();
const chamadasB = emAmbos.map((k) => [...new Set([...(deB.get(k).using_ + ' ' + deB.get(k).with_check).match(/(?<![\w.])([a-z_][a-z0-9_]*)\s*\(/gi) || []].map((s) => s.replace(/\s*\($/, '').toLowerCase()))]).sort();
const divergemChamadas = emAmbos.filter((k, i) => chamadasA[i].join(',') !== chamadasB[i].join(','));

const falhas = [];
const gate = (nome, dado, esperado) => { const ok = JSON.stringify(dado) === JSON.stringify(esperado); if (!ok) falhas.push(`${nome} | dado=${JSON.stringify(dado)} | esperado=${JSON.stringify(esperado)}`); console.log(`${ok ? 'VERDE   ' : 'VERMELHO'} ${nome}`); return ok; };
console.log(`af1: ${deA.size} PUBLIC | recon-quals: ${deB.size} PUBLIC | intersecção: ${emAmbos.length}`);
gate('mesmo conjunto de nomes nas 11 quals PUBLIC (sem sobra de um lado nem do outro)', [soEmA, soEmB], [[], []]);
gate('contúdo (cmd + qual + with_check) idêntico entre os dois instrumentos', diferem.map((d) => d.politica), []);
gate('extracção de chamadas coincidente política a política', divergemChamadas, []);
gate('são mesmo 11', [deA.size, deB.size], [11, 11]);
const funcoesChamadas = [...new Set(chamadasA.flat())].sort();
console.log(`\nfunções chamadas pelas 11 quals (do cruzamento): ${funcoesChamadas.join(', ')}`);
const legadasANu = funcoesChamadas.filter((n) => ['current_role', 'is_developer', 'is_staff'].includes(n));
gate('nenhuma das 11 quals chama um helper legado a nu (o fantasma do substring desaparece)', legadasANu, []);
const out = {
  em: new Date().toISOString(),
  instrumentos: { banda_1: 'evidence/af1-auditoria-final-16-11.json', banda_2: 'evidence/af1b-rm68-recon-quals-16-11.json' },
  metodo: 'comparação por CONTEÚDO normalizado (whitespace colapsado, cmd por palavra); hashes de pegada nunca foram comparados entre si',
  publicas_banda1: deA.size, publicas_banda2: deB.size, nomes_so_banda1: soEmA, nomes_so_banda2: soEmB,
  conteudo_divergente: diferem, chamadas_divergentes: divergemChamadas, funcoes_chamadas: funcoesChamadas,
  falhas, veredito: falhas.length === 0 ? 'AF1C_CRUZAMENTO_VERDE' : 'AF1C_CRUZAMENTO_VERMELHO',
};
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`\n=== ${out.veredito} | ${Object.keys(out).length} campos em ${OUT.replace(DIR + '/', '')} ===`);
if (falhas.length) process.exit(1);
