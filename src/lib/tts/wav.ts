
const SAMPLE_RATE = 44100;
const BITS_PER_SAMPLE = 16;
const NUM_CHANNELS = 1;
const BYTES_PER_SAMPLE = 2;

function writeU32(buf: Buffer, offset: number, value: number): void {
  buf.writeUInt32LE(value, offset);
}
function writeU16(buf: Buffer, offset: number, value: number): void {
  buf.writeUInt16LE(value, offset);
}

export function pcmToWav(pcmBuffer: Buffer): Buffer {
  const dataLength = pcmBuffer.length;
  const headerLength = 44;
  const fileSize = headerLength + dataLength;

  const header = Buffer.alloc(headerLength);
  let offset = 0;
  header.write("RIFF", offset); offset += 4;
  writeU32(header, offset, fileSize - 8); offset += 4;
  header.write("WAVE", offset); offset += 4;
  header.write("fmt ", offset); offset += 4;
  writeU32(header, offset, 16); offset += 4;
  writeU16(header, offset, 1); offset += 2;
  writeU16(header, offset, NUM_CHANNELS); offset += 2;
  writeU32(header, offset, SAMPLE_RATE); offset += 4;
  writeU32(header, offset, SAMPLE_RATE * NUM_CHANNELS * BYTES_PER_SAMPLE); offset += 4;
  writeU16(header, offset, NUM_CHANNELS * BYTES_PER_SAMPLE); offset += 2;
  writeU16(header, offset, BITS_PER_SAMPLE); offset += 2;
  header.write("data", offset); offset += 4;
  writeU32(header, offset, dataLength);

  return Buffer.concat([header, pcmBuffer]);
}

export function createSilenceWav(durationSeconds: number): Buffer {
  const numSamples = Math.round(SAMPLE_RATE * durationSeconds);
  const numBytes = numSamples * BYTES_PER_SAMPLE;
  const pcm = Buffer.alloc(numBytes, 0);
  return pcmToWav(pcm);
}

export { SAMPLE_RATE };
