export default class ChangeAddressIsNotStealth extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ChangeAddressIsNotStealth";
    }
}