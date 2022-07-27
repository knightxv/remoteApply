/// <reference types="node" />
import {
  Bnrtc2Client,
  Bnrtc2Controller,
  bnrtc2Controller,
} from "@bfchain/bnrtc2-client";
import { RESULT_CODE, READY_STATE } from "@bfchain/bnrtc2-client-typings";
import { sleep, unsleep, PromiseOut } from "@bfchain/util-extends-promise";
import { EasyMap } from "@bfchain/util-extends-map";
import { Bnrtc2Buffer } from "@bfchain/bnrtc2-buffer";

// @ts-ignore
export enum MessageState {
  Success = "Success",                     // 消息发送成功，已投递到对方节点应用
  Failed = "Failed",                       // 消息发送失败，如缓冲区满无法发送
  Offline = "Offline",                     // 对方不在线，无法投递
  DportConflict = "Dport Conflict",        // dport被其它应用占用
  DportUnbound = "Dport Unbound",          // dport未绑定
  ConnectFailed = "Connect Failed",        // 连接失败
  FormatError = "Format Error",            // address或dport格式错误
  Timeout = "Timeout",                     // 消息响应超时
  Closed = "Closed",                       // 已关闭
  NoAddress = "NoAddress",                 // 未绑定地址
  Unknown = "Unknown",                     // 未知错误
}

export const BNRTC_SERVICE_DPORT = "bnrtc-service-dport";
export const BNRTC_MESSAGE_TIMEOUT_DEFAULT = 30;
export const BNRTC_NEIGHTBOR_CAST_NUM = 5;

export type MessageHandler = (data: Uint8Array) => void;
export type StateChangeHandler = (state: READY_STATE) => void;

enum MessageType {
  DATA = 1,
  ACK = 2,
}

type dataSender = (
  address: string,
  buf: Bnrtc2Buffer,
  devid?: string,
  src?: string
) => Promise<RESULT_CODE>;

// Messgage Format
// +-------------------------------------+
// + 1byte | 4bytes | 4bytes | 0..nbytes +
// +-------------------------------------+
// + type  | msgId  |  magic | payload   +
// +-------------------------------------+
const MESSAGE_HEADER_SIZE = 9;
export class BnrtcCore {
  // 消息超时时间(单位: 秒)
  private _messageTimeoutSeconds: number = BNRTC_MESSAGE_TIMEOUT_DEFAULT;
  private _bnrtc2Client: Bnrtc2Client;
  private _bnrtc2Controller: Bnrtc2Controller;
  private _userMessageHandler: MessageHandler | undefined;
  private _userStateChangeHandler: StateChangeHandler | undefined;
  private _msgIdAcc: Uint32Array = new Uint32Array(1);
  private isClientClosed: boolean = true;
  private isClientOpened: boolean = false;
  private isClosed: boolean = false;
  private magic: number = Math.floor(Math.random() * 0xffffffff);
  private loginAddress: string = "";
  private loginIsPending: boolean = false;
  private waitForReadyPromise: PromiseOut<void> | undefined;
  private _unConfirmMsgMap = EasyMap.from<
    number,
    PromiseOut<MessageState>,
    number
  >({
    creater: (msgId: number) => {
      const task = new PromiseOut<MessageState>();
      const tickTimeout = sleep(
        this._messageTimeoutSeconds * 1000,
        () => {
          // 使用resolve，不使用reject
          task.resolve(MessageState.Timeout);
        }
      );
      task.onSuccess(() => {
        // Resolve时取消超时定时器
        unsleep(tickTimeout);
      });
      task.onFinished(() => {
        // 完成时删除自己
        this._unConfirmMsgMap.tryDelete(msgId);
      });
      return task;
    },
  });

  constructor(private apiHost?: string, private apiPort?: number) {
    this._bnrtc2Client = this.newkBnrtc2Client();
    if (apiHost != undefined || apiPort != undefined) {
      this._bnrtc2Controller = new Bnrtc2Controller(apiHost, apiPort);
    } else {
      this._bnrtc2Controller = bnrtc2Controller;
    }
  }

  private async _onConnect() {
    if (this.loginIsPending && this.loginAddress != "") {
      await this._bnrtc2Controller.bindAddress(this.loginAddress);
    }
    if (this.waitForReadyPromise) {
      this.waitForReadyPromise.resolve();
      this.waitForReadyPromise = undefined;
    }
    await this._bnrtc2Client.onData(BNRTC_SERVICE_DPORT, this._messageHandler.bind(this)).catch(() => { return; });
  }

  private newkBnrtc2Client(): Bnrtc2Client {
    this.isClientClosed = false;
    this.isClientOpened = false;
    const bnrtc2Client = new Bnrtc2Client(this.apiHost, this.apiPort);
    bnrtc2Client.onClose.attach(() => {
      this.isClientClosed = true;
      this.isClientOpened = false;
      this._userStateChangeHandler && this._userStateChangeHandler(READY_STATE.CLOSE);
    });
    bnrtc2Client.onOpen.attach(async () => {
      this.isClientOpened = true;
      this.isClientClosed = false;
      // rebind onData
      await this._onConnect();
      this._userStateChangeHandler && this._userStateChangeHandler(READY_STATE.OPEN);
    });
    return bnrtc2Client;
  }

  private checkBnrtc2Client() {
    if (this.isClientClosed) {
      this.isClientClosed = false;
      this._bnrtc2Client = this.newkBnrtc2Client();
    }
  }

  private getMessageId(): number {
    return this._msgIdAcc[0]++;
  }

  private buildAckMsg(msgId: number, magic: number): Bnrtc2Buffer {
    const buf = Bnrtc2Buffer.create(MESSAGE_HEADER_SIZE);
    buf.pushU8(MessageType.ACK);
    buf.pushU32(msgId);
    buf.pushU32(magic);

    return buf;
  }

  private resultCodeToMessageState(resultCode: RESULT_CODE): MessageState {
    switch (resultCode) {
      case RESULT_CODE.SUCCESS:
        return MessageState.Success;
      case RESULT_CODE.FAILED:
        return MessageState.Failed;
      case RESULT_CODE.OFFLINE:
        return MessageState.Offline;
      case RESULT_CODE.DPORT_CONFLICT:
        return MessageState.DportConflict;
      case RESULT_CODE.DPORT_UNBOUND:
        return MessageState.DportUnbound;
      case RESULT_CODE.CONNECT_FAILED:
        return MessageState.ConnectFailed;
      case RESULT_CODE.FORMAT_ERR:
        return MessageState.FormatError;
      case RESULT_CODE.TIMEOUT:
        return MessageState.Timeout;
      default:
        return MessageState.Unknown;
    }
  }

  // 发送消息
  private async _send(
    address: /* target */ string,
    data: Uint8Array | Bnrtc2Buffer,
    sender: dataSender,
    devid?: string,
  ): Promise<MessageState> {
    this.checkBnrtc2Client();
    if (!this.isClientOpened) {
      return MessageState.ConnectFailed;
    }

    if (this.loginAddress === "") {
      return MessageState.NoAddress;
    }

    const msgId = this.getMessageId();
    let buf = data;
    if (buf instanceof Uint8Array) {
      buf = Bnrtc2Buffer.from(buf);
    }

    buf.putU32(this.magic);
    buf.putU32(msgId);
    buf.putU8(MessageType.DATA);
    const t = this._unConfirmMsgMap.forceGet(msgId);
    const res = sender(address, buf, devid, this.loginAddress);
    return res
      .then(() => {
        return t.promise;
      })
      .catch((err) => {
        t.resolve(MessageState.Failed);
        return this.resultCodeToMessageState(err);
      });
  }

  public async send(
    address: /* target */ string,
    data: Uint8Array | Bnrtc2Buffer,
    devid?: string,
  ) {
    const sender = (
      _address: string,
      _buf: Bnrtc2Buffer,
      _devid?: string,
      _src?: string
    ) => {
      return this._bnrtc2Client.send(_address, BNRTC_SERVICE_DPORT, _buf, _devid, _src);
    };

    return this._send(address, data, sender, devid);
  }


  public async broadcast(data: Uint8Array | Bnrtc2Buffer,
  ) {
    const sender = (
      _address: string,
      _buf: Bnrtc2Buffer,
      _devid?: string,
      _src?: string
    ) => {
      return this._bnrtc2Client.broadcast(BNRTC_SERVICE_DPORT, _buf, _src);
    };

    return this._send("", data, sender);
  }

  // public async neighborCast(data: Uint8Array | Bnrtc2Buffer,
  // ) {
  //   const sender = (
  //     _address: string,
  //     _buf: Bnrtc2Buffer,
  //     _devid?: string,
  //     _src?: string
  //   ) => {
  //     return this._bnrtc2Client.sendNeighbor(BNRTC_NEIGHTBOR_CAST_NUM, BNRTC_SERVICE_DPORT);
  //   };

  //   return this._send("", data, sender);
  // }

  private confirmMessage(id: number, magic: number): void {
    if (magic != this.magic) {
      // not for me
      return;
    }
    const task = this._unConfirmMsgMap.tryGet(id);
    if (task) {
      task.resolve(MessageState.Success);
    }
  }

  private sendAckMessage(
    id: number,
    magic: number,
    msg: Bnrtc2.Bnrtc2Data
  ): void {
    const ackMsg = this.buildAckMsg(id, magic);
    this._bnrtc2Client
      .send(msg.address, BNRTC_SERVICE_DPORT, ackMsg, msg.devid, msg.dst)
      .catch(() => {
        return;
      });
  }


  private _messageHandler(msg: Bnrtc2.Bnrtc2Data) {
    const buf = Bnrtc2Buffer.from(msg.data);
    if (buf.length < MESSAGE_HEADER_SIZE) {
      return;
    }
    const type: MessageType = buf.pullU8();
    const msgId = buf.pullU32();
    const magic = buf.pullU32();

    if (type === MessageType.ACK) {
      this.confirmMessage(msgId, magic);
    } else if (type === MessageType.DATA) {
      if (!msg.isSync) {
        // send ack if is not synced msg
        this.sendAckMessage(msgId, magic, msg);
      }
      this._userMessageHandler && this._userMessageHandler(buf.data())
    }
  }

  // 注册接收消息回调
  public onMessage(handler: MessageHandler) {
    this._userMessageHandler = handler;
  }

  public onStateChange(handler: StateChangeHandler) {
    this._userStateChangeHandler = handler;
  }

  // 登录本地地址
  public async login(address: string) {
    if (this.loginAddress != address) {
      await this.logout(this.loginAddress);
      const ok = await this._bnrtc2Controller.bindAddress(address);
      if (!ok) {
        this.loginIsPending = true;
      }
      this.loginAddress = address;
      if (!this.isClientOpened) {
        if (this.waitForReadyPromise === undefined) {
          this.waitForReadyPromise = new PromiseOut();
        }
        await this.waitForReadyPromise.promise;
      }
    }
  }

  // 登出本地地址
  public async logout(address: string) {
    if (address != "" && this.loginAddress == address) {
      await this._bnrtc2Controller.unbindAddress(this.loginAddress)
      this.loginAddress = "";
      this.loginIsPending = false;
    }
  }

  // 关闭通道
  public close() {
    if (this.isClosed) {
      return;
    }
    this.isClosed = true;
    this._unConfirmMsgMap.forEach((task) => {
      task.resolve(MessageState.Closed);
    });
    this._unConfirmMsgMap.clear();
    if (this.loginAddress != "") {
      this._bnrtc2Controller.unbindAddress(this.loginAddress);
      this.loginAddress = "";
    }
    this._bnrtc2Client.close();
  }
}
