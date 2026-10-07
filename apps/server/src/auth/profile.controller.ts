import { Body, Controller, Get, Patch } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import type { AuthUser } from './auth-user.js';

/** 当前登录用户资料 — 需携带 Access Token（非 @Public） */
@Controller('api/auth')
export class ProfileController {
  constructor(private readonly authService: AuthService) {}

  /** 获取当前登录用户资料（供前端刷新头像等） */
  @Get('me')
  getMe(@CurrentUser() user: AuthUser) {
    return this.authService.getProfile(user.userId);
  }

  /** 更新当前登录用户头像 */
  @Patch('me')
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.authService.updateAvatar(user.userId, dto.avatar);
  }
}