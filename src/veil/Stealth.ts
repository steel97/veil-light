import { ECPairFactory, ECPairAPI } from "ecpair";
import { Hash } from "fast-sha256";
import * as ecc from "veil-secp256k1";

const EC_COMPRESSED_SIZE = 33;

export interface StealthSecretResult {
    sShared: Buffer;
    pkExtracted: Buffer;
}

export default class Stealth {
    static setPublicKey = (pk: Buffer) => {
        const buf = Buffer.alloc(EC_COMPRESSED_SIZE);
        buf.set(pk, 0);
        return buf;
    }

    static stealthSecret = (secret: Buffer, pubkey: Buffer, pkSpend: Buffer) => {
        let sShared: Buffer | null = null;
        let pkExtracted: Buffer | null = null;

        if (pubkey.length != EC_COMPRESSED_SIZE || pkSpend.length != EC_COMPRESSED_SIZE)
            throw new Error("sanity checks failed");

        let Q = pubkey;
        let R = pkSpend;

        Q = Buffer.from(ecc.pointMultiply(Q, secret, true)!);
        const tmp33 = Q; // secp256k1_ec_pubkey_serialize(secp256k1_ctx_stealth, tmp33, &len, &Q, SECP256K1_EC_COMPRESSED); // Returns: 1 always.

        const hasher = new Hash();
        hasher.update(tmp33);
        let vKey = Buffer.from(hasher.digest());


        //sShared = Buffer.from(vKey); //valid, compressed
        sShared = Buffer.alloc(32);
        sShared.set(vKey);
        //if (!secp256k1_ec_seckey_verify(secp256k1_ctx_stealth, sharedSOut.begin()))
        //    return errorN(1, "%s: secp256k1_ec_seckey_verify failed.", __func__); // Start again with a new ephemeral key

        R = Buffer.from(ecc.pointAddScalar(R, sShared, true)!);

        pkExtracted = Stealth.setPublicKey(R);


        const res: StealthSecretResult = {
            sShared: sShared!,
            pkExtracted: pkExtracted!
        };
        return res;
    }

    static stealthSharedToSecretSpend = (sharedS: Buffer, spendSecret: Buffer) => { //ckey, ckey, ckey
        let secretOut = spendSecret;

        secretOut = Buffer.from(ecc.privateAdd(secretOut, sharedS)!);
        //secp256k1_ec_seckey_verify
        return secretOut;
    }

    static getPubKey = (input: Buffer) => {
        const ECPair: ECPairAPI = ECPairFactory(ecc);
        const keyPair = ECPair.fromPrivateKey(input);
        return keyPair.publicKey;
    }
}