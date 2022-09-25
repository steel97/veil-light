import { BIP32Interface } from "bip32";
import { COIN_DIGITS, nRingCTAccount } from "./Chainparams";
import Lightwallet from "./Lightwallet";
import LightwalletAddress from "./LightwalletAddress";

export enum AccountType {
    DEFAULT = 0,
    STEALTH = 1,
    CHANGE = 2
}

export default class LightwalletAccount {
    private _wallet: Lightwallet;

    private _walletAccount: BIP32Interface;
    private _keyMasterAnon: BIP32Interface;

    private _vDefaultAccount: BIP32Interface;
    private _vStealthAccount: BIP32Interface;
    private _vChangeAccount: BIP32Interface;


    constructor(wallet: Lightwallet, accountId = 0) {
        this._wallet = wallet;
        this._walletAccount = this._wallet.getKeyCoin().deriveHardened(accountId);

        this._keyMasterAnon = this._walletAccount.deriveHardened(nRingCTAccount);
        this._vDefaultAccount = this._keyMasterAnon.deriveHardened(1);
        this._vStealthAccount = this._keyMasterAnon.deriveHardened(2);
        this._vChangeAccount = this._keyMasterAnon.deriveHardened(3);
    }

    public getAddress(fromAccount: AccountType, index = 1) {
        const address = new LightwalletAddress(this.getAccount(fromAccount), index);
        return address;
    }

    public getAccount(type: AccountType) {
        switch (type) {
            case AccountType.STEALTH:
                return this._vStealthAccount;
            case AccountType.CHANGE:
                return this._vChangeAccount;
        }
        return this._vDefaultAccount;
    }

    public async getBalanceRaw(input: Array<LightwalletAddress>) {
        let amount = 0;
        for (const addr of input)
            amount += await addr.getBalance();

        return amount;
    }

    public async getBalanceFormatted(input: Array<LightwalletAddress>) {
        const res = await this.getBalanceRaw(input);
        return res.toFixed(COIN_DIGITS);
    }
}