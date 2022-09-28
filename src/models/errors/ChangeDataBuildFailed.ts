export default class ChangeDataBuildFailed extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ChangeDataBuildFailed";
    }
}