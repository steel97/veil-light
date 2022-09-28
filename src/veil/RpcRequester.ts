import axios from "axios";
import RPCRequest from "../models/rpc/RpcRequest";

export default class RpcRequester {
    public static NODE_URL = "https://explorer-api.veil-project.com";
    public static NODE_PASSWORD = "";

    public static async send<T>(request: RPCRequest) {
        let headers = {};
        let useCredentials = false;
        if (RpcRequester.NODE_PASSWORD != "") {
            headers = { 'Authorization': + `Basic ${RpcRequester.NODE_PASSWORD}` }
            useCredentials = true;
        }

        const rawResponse = await axios.post<T>(RpcRequester.NODE_URL, request, {
            headers: headers,
            withCredentials: useCredentials
        });
        return rawResponse.data;
    }
}