export default class GetDestinationKeyForOutputFailed extends Error {
    constructor(message: string) {
        super(message);
        this.name = "GetDestinationKeyForOutputFailed";
    }
}