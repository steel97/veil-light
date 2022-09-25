import { fromBase58Check, toOutputScript } from "bitcoinjs-lib/src/address";
import { bech32Prefixes, veilNetwork } from "./Chainparams";
import { bech32 } from "bech32";
import CVeilStealthAddress from "./CVeilStealthAddress";

export default class CVeilAddress {
    private _isValid: boolean;
    private _scriptPubKey?: Buffer;
    private _stealthAddress?: CVeilStealthAddress;

    public constructor(scriptPubKey: Buffer | undefined, stealthAddress: CVeilStealthAddress | undefined, valid: boolean) {
        this._scriptPubKey = scriptPubKey;
        this._stealthAddress = stealthAddress;
        this._isValid = valid;
    }

    public getScriptPubKey() {
        return this._scriptPubKey;
    }

    public getStealthAddress() {
        return this._stealthAddress;
    }

    public isValid() {
        return this._isValid;
    }

    public isValidStealthAddress() {
        if (this._stealthAddress == null) return false;
        return this._stealthAddress.isValid;
    }

    public static parse(address: string) {
        let scriptPubKey: Buffer | undefined;
        let stealthAddress: CVeilStealthAddress | undefined;
        let valid = false;

        try {
            scriptPubKey = toOutputScript(address, veilNetwork);
            valid = true;
        } catch {
            try {
                const b58d = fromBase58Check(address);
                const addrHash = b58d.hash.slice(1); // size of array base58Prefixes.STEALTH_ADDRESS
                stealthAddress = new CVeilStealthAddress();
                stealthAddress.fromBuffer(addrHash);
            } catch {
                // stealth bech32
                /*const bechRes = fromBech32(address);
                if (bechRes.prefix != bech32Prefixes.STEALTH_ADDRESS) {
                    throw new Error("Invalid address");
                }*/
                const data = bech32.decode(address, 128);
                if (data.prefix != bech32Prefixes.STEALTH_ADDRESS) {
                    throw new Error("Invalid address");
                }
                const res = bech32.fromWords(data.words);
                const buf = Buffer.from(res);
                stealthAddress = new CVeilStealthAddress();
                stealthAddress.fromBuffer(buf);
            }
        }

        const addrObj = new CVeilAddress(scriptPubKey, stealthAddress, valid);
        return addrObj;
    }
}