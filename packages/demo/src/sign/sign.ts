import { RemoteField, remoteProxy } from '@cccd/core';
import { FieldMap } from '@cccd/corev2';

import type { SignService as ISignService, Result } from '@cccd/demo-services';
@remoteProxy('iojj3XQJ8ZX9UtstPLpdcspnCb8dlBIb83SIAbQPb1w=')
export class SignService implements ISignService {
  @RemoteField()
  readonly signInfo!: FieldMap<boolean>
  signRecords(): Promise<string[]> {
    throw new Error('Method not implemented.');
  }
  sign(): Promise<Result> {
    throw new Error('Method not implemented.');
  }
}