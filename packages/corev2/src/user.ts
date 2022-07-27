import { Evt } from "@bfcs/util-evt";
import { roleManager, sysRoleLocal, sysRoleRemote } from "./role";
import { KeyPair } from "./keypair";
import { Permission } from "./permission";

// RBAC -- Role-based Access Control
// User + Role + Permission

export class User {
  constructor(
    public readonly name: string,
    private keypair: KeyPair
  ) { }

  publicKey() {
    return this.keypair.publicKey;
  }

  privateKey() {
    return this.keypair.privateKey
  }
}

export enum UserEvent {
  ADD = 'ADD',
  REMOVE = 'REMOVE',
}

export interface UserEventData {
  user: User;
  event: UserEvent;
}

class UserManager {
  users: Map<string, { user: User, roles: string[] }> = new Map();
  evt = new Evt<UserEventData>({ id: 'user' });

  addUser(name: string, user: User, roles: string[]): void {
    if (this.users.has(name)) {
      throw new Error(`User ${name} already exists`);
    }

    if (roles.length === 0) {
      throw new Error(`User ${name} must have at least one role`);
    }

    this.users.set(name, { user, roles: roles.slice() });
    this.evt.post({ user, event: UserEvent.ADD });
  }

  delUser(name: string): void {
    const user = this.users.get(name);
    if (!user) {
      return;
    }
    this.users.delete(name);
    this.evt.post({ user: user.user, event: UserEvent.REMOVE });
  }

  getUser(name: string): User | undefined {
    const user = this.users.get(name);
    if (!user) {
      return undefined;
    }

    return user.user;
  }

  hasUser(name: string): boolean {
    return this.users.has(name);
  }

  getUserRoles(name: string): string[] {
    const user = this.users.get(name);
    if (!user) {
      return [];
    }

    return user.roles;
  }

  getUserPermissions(name: string): Permission[] {
    const user = this.users.get(name);
    const permissions: Permission[] = [];
    if (!user) {
      return permissions;
    }
    for (const roleName of user.roles) {
      const role = roleManager.getRole(roleName);
      if (role != undefined) {
        permissions.push(...role.getPermissions())
      }
    }
    return permissions;

  }

  onUser(listener: (user: UserEventData) => void) {
    return this.evt.attach(listener);
  }

  hasPermission(name: string, permission: Permission): boolean {
    const user = this.users.get(name);
    if (!user) {
      return false;
    }
    for (const roleName of user.roles) {
      const role = roleManager.getRole(roleName);
      if (role && role.hasPermission(permission)) {
        return true;
      }
    }

    return false;
  }

  login(name: string, keypair: KeyPair) {
    if (this.users.has(name)) {
      throw new Error(`User ${name} already exist`);
    }

    let roles: string[] = [];
    if (keypair.privateKey != "") {
      // @todo check if keypair is valid
      roles = [sysRoleLocal];
    } else if (keypair.publicKey != "") {
      // @todo check if keypair is valid
      roles = [sysRoleRemote];
    }
    const user = new User(name, keypair);
    this.addUser(name, user, roles);
  }
}

export const userManager = new UserManager();

