// Record the physical print dimensions in a standard PNG pHYs chunk.
export function pngPhysicalSize(bytes, widthMM = 63.5, heightMM = 88) {
  const read = (p) =>
      new DataView(bytes.buffer, bytes.byteOffset + p, 4).getUint32(0),
    write = (a, p, v) =>
      new DataView(a.buffer, a.byteOffset + p, 4).setUint32(0, v);
  if (bytes.length < 33 || bytes[0] !== 137 || bytes[1] !== 80)
    throw Error("Invalid PNG");
  const w = read(16),
    h = read(20),
    chunk = new Uint8Array(21);
  write(chunk, 0, 9);
  chunk.set([112, 72, 89, 115], 4);
  write(chunk, 8, Math.round((w * 1000) / widthMM));
  write(chunk, 12, Math.round((h * 1000) / heightMM));
  chunk[16] = 1;
  let crc = 0xffffffff;
  for (const b of chunk.subarray(4, 17)) {
    crc ^= b;
    for (let k = 0; k < 8; k++)
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  write(chunk, 17, (crc ^ 0xffffffff) >>> 0);
  let offset = 33;
  const pieces = [bytes.subarray(0, 33), chunk];
  while (offset < bytes.length) {
    const len = read(offset) + 12;
    if (len < 12 || offset + len > bytes.length)
      throw Error("Invalid PNG chunk");
    if (
      String.fromCharCode(...bytes.subarray(offset + 4, offset + 8)) !== "pHYs"
    )
      pieces.push(bytes.subarray(offset, offset + len));
    offset += len;
  }
  const result = new Uint8Array(pieces.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of pieces) {
    result.set(p, at);
    at += p.length;
  }
  return result;
}
