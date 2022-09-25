export default interface RpcRequest {
    jsonrpc: string,
    id?: string,
    method: string,
    params: Array<any>
}