import CMutableTransaction from "./core/CMutableTransaction";

const WITNESS_SCALE_FACTOR = 4;
const DEFAULT_BYTES_PER_SIGOP = 20;
const nBytesPerSigOp = DEFAULT_BYTES_PER_SIGOP;

export function getVirtualTransactionSizeRaw(nWeight: number, nSigOpCost: number) { // int64_t
    const compute = nSigOpCost * nBytesPerSigOp;
    return ((nWeight > compute ? nWeight : compute) + WITNESS_SCALE_FACTOR - 1) / WITNESS_SCALE_FACTOR;
}
export function getVirtualTransactionSize(tx: CMutableTransaction, nSigOpCost = 0) {
    return getVirtualTransactionSizeRaw(getTransactionWeight(tx), nSigOpCost);
}

// TO-DO
export function getSerializeSize(s: CMutableTransaction, t: number) {
    //return (CSizeComputer(s.GetType(), s.nVersion()) << t).size();
}

export function getTransactionWeight(tx: CMutableTransaction) {
    return 1;
    //return getSerializeSize(tx,)
    //return :: GetSerializeSize(tx, SER_NETWORK, PROTOCOL_VERSION | SERIALIZE_TRANSACTION_NO_WITNESS) * (WITNESS_SCALE_FACTOR - 1) + :: GetSerializeSize(tx, SER_NETWORK, PROTOCOL_VERSION);
}