export default class RecipientDataBuildFailed extends Error {
    constructor(message: string) {
        super(message);
        this.name = "RecipientDataBuildFailed";
    }
}