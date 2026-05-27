import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ResponseDto } from '../dto/response.dto';

/** 全局 HTTP 异常过滤器 — 将异常也输出为统一响应格式 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = '服务器内部错误';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message =
        typeof res === 'string'
          ? res
          : (res as any).message ?? JSON.stringify(res);
      // message 为数组时取第一条
      if (Array.isArray(message)) {
        message = message[0];
      }
    }

    const body: ResponseDto = {
      code: status,
      message,
      data: null,
    };

    response.status(status).json(body);
  }
}
