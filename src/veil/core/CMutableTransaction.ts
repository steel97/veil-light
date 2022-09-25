import { Hash } from "fast-sha256";
import { SerializationType } from "../Serialization";
import { BufferWriter } from "bitcoinjs-lib/src/bufferutils";
import CTxIn from "./CTxIn";
import CTxOutBase from "./CTxOutBase";


export default class CMutableTransaction {
    public vin: Array<CTxIn> = [];
    public vpout: Array<CTxOutBase> = [];// std::vector<CTxOutBaseRef> vpout;
    public nVersion: number = 2;//int32_t
    public nLockTime: number = 0;//uint32_t

    serializeHash(out: CTxOutBase, hashType: number) {
        const buf = out.serialize();
        const tbuf = Buffer.alloc(4 + buf.length);
        const writer = new BufferWriter(tbuf);
        //writer.writeUInt32(hashType);
        writer.writeSlice(buf);
        const rbuf = writer.buffer.slice(0, writer.offset);
        const hasher = new Hash();
        hasher.update(rbuf, rbuf.length);
        const hsh = hasher.digest();
        hasher.reset();
        hasher.update(hsh, hsh.length);
        return Buffer.from(hasher.digest());
    }

    getOutputsHash() { // uint256 return
        const pblank = Buffer.from("0000000000000000000000000000000000000000000000000000000000000000", "hex");
        let hashOutputs = Buffer.alloc(32);
        let hashOutputsSet = false;
        //static const unsigned char pblank[1] = {};
        const hasher = new Hash();
        for (const out of this.vpout) {
            const hash = this.serializeHash(out, SerializationType.SER_GETHASH);

            hasher.reset();

            hasher.update(hash.length == 0 ? pblank : hash);
            hasher.update(!hashOutputsSet ? pblank : hashOutputs);
            // call update on all data came from serialization

            const temp = Buffer.from(hasher.digest());
            hasher.reset();
            hasher.update(temp);
            hashOutputs = Buffer.from(hasher.digest());
            hashOutputsSet = true;
            //hashOutputs = Hash(BEGIN(hash), END(hash), hashOutputs.begin(), hashOutputs.end());
        }

        return hashOutputs;
    }

    hasWitness() {
        for (let i = 0; i < this.vin.length; i++) {
            if (!this.vin[i].scriptWitness.isNull()) {
                return true;
            }
        }
        return false;
    }

    encode() {
        const buf = Buffer.alloc(81920);
        const writer = new BufferWriter(buf);
        writer.writeUInt8(this.nVersion & 0xFF);
        //type
        let bv = (this.nVersion >> 8) & 0xFF;
        writer.writeUInt8(bv);
        writer.writeUInt8(this.hasWitness() ? 1 : 0);
        writer.writeUInt32(this.nLockTime);

        writer.writeVarInt(this.vin.length);
        for (const txin of this.vin) {
            const buf = txin.serialize();
            writer.writeSlice(buf);
        }

        writer.writeVarInt(this.vpout.length);
        for (let k = 0; k < this.vpout.length; ++k) {
            writer.writeUInt8(this.vpout[k].nVersion);
            writer.writeSlice(this.vpout[k].serialize())
        }

        if (this.hasWitness()) {
            for (const txin of this.vin) {
                writer.writeSlice(txin.scriptWitness.serialize());
            }
        }
        /*
    if (tx.HasWitness()) {
        for (auto &txin : tx.vin)
            s << txin.scriptWitness.stack;
    }
        */
        return writer.buffer.slice(0, writer.offset);
    }
}

/**
 * Basic transaction serialization format:
 * - int32_t nVersion
 * - std::vector<CTxIn> vin
 * - std::vector<CTxOut> vout
 * - uint32_t nLockTime
 *
 * Extended transaction serialization format:
 * - int32_t nVersion
 * - unsigned char dummy = 0x00
 * - unsigned char flags (!= 0)
 * - bool Tx Has Segwit
 * - std::vector<CTxIn> vin
 * - std::vector<CTxOut> vout
 * - if (flags & 1):
 *   - CTxWitness wit;
 * - uint32_t nLockTime
 */