export default class InvalidChangeAddress extends Error {
    constructor(message: string) {
        super(message);
        this.name = "InvalidChangeAddress";
    }
}