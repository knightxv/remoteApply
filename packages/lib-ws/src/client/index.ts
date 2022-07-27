import { INetworkClient, Opts } from "../types"
import { encode, decode, pubsub } from "@cccd/lib";
import { WebSocketClient } from "./wsClient";

export class NetworkClient implements INetworkClient {
  private client!: WebSocketClient;
  constructor(url: string) {
    this.client = new WebSocketClient(url);
    this.client.onMessage((data: Uint8Array) => {
      const msg = decode(data);
      if ("value" in msg) {
        pubsub.pub(msg.key, msg.value);
      }
    });
  }
  get(key: string, opts?: Opts): boolean {
    this.client.send(encode({ key, opts }));
    return true;
  }
  set(key: string, value: Uint8Array, opts?: Opts): boolean {
    this.client.send(encode({ key, value, opts }));
    return true;
  }
  sub(key: string) {
    return pubsub.sub(key);
  }
  pub(key: string, value: Uint8Array) {
    return pubsub.pub(key, value);
  }
}
