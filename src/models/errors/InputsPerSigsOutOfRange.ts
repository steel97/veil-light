export default class InputsPerSigsIsOutOfRange extends Error {
    constructor(message: string) {
        super(message);
        this.name = "InputsPerSigsIsOutOfRange";
    }
}