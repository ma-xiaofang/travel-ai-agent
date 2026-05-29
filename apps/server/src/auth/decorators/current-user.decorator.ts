import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUser } from '../auth-user.js';

/**
 * 当前登录用户参数装饰器。
 *
 * 从请求对象中取出 JWT 认证守卫（{@link JwtAuthGuard}）解析并注入的
 * `req.user`，直接注入到控制器方法参数中，免去手动读取 request 的样板代码。
 *
 * @example
 * ```ts
 * \@Get('profile')
 * getProfile(\@CurrentUser() user: AuthUser) {
 *   return user;
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  // _data：装饰器调用时可传入的参数，此处未使用
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthUser }>();
    return request.user;
  },
);
