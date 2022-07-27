import { INetworkServer } from "../types"
import { encode, decode, pubsub } from "@cccd/lib";
import { Server } from "./ws";
export class NetworkServer implements INetworkServer {
  private server!: Server;

  constructor(host: string, localPort: number) {
    this.server = new Server(host, localPort);
    this.server.onMessage((_: number, data: Uint8Array) => {
      const msg = decode(data);
      if ("value" in msg) {
        pubsub.pub(msg.key, msg.value);
      } else {
        pubsub.pub(msg.key, new Uint8Array());
      }
    });
  }

  sub(key: string) {
    return pubsub.sub(key);
  }

  pub(key: string, value: Uint8Array): boolean {
    this.server.broadcast(encode({ key, value }));
    return true;
  }
}
