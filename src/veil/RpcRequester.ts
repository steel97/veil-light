import fetch from "node-fetch";
import RPCRequest from "../models/rpc/RpcRequest";

export default class RpcRequester {
    public static NODE_URL = "https://explorer-api.veil-project.com";
    public static async send<T>(request: RPCRequest) {
        const rawResponse = await fetch(RpcRequester.NODE_URL, {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify(request, (_, value) =>
                typeof value === "bigint"
                    ? parseInt(value.toString()) // because veil node expect integer
                    : value)
        });

        return (await rawResponse.json()) as T;
    }
}