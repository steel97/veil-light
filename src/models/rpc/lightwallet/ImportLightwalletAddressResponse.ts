import RpcResponse from "../RpcResponse";

export interface ImportLightwalletStatus {
    result: string,
    stealth_address_bech: string,
    stealth_address_normal: string,
    imported_on: number,
    created_on: number,
    watchonly: boolean
}

export interface ImportLightwalletAddressResponse extends RpcResponse {
    result: ImportLightwalletStatus
}