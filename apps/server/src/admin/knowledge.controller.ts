import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { KnowledgeService } from './knowledge.service.js';
import { CollectionDto, DocumentDto, DocumentQueryDto } from './dto/index.js';

/** 知识库管理 — 仅 ADMIN */
@Controller('api/admin/knowledge')
@UseGuards(RolesGuard)
@Roles('ADMIN')
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  // ─── 集合 ──────────────────────────────────────────

  @Get('collections')
  listCollections() {
    return this.knowledgeService.listCollections();
  }

  @Get('collections/:id')
  getCollection(@Param('id') id: string) {
    return this.knowledgeService.getCollection(id);
  }

  @Post('collections')
  createCollection(@Body() dto: CollectionDto) {
    return this.knowledgeService.createCollection(dto);
  }

  @Patch('collections/:id')
  updateCollection(@Param('id') id: string, @Body() dto: CollectionDto) {
    return this.knowledgeService.updateCollection(id, dto);
  }

  @Delete('collections/:id')
  deleteCollection(@Param('id') id: string) {
    return this.knowledgeService.deleteCollection(id);
  }

  // ─── 文档 ──────────────────────────────────────────

  @Get('documents')
  listDocuments(@Query() query: DocumentQueryDto) {
    return this.knowledgeService.listDocuments(query);
  }

  @Get('documents/:id')
  getDocument(@Param('id') id: string) {
    return this.knowledgeService.getDocument(id);
  }

  @Post('documents')
  createDocument(@Body() dto: DocumentDto) {
    return this.knowledgeService.createDocument(dto);
  }

  @Patch('documents/:id')
  updateDocument(@Param('id') id: string, @Body() dto: DocumentDto) {
    return this.knowledgeService.updateDocument(id, dto);
  }

  @Delete('documents/:id')
  deleteDocument(@Param('id') id: string) {
    return this.knowledgeService.deleteDocument(id);
  }

  /** 触发 RAG 入库 */
  @Post('documents/:id/index')
  indexDocument(@Param('id') id: string) {
    return this.knowledgeService.indexDocument(id);
  }

  // ─── 分块 ──────────────────────────────────────────

  @Get('documents/:id/chunks')
  listChunks(@Param('id') id: string) {
    return this.knowledgeService.listChunks(id);
  }
}
