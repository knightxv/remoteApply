export enum Permission {
  GET = 'GET',
  SET = 'SET',
  APPLY = 'APPLY',
  GET_REMOTE = 'GET_REMOTE',
  SET_REMOTE = 'SET_REMOTE',
  APPLY_REMOTE = 'APPLY_REMOTE',
}

export enum PermissionEvent {
  ADD = 'ADD',
  REMOVE = 'REMOVE',
}

export interface PermissionEventData {
  permission: Permission;
  event: PermissionEvent;
}
