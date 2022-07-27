import { Evt } from "@bfcs/util-evt";


import { Permission, PermissionEvent, PermissionEventData } from "./permission";

export enum RoleEvent {
  ADD = 'ADD',
  REMOVE = 'REMOVE',
}

export interface RoleEventData {
  role: Role;
  event: RoleEvent;
}

export class Role {
  permissionSet: Set<Permission> = new Set();
  evt = new Evt<PermissionEventData>({ id: 'permission' });
  constructor(
    public readonly name: string,
    private permissions: Permission[],
  ) {
    for (const permission of permissions) {
      this.addPermission(permission);
    }
  }

  addPermission(permission: Permission): void {
    if (this.permissionSet.has(permission)) {
      return
    }
    this.permissionSet.add(permission);
    this.evt.post({ permission, event: PermissionEvent.ADD });
  }

  removePermission(permission: Permission): void {
    if (!this.permissionSet.has(permission)) {
      return
    }
    this.permissionSet.delete(permission);
    this.evt.post({ permission, event: PermissionEvent.REMOVE });
  }

  hasPermission(permission: Permission): boolean {
    return this.permissionSet.has(permission);
  }

  getPermissions(): Permission[] {
    return this.permissions.slice();
  }

  onPermission(listener: (permission: PermissionEventData) => void) {
    return this.evt.attach(listener);
  }
}

class RoleManager {
  roles: Map<string, Role> = new Map();
  evt = new Evt<RoleEventData>({ id: 'role' });

  addRole(name: string, role: Role): void {
    if (this.roles.has(name)) {
      throw new Error(`Role ${name} already exists`);
    }

    this.roles.set(name, role);
    this.evt.post({ role, event: RoleEvent.ADD });
  }

  delRole(name: string): void {
    const role = this.roles.get(name);
    if (!role) {
      return;
    }

    this.roles.delete(name);
    this.evt.post({ role, event: RoleEvent.REMOVE });
  }

  getRole(name: string): Role | undefined {
    return this.roles.get(name);
  }

  hasRole(name: string): boolean {
    return this.roles.has(name);
  }

  onRole(listener: (role: RoleEventData) => void) {
    return this.evt.attach(listener);
  }
}

export const roleManager = new RoleManager();

export const defineRole = (name: string, permissions: Permission[]): Role => {
  const role = new Role(name, permissions);
  roleManager.addRole(name, role);
  return role;
}

// preset roles
export const sysRoleLocal = 'sys.local';
export const sysRoleRemote = 'sys.remote';
defineRole(sysRoleLocal, [Permission.GET, Permission.SET, Permission.APPLY]);
defineRole(sysRoleRemote, [Permission.GET_REMOTE, Permission.SET_REMOTE, Permission.APPLY_REMOTE]);

