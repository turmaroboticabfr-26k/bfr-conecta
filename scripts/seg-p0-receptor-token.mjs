import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const file = join(homedir(), '.gh-token');
const deadMd5 = 'd915a2cca74a';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Private-Network': 'true',
};

const server = createServer((req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); res.end(); return; }
  if (req.method !== 'POST' || req.url !== '/t') { res.writeHead(404, cors); res.end(); return; }
  let body = '';
  req.on('data', c => { body += c; if (body.length > 4096) req.destroy(); });
  req.on('end', () => {
    const value = body.trim();
    const md5 = createHash('md5').update(value).digest('hex').slice(0, 12);
    if (!value.startsWith('github_pat_') || value.length !== 93 || /\s/.test(value)) {
      console.log(`REJEITADO: len=${value.length} md5=${md5} forma_invalida`);
      res.writeHead(400, cors); res.end('bad shape'); return;
    }
    if (md5 === deadMd5) {
      console.log('REJEITADO: token morto');
      res.writeHead(400, cors); res.end('dead'); return;
    }
    writeFileSync(file, value);
    console.log(`GRAVADO: len=${value.length} md5=${md5} diferente_do_morto=SIM`);
    res.writeHead(200, cors); res.end('ok');
    setTimeout(() => { server.close(); process.exit(0); }, 200);
  });
});

server.listen(8765, '127.0.0.1', () => console.log('RECEPTOR: 127.0.0.1:8765 a espera'));
setTimeout(() => { console.log('TIMEOUT: nada recebido em 60 s'); server.close(); process.exit(1); }, 60000);