import { BufferWriter } from "bitcoinjs-lib/src/bufferutils";
import { OutputTypes } from "./OutputTypes";
import CTxOutCT from "./CTxOutCT";

export default class CTxOutRingCTOr extends CTxOutCT {
    public pk?: Buffer;

    public constructor() {
        super(OutputTypes.OUTPUT_RINGCT);
    }

    public serialize() {
        const preSize = 33 + 33;

        const writerBuf = Buffer.alloc(preSize + this.vData!.length + this.vRangeproof?.length! + 128);
        const writer = new BufferWriter(writerBuf);
        writer.writeSlice(this.pk!);
        writer.writeSlice(this.commitment!);
        writer.writeVarSlice(this.vData!);
        writer.writeVarSlice(this.vRangeproof!);

        return writer.buffer.subarray(0, writer.offset);
    }
}