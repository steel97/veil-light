export default class FailedToPrepareMlsag extends Error {
    constructor(message: string) {
        super(message);
        this.name = "FailedToPrepareMlsag";
    }
}