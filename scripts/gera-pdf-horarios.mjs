// Gera PDFs validos a partir dos PNGs dos horarios (candidatas, NAO sobrescreve nada).
// O defeito: app/horario-*-2026.pdf e worker-deploy-v121/public/horario-*-2026.pdf sao
// HTML de 1.477.823 B (md5 954621f2... nos dois). O conteudo real vive nos PNGs 1686x1194.
// Este script le o PNG, desfaz os filtros, embute os pixeis num PDF minimo com FlateDecode,
// e prova a ida-e-volta: inflar o stream do PDF e comparar byte a byte com os pixeis.
// Sem dependencias (zlib e embutida). Rotulos: PDF gerado a partir do PNG, nao o "original".
import fs from 'node:fs';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

const dir = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const OUT = `${dir}/bfr-candidata-v122-horarios-pdf`;
const md5 = b => crypto.createHash('md5').update(b).digest('hex');
const die = m => { console.error(`ABORTO: ${m}`); process.exit(1); };

const alvos = [
  { png: `${dir}/app/horario-matutino-2026.png`, pdf: `${OUT}/horario-matutino-2026.pdf` },
  { png: `${dir}/app/horario-vespertino-2026.png`, pdf: `${OUT}/horario-vespertino-2026.pdf` },
];

function parsePng(buf) {
  if (buf.slice(0, 8).toString('latin1') !== '\x89PNG\r\n\x1a\n') die('assinatura PNG invalida');
  let off = 8, width = 0, height = 0, bitDepth = 0, colorType = 0;
  const idat = [];
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.slice(off + 4, off + 8).toString('latin1');
    const data = buf.slice(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      bitDepth = data[8]; colorType = data[9];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (!width || !height) die('IHDR ausente');
  if (bitDepth !== 8 || colorType !== 2) die(`PNG inesperado: bitDepth=${bitDepth} colorType=${colorType} (esperado 8/2 RGB)`);
  return { width, height, raw: zlib.inflateSync(Buffer.concat(idat)) };
}

// Filtros PNG: None/Sub/Up/Average/Paeth sobre bpp=3
function unfilter(raw, width, height) {
  const bpp = 3, stride = width * bpp, out = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)];
    const row = raw.slice(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const prev = y > 0 ? out.slice((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? out[y * stride + i - bpp] : 0;
      const b = prev ? prev[i] : 0;
      const c = i >= bpp && prev ? prev[i - bpp] : 0;
      let v = row[i];
      if (f === 1) v = (v + a) & 0xff;
      else if (f === 2) v = (v + b) & 0xff;
      else if (f === 3) v = (v + ((a + b) >> 1)) & 0xff;
      else if (f === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xff;
      } else if (f !== 0) die(`filtro PNG desconhecido: ${f}`);
      out[y * stride + i] = v;
    }
  }
  return out;
}

function montaPdf(pixels, width, height) {
  const stream = zlib.deflateSync(pixels); // zlib-wrapped e valido em /FlateDecode
  const content = Buffer.from(`q ${width} 0 0 ${height} 0 0 cm /Im0 Do Q\n`, 'latin1');
  const endstream = Buffer.from('\nendstream', 'latin1');
  const imgDict = Buffer.from(
    `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${stream.length} >>\nstream\n`,
    'latin1'
  );
  const contentDict = Buffer.from(`<< /Length ${content.length} >>\nstream\n`, 'latin1');
  // cada corpo e um objeto completo: dicionario + stream + endstream juntos
  const bodies = [
    Buffer.from('<< /Type /Catalog /Pages 2 0 R >>', 'latin1'),
    Buffer.from('<< /Type /Pages /Kids [3 0 R] /Count 1 >>', 'latin1'),
    Buffer.from(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`, 'latin1'),
    Buffer.concat([imgDict, stream, endstream]),
    Buffer.concat([contentDict, content, endstream]),
  ];
  const out = [Buffer.from('%PDF-1.4\n', 'latin1')];
  const offsets = [0];
  let pos = out[0].length;
  for (let i = 0; i < bodies.length; i++) {
    offsets.push(pos);
    const chunk = Buffer.concat([
      Buffer.from(`${i + 1} 0 obj\n`, 'latin1'),
      bodies[i],
      Buffer.from('\nendobj\n', 'latin1'),
    ]);
    out.push(chunk);
    pos += chunk.length;
  }
  const xrefAt = pos;
  const n = bodies.length + 1;
  let xref = `xref\n0 ${n}\n0000000000 65535 f \n`;
  for (let i = 1; i < n; i++) xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  xref += `trailer\n<< /Size ${n} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;
  return Buffer.concat([...out, Buffer.from(xref, 'latin1')]);
}

function confereRoundTrip(pdfBuf, pixels, width, height) {
  const s = pdfBuf.toString('latin1');
  const m = /4 0 obj[\s\S]*?stream\n([\s\S]*?)\nendstream/.exec(s);
  if (!m) die('stream da imagem nao localizado no PDF');
  const back = zlib.inflateSync(Buffer.from(m[1], 'latin1'));
  const ok = back.length === pixels.length && crypto.timingSafeEqual(back, pixels);
  return { ok, bytes: back.length };
}

fs.mkdirSync(OUT, { recursive: true });
const diary = { em: new Date().toISOString(), alvos: [], porta_ok: true, nao_sobrescreve: true };
for (const a of alvos) {
  if (fs.existsSync(a.pdf)) die(`${a.pdf} ja existe (nao sobrescrever)`);
  const pngBuf = fs.readFileSync(a.png);
  const { width, height, raw } = parsePng(pngBuf);
  if (raw.length !== height * (width * 3 + 1)) die(`tamanho bruto ${raw.length} != ${height * (width * 3 + 1)}`);
  const pixels = unfilter(raw, width, height);
  const pdfBuf = montaPdf(pixels, width, height);
  const rt = confereRoundTrip(pdfBuf, pixels, width, height);
  if (!rt.ok) die(`ida-e-volta falhou em ${a.pdf} (${rt.bytes} B devolvidos)`);
  if (!pdfBuf.slice(0, 8).toString('latin1').startsWith('%PDF-1.')) die(`magica %PDF ausente em ${a.pdf}`);
  fs.writeFileSync(a.pdf, pdfBuf);
  diary.alvos.push({
    png: a.png.split('/').pop(), pngMd5: md5(pngBuf), pngBytes: pngBuf.length,
    pdf: a.pdf.split('/').pop(), pdfMd5: md5(pdfBuf), pdfBytes: pdfBuf.length,
    width, height, roundTrip: 'OK',
  });
  console.log(`${a.pdf.split('/').pop()}  ${width}x${height}  ${pdfBuf.length} B  md5 ${md5(pdfBuf)}  roundTrip=OK`);
}
fs.writeFileSync(`${OUT}/portoes-horarios-pdf-diary.json`, JSON.stringify(diary, null, 2));
console.log(`\ngravado em ${OUT} (candidatas; NAO tocou em app/ nem em worker-deploy-*)`);
