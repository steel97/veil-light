export default class UnknownOutputType extends Error {
    constructor(message: string) {
        super(message);
        this.name = "UnknownOutputType";
    }
}