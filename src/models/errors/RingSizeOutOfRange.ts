export default class RingSizeOutOfRange extends Error {
    constructor(message: string) {
        super(message);
        this.name = "RingSizeOutOfRange";
    }
}