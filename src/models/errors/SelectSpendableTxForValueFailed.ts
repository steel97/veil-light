export default class SelectSpendableTxForValueFailed extends Error {
    constructor(message: string) {
        super(message);
        this.name = "SelectSpendableTxForValueFailed";
    }
}