export default class TxAtLeastOneRecipient extends Error {
    constructor(message: string) {
        super(message);
        this.name = "TxAtLeastOneRecipient";
    }
}