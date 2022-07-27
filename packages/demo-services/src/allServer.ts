import * as path from 'path';
import { ModuleStroge, Resolve, Injectable } from '@bfchain/util';
import { keyPair, CCCDManager } from '@cccd/core';
import { Bnrtc } from '@cccd/lib-bnrtc';

import { SERVICES_PUBSUB } from '@cccd/core';
import * as services from './services';

const bnrtc = new Bnrtc('127.0.0.1', 19999);
const moduleMap = new ModuleStroge([[SERVICES_PUBSUB, bnrtc]]);

const storageOption = {
  location: path.join(process.cwd(), 'data/bfchain'),
  reverse: true,
};

@Injectable()
class Boot {
  constructor(public cccdManager: CCCDManager) { }
  async steup() {
    const adminSeed = new Uint8Array(32).fill(1);
    const adminKeypair = keyPair(adminSeed);
    const loginRole = await this.cccdManager.login(adminKeypair.secretKey);
    // expose services
    for (const serverName in services) {
      const service = services[serverName];
      this.cccdManager.exposeService(service);
    }
    this.cccdManager.startExposeServer();
    // set config & load plugin
    this.cccdManager.loadConfig({
      kvStorage: storageOption,
      ksStorage: storageOption,
    });
    console.log(`-------------- services start ----------------`);
    console.log(loginRole.publicKeyBase64);
  }
}

Resolve(Boot, moduleMap).steup();
