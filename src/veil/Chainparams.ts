import { Network } from "ecpair/src/networks";
import CFeeRate from "./core/CFeeRate";

export const base58Prefixes = {
    PUBKEY_ADDRESS: 0x46,
    SCRIPT_ADDRESS: 0x05,
    SECRET_KEY: 0x80,
    STEALTH_ADDRESS: 0x84,
    EXT_PUBLIC_KEY: 0x0488b21e,
    EXT_SECRET_KEY: 0x0488ade4
};
export const bech32Prefixes = {
    STEALTH_ADDRESS: "sv",
    BASE_ADDRESS: "bv"
}
export const nBIP44ID = 0x800002ba;
export const nRingCTAccount = 20000;
export const nZerocoinAccount = 100000;

// CAmount
export const COIN_DIGITS = 8;
export const COIN = BigInt(100000000);
export const CENT_DIGITS = 6;
export const CENT = BigInt(1000000);

export const DEFAULT_MIN_RELAY_TX_FEE = 1000;

export const minRelayTxFee = new CFeeRate(DEFAULT_MIN_RELAY_TX_FEE);

export const veilNetwork: Network = {
    messagePrefix: "\x19Veil Signed Message:\n",
    bech32: bech32Prefixes.BASE_ADDRESS, // stealth can't be parsed with bitcoinjs, used workaround in src/veil/CVeilAddress.ts
    bip32: {
        public: base58Prefixes.EXT_PUBLIC_KEY,
        private: base58Prefixes.EXT_SECRET_KEY,
    },
    pubKeyHash: base58Prefixes.PUBKEY_ADDRESS,
    scriptHash: base58Prefixes.SCRIPT_ADDRESS,
    wif: base58Prefixes.SECRET_KEY,
};