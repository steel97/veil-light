import { BufferReader, BufferWriter } from "bitcoinjs-lib/src/bufferutils";
import { NumPass } from "../../core/JsRef";
import COutPoint from "../tx/COutPoint";
import CScriptWitness from "./CScriptWitness";

export default class CTxIn {
    static SEQUENCE_FINAL = 0xffffffff; // uint32_t
    static SEQUENCE_LOCKTIME_DISABLE_FLAG = (1 << 31); // uint32_t
    static SEQUENCE_LOCKTIME_TYPE_FLAG = (1 << 22); // uint32_t
    static SEQUENCE_LOCKTIME_MASK = 0x0000ffff; // uint32_t
    static SEQUENCE_LOCKTIME_GRANULARITY = 9; // int


    public nSequence: number;
    public prevout = new COutPoint();

    public scriptData = new CScriptWitness();
    public scriptWitness = new CScriptWitness();

    constructor() {
        this.nSequence = CTxIn.SEQUENCE_FINAL;
    }

    setAnonInfo(nInputs: number, nRingSize: number) //uint32_t
    {
        this.prevout.hash = Buffer.alloc(32);//uint256
        const writer = new BufferWriter(this.prevout.hash);
        writer.writeUInt32(nInputs);
        writer.writeUInt32(nRingSize);
        //memcpy(prevout.hash.begin(), &nInputs, 4);
        //memcpy(prevout.hash.begin()+4, &nRingSize, 4);
        return true;
    }

    getAnonInfo(nInputs: NumPass, nRingSize: NumPass) {
        const reader = new BufferReader(this.prevout.hash!);
        nInputs.num = reader.readUInt32();
        nRingSize.num = reader.readUInt32();

        return true;
    }

    isAnonInput() {
        return this.prevout.isAnonInput();
    }

    serialize() {
        const buf = Buffer.alloc(4096);
        const writer = new BufferWriter(buf);
        writer.writeSlice(this.prevout.serialize());
        //scriptSig empty
        writer.writeUInt8(0);
        writer.writeUInt32(this.nSequence);
        if (this.isAnonInput()) {
            //scriptData.stack
            writer.writeSlice(this.scriptData.serialize())
        }
        return writer.buffer.slice(0, writer.offset);
    }
}