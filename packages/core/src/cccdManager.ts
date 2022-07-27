import { ModuleStroge, Injectable, Resolve, Inject } from '@bfchain/util';
import {
  IStorageOption,
  KSStorage,
  KSSTORAGE_ARGS,
  KVStorage,
  KVSTORAGE_ARGS,
  SubData,
  textEncoder,
  textDecoder,
  crypto,
  IPubSub,
  IKVStorage,
  IKSStorage,
} from '@cccd/lib';
import { base64ToUint8Array, LocalRole, RemoteRole, RoleManager } from './role';
import { triggerApply } from './comlink/comlink';
import { Message, WireValue } from './comlink/protocol';
import { ExposeServerConstructor, EXPONSE_SERVER_ARGS } from './exposeServer';
import { SERVICES_KS_STORAGE, SERVICES_KV_STORAGE, SERVICES_PUBSUB } from './const';

export const applyMessageEncode = (message: Message): Uint8Array => {
  return textEncoder.encode(JSON.stringify(message));
};
export const applyMessageDecode = (message: Uint8Array): Message => {
  return JSON.parse(textDecoder.decode(message));
};
export const wireValueEncode = (message: WireValue): Uint8Array => {
  return textEncoder.encode(JSON.stringify(message));
};
export const wireValueDecode = (message: Uint8Array): WireValue => {
  return JSON.parse(textDecoder.decode(message));
};

type ICCCDConfig = {
  kvStorage?: IStorageOption;
  ksStorage?: IStorageOption;
};
@Injectable()
export class CCCDManager {
  private exposeServerMap = new Map<string, ExposeServerConstructor>();
  constructor(
    private moduleMap: ModuleStroge,
    public roleManager: RoleManager,
    @Inject(SERVICES_PUBSUB)
    public pubsub: IPubSub,
  ) {}
  loadConfig(config: ICCCDConfig) {
    if (config.kvStorage) {
      const storageOption = config.kvStorage;
      this.moduleMap.set(
        SERVICES_KV_STORAGE,
        Resolve(KVStorage, this.moduleMap.installMask(new ModuleStroge([[KVSTORAGE_ARGS, storageOption]]))),
      );
    }
    if (config.ksStorage) {
      const storageOption = config.ksStorage;
      this.moduleMap.set(
        SERVICES_KS_STORAGE,
        Resolve(KSStorage, this.moduleMap.installMask(new ModuleStroge([[KSSTORAGE_ARGS, storageOption]]))),
      );
    }
  }
  async login(privateKey: Uint8Array) {
    const loginRole = new LocalRole(privateKey);
    await this.pubsub.login(loginRole.publicKeyBase64);
    this.roleManager.login(loginRole.privateKey);
    return loginRole;
  }
  exposeService(classConstructor: ExposeServerConstructor) {
    this.exposeServerMap.set(classConstructor.name, classConstructor);
  }
  startExposeServer() {
    const { loginRole } = this.roleManager;
    this.pubsub.onSub(`${loginRole.publicKeyBase64}/REMOTE_APPLY/$publicKey/$className`, this.remoteApplyHandler, this);
  }

  remoteApplyHandler = async ([matchs, data]: SubData) => {
    const { loginRole } = this.roleManager;
    const [_, applyPublicKeyStr, className] = matchs;
    try {
      const applyPublicKey = base64ToUint8Array(applyPublicKeyStr);
      const message = crypto.decrypt(data, applyPublicKey, loginRole.privateKey);
      const applyMessage = applyMessageDecode(message);
      const classConstructor = this.exposeServerMap.get(className);
      if (classConstructor == undefined) {
        throw new Error('classConstructor is undefined');
      }
      const applyRole = new RemoteRole(applyPublicKey);
      const instance = Resolve(
        classConstructor,
        this.moduleMap.installMask(new ModuleStroge([[EXPONSE_SERVER_ARGS.APPLY_ROLE, applyRole]])),
      );
      const result = await triggerApply(instance, applyMessage);
      if (result == undefined) {
        throw new ReferenceError(`can not valid applyMessage:: ${JSON.stringify(applyMessage)}`);
      }
      const resultData = wireValueEncode(result);
      const resultCrypto = crypto.encrypt(resultData, applyPublicKey, loginRole.privateKey);
      this.pubsub.pub(
        `${applyPublicKeyStr}/REMOTE_APPLY_RETURN/${loginRole.publicKeyBase64}`,
        resultCrypto,
        applyPublicKeyStr,
      );
    } catch (err) {
      console.error(err);
      return;
    }
  };
  stopExposeServer() {
    const { loginRole } = this.roleManager;
    this.pubsub.offSub(`${loginRole.publicKeyBase64}/REMOTE_APPLY/$publicKey/$className`, this.remoteApplyHandler);
  }
  // async *subscription<T>(remoteRole: RemoteRole, subKey: string) {
  //   subKey = subKey.replace(/:\w+/g, '$key');

  //   for await (const [keys, data] of this.pubsub.sub(
  //     `${remoteRole.publicKeyBase64}/FIELD_UPDATE/$signature/${subKey}`,
  //   )) {
  //     const [_, signature, ...otherKeys] = keys;
  //     const [verify, val] = decodeVerifyFiled<T>(data, signature, remoteRole.publicKey);
  //     if (verify) {
  //       yield [otherKeys, val] as [string[], T];
  //     }
  //   }
  // }
  // getPublicKey<T>(remoteRole: RemoteRole, key: string, timeout = 30) {
  //   const loginRole = this.loginRole;
  //   return getFiledPublicValue(key, this.pubsub, loginRole, remoteRole, timeout);
  // }
}
