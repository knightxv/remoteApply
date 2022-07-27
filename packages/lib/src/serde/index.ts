import type { DataType } from './types';
import { comproto } from '../comproto/index';

export function encode(data: DataType): Uint8Array {
  return comproto.serialize(data);
}

export function decode(u8a: Uint8Array): DataType {
  return comproto.deserialize(u8a) as DataType;
}
