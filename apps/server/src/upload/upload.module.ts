import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller.js';

/** 上传模块 — 头像等图片上传（仅 ADMIN），文件落盘至 uploads/ 静态目录 */
@Module({
  controllers: [UploadController],
})
export class UploadModule {}