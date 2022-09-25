import { OutputTypes } from "./OutputTypes";
import CVeilStealthAddress from "../CVeilStealthAddress";

export default class CTxDestination {
    public scriptPubKey?: Buffer;
    public stealthAddress?: CVeilStealthAddress;
    public type: OutputTypes;

    public constructor(scriptPubKey: Buffer | undefined, stealthAddress: CVeilStealthAddress | undefined, type: OutputTypes) {
        this.scriptPubKey = scriptPubKey;
        this.stealthAddress = stealthAddress;
        this.type = type;
    }
}