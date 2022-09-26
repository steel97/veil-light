import { Network } from "ecpair/src/networks";
import CFeeRate from "./core/CFeeRate";

export interface Base58Prefixes {
    PUBKEY_ADDRESS: number,
    SCRIPT_ADDRESS: number,
    SECRET_KEY: number,
    STEALTH_ADDRESS: number,
    EXT_PUBLIC_KEY: number,
    EXT_SECRET_KEY: number
}

export interface Bech32Prefixes {
    STEALTH_ADDRESS: string,
    BASE_ADDRESS: string
}

export interface Chainparams {
    base58Prefixes: Base58Prefixes,
    bech32Prefixes: Bech32Prefixes
    nBIP44ID: number;
    nRingCTAccount: number;
    nZerocoinAccount: number;

    COIN_DIGITS: number;
    COIN: bigint;
    CENT_DIGITS: number;
    CENT: bigint;
    DEFAULT_MIN_RELAY_TX_FEE: number;
    minRelayTxFee: CFeeRate | undefined;
    veilNetwork: Network | undefined;
}

export const mainNetParams: Chainparams = {
    base58Prefixes: {
        PUBKEY_ADDRESS: 0x46,
        SCRIPT_ADDRESS: 0x05,
        SECRET_KEY: 0x80,
        STEALTH_ADDRESS: 0x84,
        EXT_PUBLIC_KEY: 0x0488b21e,
        EXT_SECRET_KEY: 0x0488ade4
    },
    bech32Prefixes: {
        STEALTH_ADDRESS: "sv",
        BASE_ADDRESS: "bv"
    },
    nBIP44ID: 0x800002ba,
    nRingCTAccount: 20000,
    nZerocoinAccount: 100000,

    // CAmount
    COIN_DIGITS: 8,
    COIN: BigInt(100000000),
    CENT_DIGITS: 6,
    CENT: BigInt(1000000),

    DEFAULT_MIN_RELAY_TX_FEE: 1000,
    minRelayTxFee: undefined,
    veilNetwork: undefined
}

mainNetParams.minRelayTxFee = new CFeeRate(mainNetParams.DEFAULT_MIN_RELAY_TX_FEE);
mainNetParams.veilNetwork = {
    messagePrefix: "\x19Veil Signed Message:\n",
    bech32: mainNetParams.bech32Prefixes.BASE_ADDRESS, // stealth can't be parsed with bitcoinjs, used workaround in src/veil/CVeilAddress.ts
    bip32: {
        public: mainNetParams.base58Prefixes.EXT_PUBLIC_KEY,
        private: mainNetParams.base58Prefixes.EXT_SECRET_KEY,
    },
    pubKeyHash: mainNetParams.base58Prefixes.PUBKEY_ADDRESS,
    scriptHash: mainNetParams.base58Prefixes.SCRIPT_ADDRESS,
    wif: mainNetParams.base58Prefixes.SECRET_KEY,
};