#!/usr/bin/env node
// Generates icon-192.png and icon-512.png in public/
// Run with: node generate-icons.cjs

const zlib = require('zlib')
const fs = require('fs')
const path = require('path')

// CRC32 table
const crcTable = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
  }
  crcTable[n] = c
}
function crc32(buf) {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf])
}

function makePNG(size, bgRgb, fgRgb) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR chunk
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8  // 8 bits per channel
  ihdr[9] = 2  // RGB colour type
  // compression, filter, interlace = 0

  // Draw a rounded square background with a bold "L" letter
  const [br, bg, bb] = bgRgb
  const [fr, fg, fb] = fgRgb
  const margin = Math.round(size * 0.18)
  const strokeW = Math.round(size * 0.13)
  const rows = []

  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3)
    row[0] = 0 // filter type = None
    for (let x = 0; x < size; x++) {
      // "L" shape: vertical bar from top to bottom, horizontal bar at bottom
      const inVert = x >= margin && x < margin + strokeW && y >= margin && y < size - margin
      const inHoriz = y >= size - margin - strokeW && y < size - margin && x >= margin && x < size - margin
      const [r, g, b] = (inVert || inHoriz) ? [fr, fg, fb] : [br, bg, bb]
      const p = 1 + x * 3
      row[p] = r; row[p + 1] = g; row[p + 2] = b
    }
    rows.push(row)
  }

  const raw = Buffer.concat(rows)
  const idat = zlib.deflateSync(raw, { level: 6 })

  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idat),
    makeChunk('IEND', Buffer.alloc(0)),
  ])
}

const outDir = path.join(__dirname, 'public')
const bg = [3, 7, 18]      // #030712 gray-950
const fg = [37, 99, 235]   // #2563eb blue-600

fs.writeFileSync(path.join(outDir, 'icon-192.png'), makePNG(192, bg, fg))
fs.writeFileSync(path.join(outDir, 'icon-512.png'), makePNG(512, bg, fg))
console.log('Generated public/icon-192.png and public/icon-512.png')
