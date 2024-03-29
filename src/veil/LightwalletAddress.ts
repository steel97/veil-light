import { hash160 } from "bitcoinjs-lib/src/crypto"
import { BIP32Interface } from "bip32";
import { GetWatchOnlyStatusResponse } from "../models/rpc/lightwallet/GetWatchOnlyStatusResponse";
import { GetWatchOnlyTxesResponse } from "../models/rpc/lightwallet/GetWatchOnlyTxesResponse";
import { ImportLightwalletAddressResponse } from "../models/rpc/lightwallet/ImportLightwalletAddressResponse";
import { CheckKeyImagesResponse, KeyImageResult } from "../models/rpc/wallet/CheckKeyImagesResponse";
import CWatchOnlyTxWithIndex from "./tx/CWatchOnlyTxWithIndex";
import RpcRequester from "./RpcRequester";
import LightwalletAccount from "./LightwalletAccount";
import LightwalletTransactionBuilder from "./LightwalletTransactionBuilder";
import Lightwallet from "./Lightwallet";
import CVeilAddress from "./CVeilAddress";
import CVeilStealthAddress from "./CVeilStealthAddress";
import Stealth from "./Stealth";
import CVeilRecipient from "./CVeilRecipient";

export default class LightwalletAddress {
    private _lwAccount: LightwalletAccount;
    private _addressKey: BIP32Interface;
    private _stealth: CVeilStealthAddress;
    private _transactionsCache?: Array<CWatchOnlyTxWithIndex>;
    private _keyImageCache?: Array<KeyImageResult>;
    private _syncWithNodeCalled = false;
    private _syncStatus: "failed" | "synced" | "scanning" = "scanning";

    public constructor(lwAccount: LightwalletAccount, account: BIP32Interface, index: number) {
        this._lwAccount = lwAccount;
        this._addressKey = account.deriveHardened(index);
        this._stealth = new CVeilStealthAddress();
        this._stealth.fromData(
            this.getScanKey().privateKey!,
            Stealth.getPubKey(this.getScanKey().privateKey!),
            hash160(this.getSpendKey().privateKey!),
            Stealth.getPubKey(this.getSpendKey().privateKey!),
            0
        );
    }

    public syncWithNode = async (fromBlock = 0) => {
        const scanKeyPriv = this.getScanKey().privateKey?.toString("hex");
        const spendKeyPub = this.getSpendKey().publicKey.toString("hex");

        const importResponse = await RpcRequester.send<ImportLightwalletAddressResponse>({
            jsonrpc: "1.0",
            method: "importlightwalletaddress",
            params: [scanKeyPriv, spendKeyPub, fromBlock]
        });

        let address = "";

        if (importResponse.error != null) {
            const importStatus = await RpcRequester.send<GetWatchOnlyStatusResponse>({
                jsonrpc: "1.0",
                method: "getwatchonlystatus",
                params: [scanKeyPriv, spendKeyPub]
            });

            this._syncStatus = importStatus.result.status;

            address = importStatus.result.stealth_address;
        } else {
            address = importResponse.result.stealth_address_bech;
        }

        this._syncWithNodeCalled = true;

        return address;
    }

    public fetchTxes = async () => {
        if (!this._syncWithNodeCalled || this._syncStatus != "synced") {
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
            const ki = tx.getKeyImage()?.toString("hex") ?? "";
            keyimages.push(ki);
        });
        // get keyimages info
        const kiResponse = await RpcRequester.send<CheckKeyImagesResponse>({
            jsonrpc: "1.0",
            method: "checkkeyimages",
            params: [keyimages]
        });
        if (kiResponse.error != null) return null;

        // fix key images response
        const newKeyImageRes: Array<KeyImageResult> = [];
        for (let i = 0; i < kiResponse.result.length; i++) {
            const tx = txes[i];
            const keyImageRes = kiResponse.result[i];
            keyImageRes.txid = tx.getId();
            newKeyImageRes.push(keyImageRes);
        }

        this._keyImageCache = newKeyImageRes;
        this._transactionsCache = txes.slice();

        return this._transactionsCache;
    }

    public getUnspentOutputs = async (ignoreMemPoolSpend = false) => {
        if (this._transactionsCache == null) {
            await this.fetchTxes();
            if (this._transactionsCache == null) return [];
        }

        const res: Array<CWatchOnlyTxWithIndex> = [];
        let i = 0;
        this._transactionsCache.forEach(tx => {
            const txInfo = this._keyImageCache?.find(a => a.txid == tx.getId());
            if (!(txInfo?.spent ?? true) && (!(txInfo?.spentinmempool ?? false) || ignoreMemPoolSpend)) {
                res.push(tx);
            }
            i++;
        });

        return res;
    }

    public getSpentOutputsInMemoryPool = async () => {
        if (this._transactionsCache == null) {
            await this.fetchTxes();
            if (this._transactionsCache == null) return [];
        }

        const res: Array<CWatchOnlyTxWithIndex> = [];
        let i = 0;
        this._transactionsCache.forEach(tx => {
            const txInfo = this._keyImageCache?.find(a => a.txid == tx.getId());
            if ((txInfo?.spentinmempool ?? false))
                res.push(tx);
            i++;
        });

        return res;
    }

    public getAllOutputs = async () => {
        return this._transactionsCache;
    }

    public getBalance = async (substractTxes: Array<string> = []) => {
        const res = await this.getUnspentOutputs();
        if (res.length == 0) return 0;

        // compute balance
        let amount = 0;
        res.forEach(utx => {
            if (substractTxes.indexOf(utx.getId() ?? "") !== -1) return;
            amount += utx.getAmount(this._lwAccount.getWallet().getChainParams());
        });
        return amount;
    }

    public getBalanceLocked = async () => {
        const res = await this.getSpentOutputsInMemoryPool();
        if (res.length == 0) return 0;

        // compute balance
        let amount = 0;
        res.forEach(utx => {
            amount += utx.getAmount(this._lwAccount.getWallet().getChainParams())
        });
        return amount;
    }

    public getScanKey = () => this._addressKey.deriveHardened(1);
    public getSpendKey = () => this._addressKey.deriveHardened(2);

    public async buildTransaction(recipients: Array<CVeilRecipient>, vSpendableTx: Array<CWatchOnlyTxWithIndex>, strategyUseSingleTxPriority: boolean, ringSize = 5) {
        const chainParams = this._lwAccount.getWallet().getChainParams();
        const vDummyOutputs = await Lightwallet.getAnonOutputs(vSpendableTx.length, ringSize);

        // rebuild recipients
        const resultingRecipients: Array<CVeilRecipient> = [];
        for (const rcp of recipients) {
            resultingRecipients.push({
                address: rcp.address,
                amount: parseFloat(rcp.amount.toFixed(chainParams.COIN_DIGITS))
            });
        }

        return LightwalletTransactionBuilder.buildLightWalletTransaction(
            chainParams, this,
            resultingRecipients,
            vSpendableTx,
            vDummyOutputs, strategyUseSingleTxPriority, ringSize);
    }

    public getStringAddress() {
        return this._stealth.toBech32(this._lwAccount.getWallet().getChainParams());
    }

    public getSyncStatus() {
        return this._syncStatus;
    }
}