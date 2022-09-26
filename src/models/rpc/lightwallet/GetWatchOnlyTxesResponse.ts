import RpcResponse from "../RpcResponse";

export interface WatchOnlyTx {
    type: "stealth" | "anon",
    keyimage?: string,
    amount?: string, //??
    spent?: boolean,
    spent_in?: string,
    dbindex: number,

    n: number, // txindex
    // ringct
    ringct_index?: number//
    pubkey?: string,
    pubkey_hash?: string, // CBitcoinAddress
    // stealth
    scriptPubKey?: string,
    destination_bech32?: string,
    destination?: string,
    // common
    valueCommitment: string,
    data_hex: string

    raw: string
}

export interface GetWatchOnlyTxesResult {
    anon: Array<WatchOnlyTx>,
    stealth: Array<WatchOnlyTx>,
}

export interface GetWatchOnlyTxesResponse extends RpcResponse {
    result: GetWatchOnlyTxesResult
}