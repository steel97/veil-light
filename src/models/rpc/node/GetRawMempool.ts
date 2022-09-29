import RpcResponse from "../RpcResponse";

export interface GetRawMempool extends RpcResponse {
    result: Array<string>
}