export default class InvalidEphemeralPubKey extends Error {
    constructor(message: string) {
        super(message);
        this.name = "InvalidEphemeralPubKey";
    }
}