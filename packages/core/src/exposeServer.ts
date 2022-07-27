import { Injectable, Inject } from '@bfchain/util';
import { RemoteRole, RoleManager } from './role';

export const EXPONSE_SERVER_ARGS = {
  APPLY_ROLE: Symbol('applyRole'),
};

export interface ExposeServerConstructor {
  new (...arg: any[]): any;
}
@Injectable()
export class ExposeServer {
  constructor(public roleManager: RoleManager) {}
  @Inject(EXPONSE_SERVER_ARGS.APPLY_ROLE)
  applyRole!: RemoteRole;
}
