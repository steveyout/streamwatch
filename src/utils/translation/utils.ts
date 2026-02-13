export async function compressStr(string: string): Promise<ArrayBuffer> {
  const byteArray = new TextEncoder().encode(string);
  const cs = new CompressionStream("deflate");
  const writer = cs.writable.getWriter();
  writer.write(byteArray);
  writer.close();
  return new Response(cs.readable).arrayBuffer();
}

export async function decompressStr(byteArray: ArrayBuffer): Promise<string> {
  const cs = new DecompressionStream("deflate");
  const writer = cs.writable.getWriter();
  writer.write(byteArray);
  writer.close();
  return new Response(cs.readable).arrayBuffer().then((arrayBuffer) => {
    return new TextDecoder().decode(arrayBuffer);
  });
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
