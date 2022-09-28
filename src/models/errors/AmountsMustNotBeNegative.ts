export default class AmountsMustNotBeNegative extends Error {
    constructor(message: string) {
        super(message);
        this.name = "AmountsMustNotBeNegative";
    }
}