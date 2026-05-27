import { Controller, Get, UseGuards } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { StatsService } from './stats.service.js';

/** 仪表盘统计 — 仅 ADMIN */
@Controller('api/admin')
@UseGuards(RolesGuard)
@Roles('ADMIN')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('stats')
  getStats() {
    return this.statsService.getStats();
  }
}
