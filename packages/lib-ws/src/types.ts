// import { ISubReturn } from "./pubsub";

export type Opts = undefined;

export type SubFunc = (
  key: string,
  value: Uint8Array,
  clientID: number
) => void;

export interface INetworkClient {
  get(key: string, opts: Opts): boolean;
  set(key: string, value: Uint8Array, opts: Opts): boolean;
  sub(key: string): any;
}

export interface INetworkServer {
  sub(key: string): any;
  // @note if clientID is not specified, it will be broadcasted to all clients
  pub(key: string, value: Uint8Array, clientID?: number): boolean;
}
