import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ToolsService } from './tools.service.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';

/** 旅行工具 REST 接口 — 供前端快捷调用与调试（需登录） */
@Controller('api/tools')
@UseGuards(RolesGuard)
export class ToolsController {
  constructor(private readonly toolsService: ToolsService) {}

  @Get()
  listTools() {
    return { tools: this.toolsService.getRestToolMetadata() };
  }

  @Post('weather')
  getWeather(@Body() body: { city: string }) {
    return this.toolsService.invokeTool('get_weather', body);
  }

  @Post('attractions')
  getAttractions(
    @Body()
    body: {
      city: string;
      interests?: string[];
      limit?: number;
    },
  ) {
    return this.toolsService.invokeTool('get_attractions', body);
  }

  @Post('itinerary')
  generateItinerary(
    @Body()
    body: {
      destination: string;
      days: number;
      style?: string;
      budget_level?: string;
      interests?: string[];
    },
  ) {
    return this.toolsService.invokeTool('generate_itinerary', body);
  }

  @Post('budget')
  calculateBudget(
    @Body()
    body: {
      destination: string;
      days: number;
      people?: number;
      budget_level?: string;
      include_flight?: boolean;
    },
  ) {
    return this.toolsService.invokeTool('calculate_budget', body);
  }

  @Post('visa')
  checkVisa(@Body() body: { destination: string }) {
    return this.toolsService.invokeTool('check_visa', body);
  }

  @Post('currency')
  convertCurrency(
    @Body()
    body: {
      amount: number;
      from_currency: string;
      to_currency?: string;
    },
  ) {
    return this.toolsService.invokeTool('convert_currency', body);
  }

  @Post('packing')
  generatePackingList(
    @Body()
    body: {
      destination: string;
      days: number;
      season: string;
      activities?: string[];
    },
  ) {
    return this.toolsService.invokeTool('generate_packing_list', body);
  }

  @Post('translate')
  translatePhrases(
    @Body()
    body: {
      text?: string;
      target_language?: string;
      destination?: string;
    },
  ) {
    return this.toolsService.invokeTool('translate_phrases', body);
  }

  @Post('web-search')
  webSearch(
    @Body()
    body: {
      query: string;
      topic?: 'general' | 'news' | 'finance';
      timeRange?: 'day' | 'week' | 'month' | 'year';
    },
  ) {
    return this.toolsService.invokeTool('web_search', body);
  }
}
