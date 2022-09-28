export default class TxFeeAndChangeCalcFailed extends Error {
    constructor(message: string) {
        super(message);
        this.name = "TxFeeAndChangeCalcFailed";
    }
}