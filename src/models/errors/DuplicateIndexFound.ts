export default class DuplicateIndexFound extends Error {
    constructor(message: string) {
        super(message);
        this.name = "DuplicateIndexFound";
    }
}