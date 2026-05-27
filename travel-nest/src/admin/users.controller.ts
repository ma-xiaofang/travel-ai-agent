import {
  Body, Controller, Get, Param, Patch, Query, UseGuards,
} from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { AdminUsersService } from './users.service.js';
import { UserQueryDto } from './dto/user-query.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

/** 用户管理 — 仅 ADMIN */
@Controller('api/admin/users')
@UseGuards(RolesGuard)
@Roles('ADMIN')
export class AdminUsersController {
  constructor(private readonly usersService: AdminUsersService) {}

  /** 全部用户旅行偏好列表（静态路由必须在 :id 之前） */
  @Get('preferences')
  listPreferences(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.usersService.listPreferences(
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
    );
  }

  /** 注册用户列表 */
  @Get()
  listUsers(@Query() query: UserQueryDto) {
    return this.usersService.listUsers(query);
  }

  /** 编辑用户（角色、昵称等） */
  @Patch(':id')
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.updateUser(id, dto);
  }

  /** 单个用户旅行偏好详情 */
  @Get(':id/preferences')
  getUserPreferences(@Param('id') id: string) {
    return this.usersService.getUserPreferences(id);
  }

  /** 更新用户旅行偏好 */
  @Patch(':id/preferences')
  updateUserPreferences(
    @Param('id') id: string,
    @Body() data: { summary?: string; preferences?: Record<string, unknown> },
  ) {
    return this.usersService.updateUserPreferences(id, data);
  }
}
