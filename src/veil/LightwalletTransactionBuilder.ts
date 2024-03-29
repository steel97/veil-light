import { hash160 } from "bitcoinjs-lib/src/crypto"
import { BufferWriter } from "bitcoinjs-lib/src/bufferutils";
import { Chainparams } from "./Chainparams"; // CENT, COIN, minRelayTxFee
import { OutputTypes } from "./core/OutputTypes";
import { Hash } from "fast-sha256";
import { ECPairFactory, ECPairAPI } from "ecpair";
import { opcodetype } from "./core/CScript";
import { BoolPass, NumPass } from "../core/JsRef";
import { createArrayBuf, resize, resizeBuf, resizeNumArr } from "../core/Array";
import { getVirtualTransactionSize } from "./Policy";
import CoinSelection from "./CoinSelection";
import { AnonOutput } from "../models/rpc/lightwallet/GetAnonOutputsResponse";
import { putVarInt } from "../core/BitcoinJsFix";
import CWatchOnlyTxWithIndex from "./tx/CWatchOnlyTxWithIndex";
import CTempRecipient from "./core/CTempRecipient";
import CTxDestination from "./core/CTxDestination";
import CMutableTransaction from "./core/CMutableTransaction";
import CTxOutBase from "./core/CTxOutBase";
import CTxOutStandard from "./core/CTxOutStandard";
import CTxOutCT from "./core/CTxOutCT";
import CTxOutRingCTOr from "./core/CTxOutRingCTOr";
import CTxIn from "./core/CTxIn";
import COutPoint from "./tx/COutPoint";
import CTxOutData from "./core/CTxOutData";
import CVeilAddress from "./CVeilAddress";
import LightwalletAddress from "./LightwalletAddress";
import Stealth from "./Stealth";
import CLightWalletAnonOutputData from "./tx/CLightWalletAnonOutputData";
import CWatchOnlyTx, { WatchOnlyTxType } from "./tx/CWatchOnlyTx";
import CVeilStealthAddress from "./CVeilStealthAddress";
import * as ecc from "veil-secp256k1";
import * as randomBytes from "randombytes";
import NoAnonTxes from "../models/errors/NoAnonTxes";
import AmountIsOverBalance from "../models/errors/AmountIsOverBalance";
import InvalidChangeAddress from "../models/errors/InvalidChangeAddress";
import TxAtLeastOneRecipient from "../models/errors/TxAtLeaseOneRecipient";
import AmountsMustNotBeNegative from "../models/errors/AmountsMustNotBeNegative";
import RingSizeOutOfRange from "../models/errors/RingSizeOutOfRange";
import InputsPerSigsIsOutOfRange from "../models/errors/InputsPerSigsOutOfRange";
import RecipientDataBuildFailed from "../models/errors/RecipientDataBuildFailed";
import ChangeDataBuildFailed from "../models/errors/ChangeDataBuildFailed";
import AddCTDataFailed from "../models/errors/AddCTDataFailed";
import AddOutputsFailed from "../models/errors/AddOutputsFailed";
import TxFeeAndChangeCalcFailed from "../models/errors/TxFeeAndChangeCalcFailed";
import PedersenCommitFailed from "../models/errors/PedersenCommitFailed";
import UpdateChangeOutputCommitmentFailed from "../models/errors/UpdateChangeOutputCommitmentFailed";
import InsertKeyImagesFailed from "../models/errors/InsertKeyImagesFailed";
import SignAndVerifyFailed from "../models/errors/SignAndVerifyFailed";
import InvalidBasecoinAddress from "../models/errors/InvalidBasecoinAddress";
import GetDestinationKeyForOutputFailed from "../models/errors/GetDestinationKeyForOutputFailed";
import ReceivingPubKeyGenerationFailed from "../models/errors/ReceivingPubKeyGenerationFailed";
import InvalidEphemeralPubKey from "../models/errors/InvalidEphemeralPubKey";
import ChangeAddressIsNotStealth from "../models/errors/ChangeAddressIsNotStealth";
import SelectSpendableTxForValueFailed from "../models/errors/SelectSpendableTxForValueFailed";
import MissingEphemeralValue from "../models/errors/MissingEphemeralValue";
import UnknownOutputType from "../models/errors/UnknownOutputType";
import FailedToSelectRangeProofParameters from "../models/errors/FailedToSelectRangeProofParameters";
import FailedToSignRangeProof from "../models/errors/FailedToSignRangeProof";
import DuplicateIndexFound from "../models/errors/DuplicateIndexFound";
import FailedToGetCTPointersForOutputType from "../models/errors/FailedToGetCTPointersForOutputType";
import KeyImagesFailed from "../models/errors/KeyImagesFailed";
import NoKeyFoundForIndex from "../models/errors/NoKeyFoundForIndex";
import NoPubKeyFound from "../models/errors/NoPubKeyFound";
import FailedToPrepareMlsag from "../models/errors/FailedToPrepareMlsag";
import PedersenBlindSumFailed from "../models/errors/PedersenBlindSumFailed";
import FailedToGenerateMlsag from "../models/errors/FailedToGenerateMlsag";
import BuildTransactionResult from "../models/BuildTransactionResult";
import UnimplementedException from "../models/errors/UnimplementedException";
import CVeilRecipient from "./CVeilRecipient";

const ECPair: ECPairAPI = ECPairFactory(ecc);

interface SpendableTxForValue {
    vSpendTheseTx: Array<CWatchOnlyTxWithIndex>,
    nChange: number
}

enum DataOutputTypes {
    DO_NULL = 0, // reserved
    DO_NARR_PLAIN = 1,
    DO_NARR_CRYPT = 2,
    DO_STEALTH = 3,
    DO_STEALTH_PREFIX = 4,
    DO_VOTE = 5,
    DO_FEE = 6,
    DO_DEV_FUND_CFWD = 7,
    DO_FUND_MSG = 8,
};

export default class LightwalletTransactionBuilder {

    public static AnonOutputsRawToObj(apiAnonOuts: Array<string>) {
        const res: Array<CLightWalletAnonOutputData> = [];
        for (const out of apiAnonOuts) {
            const obj = new CLightWalletAnonOutputData();
            obj.deserialize(Buffer.from(out, "hex"));
            res.push(obj);
        }

        return res;
    }

    public static AnonOutputsToObj(apiAnonOuts: Array<AnonOutput>) {
        const res: Array<CLightWalletAnonOutputData> = [];
        for (const out of apiAnonOuts) {
            const obj = new CLightWalletAnonOutputData();
            obj.deserialize(Buffer.from(out.raw, "hex"));
            res.push(obj);
        }

        return res;
    }
    // returns txHex
    public static buildLightWalletTransaction(chainParams: Chainparams, address: LightwalletAddress, recipients: Array<CVeilRecipient>, vSpendableTx: Array<CWatchOnlyTxWithIndex>, vDummyOutputs: Array<CLightWalletAnonOutputData>, strategyUseSingleTxPriority: boolean, ringSize = 5) {
        const vAnonTxes = Array<CWatchOnlyTxWithIndex>();
        const vStealthTxes = Array<CWatchOnlyTxWithIndex>();

        for (const tx of vSpendableTx) {
            if (tx.getType() == WatchOnlyTxType.ANON) {
                vAnonTxes.push(tx);
            }

            if (tx.getType() == WatchOnlyTxType.STEALTH) {
                vStealthTxes.push(tx);
            }
        }

        if (vAnonTxes.length > 0) {
            // rebuild recipients
            const resultingRecipients: Array<CVeilRecipient> = [];
            for (const rcp of recipients) {
                resultingRecipients.push({
                    address: rcp.address,
                    amount: parseInt((parseFloat(rcp.amount.toString().replace(",", ".")) * Number(chainParams.COIN)).toFixed(0))
                });
            }
            return this.buildLightWalletRingCTTransaction(chainParams, address, resultingRecipients, vAnonTxes, vDummyOutputs, strategyUseSingleTxPriority, ringSize);
        } else if (vStealthTxes.length > 0) {
            // return BuildLightWalletStealthTransaction(args, vStealthTxes, txHex, errorMsg);
            throw new UnimplementedException("Not implemented (yes?)");
        } else {
            throw new NoAnonTxes("No Anon or Stealth txes given to build transaction")
        }

    }

    // returns txHex
    private static buildLightWalletRingCTTransaction(chainParams: Chainparams, address: LightwalletAddress, recipients: Array<CVeilRecipient>, vSpendableTx: Array<CWatchOnlyTxWithIndex>, vDummyOutputs: Array<CLightWalletAnonOutputData>, strategyUseSingleTxPriority: boolean, ringSize: number) {
        const response: BuildTransactionResult = {
            fee: 0,
            amountSent: 0,
            txid: undefined
        };

        const coinSelection = new CoinSelection(chainParams);

        const spendKey = address.getSpendKey();
        const scanKey = address.getScanKey();

        const spend_secret = spendKey.privateKey;
        const scan_secret = scanKey.privateKey;
        const spend_pubkey = spendKey.publicKey;

        const vecSend: Array<CTempRecipient> = [];
        let nValueOut = 0;
        // Build the Output
        for (const rcp of recipients) {
            nValueOut += rcp.amount;
            const destination = this.getTypeOut(rcp.address);
            const r = new CTempRecipient();
            r.nType = destination?.type;
            r.setAmount(rcp.amount);
            r.address = destination;
            if (r.nType == OutputTypes.OUTPUT_STANDARD) {
                r.fScriptSet = true;
                r.scriptPubKey = destination?.scriptPubKey;
            }

            vecSend.push(r);
        }

        const vectorTxesWithAmountSet = vSpendableTx;//this.getAmountAndBlindForUnspentTx(vSpendableTx, spend_secret!, scan_secret!, spend_pubkey);

        if (!this.checkAmounts(chainParams, nValueOut, vectorTxesWithAmountSet)) {
            throw new AmountIsOverBalance("Amount is over the balance of this address");
        }

        // Default ringsize is 11
        const nRingSize = ringSize;
        const nInputsPerSig = nRingSize;

        // Get change address - this is the same address we are sending from
        const sxAddr = new CVeilStealthAddress();
        sxAddr.fromData(scan_secret!, Stealth.getPubKey(scan_secret!), hash160(spend_secret!), Stealth.getPubKey(spend_secret!), 0);

        //sxAddr.scan_pubkey = Stealth.getPubKey(sxAddr.scan_secret!);
        //sxAddr.spend_pubkey = Stealth.getPubKey(spend_secret!); // TO-DO spend_secret.IsValid()
        /*
        if (spend_secret.IsValid() && 0 != SecretToPublicKey(spend_secret, sxAddr.spend_pubkey)) {
            LogPrintf("Failed - Could not get spend public key.");
            errorMsg = "Could not get spend public key.";
            return false;
        } else {
            SetPublicKey(spend_pubkey, sxAddr.spend_pubkey);
        }        
        */


        const addrChange = new CVeilAddress(undefined, sxAddr, true);
        if (!addrChange.isValidStealthAddress()) {
            throw new InvalidChangeAddress("Invalid change address")
        }
        /*
            // TODO - if we can, remove coincontrol if we don't need to use it. bypass if we can
    // Set the change address in coincontrol
    CCoinControl coincontrol;
    coincontrol.destChange = addrChange.Get();
        
        */
        const destChange = this.getTypeOut(addrChange);
        // Check we are sending to atleast one address
        if (vecSend.length < 1) {
            throw new TxAtLeastOneRecipient("Transaction must have at least one recipient.")
        }

        // Get total value we are sending in vecSend
        let nValue = 0;
        for (const r of vecSend) {
            nValue += r.nAmount ?? 0;
            if (nValue < 0 || (r.nAmount ?? 0) < 0) {
                throw new AmountsMustNotBeNegative("Transaction amounts must not be negative");
            }
        }

        // Check ringsize
        if (nRingSize < 3 || nRingSize > 32) {
            throw new RingSizeOutOfRange("Ring size out of range.");
        }

        // Check inputspersig
        if (nInputsPerSig < 1 || nInputsPerSig > 32) {
            throw new InputsPerSigsIsOutOfRange("Num inputs per signature out of range.");
        }

        // Build the recipient data
        if (!this.buildRecipientData(vecSend)) {
            throw new RecipientDataBuildFailed("Failed - buildRecipientData");
        }

        const txNew = new CMutableTransaction();

        // Create tx object
        txNew.nLockTime = 0;

        //FeeCalculation feeCalc;
        let nFeeNeeded = 0;
        let nBytes = 0;

        // Get inputs = vAvailableWatchOnly
        let nValueOutPlainRef: NumPass = {
            num: 0
        };
        let nChangePosInOutRef: NumPass = {
            num: -1
        };

        let vMI: Array<Array<Array<number>>> = [];//Array< Array< Array<int64_t>  > >
        let vInputBlinds: Array<Buffer> = []; // Array< Buffer>
        let vSecretColumns: Array<number> = [];

        let nSubFeeTries = 100;
        let pick_new_inputs = true;
        let nValueIn = 0;

        let nFeeRetRef: NumPass = {
            num: 0
        };

        const nSubtractFeeFromAmount = 0;

        let vSelectedWatchOnly: Array<CWatchOnlyTx> = [];

        txNew.vin = [];
        txNew.vpout = [];
        vSelectedWatchOnly = [];//???!

        let nValueToSelect = nValue;
        if (nSubtractFeeFromAmount == 0) {
            nValueToSelect += nFeeRetRef.num;
        }

        nValueIn = 0;

        // Select tx to spend
        const ssres = this.selectSpendableTxForValue(nValueOut, vectorTxesWithAmountSet, strategyUseSingleTxPriority);
        const vSelectedTxes = ssres.vSpendTheseTx;
        let nTempChange = ssres.nChange;

        // TODO, have the server give us the feerate per Byte, when asking for txes
        // TODO, for now set to CENT
        nFeeNeeded = Number(chainParams.CENT);

        // Build the change recipient
        // Do not add change if we spending all balance
        let overallSpendableBalance = 0;
        vSpendableTx.forEach(tx => overallSpendableBalance += Number(tx.getRingCtOut()!.getAmount()));
        if (nValueOut + nFeeNeeded < overallSpendableBalance) {
            const nChange = nTempChange;//CAmount        
            if (!this.buildChangeData(chainParams, vecSend, nChangePosInOutRef, nFeeRetRef, nChange, destChange)) {//coincontrol.destChange(addrChange), errorMsg
                throw new ChangeDataBuildFailed("Failed BuildChangeData");
            }
        }

        const nRemainder = vSelectedTxes.length % nInputsPerSig;
        const nTxRingSigs = Math.floor(vSelectedTxes.length / nInputsPerSig + (nRemainder == 0 ? 0 : 1));

        let nRemainingInputs = vSelectedTxes.length;//size_t

        //Add blank anon inputs as anon inputs
        for (let k = 0; k < nTxRingSigs; ++k) {
            const nInputs = (k == (nTxRingSigs - 1) ? nRemainingInputs : nInputsPerSig);
            const txin = new CTxIn();
            txin.nSequence = CTxIn.SEQUENCE_FINAL;
            txin.prevout.n = COutPoint.ANON_MARKER;
            txin.setAnonInfo(nInputs, nRingSize);
            txNew.vin.push(txin);

            nRemainingInputs -= nInputs;
        }

        vMI = [];
        vInputBlinds = []
        vSecretColumns = []
        //vMI.resize(nTxRingSigs);
        //vInputBlinds.resize(nTxRingSigs);
        //vSecretColumns.resize(nTxRingSigs);
        for (let i = 0; i < nTxRingSigs; i++) {
            vMI[i] = [];
            vInputBlinds[i] = Buffer.alloc(32);
            vSecretColumns.push(0);
        }

        nValueOutPlainRef.num = 0;
        nChangePosInOutRef.num = -1;

        const outFeeVdata = Buffer.alloc(9);
        const outFeeWriter = new BufferWriter(outFeeVdata);
        outFeeWriter.writeUInt8(DataOutputTypes.DO_FEE);
        outFeeWriter.writeSlice(Buffer.alloc(8, 0));
        const outFee = new CTxOutData(outFeeWriter.buffer.subarray(0, outFeeWriter.offset));
        txNew.vpout.push(outFee);

        // Add CT DATA to txNew
        if (!this.lightWalletAddCTData(txNew, vecSend, nFeeRetRef, nValueOutPlainRef, nChangePosInOutRef, nSubtractFeeFromAmount)) {
            throw new AddCTDataFailed("Failed LightWalletAddCTData");
        }

        // Add in real outputs
        if (!this.lightWalletAddRealOutputs(txNew, vSelectedTxes, vInputBlinds, vSecretColumns, vMI)) {
            throw new AddOutputsFailed("Failed lightWalletAddRealOutputs");
        }

        // Add in dummy outputs
        this.lightWalletFillInDummyOutputs(txNew, vDummyOutputs, vSecretColumns, vMI);

        // Get the amout of bytes
        nBytes = getVirtualTransactionSize(txNew);


        if (nFeeRetRef.num >= nFeeNeeded) {
            // Reduce fee to only the needed amount if possible. This
            // prevents potential overpayment in fees if the coins
            // selected to meet nFeeNeeded result in a transaction that
            // requires less fee than the prior iteration.
            if (nFeeRetRef.num > nFeeNeeded && nChangePosInOutRef.num != -1 && nSubtractFeeFromAmount == 0) {
                const r = vecSend[nChangePosInOutRef.num];

                const extraFeePaid = nFeeRetRef.num - nFeeNeeded;
                if (r.nAmount == undefined) {
                    r.nAmount = 0;
                }

                r.nAmount += extraFeePaid;
                nFeeRetRef.num -= extraFeePaid;
            }
        } else if (!pick_new_inputs) {
            // This shouldn't happen, we should have had enough excess
            // fee to pay for the new output and still meet nFeeNeeded
            // Or we should have just subtracted fee from recipients and
            // nFeeNeeded should not have changed

            if (!nSubtractFeeFromAmount || !(--nSubFeeTries)) {
                throw new TxFeeAndChangeCalcFailed("Failed Transaction fee and change calculation failed");
            }
        }

        // Try to reduce change to include necessary fee
        if (nChangePosInOutRef.num != -1 && nSubtractFeeFromAmount == 0) {
            const r = vecSend[nChangePosInOutRef.num];
            const additionalFeeNeeded = nFeeNeeded - nFeeRetRef.num;
            if ((r.nAmount ?? 0) >= Number(coinSelection.MIN_FINAL_CHANGE) + additionalFeeNeeded) {
                if (r.nAmount == undefined) {
                    r.nAmount = 0;
                }
                r.nAmount -= additionalFeeNeeded;
                nFeeRetRef.num += additionalFeeNeeded;
            }
        }

        // Include more fee and try again.
        nFeeRetRef.num = nFeeNeeded;

        vSelectedWatchOnly = vSelectedTxes;

        nValueOutPlainRef.num += nFeeRetRef.num;

        // Remove scriptSigs to eliminate the fee calculation dummy signatures
        for (const txin of txNew.vin) {
            txin.scriptData.stack[0] = Buffer.alloc(0);
            txin.scriptWitness.stack[1] = Buffer.alloc(0);
        }

        let vpOutCommits: Array<Buffer> = []; // std:: vector <const uint8_t *>
        let vpOutBlinds: Array<Buffer> = []; // std:: vector <const uint8_t *>
        let vBlindPlain = Buffer.alloc(32, 0); // std:: vector <const uint8_t *>

        let plainCommitment = Buffer.alloc(33);
        if (nValueOutPlainRef.num > 0) {

            const res = ecc.pedersenCommit(plainCommitment, vBlindPlain, BigInt(nValueOutPlainRef.num));
            if (res == null) {
                throw new PedersenCommitFailed("Pedersen Commit failed for plain out.")
            }
            plainCommitment = Buffer.from(res.commitment);
            vBlindPlain = Buffer.from(res.blind);

            vpOutCommits.push(plainCommitment);
            vpOutBlinds.push(vBlindPlain);
        }

        if (!this.lightWalletUpdateChangeOutputCommitment(txNew, vecSend, nChangePosInOutRef, vpOutCommits, vpOutBlinds)) {
            throw new UpdateChangeOutputCommitmentFailed("Failed LightWalletUpdateChangeOutputCommitment");
        }

        response.fee = nFeeRetRef.num;

        //Add actual fee to CT Fee output
        const vpTx1 = txNew.vpout[0]! as CTxOutData;
        let vData = vpTx1.vData!;
        vData = vData.subarray(0, 1); // carefull!
        const tempBuf = Buffer.alloc(16);
        const ndWriter = new BufferWriter(tempBuf);
        //ndWriter.writeVarInt(nFeeRetRef.num);
        ndWriter.writeSlice(putVarInt(nFeeRetRef.num));
        //vData = ndWriter.buffer.subarray(0, ndWriter.offset);//end ok
        const targetData = Buffer.alloc(vData.length + ndWriter.offset);
        targetData.set(vData, 0);
        targetData.set(ndWriter.buffer.subarray(0, ndWriter.offset), 1);
        vData = targetData;
        vpTx1.vData = vData;

        const vSplitCommitBlindingKeys: Array<Buffer> = []; //std:: vector < CKey > =(txNew.vin.length); // input amount commitment when > 1 mlsag
        //int nTotalInputs = 0;

        let vSigningKeys: Record<number, Buffer> = {};
        //std:: vector < std:: pair < int64_t, CKey >> vSigningKeys;
        if (!this.lightWalletInsertKeyImages(txNew, vSigningKeys, vSelectedTxes, vSecretColumns, vMI, spend_pubkey, scan_secret!, spend_secret!)) {
            throw new InsertKeyImagesFailed("Failed LightWalletInsertKeyImages.");
        }

        if (!this.lightWalletSignAndVerifyTx(txNew, vInputBlinds, vpOutCommits, vpOutBlinds, vSplitCommitBlindingKeys, vSigningKeys, vDummyOutputs, vSelectedTxes, vSecretColumns, vMI)) {
            throw new SignAndVerifyFailed("Failed LightWalletSignAndVerifyTx");
        }

        const txId = txNew.encode().toString("hex");//EncodeHexTx(*txRef);
        response.txid = txId;
        response.amountSent = nValueOut;
        return response;
    }

    // return outputType and destination
    private static getTypeOut(address: CVeilAddress) {
        if (address.isValidStealthAddress()) {
            return new CTxDestination(undefined, address.getStealthAddress(), OutputTypes.OUTPUT_RINGCT);
        } else {
            //if (!IsValidDestination(destination)) {
            if (!address.isValid()) {
                throw new InvalidBasecoinAddress("Invalid basecoin address");
            }

            return new CTxDestination(address.getScriptPubKey(), undefined, OutputTypes.OUTPUT_STANDARD);
        }
    }

    private static checkAmounts(chainParams: Chainparams, nValueOut: number, vSpendableTx: Array<CWatchOnlyTx>) {
        let nSum: number = 0;
        for (const tx of vSpendableTx) {
            nSum += Number(tx.getRingCtOut()?.getAmount());

            if ((nValueOut + Number(chainParams.CENT)) <= nSum) {
                return true;
            }
        }

        return false;
    }

    // tx already has this info
    /*private static getAmountAndBlindForUnspentTx(vectorUnspentWatchonlyTx: Array<CWatchOnlyTx>, spend_secret: Buffer, scan_secret: Buffer, spend_pubkey: Buffer) {
         for (const currenttx of vectorUnspentWatchonlyTx) {
 
             const destinationKeyPriv = this.getDestinationKeyForOutput(currenttx, spend_secret, scan_secret, spend_pubkey);
 
             let vchEphemPK: Buffer;
             if (currenttx.getType() == WatchOnlyTxType.ANON) {
                 vchEphemPK = currenttx.getRingCtOut()?.getVCHEphemPK()!;
             } else {
                  throw new UnimplementedException("Not implemented (yes?)");
             }
 
             // Regenerate nonce
             const nonce = ecc.ECDH_VEIL(vchEphemPK, destinationKeyPriv)
             const hasher = new Hash();
             hasher.update(nonce!, 32);
             const nonceHashed = hasher.digest();
             if (currenttx.getType() == WatchOnlyTxType.ANON) {
                 const amountres = ecc.rangeProofRewind(nonceHashed, this._commitment!, this._vRangeproof!);
                 currenttx.blind = uint256();
                 memcpy(currenttx.blind.begin(), blindOut, 32);
                 currenttx.nAmount = amountOut;
                 vTxes.emplace_back(currenttx);
             } else {
                  throw new UnimplementedException("Not implemented (yes?)");
             }
             
         }
     }*/

    private static getDestinationKeyForOutput(tx: CWatchOnlyTx, spend_secret: Buffer, scan_secret: Buffer, spend_pubkey: Buffer) {
        if (tx.getType() == WatchOnlyTxType.ANON) {
            const idk = hash160(tx.getRingCtOut()?.getPubKey()!);
            //CKeyID idk = tx.ringctout.pk.GetID();

            const vchEphemPK = tx.getRingCtOut()?.getVCHEphemPK();
            const ecPubKey = Stealth.setPublicKey(spend_pubkey);
            const stealthSecretRes = Stealth.stealthSecret(scan_secret, vchEphemPK!, ecPubKey);

            const sShared = stealthSecretRes.sShared;
            const pkExtracted = stealthSecretRes.pkExtracted;

            // TO-DO
            /*if (!sShared.IsValid()) {
                LogPrintf("sShared wasn't valid: tx type %s", tx.type == CWatchOnlyTx::ANON ? "anon" : "stealth");
            }*/

            const destinationKeyPriv = Stealth.stealthSharedToSecretSpend(sShared, spend_secret);

            const destinationKey = Stealth.getPubKey(destinationKeyPriv);
            const destIdent = hash160(destinationKey);
            if (destIdent.toString("hex") != idk.toString("hex")) {
                throw new GetDestinationKeyForOutputFailed("GetDestinationKeyForOutput failed to generate correct shared secret");
            }
            return destinationKeyPriv;
        } else {
            throw new UnimplementedException("Not implemented (yes?)");
        }
    }

    private static buildRecipientData(vecSend: Array<CTempRecipient>) {
        for (const r of vecSend) {
            if (r.nType == OutputTypes.OUTPUT_STANDARD) {
                /*if (r.address.type() == typeid(CExtKeyPair)) {
                    errorMsg = "sending to extkeypair";
                    return false;
                } else if (r.address.type() == typeid(CKeyID)) {
                    r.scriptPubKey = GetScriptForDestination(r.address);
                } else {
                    if (!r.fScriptSet) {
                        r.scriptPubKey = GetScriptForDestination(r.address);
                        if (r.scriptPubKey.empty()) {
                            errorMsg = "Unknown address type and no script set.";
                            return false;
                        }
                    }
                }*/
                r.scriptPubKey = r.address?.scriptPubKey;

            } else if (r.nType == OutputTypes.OUTPUT_RINGCT) {
                let sEphem = r.sEphem;
                if (sEphem == undefined || sEphem.length < 32) {
                    sEphem = randomBytes.default(32);//ECPair.makeRandom({ compressed: true }).privateKey!;
                }

                //if (r.address.type() == typeid(CStealthAddress)) {
                const sx = r.address?.stealthAddress;

                let sShared: Buffer | undefined;
                let pkSendTo: Buffer | undefined;
                let k = 0;
                const nTries = 24;
                for (k = 0; k < nTries; ++k) {
                    try {
                        const scan_pubkey_t = Stealth.setPublicKey(sx?.scan_pubkey!);
                        const spend_pubkey_t = Stealth.setPublicKey(sx?.spend_pubkey!);
                        const res = Stealth.stealthSecret(sEphem, scan_pubkey_t, spend_pubkey_t);
                        sShared = res.sShared;
                        pkSendTo = res.pkExtracted;
                        break;
                    } catch {
                    }
                    sEphem = this.makeNewKey(true);// randomBytes.default(32);
                }
                if (k >= nTries) {
                    throw new ReceivingPubKeyGenerationFailed("Could not generate receiving public key");
                }

                r.pkTo = pkSendTo;
                const idTo = hash160(r.pkTo!);//.GetID();

                if (sx!.prefix.number_bits > 0) {
                    r.nStealthPrefix = this.fillStealthPrefix(sx!.prefix.number_bits, sx!.prefix.bitfield);
                }
                /*} else {
                    errorMsg = "RINGCT Outputs - Only able to send to stealth address for now.";
                    return false;
                }*/

                r.sEphem = sEphem;
            }
        }

        return true;
    }

    private static buildChangeData(chainParams: Chainparams, vecSend: Array<CTempRecipient>, nChangePositionOut: NumPass, nFeeReturned: NumPass, nChange: number, changeDestination: CTxDestination) {

        // Insert a sender-owned 0 value output that becomes the change output if needed
        // Fill an output to ourself
        const recipient = new CTempRecipient();
        recipient.nType = OutputTypes.OUTPUT_RINGCT;
        recipient.fChange = true;
        //sEphem = ECPair.makeRandom().privateKey!;//MakeNewKey
        //recipient.sEphem.MakeNewKey(true);
        recipient.sEphem = this.makeNewKey(true);// ECPair.makeRandom({ compressed: true }).privateKey!.subarray(0);

        recipient.address = changeDestination;

        if (recipient.address.type == OutputTypes.OUTPUT_RINGCT) {
            const sx = recipient.address.stealthAddress;
            //CStealthAddress sx = boost:: get<CStealthAddress>(recipient.address);
            //CKey keyShared;
            //ec_point pkSendTo;

            let keyShared: Buffer | undefined;
            let pkSendTo: Buffer | undefined;
            let k = 0;
            const nTries = 24;
            for (k = 0; k < nTries; ++k) {
                try {
                    //if (StealthSecret(recipient.sEphem, sx.scan_pubkey, sx.spend_pubkey, keyShared, pkSendTo) == 0)
                    const res = Stealth.stealthSecret(recipient.sEphem!, sx?.scan_pubkey!, sx?.spend_pubkey!);
                    keyShared = res.sShared;
                    pkSendTo = res.pkExtracted;
                    break;
                } catch {
                }
                recipient.sEphem = this.makeNewKey(true);
            }

            if (k >= nTries) {
                throw new ReceivingPubKeyGenerationFailed("Could not generate receiving public key");
            }

            const ecpairl = ECPair.fromPrivateKey(recipient.sEphem);
            try {
                const pkEphem = ecpairl.publicKey;
                if (pkEphem.length == 0) throw new Error();
            } catch {
                throw new InvalidEphemeralPubKey("Ephemeral pubkey is not valid");
            }

            recipient.pkTo = pkSendTo;// CPubKey(pkSendTo);

            const idTo = hash160(recipient.pkTo!);//.GetID();
            recipient.scriptPubKey = this.getScriptForDestinationKeyId(idTo);

        } else {
            throw new ChangeAddressIsNotStealth("Change address wasn't of CStealthAddress Type");
            //return false;
        }

        if (nChange > chainParams.minRelayTxFee!.getFee(2048)) {
            recipient.setAmount(nChange);
        } else {
            recipient.setAmount(0);
            nFeeReturned.num += nChange;
        }

        if (nChangePositionOut.num < 0) {
            nChangePositionOut.num = this.getRandInt(vecSend.length + 1);
        } else {
            nChangePositionOut.num = nChangePositionOut.num < vecSend.length ? nChangePositionOut.num : vecSend.length;// std::min(nChangePositionOut, (int) vecSend.length);
        }

        if (nChangePositionOut.num < vecSend.length && vecSend[nChangePositionOut.num].nType == OutputTypes.OUTPUT_DATA) {
            nChangePositionOut.num++;
        }

        vecSend.splice(nChangePositionOut.num, 0, recipient);
        //vecSend.insert(vecSend.begin() + nChangePositionOut, recipient);



        return true;
    }

    private static getScriptForDestinationKeyId(keyId: Buffer) {
        const targetBuf = Buffer.alloc(1024, 0);
        const writer = new BufferWriter(targetBuf, 0);
        writer.writeUInt8(opcodetype.OP_DUP);
        writer.writeUInt8(opcodetype.OP_HASH160);
        writer.writeSlice(keyId); // 20 bytes
        writer.writeUInt8(opcodetype.OP_EQUALVERIFY);
        writer.writeUInt8(opcodetype.OP_CHECKSIG);
        return writer.buffer.subarray(0, writer.offset);;
    }

    private static setStealthMask(nBits: number /*uint8_t */) //uint32_t
    {
        return (nBits == 32 ? 0xFFFFFFFF : ((1 << nBits) - 1));
    }

    private static fillStealthPrefix(nBits: number /* uint8_t */, nBitfield: number /* uint32_t */) //uint32_t
    {
        let prefix: number = 0;
        let mask = this.setStealthMask(nBits);

        const bytes = randomBytes.default(4);
        const dv = new DataView(new Uint8Array(bytes).buffer);
        prefix = dv.getUint32(0);
        //GetStrongRandBytes((uint8_t *) & prefix, 4);

        prefix &= (~mask);
        prefix |= nBitfield & mask;
        return prefix;
    }

    private static selectSpendableTxForValue(nValueOut: number, vSpendableTx: Array<CWatchOnlyTxWithIndex>, strategyUseSingleTxPriority: boolean) {//bool
        const res: SpendableTxForValue = {
            vSpendTheseTx: [], // vSpendTheseTx
            nChange: 0
        };
        let currentMinimumChange = 0;
        let tempsingleamountchange = 0;
        let tempmultipleamountchange = 0;

        let fSingleInput = false;
        let fMultipleInput = false;



        // TODO - this can be improved, but works for now

        for (const tx of vSpendableTx) {
            //LogPrintf("tx amounts %d, ", tx.nAmount);
            //console.log(`tx amounts ${tx.getRingCtOut()?.getAmount()!}`);
            if (tx.getRingCtOut()?.getAmount()! > nValueOut) {
                tempsingleamountchange = Number(tx.getRingCtOut()?.getAmount()!) - nValueOut;
                if ((tempsingleamountchange < currentMinimumChange || currentMinimumChange == 0) && tempsingleamountchange > 0) {
                    res.vSpendTheseTx = [];
                    fSingleInput = true;
                    res.vSpendTheseTx.push(tx);
                    currentMinimumChange = tempsingleamountchange;
                }
            }
        }

        if (!fSingleInput || !strategyUseSingleTxPriority) {
            res.vSpendTheseTx = [];
            // We can use a single input for this transaction
            let currentSelected = 0;
            for (const tx of vSpendableTx) {
                currentSelected += Number(tx.getRingCtOut()?.getAmount()!);
                res.vSpendTheseTx.push(tx);
                if (currentSelected > nValueOut) {
                    tempmultipleamountchange = currentSelected - nValueOut;
                    fMultipleInput = true;
                    break;
                }
            }
        }

        //LogPrintf("nValueOut %d, ", nValueOut);

        if (fSingleInput && !(fMultipleInput && !strategyUseSingleTxPriority)) {
            res.nChange = tempsingleamountchange;
        } else if (fMultipleInput) {
            res.nChange = tempmultipleamountchange;
        } else {
            throw new SelectSpendableTxForValueFailed("selectSpendableTxForValue failed")
        }

        return res;
    }

    private static getRand(nMax: bigint) {//uint64_t
        if (nMax == 0n)
            return 0n;

        // The range of the random source must be a multiple of the modulus
        // to give every possible output value an equal possibility
        const nRange = (18446744073709551615n / BigInt(nMax)) * BigInt(nMax); //std::numeric_limits<uint64_t>:: max()
        let nRand = 0n;
        do {
            const bytes = randomBytes.default(8);
            const dv = new DataView(new Uint8Array(bytes).buffer);
            nRand = dv.getBigUint64(0);
            //GetRandBytes((unsigned char *) & nRand, sizeof(nRand));
        } while (nRand >= nRange);
        return (nRand % nMax);
    }

    private static getRandInt(nMax: number) {
        return Number(this.getRand(BigInt(nMax)));
    }

    private static setCTOutVData(txout: CTxOutCT, pkEphem: Buffer, nStealthPrefix: number) {
        const vData = Buffer.alloc(nStealthPrefix > 0 ? 38 : 33);
        const writer = new BufferWriter(vData);
        writer.writeSlice(pkEphem.subarray(0, 33));

        if (nStealthPrefix > 0) {
            writer.writeUInt8(DataOutputTypes.DO_STEALTH_PREFIX);
            writer.writeUInt32(nStealthPrefix);
        }
        txout.vData = writer.buffer.subarray(0, writer.offset);
    }

    private static createOutputRingCT(cmpPubKeyTo: Buffer, nStealthPrefix: number, pkEphem: Buffer) {
        const txbout = new CTxOutRingCTOr();
        const txout: CTxOutRingCTOr = txbout;
        txout.pk = cmpPubKeyTo;
        this.setCTOutVData(txout, pkEphem, nStealthPrefix);
        return txbout;
    }

    private static createOutput(r: CTempRecipient) {// int    
        let txbout: CTxOutBase | undefined;
        switch (r.nType) {
            case OutputTypes.OUTPUT_DATA:
                txbout = new CTxOutData(r.vData!);
                break;
            case OutputTypes.OUTPUT_STANDARD:
                txbout = new CTxOutStandard(r.nAmount!, r.scriptPubKey!);
                break;
            case OutputTypes.OUTPUT_CT:
                {
                    txbout = new CTxOutCT(undefined);
                    const txout: CTxOutCT = txbout;

                    if (r.fNonceSet) {
                        if (r.vData?.length ?? 0 < 33) {
                            throw new MissingEphemeralValue(`Missing ephemeral value, vData size ${r.vData?.length}`);
                        }
                        txout.vData = r.vData;
                    } else {
                        let pkEphem: Buffer | undefined;
                        const ecpairl = ECPair.fromPrivateKey(r.sEphem!);
                        try {
                            pkEphem = ecpairl.publicKey;
                            if (pkEphem.length == 0) throw new Error();
                        } catch {
                            throw new InvalidEphemeralPubKey("Ephemeral pubkey is not valid");
                        }
                        this.setCTOutVData(txout, pkEphem, r.nStealthPrefix ?? 0);
                    }

                    txout.scriptPubKey = r.scriptPubKey;
                }
                break;
            case OutputTypes.OUTPUT_RINGCT:
                {
                    let pkEphem: Buffer | undefined;
                    const ecpairl = ECPair.fromPrivateKey(r.sEphem!);
                    try {
                        pkEphem = ecpairl.publicKey;
                        if (pkEphem.length == 0) throw new Error();
                    } catch {
                        throw new InvalidEphemeralPubKey("Ephemeral pubkey is not valid");
                    }
                    txbout = this.createOutputRingCT(r.pkTo!, r.nStealthPrefix ?? 0, pkEphem);
                }
                break;
            default:
                throw new UnknownOutputType(`Unknown output type ${r.nType}`);
        }

        return txbout;
    }

    private static countLeadingZeros(nValueIn: bigint) { //int
        let nZeros = 0;

        for (let i = 0; i < 64; ++i, nValueIn >>= 1n) {// TO-DO?
            if ((nValueIn & 1n))
                break;
            nZeros++;
        };

        return nZeros;
    }

    private static countTrailingZeros(nValueIn: bigint) { //int
        let nZeros = 0;

        let mask = (1n) << 63n;
        for (let i = 0; i < 64; ++i, nValueIn <<= 1n) {
            if ((nValueIn & mask))
                break;
            nZeros++;
        };

        return nZeros;
    }

    private static ipow(base: bigint, exp: bigint) //int64_t
    {
        let result = 1n;
        while (exp) {
            if (exp & 1n)
                result *= base;
            exp >>= 1n;
            base *= base;
        };
        return result;
    };

    private static selectRangeProofParameters(nValueIn: number, minValue: NumPass, exponent: NumPass, nBits: NumPass) { // int
        let nLeadingZeros = Number(this.countLeadingZeros(BigInt(nValueIn)));
        let nTrailingZeros = Number(this.countTrailingZeros(BigInt(nValueIn)));

        let nBitsReq = 64 - nLeadingZeros - nTrailingZeros;

        nBits.num = 32;

        // TODO: output rangeproof parameters should depend on the parameters of the inputs
        // TODO: drop low value bits to fee

        if (nValueIn == 0) {
            exponent.num = this.getRandInt(5);
            if (this.getRandInt(10) == 0) // sometimes raise the exponent
                nBits.num += this.getRandInt(5);
            return 0;
        };


        let nTest = nValueIn;
        let nDiv10 = 0; // max exponent
        for (nDiv10 = 0; nTest % 10 == 0; nDiv10++, nTest /= 10);


        // TODO: how to pick best?

        const eMin = nDiv10 / 2;
        exponent.num = parseInt((eMin + this.getRandInt(parseInt((nDiv10 - eMin).toString()))).toString());


        nTest = nValueIn / Number(this.ipow(10n, BigInt(exponent.num)));

        nLeadingZeros = this.countLeadingZeros(BigInt(nTest));
        nTrailingZeros = this.countTrailingZeros(BigInt(nTest));

        nBitsReq = 64 - nTrailingZeros;


        if (nBitsReq > 32) {
            nBits.num = nBitsReq;
        };

        // make multiple of 4
        while (nBits.num < 63 && nBits.num % 4 != 0)
            nBits.num++;

        return 0;
    }

    private static lightWalletAddCTData(txNew: CMutableTransaction, vecSend: Array<CTempRecipient>, nFeeReturned: NumPass, nValueOutPlain: NumPass, nChangePositionOut: NumPass, nSubtractFeeFromAmount: number) {
        const fFirst: BoolPass = {
            bool: false
        };
        for (let i = 0; i < vecSend.length; ++i) {
            const recipient = vecSend[i];

            // TODO - do we need this if fSubtractFeeFromAmount is never true? Keep this as we might enable that feature later
            // Only need to worry about this if fSubtractFeeFromAmount is true, which it isn't
            recipient.applySubFee(nFeeReturned.num, nSubtractFeeFromAmount, fFirst);

            const txbout = this.createOutput(recipient);

            if (recipient.nType == OutputTypes.OUTPUT_STANDARD) {
                nValueOutPlain.num += recipient.nAmount ?? 0;
            }

            if (recipient.fChange && recipient.nType == OutputTypes.OUTPUT_RINGCT) {
                nChangePositionOut.num = i;
            }

            recipient.n = txNew.vpout.length;
            txNew.vpout.push(txbout!);
            if (recipient.nType == OutputTypes.OUTPUT_RINGCT) {
                if (recipient.vBlind?.length != 32) {
                    recipient.vBlind = Buffer.alloc(32)//resize(32);
                    const bytes = randomBytes.default(32);
                    recipient.vBlind = bytes;
                }

                //TODO  Can we take advantage of the AddCTData function? It looks like it is the exact same code, copy pasted
                //ADD CT DATA
                {
                    const txboutRCT: CTxOutRingCTOr = txbout!;
                    let pCommitment = txboutRCT.commitment;
                    let pvRangeproof = txboutRCT.vRangeproof;

                    /*if (!pCommitment) {// || !pvRangeproof) {
                        throw new Error("Unable to get CT pointers for output type");
                    }*/
                    pCommitment = Buffer.alloc(32);

                    const nValue = recipient.nAmount;
                    //const rustsecp256k1_v0_4_1_generator *gen = rustsecp256k1_v0_4_1_generator_h;
                    const pcres = ecc.pedersenCommit(pCommitment, recipient.vBlind, BigInt(nValue!));
                    if (pcres == null) {
                        throw new PedersenCommitFailed("Pedersen commit failed");
                    }
                    pCommitment = Buffer.from(pcres.commitment);

                    let nonce: Buffer | undefined;
                    if (recipient.fNonceSet) {
                        nonce = recipient.nonce;
                    } else {
                        // TO-DO
                        /*if (!recipient.sEphem.IsValid()) {
                            errorMsg = "Invalid ephemeral key.";
                            return false;
                        }
                        if (!recipient.pkTo.IsValid()) {
                            errorMsg = "Invalid recipient public key.";
                            return false;
                        }*/
                        //nonce = recipient.sEphem.ECDH(recipient.pkTo);
                        const nonceRes = ecc.ECDH_VEIL(recipient.pkTo!, recipient.sEphem!)
                        const hasher = new Hash();
                        hasher.update(nonceRes!, 32);
                        const nonceHashed = hasher.digest();
                        //recipient.fNonceSet = true; //TO-DO
                        recipient.nonce = Buffer.from(nonceHashed);
                        nonce = recipient.nonce;
                    }

                    const message = Buffer.from(recipient.sNarration ?? "");
                    const mlen = message.length;

                    const nRangeProofLen = 5134;
                    //pvRangeproof.resize(nRangeProofLen);
                    pvRangeproof = Buffer.alloc(nRangeProofLen);

                    let min_value_ref: NumPass = {
                        num: 0
                    }; //uint64_t
                    let ct_exponent_ref: NumPass = {
                        num: 2
                    }; //int
                    let ct_bits: NumPass = {
                        num: 32
                    }; //int

                    if (0 != this.selectRangeProofParameters(nValue!, min_value_ref, ct_exponent_ref, ct_bits)) {
                        throw new FailedToSelectRangeProofParameters("Failed to select range proof parameters.");
                    }

                    if (recipient.fOverwriteRangeProofParams == true) {
                        min_value_ref.num = recipient.min_value ?? 0;
                        ct_exponent_ref.num = recipient.ct_exponent ?? 0;
                        ct_bits.num = recipient.ct_bits ?? 0;
                    }

                    const rpres = ecc.rangeproofSign(pvRangeproof, nRangeProofLen, BigInt(min_value_ref.num), pCommitment, recipient.vBlind, nonce!, ct_exponent_ref.num, ct_bits.num, BigInt(nValue!), message, mlen);
                    if (rpres == null) {
                        throw new FailedToSignRangeProof("Failed to sign range proof.");
                    }

                    pvRangeproof = Buffer.from(rpres.proof);

                    /*if (1 != secp256k1_rangeproof_sign(secp256k1_ctx_blind,
                                                   & (* pvRangeproof)[0], & nRangeProofLen,
                        min_value_ref.num, pCommitment,
                                                   & recipient.vBlind[0], nonce.begin(),
                        ct_exponent, ct_bits, nValue,
                        (const unsigned char *) message, mlen,
                        nullptr, 0, secp256k1_generator_h)) {
                    }*/
                    //pvRangeproof = resizeBuf(pvRangeproof, nRangeProofLen);
                    //pvRangeproof.resize(nRangeProofLen);
                    txboutRCT.vRangeproof = pvRangeproof;
                    txboutRCT.commitment = pCommitment;
                    const xt = ecc.rangeProofVerify(txboutRCT.commitment, txboutRCT.vRangeproof);
                    if (xt != 1) {
                        throw new FailedToSignRangeProof("Failed to sign range proof.");
                    }

                }
            }
        }

        return true;
    }

    private static lightWalletAddRealOutputs(txNew: CMutableTransaction, vSelectedTxes: Array<CWatchOnlyTxWithIndex>, vInputBlinds: Array<Buffer>, vSecretColumns: Array<number>, vMI: Array<Array<Array<number>>>) {
        const setHave: Array<number> = [];//sort        
        let nTotalInputs = 0;
        for (let l = 0; l < txNew.vin.length; ++l) { // Must add real outputs to setHave before picking decoys
            const txin = txNew.vin[l];
            let nSigInputs: NumPass = { num: 0 };
            let nSigRingSize: NumPass = { num: 0 };
            txin.getAnonInfo(nSigInputs, nSigRingSize);

            //vInputBlinds[l] = Buffer.from(vInputBlinds[l], 32 * nSigInputs.num);
            vInputBlinds[l] = resizeBuf(vInputBlinds[l], 32 * nSigInputs.num);
            //vInputBlinds[l].resize(32 * nSigInputs);

            //vCoins<txid, array index>
            const vCoins: Array<CWatchOnlyTxWithIndex> = [];
            for (let i = nTotalInputs; i < nTotalInputs + nSigInputs.num; i++) {
                vCoins.push(vSelectedTxes[i]);
            }
            nTotalInputs += nSigInputs.num;
            //const currentSize = /*nTotalInputs +*/ nSigInputs.num;

            // Placing real inputs
            {
                if (nSigRingSize.num < 3 || nSigRingSize.num > 32) {
                    throw new RingSizeOutOfRange("Ring size out of range");
                }

                vSecretColumns[l] = this.getRandInt(nSigRingSize.num);

                vMI[l] = resizeNumArr(vMI[l], vCoins.length);
                //vMI[l].resize(currentSize);

                for (let k = 0; k < vCoins.length/*vSelectedTxes.length*/; ++k) {
                    vMI[l][k] = resize(vMI[l][k], nSigRingSize.num, 0);
                    //vMI[l][k].resize(nSigRingSize);
                    for (let i = 0; i < nSigRingSize.num; ++i) {
                        if (i == vSecretColumns[l]) {
                            const vSelectedTx = vCoins[k];
                            const coin = vSelectedTx;
                            const txhash = vSelectedTx.getTxHash();

                            const pk = vSelectedTx.getRingCtOut()?.getPubKey();
                            //CCmpPubKey pk = vSelectedTxes[k].ringctout.pk;
                            //    memcpy(& vInputBlinds[l][k * 32], & vSelectedTxes[k].blind, 32);
                            /*for (let ctr = 0; ctr < 32; ctr++) {
                                vInputBlinds[l][k * 32] = pk![i];
                            }*/
                            //vInputBlinds[l].set(pk!.subarray(0, 32), k * 32);//1,33?
                            vInputBlinds[l].set(vSelectedTx.getRingCtOut()?.getBlind()!, k * 32);

                            const index = vSelectedTx.getRingCtIndex()!;

                            if (setHave.indexOf(index) !== -1) {
                                throw new DuplicateIndexFound("Duplicate index found");
                            }

                            vMI[l][k][i] = index;
                            setHave.push(index);
                        }
                    }
                }
            }
        }
        return true;
    }

    private static lightWalletFillInDummyOutputs(txNew: CMutableTransaction, vDummyOutputs: Array<CLightWalletAnonOutputData>, vSecretColumns: Array<number>, vMI: Array<Array<Array<number>>>) {
        // Fill in dummy signatures for fee calculation.
        let nCurrentLocation = 0;
        for (let l = 0; l < txNew.vin.length; ++l) {
            const txin = txNew.vin[l];
            let nSigInputs: NumPass = { num: 0 };
            let nSigRingSize: NumPass = { num: 0 };
            txin.getAnonInfo(nSigInputs, nSigRingSize);

            // Place Hiding Outputs
            {

                //let nCurrentLocation = 0;
                for (let k = 0; k < vMI[l].length; ++k) {
                    for (let i = 0; i < nSigRingSize.num; ++i) {
                        if (i == vSecretColumns[l]) {
                            continue;
                        }
                        //console.log(`looking at vector index :${nCurrentLocation}, setting index for dummy: ${vDummyOutputs[nCurrentLocation].getIndex()}`);
                        //LogPrintf("looking at vector index :%d, setting index for dummy: %d\n", nCurrentLocation, vDummyOutputs[nCurrentLocation].index);
                        vMI[l][k][i] = vDummyOutputs[nCurrentLocation].getIndex()!;
                        nCurrentLocation++;
                    }
                }
            }

            const buf = Buffer.alloc(20000);//???
            const writer = new BufferWriter(buf);

            for (let k = 0; k < nSigInputs.num; ++k)
                for (let i = 0; i < nSigRingSize.num; ++i) {
                    //writer.writeVarInt(vMI[l][k][i]);
                    writer.writeSlice(putVarInt(vMI[l][k][i]));
                }
            const vPubkeyMatrixIndices = writer.buffer.subarray(0, writer.offset);

            const vKeyImages = Buffer.alloc(33 * nSigInputs.num);

            txin.scriptData.stack.push(vKeyImages);
            txin.scriptWitness.stack.push(vPubkeyMatrixIndices);

            const vDL = Buffer.alloc((1 + (nSigInputs.num + 1) * nSigRingSize.num) *
                32 // extra element for C, extra row for commitment row
                + (txNew.vin.length > 1 ? 33
                    : 0)); // extra commitment for split value if multiple sigs
            txin.scriptWitness.stack.push(vDL);
        }
    }

    private static lightWalletUpdateChangeOutputCommitment(txNew: CMutableTransaction, vecSend: Array<CTempRecipient>, nChangePositionOut: NumPass, vpOutCommits: Array<Buffer>, vpOutBlinds: Array<Buffer>) {
        // Update the change output commitment
        for (let i = 0; i < vecSend.length; ++i) {
            const r = vecSend[i];

            if (i == nChangePositionOut.num) {
                // Change amount may have changed

                if (r.nType != OutputTypes.OUTPUT_RINGCT) {
                    throw new ChangeAddressIsNotStealth("Change output is not RingCT type.");
                }

                if (r.vBlind?.length != 32) {
                    r.vBlind = randomBytes.default(32);
                    //GetStrongRandBytes(& r.vBlind[0], 32);
                }


                {
                    const txout = txNew.vpout[r.n ?? 0] as CTxOutCT;//CTxOutBase

                    let pCommitment = txout.commitment;
                    let pvRangeproof = txout.vRangeproof;//GetPRangeproof

                    if (!pCommitment || !pvRangeproof) {
                        throw new FailedToGetCTPointersForOutputType("Unable to get CT pointers for output type");
                    }

                    let nValue = r.nAmount;
                    const pdcRes = ecc.pedersenCommit(pCommitment, r.vBlind, BigInt(nValue!));
                    if (pdcRes == null) {
                        throw new PedersenCommitFailed("Pedersen commit failed.");
                    }
                    pCommitment = Buffer.from(pdcRes.commitment);
                    txout.commitment = pCommitment;//!!!!

                    let nonce = Buffer.alloc(32);
                    if (r.fNonceSet) {
                        nonce = r.nonce!;
                    } else {
                        //TO-DO
                        /*if (!r.sEphem.IsValid()) {
                            errorMsg = "Invalid ephemeral key";
                            return false;
                        }
                        if (!r.pkTo.IsValid()) {
                            errorMsg = "Invalid recipient public key";
                            return false;
                        }*/
                        const preNonce = ecc.ECDH_VEIL(r.pkTo!, r.sEphem!);

                        const hasher = new Hash();
                        hasher.update(preNonce!, 32);
                        nonce = Buffer.from(hasher.digest());
                        r.nonce = nonce;
                    }

                    const message = Buffer.from(r.sNarration ?? "");
                    const mlen = message?.length ?? 0;
                    const nRangeProofLen = 5134;
                    pvRangeproof = pvRangeproof.subarray(0, nRangeProofLen);

                    const min_value: NumPass = { num: 0 };
                    const ct_exponent: NumPass = { num: 2 };
                    const ct_bits: NumPass = { num: 32 };

                    if (0 != this.selectRangeProofParameters(nValue!, min_value, ct_exponent, ct_bits)) {
                        throw new FailedToSelectRangeProofParameters("Failed to select range proof parameters.");
                    }

                    if (r.fOverwriteRangeProofParams == true) {
                        min_value.num = r.min_value!;
                        ct_exponent.num = r.ct_exponent!;
                        ct_bits.num = r.ct_bits!;
                    }

                    const rpres = ecc.rangeproofSign(pvRangeproof, nRangeProofLen, BigInt(min_value.num), pCommitment, r.vBlind, nonce!, ct_exponent.num, ct_bits.num, BigInt(nValue!), message, mlen);
                    if (rpres == null) {
                        throw new FailedToSignRangeProof("Failed to sign range proof.");
                    }
                    //pvRangeproof = resizeBuf(pvRangeproof, nRangeProofLen);
                    pvRangeproof = Buffer.from(rpres.proof!);
                    txout.vRangeproof = pvRangeproof;
                    const xt = ecc.rangeProofVerify(txout.commitment, txout.vRangeproof);
                    if (xt != 1) {
                        throw new FailedToSignRangeProof("Failed to sign range proof.");
                    }
                }
            }

            if (r.nType == OutputTypes.OUTPUT_CT || r.nType == OutputTypes.OUTPUT_RINGCT) {
                const txCt: CTxOutCT = txNew.vpout[r.n!];
                vpOutCommits.push(txCt.commitment!);//  -> GetPCommitment() -> data);
                vpOutBlinds.push(r.vBlind!);
            }
        }

        return true;
    }


    private static lightWalletInsertKeyImages(txNew: CMutableTransaction, vSigningKeys: Record<number, Buffer>, vSelectedTxes: Array<CWatchOnlyTxWithIndex>, vSecretColumns: Array<number>, vMI: Array<Array<Array<number>>>, spend_pubkey: Buffer, scan_secret: Buffer, spend_secret: Buffer) {
        let rv = 0;
        for (let l = 0; l < txNew.vin.length; ++l) {
            const txin = txNew.vin[l];

            const nSigInputs: NumPass = { num: 0 };
            const nSigRingSize: NumPass = { num: 0 };
            txin.getAnonInfo(nSigInputs, nSigRingSize);

            let vKeyImages = txin.scriptData.stack[0];
            const vkiTemp = Buffer.alloc(33 * nSigInputs.num);
            vkiTemp.set(vKeyImages, 0);
            vKeyImages = vkiTemp;

            for (let k = 0; k < nSigInputs.num; ++k) {
                const i = vSecretColumns[l];
                const nIndex = vMI[l][k][i];

                let vchEphemPK = Buffer.alloc(33);
                let foundTx: CWatchOnlyTxWithIndex | undefined = undefined;

                for (const tx of vSelectedTxes) {
                    if (tx.getRingCtIndex() == nIndex) {
                        //vchEphemPK = Buffer.from(tx.getRingCtOut()!.getVData()!, 33);
                        vchEphemPK = resizeBuf(tx.getRingCtOut()!.getVData()!, 33);
                        //memcpy(& vchEphemPK[0], & tx.ringctout.vData[0], 33);
                        //LogPrintf("Found the correct outpoint to generate vchEphemPK for index %d\n", nIndex);
                        //console.log(`Found the correct outpoint to generate vchEphemPK for index ${nIndex}`);
                        foundTx = tx;
                        break;
                    }
                }

                /*CKey sShared;
                ec_point pkExtracted;
                ec_point ecPubKey;
                    SetPublicKey(spend_pubkey, ecPubKey);*/
                //const ecPubKey = Stealth.setPublicKey(spend_pubkey);

                const keyDestination = this.getDestinationKeyForOutput(foundTx!, spend_secret, scan_secret, spend_pubkey);
                if (keyDestination.length == 0)
                    throw new KeyImagesFailed("Failed on keyimages");
                vSigningKeys[foundTx!.getRingCtIndex()!] = keyDestination;

                // Keyimage is required for the tx hash
                const keyImage = ecc.getKeyImage(foundTx!.getRingCtOut()?.getPubKey()!, keyDestination);
                if (keyImage == null) {
                    throw new KeyImagesFailed("Failed to get keyimage");
                }

                vKeyImages.set(keyImage, k * 33);
            }

            txin.scriptData.stack[0] = vKeyImages;
        }

        return true;
    }

    private static lightWalletSignAndVerifyTx(txNew: CMutableTransaction, vInputBlinds: Array<Buffer>, vpOutCommits: Array<Buffer>, vpOutBlinds: Array<Buffer>, vSplitCommitBlindingKeys: Array<Buffer>, vSigningKeys: Record<number, Buffer>, vDummyOutputs: Array<CLightWalletAnonOutputData>, vSelectedTx: Array<CWatchOnlyTxWithIndex>, vSecretColumns: Array<number>, vMI: Array<Array<Array<number>>>) {
        let nTotalInputs = 0;
        let rv = 0;

        for (let l = 0; l < txNew.vin.length; ++l) {
            const txin = txNew.vin[l];

            let nSigInputs: NumPass = { num: 0 };
            let nSigRingSize: NumPass = { num: 0 };
            txin.getAnonInfo(nSigInputs, nSigRingSize);

            const nCols = nSigRingSize;
            const nRows = nSigInputs.num + 1;

            const randSeed = randomBytes.default(32);

            const vsk: Array<Buffer> = createArrayBuf(nSigInputs.num, 32);
            const vpsk: Array<Buffer> = createArrayBuf(nSigInputs.num, 32);

            let vm = Buffer.alloc(nCols.num * nRows * 33);
            const vCommitments: Array<Buffer> = createArrayBuf(nCols.num * nSigInputs.num, 33);
            //vCommitments.fill(ebuf, 0, nCols.num * nSigInputs.num);
            //std:: vector < secp256k1_pedersen_commitment > vCommitments;
            //vCommitments.reserve(nCols * nSigInputs);

            const vpInCommits: Array<Buffer> = createArrayBuf(nCols.num * nSigInputs.num, 33); // TO-DO
            //vpsk.fill(ebuf, 0, nCols.num * nSigInputs.num);
            //std:: vector <const uint8_t *> vpInCommits(nCols * nSigInputs);

            let vpBlinds: Array<Buffer> = [];
            //std:: vector <const uint8_t *> vpBlinds;


            let vKeyImages = txin.scriptData.stack[0];

            //LogPrintf("nSigInputs %d , nCols %d\n", nSigInputs, nCols);
            //console.log(`nSigInputs ${nSigInputs.num} , nCols ${nCols.num}`);
            for (let k = 0; k < nSigInputs.num; ++k) {
                for (let i = 0; i < nCols.num; ++i) {
                    const nIndex = vMI[l][k][i];

                    // Actual output
                    if (i == vSecretColumns[l]) {
                        let fFoundKey = false;
                        for (const index in vSigningKeys) {
                            const first = Number(index);
                            const second = vSigningKeys[index]
                            if (first == nIndex) {
                                vsk[k] = second;
                                fFoundKey = true;
                                break;
                            }
                        }

                        if (!fFoundKey) {
                            throw new NoKeyFoundForIndex("No key for index");
                            //return false;
                        }

                        vpsk[k] = vsk[k];

                        vpBlinds.push(vInputBlinds[l].subarray(k * 32, k * 32 + 32));//vInputBlinds[l][k * 32]);

                        let fFound = false;
                        for (const tx of vSelectedTx) {
                            if (tx.getRingCtIndex() == nIndex) {
                                fFound = true;
                                const pk = tx.getRingCtOut()?.getPubKey();
                                vm.set(pk!, (i + k * nCols.num) * 33);
                                //memcpy(& vm[(i + k * nCols) * 33], tx.ringctout.pk.begin(), 33);
                                vCommitments.push(tx.getRingCtOut()!.getCommitment()!);
                                vpInCommits[i + k * nCols.num] = vCommitments[vCommitments.length - 1];
                                break;
                            }
                        }

                        if (!fFound) {
                            throw new NoPubKeyFound("No pubkey found for real output");
                            //return false;
                        }
                    } else {
                        let fFound = false;
                        for (const item of vDummyOutputs) {
                            if (item.getIndex() == nIndex) {
                                fFound = true;
                                const pk = item.getOutput()?.getPubKey();
                                vm.set(pk!, (i + k * nCols.num) * 33);
                                //memcpy(& vm[(i + k * nCols) * 33], item.output.pubkey.begin(), 33);
                                vCommitments.push(item.getOutput()?.getCommitment()!);
                                vpInCommits[i + k * nCols.num] = vCommitments[vCommitments.length - 1];
                                break;
                            }
                        }

                        if (!fFound) {
                            //LogPrintf("Couldn't find dummy index for nIndex=%d\n", nIndex);
                            throw new NoPubKeyFound("No pubkey found for dummy output");
                            //return false;
                        }
                    }
                }
            }

            let blindSum = Buffer.alloc(32, 0);
            vpsk[nRows - 1] = blindSum;

            let vDL = txin.scriptWitness.stack[1];

            if (txNew.vin.length == 1) {
                const tmpvDL = Buffer.alloc((1 + (nSigInputs.num + 1) * nSigRingSize.num) * 32);
                tmpvDL.set(vDL, 0);
                vDL = tmpvDL;
                //vDL = Buffer.from(vDL, (1 + (nSigInputs.num + 1) * nSigRingSize.num) * 32);
                //vDL.resize((1 + (nSigInputs + 1) * nSigRingSize) * 32); // extra element for C, extra row for commitment row
                vpBlinds = vpBlinds.concat(vpOutBlinds);
                //vpBlinds.insert(vpBlinds.end(), vpOutBlinds.begin(), vpOutBlinds.end());

                const rprres = ecc.prepareMlsag(vm, blindSum, vpOutCommits.length, vpOutCommits.length, /*added */vpInCommits.length, vpBlinds.length, /*end */ nCols.num, nRows, vpInCommits, vpOutCommits, vpBlinds);
                rv = rprres != null ? 0 : 1;
                if (0 != rv) {
                    throw new FailedToPrepareMlsag("Failed to prepare mlsag");
                }
                vpsk[nRows - 1] = Buffer.from(rprres?.SK!); // reset to returned blindsum? from secp256k1_prepare_mlsag
                vm = Buffer.from(rprres?.M!); // reset vm to returned m from secp256k1_prepare_mlsag
            } else {
                // extra element for C extra, extra row for commitment row, split input commitment
                const tmpvDL = Buffer.alloc((1 + (nSigInputs.num + 1) * nSigRingSize.num) * 32 + 33);
                tmpvDL.set(vDL, 0);
                vDL = tmpvDL;
                //vDL = Buffer.from(vDL, (1 + (nSigInputs.num + 1) * nSigRingSize.num) * 32 + 33);
                //vDL.resize((1 + (nSigInputs + 1) * nSigRingSize) * 32 + 33);

                if (l == txNew.vin.length - 1) {
                    const vpAllBlinds = vpOutBlinds;

                    for (let k = 0; k < l; ++k) {
                        vpAllBlinds.push(vSplitCommitBlindingKeys[k]);
                    }
                    vSplitCommitBlindingKeys.push(Buffer.from("00", "hex"));

                    const res = ecc.pedersenBlindSum(vSplitCommitBlindingKeys[l], vpAllBlinds, vpAllBlinds.length, vpOutBlinds.length);

                    if (res == null) {
                        throw new PedersenBlindSumFailed("Pedersen blind sum failed.");
                    }
                    vSplitCommitBlindingKeys[l] = Buffer.from(res); // got from secp256k1_pedersen_blind_sum
                } else {
                    //ECPair.makeRandom().privateKey!;
                    //Buffer.alloc(32); - work for some reason
                    // TO-DO should be this.makeNewKey(true)
                    vSplitCommitBlindingKeys[l] = Buffer.alloc(32);//this.makeNewKey(true);// Buffer.alloc(32);// this.makeNewKey(true);// ECPair.makeRandom({ compressed: true }).privateKey!;//.MakeNewKey(true);
                }

                let nCommitValue = 0;
                for (let k = 0; k < nSigInputs.num; k++) {
                    const coin = vSelectedTx[nTotalInputs + k];
                    nCommitValue += Number(coin.getRingCtOut()!.getAmount());
                }

                nTotalInputs += nSigInputs.num;

                /*
                CAmount nCommitValue = 0;
                    for (size_t k = 0; k < nSigInputs; ++k) {
                        const auto &coin = setCoins[nTotalInputs+k];
                        const COutputRecord *oR = coin.first->second.GetOutput(coin.second);
                        nCommitValue += oR->GetAmount();
                    }

                    nTotalInputs += nSigInputs;
                */

                let splitInputCommit = Buffer.alloc(33);
                const commres = ecc.pedersenCommit(splitInputCommit, vSplitCommitBlindingKeys[l], BigInt(nCommitValue));

                if (commres == null) {
                    throw new PedersenCommitFailed("Pedersen commit failed.");
                }
                splitInputCommit = Buffer.from(commres?.commitment); // set from secp256k1_pedersen_commit
                vSplitCommitBlindingKeys[l] = Buffer.from(commres?.blind); // set from secp256k1_pedersen_commit

                vDL.set(splitInputCommit, (1 + (nSigInputs.num + 1) * nSigRingSize.num) * 32);
                //memcpy(& vDL[(1 + (nSigInputs + 1) * nSigRingSize) * 32], splitInputCommit.data, 33);
                vpBlinds.push(vSplitCommitBlindingKeys[l]);

                const pSplitCommits = [splitInputCommit];
                // size_t nOuts, size_t nBlinded, /* added */ size_t vpInCommitsLen, size_t vpBlindsLen, /* end */ size_t nCols, size_t nRows,
                const rprres = ecc.prepareMlsag(vm, blindSum, 1, 1, /*added */vpInCommits.length, vpBlinds.length, /*end */ nCols.num, nRows, vpInCommits, pSplitCommits, vpBlinds);
                rv = rprres != null ? 0 : 1;
                if (0 != rv) {
                    throw new FailedToPrepareMlsag("Failed to prepare mlsag with");
                }

                vpsk[nRows - 1] = Buffer.from(rprres?.SK!); // reset to returned blindsum? from secp256k1_prepare_mlsag
                vm = Buffer.from(rprres?.M!); // reset vm to returned m from secp256k1_prepare_mlsag

                vpBlinds.pop();
            }

            const hashOutputs = txNew.getOutputsHash();
            const res = ecc.generateMlsag(vKeyImages, vDL, vDL.subarray(32), randSeed, hashOutputs, nCols.num, nRows, vSecretColumns[l], vpsk.length, vpsk, vm);
            /*
            secp256k1_generate_mlsag(& vKeyImages[0], & vDL[0], & vDL[32],
                randSeed, hashOutputs, nCols, nRows, vSecretColumns[l], vpsk.length,
                vpsk, vm)
            */
            if (res == null) {
                throw new FailedToGenerateMlsag("Failed to generate mlsag");
            }
            vKeyImages = Buffer.from(res.KI);
            vDL.set(res.PC, 0);
            vDL.set(res.PS, 32);

            // Validate the mlsag
            rv = ecc.verifyMlsag(hashOutputs, nCols.num, nRows, vm, vKeyImages, vDL, vDL.subarray(32));
            if (0 != rv) {
                throw new FailedToGenerateMlsag("Failed to generate mlsag on initial generation");
            }

            txin.scriptData.stack[0] = vKeyImages;
            txin.scriptWitness.stack[1] = vDL;
        }

        return true;
    }

    private static makeNewKey(compressed: boolean) {
        let buf: Buffer;
        do {
            buf = randomBytes.default(32);
        } while (!ecc.seckeyVerify(buf));//  !Check(keydata.data()));     
        return buf;
    }

}