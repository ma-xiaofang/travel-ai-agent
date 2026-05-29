import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from './decorators/public.decorator.js';

/**
 * JWT 认证守卫
 *
 * 继承 Passport 的 `AuthGuard('jwt')`，全局启用以保护所有路由：
 * 校验请求携带的 JWT，并将解析出的用户注入到 `request.user`。
 * 标注了 `@Public()` 装饰器的路由会跳过认证（如登录、注册等公开接口）。
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  /**
   * 判断当前请求是否需要认证。
   *
   * @param context 执行上下文，用于读取 @Public 元数据
   * @returns 公开路由直接放行；其余交由 Passport 执行 JWT 校验
   */
  canActivate(context: ExecutionContext) {
    // 合并方法级与类级的 @Public 元数据，方法级优先覆盖类级
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    // 公开路由跳过 JWT 校验
    if (isPublic) {
      return true;
    }
    // 非公开路由委托给 Passport 的 jwt 策略校验 token
    return super.canActivate(context);
  }
}
