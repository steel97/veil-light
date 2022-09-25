import { BufferWriter } from "bitcoinjs-lib/src/bufferutils";
import { OutputTypes } from "./OutputTypes";
import CTxOutBase from "./CTxOutBase";

export default class CTxOutStandard extends CTxOutBase {
    public nValue = 0;//int64
    public scriptPubKey: Buffer;//CScript

    public constructor(nValue: number, scriptPubKey: Buffer) {
        super(OutputTypes.OUTPUT_STANDARD);
        this.nValue = nValue;
        this.scriptPubKey = scriptPubKey;
    }

    public serialize() {
        const buf = Buffer.alloc(this.scriptPubKey?.length! + 512);
        const writer = new BufferWriter(buf);
        writer.writeUInt64(this.nValue);
        writer.writeVarInt(this.scriptPubKey.length);
        writer.writeSlice(this.scriptPubKey!);
        return writer.buffer.slice(0, writer.offset);
    }
}