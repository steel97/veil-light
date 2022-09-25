import { BufferReader } from "bitcoinjs-lib/src/bufferutils";
import COutPoint from "./COutPoint";

export default class CAnonOutput {
    private _pubkey: Buffer | undefined = undefined;
    private _commitment: Buffer | undefined = undefined;
    private _outpoint: COutPoint | undefined = undefined;
    private _nBlockHeight: number | undefined = undefined;
    private _nCompromised: number | undefined = undefined;

    public deserialize(buffer: Buffer) {
        const reader = new BufferReader(buffer);
        this._pubkey = reader.readVarSlice();
        this._commitment = reader.readSlice(33);
        this._outpoint = new COutPoint();
        const read = this._outpoint.deserialize(buffer.slice(reader.offset));

        const reader2 = new BufferReader(buffer.slice(reader.offset + read));
        this._nBlockHeight = reader2.readInt32();
        this._nCompromised = reader2.readUInt8();
    }

    public getCommitment() {
        return this._commitment;
    }

    public getPubKey() {
        return this._pubkey;
    }
}