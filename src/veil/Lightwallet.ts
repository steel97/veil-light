import { mnemonicToSeed, generateMnemonic, validateMnemonic } from "bip39";
import { BIP32Factory, BIP32Interface } from "bip32";
import { Chainparams } from "./Chainparams";
import { GetAnonOutputsResponse } from "../models/rpc/lightwallet/GetAnonOutputsResponse";
import { SendRawTransactionResponse } from "../models/rpc/wallet/SendRawTransactionResponse";
import LightwalletTransactionBuilder from "./LightwalletTransactionBuilder";
import RpcRequester from "./RpcRequester";
import * as ecc from "veil-secp256k1";
import PublishTransactionResult from "../models/PublishTransactionResult";

const bip32 = BIP32Factory(ecc);
const BIP44_PURPOSE = 0x8000002C;

export default class Lightwallet {
    static fromMnemonic = async (chainParams: Chainparams, mnemonic: Array<string>) => {
        const mnemonicSeed = await mnemonicToSeed(mnemonic.join(" "));
        return new Lightwallet(chainParams, mnemonicSeed);
    }

    static generateMnemonic(size = 256) { return generateMnemonic(size).split(" "); }
    static verifyMnemonic(mnemonic: string, wordlist: Array<string> | undefined = undefined) { return validateMnemonic(mnemonic, wordlist) }

    private _chainParams: Chainparams;
    private _keyMaster: BIP32Interface;
    private _keyPurpose: BIP32Interface;
    private _keyCoin: BIP32Interface;

    constructor(chainParams: Chainparams, mnemonicSeed: Buffer) {
        this._chainParams = chainParams;
        this._keyMaster = bip32.fromSeed(mnemonicSeed);
        this._keyPurpose = this._keyMaster.derive(BIP44_PURPOSE);
        this._keyCoin = this._keyPurpose.derive(chainParams.nBIP44ID);
    }

    public getChainParams() { return this._chainParams; }
    public getKeyCoin() { return this._keyCoin; }

    public static async getAnonOutputs(vtxoutCount: number, ringSize = 5) {
        const response = await RpcRequester.send<GetAnonOutputsResponse>({
            jsonrpc: "1.0",
            method: "getanonoutputs",
            params: [vtxoutCount, ringSize] // inputSize, ringSize
        });
        return LightwalletTransactionBuilder.AnonOutputsToObj(response.result);
    }

    public static async publishTransaction(rawTx: string) {
        const response = await RpcRequester.send<SendRawTransactionResponse>({
            jsonrpc: "1.0",
            method: "sendrawtransaction",
            params: [rawTx]
        });
        const res: PublishTransactionResult = {
            txid: null,
            errorCode: null,
            message: null
        };

        if (response.error != null) {
            res.errorCode = response.error.code;
            res.message = response.error.message;
        } else {
            res.txid = response.result;
        }
        return res;
    }
}