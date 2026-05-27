import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './jwt.strategy';
import * as crypto from 'crypto';

/** 令牌对返回值 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/** 认证服务 — 处理注册、登录、令牌刷新与登出 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /** 用户注册 */
  async register(dto: RegisterDto): Promise<TokenPair> {
    //存在性校验
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          ...(dto.email ? [{ email: dto.email }] : []),
          ...(dto.phone ? [{ phone: dto.phone }] : []),
        ],
      },
    });
    if (existing) {
      if (dto.email && existing.email === dto.email) {
        throw new ConflictException('邮箱已被注册');
      }
      throw new ConflictException('手机号已被注册');
    }

    /** 
     * 生成密码的哈希值
     * @param dto.password 明文密码
     * @param 10 盐的长度
     * @returns 哈希值 即 加密后的密码
     */
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email ?? null,
        username: dto.username,
        password: hashedPassword,
        phone: dto.phone ?? null,
        nickName: dto.nickName ?? null,
        gender: dto.gender ?? null,
        age: dto.age ?? null,
      },
    });

    return this.generateTokens(user);
  }

  /** 用户登录 — 支持用户名、邮箱或手机号 */
  async login(dto: LoginDto): Promise<TokenPair> {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          ...(dto.username ? [{ username: dto.username }] : []),
          ...(dto.email ? [{ email: dto.email }] : []),
          ...(dto.phone ? [{ phone: dto.phone }] : []),
        ],
      },
    });
    if (!user) {
      throw new UnauthorizedException('账号或密码错误');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('账号或密码错误');
    }

    return this.generateTokens(user);
  }

  /** 刷新令牌对（轮换机制：旧 Refresh Token 立即删除） */
  async refresh(refreshToken: string): Promise<TokenPair> {
    const record = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!record || record.expiresAt < new Date()) {
      if (record) {
        await this.prisma.refreshToken.delete({ where: { id: record.id } });
      }
      throw new UnauthorizedException('刷新令牌无效或已过期');
    }

    // 删除旧令牌，生成新令牌对
    await this.prisma.refreshToken.delete({ where: { id: record.id } });
    return this.generateTokens(record.user);
  }

  /** 登出 — 删除 Refresh Token */
  async logout(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken
      .delete({ where: { token: refreshToken } })
      .catch(() => {}); // 令牌不存在时静默处理
  }

  /** 生成 Access + Refresh Token 对 */
  private async generateTokens(user: {
    id: string;
    email: string | null;
    phone: string | null;
    role: string;
    username: string;
  }): Promise<TokenPair> {
    const payload: JwtPayload = {
      sub: user.id,
      role: user.role,
      username: user.username,
      ...(user.email ? { email: user.email } : {}),
      ...(user.phone ? { phone: user.phone } : {}),
    };

    const accessToken = this.jwt.sign(payload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES', '15m') as any,
    });

    const refreshToken = crypto.randomUUID();
    const configured = this.config.get<string>('JWT_REFRESH_EXPIRES_MS');
    const refreshExpiresMs =
      parseInt(configured ?? '', 10) || 7 * 24 * 60 * 60 * 1000;

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + refreshExpiresMs),
      },
    });

    return { accessToken, refreshToken };
  }
}
