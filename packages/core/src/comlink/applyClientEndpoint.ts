import { Endpoint, IEventListener, Message } from './protocol';
import { Inject, Injectable } from '@bfchain/util';
import { Sublistener, crypto, IPubSub } from '@cccd/lib';
import { RemoteRole, RoleManager } from '../role';
import { applyMessageEncode, wireValueDecode } from '../cccdManager';
import { SERVICES_PUBSUB } from '../const';

export const APPLY_CLIENT_ENDPOINT_ARGS = {
  CLASS_NAME: Symbol('CLASS_NAME'),
  REMOTE_ROLE: Symbol('REMOTE_ROLE'),
};
@Injectable()
export class ApplyClientEndpoint implements Endpoint {
  private subListenerWeakMap = new WeakMap<IEventListener, Sublistener>();
  constructor(
    public roleManager: RoleManager,
    @Inject(SERVICES_PUBSUB) public pubsub: IPubSub,
    @Inject(APPLY_CLIENT_ENDPOINT_ARGS.REMOTE_ROLE) public remoteRole: RemoteRole,
    @Inject(APPLY_CLIENT_ENDPOINT_ARGS.CLASS_NAME) public className: string,
  ) { }
  get subKey() {
    const { loginRole } = this.roleManager;
    return `${loginRole.publicKeyBase64}/REMOTE_APPLY_RETURN/${this.remoteRole.publicKeyBase64}`;
  }

  async postMessage(message: Message) {
    const { loginRole } = this.roleManager;
    const { pubsub } = this;
    const val = applyMessageEncode(message);
    const data = crypto.encrypt(val, this.remoteRole.publicKey, loginRole.privateKey);
    pubsub.pub(`${this.remoteRole.publicKeyBase64}/REMOTE_APPLY/${loginRole.publicKeyBase64}/${this.className}`, data, this.remoteRole.publicKeyBase64);
  }
  addEventListener(listener: IEventListener): void {
    const { loginRole } = this.roleManager;
    const { pubsub } = this;
    const subListener: Sublistener = async ([_, data]) => {
      try {
        const messageData = crypto.decrypt(data, this.remoteRole.publicKey, loginRole.privateKey);
        const message = wireValueDecode(messageData);
        listener(message);
      } catch (err) {
        console.error(err);
      }
    };
    this.subListenerWeakMap.set(listener, subListener);
    pubsub.onSub(this.subKey, subListener);
  }
  removeEventListener(listener: IEventListener): void {
    const { pubsub } = this;
    const subListener = this.subListenerWeakMap.get(listener);
    if (subListener) {
      this.subListenerWeakMap.delete(listener);
      pubsub.offSub(this.subKey, subListener);
    }
  }
}
