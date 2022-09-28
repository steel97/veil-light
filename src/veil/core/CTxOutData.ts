import { BufferWriter } from "bitcoinjs-lib/src/bufferutils";
import { OutputTypes } from "./OutputTypes";
import CTxOutBase from "./CTxOutBase";

export default class CTxOutData extends CTxOutBase {
    public vData: Buffer | undefined;

    public constructor(buf: Buffer) {
        super(OutputTypes.OUTPUT_DATA);
        this.vData = buf;
    }

    public serialize() {
        const buf = Buffer.alloc(this.vData?.length! + 512);
        const writer = new BufferWriter(buf);
        writer.writeVarSlice(this.vData!);
        return writer.buffer.subarray(0, writer.offset);
    }
}