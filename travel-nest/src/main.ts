import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 全局 DTO 校验管道
  const { ValidationPipe } = await import('@nestjs/common');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  // 全局响应拦截器 — 统一封装成功响应
  const { Reflector } = await import('@nestjs/core');
  const { ResponseInterceptor } = await import(
    './common/interceptors/response.interceptor.js'
  );
  app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));

  // 全局异常过滤器 — 统一封装错误响应
  const { HttpExceptionFilter } = await import(
    './common/filters/http-exception.filter.js'
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
