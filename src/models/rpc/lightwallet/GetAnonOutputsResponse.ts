import RpcResponse from "../RpcResponse";

export interface AnonOutput {
    ringctindex: number,
    pubkey: string,
    commitment: string,
    tx_hash: string,
    tx_index: string,// number?
    blockheight: number,
    compromised: number,
    raw: string
}

export interface GetAnonOutputsResponse extends RpcResponse {
    result: Array<AnonOutput>
}