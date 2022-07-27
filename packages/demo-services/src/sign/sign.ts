import { Field, FieldMap } from '@cccd/corev2';
import { Result } from '../types';

export const MaxRecordNum = 31; /* max days of month */

export class SignService {
  @Field() signInfo!: FieldMap<boolean>;
  async sign() {
    const todayStr = new Date().toISOString().split('T')[0];
    this.signInfo.set(todayStr, true);
    return Result.Success;
  }

  async signRecords(limit: number = MaxRecordNum, startDate: string = "1970-01-01") {
    const records: string[] = [];
    if (limit < 0) {
      return records;
    }

    if (limit > MaxRecordNum) {
      limit = MaxRecordNum;
    }


    for await (const key of this.signInfo.keys()) {
      records.push(key);
      if (records.length >= limit) {
        break;
      }
    }

    return records;
  }
}

