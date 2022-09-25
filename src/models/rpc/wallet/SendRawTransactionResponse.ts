import RpcResponse from "../RpcResponse";

export interface SendRawTransactionResponse extends RpcResponse {
    result: string;
}