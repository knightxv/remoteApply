export type MessageHandler = (msg: Uint8Array) => void;
export type CloseHandler = () => void;

let eventDataReader = (data: any) => data;
if (typeof Blob !== "undefined") {
  eventDataReader = (data) => {
    const reader = new FileReader();
    if (data instanceof Blob) {
      reader.readAsArrayBuffer(data);
      return new Promise<ArrayBuffer>((resolve, reject) => {
        reader.onload = (ev) => {
          if (ev.loaded === ev.total) {
            resolve(new Uint8Array(reader.result as ArrayBuffer));
          }
        };
        reader.onerror = reject;
      });
    }
    return data;
  };
}

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
    this.ws.onmessage = async (ev: MessageEvent) => {
      const msg = await eventDataReader(ev.data);
      handler(msg);
    };
  }

  onClose(handler: CloseHandler): void {
    this.ws.onclose = handler;
    this.ws.onerror = handler;
  }
}
