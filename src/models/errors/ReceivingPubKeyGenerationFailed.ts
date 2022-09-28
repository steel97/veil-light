export default class ReceivingPubKeyGenerationFailed extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ReceivingPubKeyGenerationFailed";
    }
}