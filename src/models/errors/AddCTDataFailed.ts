export default class AddCTDataFailed extends Error {
    constructor(message: string) {
        super(message);
        this.name = "LightWalletAddCTDataFailed";
    }
}