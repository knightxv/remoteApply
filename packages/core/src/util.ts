import { ModuleStroge, InjectProp, MODULE_MAP } from '@bfchain/util';
import { INJECT_PROP_MODULE_MAP } from './const';

export const getInstanceModuleMap = (tar: any) => {
  if (!tar[INJECT_PROP_MODULE_MAP]) {
    InjectProp(MODULE_MAP)(tar, INJECT_PROP_MODULE_MAP);
  }
  return tar[INJECT_PROP_MODULE_MAP] as ModuleStroge;
};
