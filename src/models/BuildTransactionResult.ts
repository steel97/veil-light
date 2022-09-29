export default interface BuildTransactionResult {
    fee: number,
    txid: string | undefined,
    amountSent: number
}