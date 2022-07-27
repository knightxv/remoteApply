import WebSocket, { WebSocketServer } from "ws";

interface Client {
  id: number;
  ws: WebSocket;
}

const SERVER_ID = 0;

export type MessageHandler = (id: number, data: Uint8Array) => void;

export class Server {
  private _clientIdAcc: Uint32Array = new Uint32Array(1);
  private clients: Map<number, Client> = new Map();
  private msgHandler?: MessageHandler;

  constructor(private readonly host: string, private readonly port: number) {
    const socket = new WebSocketServer({ host, port });
    socket.on("connection", (ws) => {
      const clientId = this.getClientId();
      const client = { id: clientId, ws: ws };
      this.clients.set(clientId, client);
      ws.on("message", (data: WebSocket.RawData, isBinary: boolean) => {
        if (!isBinary) {
          return;
        }
        if (this.msgHandler) {
          if (data instanceof Array) {
            for (const d of data) {
              this.msgHandler(clientId, d);
            }
          } else {
            this.msgHandler(clientId, new Uint8Array(data));
          }
        }
      });

      ws.on("close", () => {
        this.clients.delete(clientId);
      });

      ws.on("error", () => {
        ws.close();
        this.clients.delete(clientId);
      });
    });
  }

  private getClientId(): number {
    this._clientIdAcc[0]++;
    if (this._clientIdAcc[0] == SERVER_ID) {
      this._clientIdAcc[0]++;
    }
    return this._clientIdAcc[0];
  }

  public onMessage(handler: MessageHandler) {
    this.msgHandler = (id: number, data: Uint8Array) => {
      this.broadcast(data, [id]);
      handler(id, data);
    }
  }

  public send(id: number, data: Uint8Array): boolean {
    const client = this.clients.get(id);
    if (client) {
      client.ws.send(data);
      return true;
    }
    return false;
  }

  public broadcast(data: Uint8Array, ignoreIds: number[] = []) {
    const ignoreIdSet = new Set(ignoreIds);

    this.clients.forEach((client) => {
      if (ignoreIdSet.has(client.id)) {
        return;
      }

      if (client.ws.readyState == client.ws.OPEN) {
        client.ws.send(data);
      }
    });
  }
}
