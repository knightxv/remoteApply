import { encode, decode, pubsub, IPubSub, Sublistener } from '@cccd/lib';
import { BnrtcCore, MessageState } from "./core"

export class Bnrtc implements IPubSub {
  private _core: BnrtcCore;
  constructor(host?: string, port?: number) {
    this._core = new BnrtcCore(host, port);
    this._core.onMessage((data: Uint8Array) => {
      const msg = decode(data);
      if ('value' in msg) {
        pubsub.pub(msg.key, msg.value);
      }
    });
  }
  async login(address: string) {
    await this._core.login(address);
    // @note wait for peer address published
    await new Promise((resolve) => {
      setTimeout(resolve, 3000);
    });
  }

  async pub(key: string, value: Uint8Array, receiver?: string) {
    let res: MessageState | undefined;
    if (receiver === undefined || receiver === "") {
      res = await this._core.broadcast(encode({ key, value }));
      // await this._core.neighborCast(encode({ key, value }));
    } else {
      res = await this._core.send(receiver, encode({ key, value }));
    }

    if (res !== MessageState.Success) {
      console.log("pub key-%s value-%s failed %s", key, value, res);
    }
  }
  sub(key: string) {
    return pubsub.sub(key);
  }
  onSub(key: string, handler: Sublistener, bindObj?: unknown) {
    pubsub.onSub(key, handler, bindObj);
  }
  offSub(key: string, handler: Sublistener) {
    pubsub.offSub(key, handler);
  }
}

export const bnrtc = new Bnrtc();