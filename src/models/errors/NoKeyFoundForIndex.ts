export default class NoKeyFoundForIndex extends Error {
    constructor(message: string) {
        super(message);
        this.name = "NoKeyFoundForIndex";
    }
}