export default class CFeeRate {
    private nSatoshisPerK = 0;
    constructor(_nSatoshisPerK: number) {
        this.nSatoshisPerK = _nSatoshisPerK;
    }

    getFee(nBytes_: number) {
        //assert(nBytes_ <= uint64_t(std:: numeric_limits<int64_t>:: max()));
        let nSize = nBytes_;//int64_t(nBytes_);

        let nFee = this.nSatoshisPerK * nSize / 1000;

        if (nFee == 0 && nSize != 0) {
            if (this.nSatoshisPerK > 0)
                nFee = 1;
            if (this.nSatoshisPerK < 0)
                nFee = -1;
        }

        return nFee;
    }

}