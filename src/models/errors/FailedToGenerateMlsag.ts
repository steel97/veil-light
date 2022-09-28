export default class FailedToGenerateMlsag extends Error {
    constructor(message: string) {
        super(message);
        this.name = "FailedToGenerateMlsag";
    }
}