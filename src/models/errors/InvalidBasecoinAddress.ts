export default class InvalidBasecoinAddress extends Error {
    constructor(message: string) {
        super(message);
        this.name = "InvalidBasecoinAddress";
    }
}