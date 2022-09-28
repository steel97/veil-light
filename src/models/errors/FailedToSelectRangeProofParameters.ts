export default class FailedToSelectRangeProofParameters extends Error {
    constructor(message: string) {
        super(message);
        this.name = "FailedToSelectRangeProofParameters";
    }
}