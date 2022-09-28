export default class AddOutputsFailed extends Error {
    constructor(message: string) {
        super(message);
        this.name = "AddOutputsFailed";
    }
}