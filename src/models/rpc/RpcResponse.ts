import JsonRpcError from "./JsonRpcError";

export default interface RpcResponse {
    id?: string,
    error: JsonRpcError
}