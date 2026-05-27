import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ResponseMessage } from '../common/decorators/response-message.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { RagService } from './rag.service.js';
import { LoadDocumentsDto, QueryDto } from './dto/index.js';

@Controller('api/rag')
@UseGuards(RolesGuard)
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @Post('load')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('文档已加载到知识库')
  loadDocuments(@Body() body: LoadDocumentsDto) {
    return this.ragService.loadDocuments(body);
  }

  @Post('query')
  @HttpCode(HttpStatus.OK)
  query(@Body() body: QueryDto) {
    return this.ragService.query(body.question, body.topK);
  }

  @Post('search')
  @HttpCode(HttpStatus.OK)
  search(@Body() body: QueryDto) {
    return this.ragService.searchVectorStore(body.question, body.topK);
  }
}
