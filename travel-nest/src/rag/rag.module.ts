import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { RagService } from './rag.service.js';
import { RagController } from './rag.controller.js';
import { PgvectorService } from './pgvector.service.js';
import { VECTOR_STORE_SERVICE } from './vector-store.interface.js';

@Module({
  imports: [AuthModule],
  providers: [
    RagService,
    PgvectorService,
    {
      provide: VECTOR_STORE_SERVICE,
      useExisting: PgvectorService,
    },
  ],
  controllers: [RagController],
  exports: [RagService],
})
export class RagModule {}
