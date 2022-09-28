export default class KeyImagesFailed extends Error {
    constructor(message: string) {
        super(message);
        this.name = "KeyImagesFailed";
    }
}