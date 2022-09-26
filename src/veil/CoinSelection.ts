import { Chainparams } from "./Chainparams";

export default class CoinSelection {
    constructor(params: Chainparams) {
        this.MIN_CHANGE = params.CENT;
        this.MIN_FINAL_CHANGE = this.MIN_CHANGE / 2n;
    }
    //! target minimum change amount
    public MIN_CHANGE: bigint = 0n;
    //! final minimum change amount after paying for fees
    public MIN_FINAL_CHANGE: bigint = 0n;
}