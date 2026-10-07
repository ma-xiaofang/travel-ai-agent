import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import {
  UPLOAD_URL_PREFIX,
  ensureUploadDirs,
  getAvatarDir,
} from './upload.paths.js';

/** 允许的图片类型 → 落盘扩展名 */
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

/** 头像体积上限：2MB */
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

/** 文件上传 — 仅 ADMIN */
@Controller('api/upload')
@UseGuards(RolesGuard)
@Roles('ADMIN')
export class UploadController {
  /** 上传头像图片，返回可直接访问的相对 URL */
  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_AVATAR_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_IMAGE_TYPES[file.mimetype]) {
          cb(new BadRequestException('仅支持 JPG / PNG / WebP / GIF 格式的图片'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  async uploadAvatar(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('未接收到上传文件');
    }

    ensureUploadDirs();
    // 文件名使用随机 UUID + 白名单扩展名，避免路径穿越与重名覆盖
    const filename = `${randomUUID()}${ALLOWED_IMAGE_TYPES[file.mimetype]}`;
    await writeFile(resolve(getAvatarDir(), filename), file.buffer);

    return { url: `${UPLOAD_URL_PREFIX}/avatars/${filename}` };
  }
}