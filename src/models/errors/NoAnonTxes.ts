export default class NoAnonTxes extends Error {
    constructor(message: string) {
        super(message);
        this.name = "NoAnonTxes";
    }
}