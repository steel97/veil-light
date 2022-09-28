import axios from "axios";
import RPCRequest from "../models/rpc/RpcRequest";

export default class RpcRequester {
    public static NODE_URL = "https://explorer-api.veil-project.com";
    public static NODE_PASSWORD = "";

    public static async send<T>(request: RPCRequest) {
        const rawResponse = await axios.post<T>(RpcRequester.NODE_URL, request, {
            headers: { 'Authorization': + `Basic ${RpcRequester.NODE_PASSWORD}` },
            withCredentials: true
        });
        return rawResponse.data;
    }
}