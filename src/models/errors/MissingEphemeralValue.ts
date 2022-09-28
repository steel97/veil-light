export default class MissingEphemeralValue extends Error {
    constructor(message: string) {
        super(message);
        this.name = "MissingEphemeralValue";
    }
}