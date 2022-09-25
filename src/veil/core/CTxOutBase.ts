export default class CTxOutBase {
    public nVersion: number = 0;

    constructor(nVersion: number) {
        this.nVersion = nVersion;
    }

    public serialize() {
        /*switch (this.nVersion)
        {
            case OUTPUT_STANDARD:
                s << *((CTxOutStandard*) this);
                break;
            case OUTPUT_CT:
                s << *((CTxOutCT*) this);
                break;
            case OUTPUT_RINGCT:
                s << *((CTxOutRingCT*) this);
                break;
            case OUTPUT_DATA:
                s << *((CTxOutData*) this);
                break;
            default:
                throw std::runtime_error("serialize error: tx output type does not exist");
        }*/
        return Buffer.alloc(0);
    }
}