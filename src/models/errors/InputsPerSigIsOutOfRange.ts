export default class InputsPerSigIsOutOfRange extends Error {
    constructor(message: string) {
        super(message);
        this.name = "InputsPerSigIsOutOfRange";
    }
}