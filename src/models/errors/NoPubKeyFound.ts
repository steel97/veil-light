export default class NoPubKeyFound extends Error {
    constructor(message: string) {
        super(message);
        this.name = "NoPubKeyFound";
    }
}