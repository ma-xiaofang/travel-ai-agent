import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/** 限制路由仅指定角色可访问（需配合 RolesGuard） */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
