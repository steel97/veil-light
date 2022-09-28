export default class UnimplementedException extends Error {
    constructor(message: string) {
        super(message);
        this.name = "UnimplementedException";
    }
}