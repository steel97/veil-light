import { BufferWriter } from "bitcoinjs-lib/src/bufferutils";
import { OutputTypes } from "./OutputTypes";
import CTxOutBase from "./CTxOutBase";

export default class CTxOutCT extends CTxOutBase {
    public commitment?: Buffer;
    public vData?: Buffer;
    public scriptPubKey?: Buffer;
    public vRangeproof?: Buffer;

    public constructor(nVersion: number | undefined) {
        super(nVersion ?? OutputTypes.OUTPUT_CT);
    }

    public serialize() {
        const preSize = 33 + this.vData?.length! + this.scriptPubKey?.length!;

        const writerBuf = Buffer.alloc(preSize + this.vRangeproof?.length! + 10);
        const writer = new BufferWriter(writerBuf);
        writer.writeSlice(this.commitment!);
        writer.writeSlice(this.vData!);
        writer.writeSlice(this.scriptPubKey!);
        writer.writeVarSlice(this.vRangeproof!);

        return writer.buffer.subarray(0, writer.offset);
    }
}