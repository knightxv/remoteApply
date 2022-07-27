
export enum Action {
  GET = 'GET',
  SET = 'SET',
  APPLY = 'APPLY',
}

interface RemoteRequest {
  action: Action;
  className: string;
  signature: string;
}

interface RemoteGetRequest extends RemoteRequest {
  key: string;
}

interface RemoteSetRequest<T> extends RemoteRequest {
  key: string;
  value: T;
}

interface RemoteApplyRequest<T> extends RemoteRequest {
  key: string;
  args: T;
}


function get<T extends { [k: string]: any }, K extends string, V = T[K]>(instance: T, key: K): Promise<V> {
  const request = {
    action: Action.GET,
    className: instance.constructor.name,
    key: key,
    signature: '',
  } as RemoteGetRequest;

  // send request
  return Reflect.get(instance, key)
}

function set<T extends { [k: string]: any }, K extends string, V = T[K]>(instance: T, key: K, value: V) {
  const request = {
    action: Action.SET,
    className: instance.constructor.name,
    key: key,
    signature: '',
    value: value,
  } as RemoteSetRequest<V>;

  // send request
  return Reflect.set(instance, key, value)
}

function apply<T extends { [k: string]: any }, K extends string, V extends (...args: any) => any = T[K]>(instance: T, key: K, _args: Parameters<V>): Promise<ReturnType<V>> {
  const request = {
    action: Action.APPLY,
    className: instance.constructor.name,
    key: key,
    signature: '',
    args: _args,
  } as RemoteApplyRequest<Parameters<V>>;

  // send request
  return Reflect.apply(instance[key], instance, _args)
}
