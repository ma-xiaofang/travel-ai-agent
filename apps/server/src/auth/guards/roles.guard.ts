import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import type { AuthUser } from '../auth-user.js';

/**
 * 角色权限守卫
 *
 * 配合 `@Roles()` 装饰器实现基于角色（RBAC）的访问控制。
 * 通过 Reflector 读取路由处理器或控制器上声明的所需角色，
 * 校验当前请求用户的角色是否满足要求。
 *
 * 注意：本守卫只负责角色校验，用户身份须先由 JWT 守卫注入到
 * `request.user`，因此通常排在认证守卫之后执行。
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  /**
   * 判断当前请求是否被放行。
   *
   * @param context 执行上下文，用于读取元数据与请求对象
   * @returns 满足角色要求时返回 true
   * @throws ForbiddenException 用户缺失或角色不匹配时抛出「权限不足」
   */
  canActivate(context: ExecutionContext): boolean {
    // 合并方法级与类级的 @Roles 元数据，方法级优先覆盖类级
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    // 未声明所需角色：视为公开接口，直接放行
    if (!requiredRoles?.length) {
      return true;
    }

    // 取出认证守卫注入的用户，校验其角色是否在允许列表中
    const { user } = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    if (user && requiredRoles.includes(user.role)) {
      return true;
    }

    throw new ForbiddenException('权限不足');
  }
}
