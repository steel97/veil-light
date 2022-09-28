export default class LightWalletAddOutputsFailed extends Error {
    constructor(message: string) {
        super(message);
        this.name = "LightWalletAddOutputsFailed";
    }
}