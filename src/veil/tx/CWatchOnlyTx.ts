import { BufferReader } from "bitcoinjs-lib/src/bufferutils";
import { Chainparams } from "../Chainparams";
import CTxOutRingCT from "./CTxOutRingCT";

export enum WatchOnlyTxType {
    NOTSET = -1,
    STEALTH = 0,
    ANON = 1
}

export default class CWatchOnlyTx {
    private _type?: WatchOnlyTxType;
    private _scanSecret?: Buffer;
    private _txHash?: Buffer;
    private _txHashHex?: string;
    private _txIndex?: number;
    private _ringctout?: CTxOutRingCT;
    //private _ctout: CTxOutCT;

    constructor() {

    }

    public deserialize(buffer: Buffer) {
        const reader = new BufferReader(buffer);
        this._type = WatchOnlyTxType.NOTSET;
        switch (reader.readInt32()) {
            case 0:
                this._type = WatchOnlyTxType.STEALTH;
            case 1:
                this._type = WatchOnlyTxType.ANON;
        }

        this._scanSecret = reader.readSlice(32);
        const scanSecretValid = (reader.readUInt8() ?? 0) > 0;
        const scanSecretCompressed = (reader.readUInt8() ?? 0) > 0;

        this._txHash = reader.readSlice(32);
        this._txIndex = reader.readUInt32();

        if (this._type == WatchOnlyTxType.ANON) {
            const ctxOut = new CTxOutRingCT();
            ctxOut.deserialize(buffer.subarray(reader.offset));
            this._ringctout = ctxOut;
        }
    }

    public getType() {
        return this._type;
    }

    public getKeyImage() {
        // return ct or ringct
        if (this._ringctout == null) {
            return undefined;
        }

        return this._ringctout!.getKeyImage();
    }

    public getAmount(chainParams: Chainparams) {
        // return ct or ringct
        if (this._ringctout == null) {
            return 0;
        }

        return (Number((this._ringctout!.getAmount() ?? 0n)) / Number(chainParams.COIN));
    }

    public getRingCtOut() { return this._ringctout; }

    public getId() {
        if (this._txHashHex == null) {
            this._txHashHex = this._txHash?.toString("hex");
        }

        return this._txHashHex;
    }

    public getTxHash() {
        return this._txHash?.reverse();
    }
}