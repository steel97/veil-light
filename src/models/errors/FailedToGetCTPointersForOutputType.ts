export default class FailedToGetCTPointersForOutputType extends Error {
    constructor(message: string) {
        super(message);
        this.name = "FailedToGetCTPointersForOutputType";
    }
}