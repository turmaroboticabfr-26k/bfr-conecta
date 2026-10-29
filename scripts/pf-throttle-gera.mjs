import fs from 'node:fs';

const DIR = 'C:/Users/pcmac/.kiro/crew/uploads/';
const LIVE = JSON.parse(fs.readFileSync(DIR + 'pf-throttle-recon.json', 'utf8'));
const live = LIVE.notifyDef;
if (!live || !live.includes('CREATE OR REPLACE FUNCTION public.bfr_pf_notify_location()')) {
  throw new Error('sem o texto vivo da funcao no recon');
}

const JANELA = "interval '5 minutes'";

const hunks = [
  {
    nome: 'H1-declare',
    busca: 'declare\n  v_key text;\n  v_ids jsonb;\nbegin\n',
    insere: 'declare\n  v_key text;\n  v_ids jsonb;\n  v_janela interval := ' + JANELA + ';\n  v_livre boolean;\nbegin\n',
  },
  {
    nome: 'H2-checar-janela',
    busca: "  if v_key is null then\n    raise warning 'bfr_pf_notify_location: segredo pf_emissor_service_role ausente';\n    return new;\n  end if;\n",
    insere: "  if v_key is null then\n    raise warning 'bfr_pf_notify_location: segredo pf_emissor_service_role ausente';\n    return new;\n  end if;\n\n"
      + '  select coalesce(bool_or(now() - t.last_notified_at >= v_janela), true)\n'
      + '    into v_livre\n'
      + '    from public.student_location_notify_throttle t\n'
      + '   where t.student_id = new.student_id;\n\n'
      + '  if not v_livre then\n'
      + '    return new;\n'
      + '  end if;\n',
  },
  {
    nome: 'H3-carimbo',
    busca: '    timeout_milliseconds := 5000\n  );\n\n  return new;\n',
    insere: '    timeout_milliseconds := 5000\n  );\n\n'
      + '  insert into public.student_location_notify_throttle (student_id, last_notified_at)\n'
      + '  values (new.student_id, now())\n'
      + '  on conflict (student_id) do update\n'
      + '    set last_notified_at = excluded.last_notified_at;\n\n'
      + '  return new;\n',
  },
];

let novo = live;
const provas = [];
for (const h of hunks) {
  const oc = novo.split(h.busca).length - 1;
  if (oc !== 1) throw new Error(`hunk ${h.nome}: ancora encontrada ${oc}x, esperado 1x`);
  novo = novo.replace(h.busca, h.insere);
  provas.push({ nome: h.nome, ancoras: oc, delta_chars: h.insere.length - h.busca.length });
}

const ddl = [
  '-- BFR Conecta · Protecao Familiar · throttle de notificacao de nova localizacao',
  '-- CANDIDATA — gerada de pg_get_functiondef vivo (29/10), nao copiada a mao.',
  '--',
  '-- Decisao de produto (§C.26 item vi): o gatilho bfr_pf_notify_location disparava a CADA',
  '--   escrita de posicao, sem janela. A partir daqui, para o MESMO aluno ha no maximo uma',
  "--   notificacao por " + JANELA + '.',
  '--   Dentro da janela o gatilho SILENCE: nao chama net.http_post e nao gasta a janela.',
  '--   A escrita da posicao NUNCA e bloqueada — o throttle so segura a notificacao.',
  '--   Chave = aluno (uma fila por student_id): se dois responsaveis compartilham, ambos',
  '--   recebem na primeira e ambos ficam calados durante a janela.',
  '--',
  '-- Espelha o padrao da irma public.student_location_report_throttle (trava de 30 s por',
  '--   escrita): dono postgres, RLS ligado SEM force e sem policies, ACL so postgres+',
  '--   service_role. Sem force e de proposito: com force + 0 policies a propria',
  '--   SECURITY DEFINER (dono postgres) ficava bloqueada na tabela que ela escreve.',
  '-- Dependencias no ar: Edge send-school-notification v20, segredo Vault',
  "--   'pf_emissor_service_role', pg_net 0.20.4, gatilho bfr_pf_notify_location (tgtype 21).",
  '--',
  'begin;',
  '',
  'create table if not exists public.student_location_notify_throttle (',
  '  student_id uuid primary key references public.students(id) on delete cascade,',
  '  last_notified_at timestamp with time zone not null',
  ');',
  '',
  'alter table public.student_location_notify_throttle enable row level security;',
  'revoke all on public.student_location_notify_throttle from public, anon, authenticated;',
  'grant all on public.student_location_notify_throttle to service_role;',
  '',
  novo.trimEnd() + ';',
  '',
  'revoke all on function public.bfr_pf_notify_location() from public, anon, authenticated;',
  '',
  'commit;',
  '',
  '-- Reversao (congelada; executar so com OK):',
  '-- begin;',
  '-- drop trigger if exists bfr_pf_notify_location on public.student_locations;',
  '-- drop function if exists public.bfr_pf_notify_location();',
  '-- drop table if exists public.student_location_notify_throttle;',
  '-- commit;',
  '-- (a funcao anterior a esta candidata esta salva em pf-throttle-original-function.sql;',
  '--  para reverter SEM perder o emissor, reaplicar aquele texto e manter a tabela vazia)',
  '',
].join('\n');

fs.writeFileSync(DIR + 'pf-throttle-candidate.sql', ddl);
fs.writeFileSync(DIR + 'pf-throttle-original-function.sql', live);
fs.writeFileSync(DIR + 'pf-throttle-hunks.json', JSON.stringify({
  quando: new Date().toISOString(),
  janela: JANELA,
  chave: 'student_id',
  comportamento_dentro_da_janela: 'silenciar (nao chama net.http_post)',
  escrita_da_posicao: 'sempre permitida',
  origem: 'pg_get_functiondef vivo de 29/10 (pf-throttle-recon.json)',
  live_md5: null,
  hunks: provas,
  candidato_md5: null,
}, null, 2) + '\n');

console.log('hunks:', JSON.stringify(provas));
console.log('candidata:', ddl.length, 'bytes');
console.log('original:', live.length, 'bytes');
import { createHash } from 'node:crypto';
console.log('md5 original :', createHash('md5').update(live).digest('hex'));
console.log('md5 candidata:', createHash('md5').update(ddl).digest('hex'));
console.log('novo corpo contem v_janela?', novo.includes('v_janela'), '| v_livre?', novo.includes('v_livre'), '| tabela?', novo.includes('student_location_notify_throttle'));
