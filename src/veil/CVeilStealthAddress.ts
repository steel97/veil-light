import { Chainparams } from "./Chainparams";
import { bech32 } from "bech32";

const MAX_STEALTH_NARRATION_SIZE = 48;
const MIN_STEALTH_RAW_SIZE = 1 + 33 + 1 + 33 + 1 + 1;
const EC_SECRET_SIZE = 32;
const EC_COMPRESSED_SIZE = 33;
const EC_UNCOMPRESSED_SIZE = 65;

export interface stealth_prefix {
    number_bits: number,
    bitfield: number
}

export default class CVeilStealthAddress {
    public data: Buffer | undefined;
    public isValid = false;

    public options = 0;
    public prefix: stealth_prefix = {
        number_bits: 0,
        bitfield: 0
    };
    public number_signatures = 0;
    public scan_secret: Buffer | undefined;
    public scan_pubkey: Buffer | undefined;
    public spend_pubkey: Buffer | undefined;
    public spend_secret_id: Buffer | undefined;

    public fromData(scan_secret: Buffer, scan_pub: Buffer, spend_secret_id: Buffer, spend_pub: Buffer, number_bits: number) {
        this.scan_secret = scan_secret;
        this.scan_pubkey = scan_pub;
        this.spend_secret_id = spend_secret_id;
        this.spend_pubkey = spend_pub;
        this.prefix.number_bits = number_bits;
        this.isValid = true;
    }

    public fromBuffer(buffer: Buffer) {
        this.data = buffer;
        var nSize = buffer.length;
        if (nSize < MIN_STEALTH_RAW_SIZE) {
            return;
        }

        let index = 0;
        this.options = buffer[index++];

        this.scan_pubkey = buffer.slice(index, index + EC_COMPRESSED_SIZE);

        index += EC_COMPRESSED_SIZE;
        var spend_pubkeys = buffer[index++];

        if (nSize < MIN_STEALTH_RAW_SIZE + EC_COMPRESSED_SIZE * (spend_pubkeys - 1)) {
            return;
        }

        this.spend_pubkey = buffer.slice(index, index + EC_COMPRESSED_SIZE * spend_pubkeys);


        index += EC_COMPRESSED_SIZE * spend_pubkeys;

        this.number_signatures = buffer[index++];
        this.prefix.number_bits = buffer[index++];
        this.prefix.bitfield = 0;
        var nPrefixBytes = Math.ceil(this.prefix.number_bits / 8.0);

        if (nSize < MIN_STEALTH_RAW_SIZE + EC_COMPRESSED_SIZE * (spend_pubkeys - 1) + nPrefixBytes)
            return;

        if (nPrefixBytes >= 1) {
            const dv = new DataView(new Uint8Array(buffer.slice(index, index + nPrefixBytes)).buffer);
            this.prefix.bitfield = dv.getUint32(0);
        }
        //  memcpy(&prefix.bitfield, p, nPrefixBytes);

        this.isValid = true;
    }

    toBech32(chain: Chainparams) {
        const buffer = Buffer.alloc(512);

        let index = 0;
        buffer.writeUInt8(this.options, index++);

        buffer.set(this.scan_pubkey!, index);
        index += EC_COMPRESSED_SIZE;

        const spend_pubkeys = 1;
        buffer.writeUInt8(spend_pubkeys, index++); //const spend_pubkeys = buffer[index++];


        buffer.set(this.spend_pubkey!, index);
        index += EC_COMPRESSED_SIZE * spend_pubkeys;

        buffer.writeUInt8(this.number_signatures, index++);
        buffer.writeUInt8(this.prefix.number_bits, index++);

        const nPrefixBytes = Math.ceil(this.prefix.number_bits / 8.0);
        if (nPrefixBytes >= 1) {
            buffer.writeUInt32BE(this.prefix.bitfield, index);
            index += 4;
        }

        const words = bech32.toWords(buffer.slice(0, index));
        const data = bech32.encode(chain.bech32Prefixes.STEALTH_ADDRESS, words, 128);
        return data;
    }
}