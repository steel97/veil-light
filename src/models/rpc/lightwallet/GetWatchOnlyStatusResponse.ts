import RpcResponse from "../RpcResponse";

export interface WatchOnlyStatus {
    status: "failed" | "synced" | "scanning",
    stealth_address: string,
    transactions_found?: number
}

export interface GetWatchOnlyStatusResponse extends RpcResponse {
    result: WatchOnlyStatus
}