export default class FailedToSignRangeProof extends Error {
    constructor(message: string) {
        super(message);
        this.name = "FailedToSignRangeProof";
    }
}