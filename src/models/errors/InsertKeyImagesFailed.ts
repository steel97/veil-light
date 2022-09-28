export default class InsertKeyImagesFailed extends Error {
    constructor(message: string) {
        super(message);
        this.name = "InsertKeyImagesFailed";
    }
}