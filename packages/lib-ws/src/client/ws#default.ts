export type MessageHandler = (msg: Uint8Array) => void;
export type CloseHandler = () => void;

export class WebSockets {
  constructor(_url: string) {
    throw new Error("Method not implemented.");
  }
  send(_data: Uint8Array): boolean {
    throw new Error("Method not implemented.");
  }
  onMessage(_handler: MessageHandler): void {
    throw new Error("Method not implemented.");
  }
  onClose(_handler: CloseHandler): void {
    throw new Error("Method not implemented.");
  }
}
