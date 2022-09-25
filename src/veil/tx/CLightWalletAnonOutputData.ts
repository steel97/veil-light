import { BufferReader } from "bitcoinjs-lib/src/bufferutils";
import CAnonOutput from "./CAnonOutput";

export default class CLightWalletAnonOutputData {
    private _index: number | undefined = undefined;
    private _output: CAnonOutput | undefined = undefined;

    public deserialize(buffer: Buffer) {
        const reader = new BufferReader(buffer);
        this._index = reader.readUInt64();
        this._output = new CAnonOutput();
        this._output.deserialize(buffer.subarray(8));
    }

    public getIndex() {
        return this._index;
    }

    public getOutput() {
        return this._output;
    }
}