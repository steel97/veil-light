export default class UpdateChangeOutputCommitmentFailed extends Error {
    constructor(message: string) {
        super(message);
        this.name = "UpdateChangeOutputCommitmentFailed";
    }
}