import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { AuthUser } from './auth-user.js';

/** JWT 负载内容 */
export interface JwtPayload {
  sub: string;
  username: string;
  email?: string;
  phone?: string;
  role: string;
}

/** JWT 认证策略 — 校验 Access Token */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  /** 校验通过后挂载到 req.user */
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
