import { BufferWriter } from "bitcoinjs-lib/src/bufferutils";

export default class CScriptWitness {
    // Note that this encodes the data elements being pushed, rather than
    // encoding them as a CScript that pushes them.
    stack: Array<Buffer> = [];

    public isNull() { return this.stack.length == 0; }
    //public setNull() { stack.clear(); stack.shrink_to_fit(); }

    public serialize() {
        const tmpBuf = Buffer.alloc(8096 * 2);
        const writer = new BufferWriter(tmpBuf);
        writer.writeVarInt(this.stack.length);
        for (const obj of this.stack) {
            writer.writeVarSlice(obj);
        }
        /*
        var size = 0UL;
    var tempSize = 0UL;
    serializationContext.ReadCompactSize(out size);

    Stack = new List<byte[]>();

    for (var i = 0UL; i < size; i++)
    {
        serializationContext.ReadCompactSize(out tempSize);
        var stackEntry = serializationContext.ReadByteArray(tempSize);
        Stack.Add(stackEntry);
    }
        */
        return writer.buffer.subarray(0, writer.offset);
    }
};