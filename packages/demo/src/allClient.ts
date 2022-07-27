import { Injectable, ModuleStroge, Resolve } from '@bfchain/util';
import { SignService, ArticleService } from './services';
import { CCCDManager, keyPair, LocalRole } from '@cccd/core';
import { SERVICES_PUBSUB } from '@cccd/core/src/const';
import { Bnrtc } from '@cccd/lib-bnrtc';

const bnrtc = new Bnrtc('127.0.0.1', 19888);
export const moduleMap = new ModuleStroge([[SERVICES_PUBSUB, bnrtc]]);
@Injectable()
export class Boot {
  public loginRole?: LocalRole;
  constructor(
    public cccdManager: CCCDManager,
    public signService: SignService,
    // public articleService: ArticleService,
  ) { }
  async steup() {
    const userSeed = new Uint8Array(32).fill(2);
    const userKeypair = keyPair(userSeed);
    const userRole = await this.cccdManager.login(userKeypair.secretKey);
    this.loginRole = userRole;
    console.log('cccd login::' + userRole.publicKeyBase64);
    const x = await this.signService.sign();
    console.log("sign:", x);
    // const article = await this.articleService.createArticle("Title", "contents");
    // console.log("create article:", article);
  }
}

const boot = Resolve(Boot, moduleMap);
boot.steup();
