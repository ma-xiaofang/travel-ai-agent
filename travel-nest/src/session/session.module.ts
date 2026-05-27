import { Module } from '@nestjs/common';
import { SessionService } from './session.service.js';

@Module({
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}
