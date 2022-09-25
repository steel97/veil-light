export default interface PublishTransactionResult {
    txid: string | null,
    errorCode: number | null,
    message: string | null | undefined
}