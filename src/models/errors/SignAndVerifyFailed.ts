export default class SignAndVerifyFailed extends Error {
    constructor(message: string) {
        super(message);
        this.name = "SignAndVerifyFailed";
    }
}