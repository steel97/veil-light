import { BIP32Interface } from "bip32";
import { GetWatchOnlyStatusResponse } from "../models/rpc/lightwallet/GetWatchOnlyStatusResponse";
import { GetWatchOnlyTxesResponse } from "../models/rpc/lightwallet/GetWatchOnlyTxesResponse";
import { ImportLightwalletAddressResponse } from "../models/rpc/lightwallet/ImportLightwalletAddressResponse";
import { CheckKeyImagesResponse, KeyImageResult } from "../models/rpc/wallet/CheckKeyImagesResponse";
import CWatchOnlyTxWithIndex from "./tx/CWatchOnlyTxWithIndex";
import RpcRequester from "./RpcRequester";
import LightwalletAccount from "./LightwalletAccount";

export default class LightwalletAddress {
    private _lwAccount: LightwalletAccount;
    private _addressKey: BIP32Interface;
    private _transactionsCache?: Array<CWatchOnlyTxWithIndex>;
    private _keyImageCache?: Array<KeyImageResult>;
    private _syncWithNodeCalled = false;

    public constructor(lwAccount: LightwalletAccount, account: BIP32Interface, index: number) {
        this._lwAccount = lwAccount;
        this._addressKey = account.deriveHardened(index);
    }

    public syncWithNode = async () => {
        const scanKeyPriv = this.getScanKey().privateKey?.toString("hex");
        const spendKeyPub = this.getSpendKey().publicKey.toString("hex");

        const importResponse = await RpcRequester.send<ImportLightwalletAddressResponse>({
            jsonrpc: "1.0",
            method: "importlightwalletaddress",
            params: [scanKeyPriv, spendKeyPub, BigInt(0)]
        });

        let address = "";

        if (importResponse.error != null) {
            const importStatus = await RpcRequester.send<GetWatchOnlyStatusResponse>({
                jsonrpc: "1.0",
                method: "getwatchonlystatus",
                params: [scanKeyPriv, spendKeyPub]
            });

            address = importStatus.result.stealth_address;
        } else {
            address = importResponse.result.stealth_address_bech;
        }

        this._syncWithNodeCalled = true;

        return address;
    }

    public fetchTxes = async () => {
        if (!this._syncWithNodeCalled) {
            await this.syncWithNode();
        }

        const scanKey = this.getScanKey();
        const spendKey = this.getSpendKey();

        const response = await RpcRequester.send<GetWatchOnlyTxesResponse>({
            jsonrpc: "1.0",
            method: "getwatchonlytxes",
            params: [scanKey.privateKey?.toString("hex")]
        });

        const txes: Array<CWatchOnlyTxWithIndex> = [];
        for (const tx of response.result.anon) {
            const txObj = new CWatchOnlyTxWithIndex();
            txObj.deserialize(Buffer.from(tx.raw, "hex"), tx.raw);
            txObj.getRingCtOut()?.decodeTx(spendKey, scanKey)
            txes.push(txObj);
        }

        // get keyimages
        const keyimages: Array<string> = [];
        txes.forEach(tx => {
            keyimages.push(tx.getKeyImage()?.toString("hex") ?? "");
        });
        // get keyimages info
        const kiResponse = await RpcRequester.send<CheckKeyImagesResponse>({
            jsonrpc: "1.0",
            method: "checkkeyimages",
            params: [keyimages]
        });
        if (kiResponse.error != null) return null;

        this._keyImageCache = kiResponse.result;
        this._transactionsCache = txes;

        return this._transactionsCache;
    }

    public getUnspentOutputs = async () => {
        if (this._transactionsCache == null) {
            await this.fetchTxes();
            if (this._transactionsCache == null) return [];
        }

        const res: Array<CWatchOnlyTxWithIndex> = [];
        let i = 0;
        this._transactionsCache.forEach(tx => {
            const txInfo = this._keyImageCache?.at(i);
            if (!(txInfo?.spent ?? true))
                res.push(tx);
            i++;
        });

        return res;
    }

    public getBalance = async () => {
        const res = await this.getUnspentOutputs();
        if (res.length == 0) return 0;

        // compute balance
        let amount = 0;
        res.forEach(utx => amount += utx.getAmount(this._lwAccount.getWallet().getChainParams()));
        return amount;
    }

    public getScanKey = () => this._addressKey.deriveHardened(1);
    public getSpendKey = () => this._addressKey.deriveHardened(2);
}