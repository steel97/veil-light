import RpcResponse from "../RpcResponse";

export interface ImportLightwalletStatus {
    result: string,
    stealth_address_bech: string,
    stealth_address_normal: string,
    imported_on: bigint,
    created_on: bigint,
    watchonly: boolean
}

export interface ImportLightwalletAddressResponse extends RpcResponse {
    result: ImportLightwalletStatus
}