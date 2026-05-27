import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** 标记路由无需 JWT（登录、注册、健康检查等） */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
