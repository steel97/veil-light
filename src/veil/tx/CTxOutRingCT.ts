import { BIP32Interface } from "bip32";
import { BufferReader } from "bitcoinjs-lib/src/bufferutils";
import { Hash } from "fast-sha256";
import * as ecc from "veil-secp256k1";
import Stealth from "../Stealth";

export default class CTxOutRingCT {
    private _pubKey: Buffer | undefined = undefined;
    private _commitment: Buffer | undefined = undefined;
    private _vData: Buffer | undefined = undefined;
    private _vRangeproof: Buffer | undefined = undefined;
    private _vchEphemPK: Buffer | undefined = undefined;

    private _keyImage: Buffer | undefined = undefined;
    private _nAmount: bigint | undefined = undefined;
    private _blind: Buffer | undefined = undefined;

    public deserialize(buffer: Buffer) {
        const reader = new BufferReader(buffer);
        this._pubKey = reader?.readSlice(33);
        this._commitment = reader?.readSlice(33);
        this._vData = reader?.readVarSlice();
        this._vRangeproof = reader?.readVarSlice();
        this._vchEphemPK = this._vData?.subarray(0, 33);
    }

    public decodeTx(spendKey: BIP32Interface, scanKey: BIP32Interface) {
        const ecPubKey = Stealth.setPublicKey(spendKey.publicKey);
        const stealthSecretRes = Stealth.stealthSecret(scanKey.privateKey!, this._vchEphemPK!, ecPubKey);

        const sShared = stealthSecretRes.sShared;
        //const pkExtracted = stealthSecretRes.pkExtracted;

        const destinationKeyPriv = Stealth.stealthSharedToSecretSpend(sShared, spendKey.privateKey!);
        //const destinationKey = Stealth.getPubKey(destinationKeyPriv);

        //const destIdent = hash160(destinationKey);
        //const pkIdent = hash160(this._pubKey!);

        this._keyImage = Buffer.from(ecc.getKeyImage(this._pubKey!, destinationKeyPriv)!);
        const nonce = ecc.ECDH_VEIL(this._vchEphemPK!, destinationKeyPriv)
        const hasher = new Hash();
        hasher.update(nonce!, 32);
        const nonceHashed = hasher.digest();

        const amountres = ecc.rangeProofRewind(nonceHashed, this._commitment!, this._vRangeproof!);
        this._nAmount = amountres?.value;
        this._blind = Buffer.from(amountres?.blindOut!);
    }

    public getPubKey() { return this._pubKey; }
    public getKeyImage() { return this._keyImage; }
    public getAmount() { return this._nAmount; }
    public getVCHEphemPK() { return this._vchEphemPK; }
    public getVData() { return this._vData; }
    public getCommitment() { return this._commitment; }
    public getBlind() { return this._blind };
}