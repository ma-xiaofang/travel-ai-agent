import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { AuthUser } from './auth-user.js';

/**
 * JWT 负载（Payload）内容。
 *
 * 即签发 Access Token 时写入并在校验后解出的字段。
 * `sub` 为 JWT 标准声明，存放用户唯一标识（即 userId）。
 */
export interface JwtPayload {
  /** 用户唯一标识（JWT 标准 subject 声明） */
  sub: string;
  /** 用户名 */
  username: string;
  /** 邮箱（可选） */
  email?: string;
  /** 手机号（可选） */
  phone?: string;
  /** 角色（ADMIN / USER），供 RolesGuard 授权使用 */
  role: string;
}

/**
 * JWT 认证策略 — 校验 Access Token。
 *
 * 基于 `passport-jwt`，以策略名 `'jwt'` 注册（供 {@link JwtAuthGuard} 引用）。
 * 从请求头 `Authorization: Bearer <token>` 提取并校验 Access Token，
 * 校验通过后由 {@link JwtStrategy.validate} 构造 `AuthUser` 注入到 `req.user`。
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      // 从 Authorization 头的 Bearer Token 中提取 JWT
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // 不忽略过期时间：过期 token 直接判定为无效
      ignoreExpiration: false,
      // 验签密钥；缺失则启动即抛错（getOrThrow）
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  /**
   * 校验通过后的回调，返回值会被 Passport 挂载到 `req.user`。
   *
   * 将 JWT 负载映射为统一的 {@link AuthUser} 结构，供
   * `@CurrentUser()` 装饰器与 `RolesGuard` 等下游消费。
   *
   * @param payload 已验签且未过期的 JWT 负载
   * @returns 注入到 req.user 的当前用户对象
   */
  validate(payload: JwtPayload): AuthUser {
    return {
      userId: payload.sub,
      username: payload.username,
      email: payload.email,
      phone: payload.phone,
      role: payload.role,
    };
  }
}
