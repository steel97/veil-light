export default class LightWalletAddCTDataFailed extends Error {
    constructor(message: string) {
        super(message);
        this.name = "LightWalletAddCTDataFailed";
    }
}