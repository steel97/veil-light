import RpcResponse from "../RpcResponse";

export interface KeyImageResult {
    status: string,
    msg: string,
    spent: boolean,
    spentinmempool: boolean,
    txid: string | undefined
}

export interface CheckKeyImagesResponse extends RpcResponse {
    result: Array<KeyImageResult>
}