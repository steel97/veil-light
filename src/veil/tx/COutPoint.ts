import { BufferReader, BufferWriter } from "bitcoinjs-lib/src/bufferutils";

export default class COutPoint {
    static ANON_MARKER = 0xffffffa0; // uint32_t

    public hash: Buffer | undefined = undefined;
    public n: number | undefined = undefined;

    public deserialize(buffer: Buffer) {
        const reader = new BufferReader(buffer);
        this.hash = reader.readSlice(32);
        this.n = reader.readUInt32();

        return reader.offset;
    }

    public serialize() {
        const tmpBuf = Buffer.alloc(32 + 4);
        const writer = new BufferWriter(tmpBuf);
        writer.writeSlice(this.hash!);
        writer.writeUInt32(this.n!);
        return writer.buffer.slice(0, writer.offset);
    }

    public isAnonInput() {
        return this.n == COutPoint.ANON_MARKER;
    }
}