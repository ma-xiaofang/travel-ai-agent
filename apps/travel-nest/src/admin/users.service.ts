import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { UserQueryDto } from './dto/user-query.dto.js';
import type { UpdateUserDto } from './dto/update-user.dto.js';

/** 管理后台 — 用户管理与旅行偏好 */
@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  /** 分页查询注册用户列表 */
  async listUsers(query: UserQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.UserWhereInput = {};

    if (query.role) {
      where.role = query.role as Prisma.EnumRoleFilter['equals'];
    }
    if (query.keyword) {
      where.OR = [
        { username: { contains: query.keyword, mode: 'insensitive' } },
        { email: { contains: query.keyword, mode: 'insensitive' } },
        { phone: { contains: query.keyword, mode: 'insensitive' } },
        { nickName: { contains: query.keyword, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          username: true,
          email: true,
          phone: true,
          nickName: true,
          avatar: true,
          gender: true,
          age: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: rows.map((row) => ({
        ...row,
        gender: row.gender ?? null,
      })),
      total,
      page,
      pageSize,
    };
  }

  /** 管理员编辑用户（昵称、性别、年龄、角色） */
  async updateUser(userId: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.nickName !== undefined ? { nickName: dto.nickName } : {}),
        ...(dto.gender !== undefined ? { gender: dto.gender } : {}),
        ...(dto.age !== undefined ? { age: dto.age } : {}),
        ...(dto.role !== undefined ? { role: dto.role } : {}),
      },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        nickName: true,
        avatar: true,
        gender: true,
        age: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /** 获取所有用户的旅行偏好列表（含访客 user_xxx） */
  async listPreferences(page = 1, pageSize = 20) {
    const [rows, total] = await Promise.all([
      this.prisma.userTravelProfile.findMany({
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.userTravelProfile.count(),
    ]);

    // 解析偏好中的 userId → 用户名映射
    const userIds = rows.map((r) => r.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, nickName: true, email: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return {
      items: rows.map((row) => {
        const u = userMap.get(row.userId);
        const isGuest = row.userId.startsWith('user_');
        return {
          userId: row.userId,
          userLabel: isGuest
            ? `访客 · ${row.userId}`
            : (u?.nickName ?? u?.username ?? u?.email ?? row.userId),
          isGuest,
          summary: row.summary,
          preferences: row.preferences as Record<string, unknown>,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        };
      }),
      total,
      page,
      pageSize,
    };
  }

  /** 获取单个用户的旅行偏好 */
  async getUserPreferences(userId: string) {
    const profile = await this.prisma.userTravelProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException('该用户尚无旅行偏好记录');
    }

    const isGuest = userId.startsWith('user_');
    let userLabel = `访客 · ${userId}`;
    if (!isGuest) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { username: true, nickName: true, email: true },
      });
      if (user) {
        userLabel = user.nickName ?? user.username ?? user.email ?? userId;
      }
    }

    return {
      userId: profile.userId,
      userLabel,
      isGuest,
      summary: profile.summary,
      preferences: profile.preferences as Record<string, unknown>,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  /** 更新用户旅行偏好 */
  async updateUserPreferences(
    userId: string,
    data: { summary?: string; preferences?: Record<string, unknown> },
  ) {
    const profile = await this.prisma.userTravelProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException('该用户尚无旅行偏好记录');
    }

    return this.prisma.userTravelProfile.update({
      where: { userId },
      data: {
        ...(data.summary !== undefined ? { summary: data.summary } : {}),
        ...(data.preferences !== undefined
          ? { preferences: data.preferences as Prisma.InputJsonValue }
          : {}),
      },
    });
  }
}
