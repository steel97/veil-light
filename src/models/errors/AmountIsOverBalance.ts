export default class AmountIsOverBalance extends Error {
    constructor(message: string) {
        super(message);
        this.name = "AmountIsOverBalance";
    }
}