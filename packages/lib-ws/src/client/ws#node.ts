import WebSocket from 'ws';

export type MessageHandler = (msg: Uint8Array) => void;
export type CloseHandler = () => void;

export class WebSockets {
  private ws: WebSocket;
  constructor(url: string) {
    this.ws = new WebSocket(url);
  }

  isOpend(): boolean {
    return this.ws.readyState === this.ws.OPEN;
  }

  send(data: Uint8Array): boolean {
    if (this.isOpend()) {
      this.ws.send(data);
      return true;
    }
    return false;
  }

  onMessage(handler: MessageHandler): void {
    this.ws.on('message', (data: WebSocket.RawData) => {
      if (data instanceof Array) {
        for (const d of data) {
          handler(d);
        }
      } else {
        handler(new Uint8Array(data));
      }
    });
  }

  onClose(handler: CloseHandler): void {
    this.ws.on('close', handler);
    this.ws.on('error', handler);
  }
}
