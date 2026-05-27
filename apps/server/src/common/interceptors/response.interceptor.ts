import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { map, Observable } from 'rxjs';
import { ResponseDto } from '../dto/response.dto';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator';

/** 全局响应拦截器 — 将控制器返回值统一封装为 ResponseDto 格式 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ResponseDto> {
    const response = context.switchToHttp().getResponse();
    const customMessage = this.reflector.get<string>(
      RESPONSE_MESSAGE_KEY,
      context.getHandler(),
    );

    return next.handle().pipe(
      map((data) => {
        // 响应已被手动结束（如 SSE 流、文件下载），跳过包装
        if (response.headersSent) {
          return data;
        }
        // 已是标准格式则直接透传
        if (data && typeof data === 'object' && 'code' in data && 'message' in data) {
          return data;
        }
        return { code: 200, message: customMessage ?? '操作成功', data };
      }),
    );
  }
}
