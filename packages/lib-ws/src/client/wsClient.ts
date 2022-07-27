import { WebSockets } from "./ws#node";
import type { MessageHandler } from "./ws#node";

export class WebSocketClient {
  private ws: WebSockets;
  private isConnecting: boolean = false;
  private msgHandler: MessageHandler | undefined;
  constructor(private url: string) {
    this.ws = this.create();
  }

  private create(): WebSockets {
    const socket = new WebSockets(this.url);
    socket.onClose(() => {
      this.reconnect(1000);
    });

    if (this.msgHandler) {
      socket.onMessage(this.msgHandler);
    }

    return socket;
  }

  private reconnect(delay: number): void {
    if (this.isConnecting) {
      return;
    }
    this.isConnecting = true;
    setTimeout(async () => {
      this.ws = this.create();
      this.isConnecting = false;
    }, delay);
  }

  public send(data: Uint8Array): boolean {
    return this.ws.send(data);
  }

  public onMessage(handler: MessageHandler): void {
    this.msgHandler = handler;
    if (this.ws) {
      this.ws.onMessage(handler);
    }
  }
}
