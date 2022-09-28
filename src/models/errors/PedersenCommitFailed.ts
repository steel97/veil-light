export default class PedersenCommitFailed extends Error {
    constructor(message: string) {
        super(message);
        this.name = "PedersenCommitFailed";
    }
}