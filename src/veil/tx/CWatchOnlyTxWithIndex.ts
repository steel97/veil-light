import { BufferReader } from "bitcoinjs-lib/src/bufferutils";
import CWatchOnlyTx from "./CWatchOnlyTx";

export default class CWatchOnlyTxWithIndex extends CWatchOnlyTx {
    private _ringctIndex: number | undefined = undefined;
    public raw: string = "";
    public remoteTxHash: string = "";

    constructor() {
        super();
    }

    public deserialize(buffer: Buffer, raw: string | undefined = undefined) {
        this.raw = raw ?? "";
        const reader = new BufferReader(buffer);
        this._ringctIndex = reader.readUInt64();
        super.deserialize(buffer.subarray(8));
    }

    public getRingCtIndex() {
        return this._ringctIndex;
    }
}