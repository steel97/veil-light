import { BoolPass } from "../../core/JsRef";
import CTxDestination from "./CTxDestination";
import { OutputTypes } from "./OutputTypes";

export default class CTempRecipient {
    public setAmount(nValue: number) {
        this.nAmount = nValue;
        this.nAmountSelected = nValue;
    }

    applySubFee(nFee: number, nSubtractFeeFromAmount: number, fFirst: BoolPass) {
        if (this.nType != OutputTypes.OUTPUT_DATA) {
            if (this.fSubtractFeeFromAmount && !this.fExemptFeeSub) {
                if (this.nAmount == null) this.nAmount = 0;
                this.nAmount -= nFee / nSubtractFeeFromAmount; // Subtract fee equally from each selected recipient

                if (fFirst.bool) { // first receiver pays the remainder not divisible by output count
                    fFirst.bool = false;
                    this.nAmount -= nFee % nSubtractFeeFromAmount;
                }
                return true;
            }
        }
        return false;
    };

    //bool ApplySubFee(CAmount nFee, size_t nSubtractFeeFromAmount, bool &fFirst);

    public nType?: number; // uint8_t
    public nAmount?: number; //uint64           // If fSubtractFeeFromAmount, nAmount = nAmountSelected - feeForOutput
    public nAmountSelected?: number;//uint64
    public fSubtractFeeFromAmount: boolean = false;
    public fSplitBlindOutput: boolean = false;
    public fExemptFeeSub: boolean = false;         // Value too low to sub fee when blinded value split into two outputs
    public fZerocoin: boolean = false;
    public fZerocoinMint: boolean = false;
    public address?: CTxDestination;
    public isMine: boolean = false;
    public scriptPubKey?: Buffer;
    public vData?: Buffer; // std::vector<uint8_t>
    public vBlind?: Buffer; // std::vector<uint8_t>
    public vRangeproof?: Buffer; // std::vector<uint8_t>
    public commitment?: Buffer;//secp256k1_pedersen_commitment
    public nonce?: Buffer;//uint256

    // TODO: range proof parameters, try to keep similar for fee
    // Allow an overwrite of the parameters.
    public fOverwriteRangeProofParams = false;
    public min_value?: number; //uint64_t
    public ct_exponent?: number; //int
    public ct_bits?: number; //int

    public sEphem?: Buffer; //CKey
    public pkTo?: Buffer; //CPubKey
    public n?: number;//int
    public sNarration?: string;//std::string 
    public fScriptSet: boolean = false;
    public fChange: boolean = false;
    public fLastBlindDummy: boolean = false;
    public fNonceSet: boolean = false;
    public nChildKey?: number; //uint32_t // update later
    public nStealthPrefix?: number;//uint32_t
}