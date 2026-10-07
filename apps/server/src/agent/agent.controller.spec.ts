import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AgentController } from './agent.controller.js';
import { MessageRole } from '../../generated/prisma/client.js';

/**
 * 行程卡「编辑保存」接口的契约测试。
 *
 * 这条链路是前端唯一会回写助手消息的入口，边界一旦失守就会让
 * `artifact` 被脏数据污染（前端按固定字段渲染，脏数据直接白屏），
 * 因此这里逐个钉死 4 类拒绝分支与成功分支。
 */
describe('AgentController.updateMessageArtifact (PUT /api/agent/messages/:id/artifact)', () => {
  const messageId = 'msg-1';
  const sessionId = 'session-1';
  const user = { userId: 'user-1', username: 'u', role: 'USER' } as any;

  const validArtifact = {
    destination: '洛阳',
    days: 1,
    plan: [{ day: 1, items: [{ period: '上午', title: '龙门石窟' }] }],
  };

  function buildController() {
    const memoryService = {
      getMessage: jest.fn().mockResolvedValue({
        id: messageId,
        sessionId,
        role: MessageRole.ASSISTANT,
      }),
      updateMessageArtifact: jest.fn().mockResolvedValue(undefined),
    };
    const sessionService = {
      assertSessionOwner: jest.fn().mockResolvedValue({ id: sessionId }),
    };

    const controller = new AgentController(
      {} as any,
      memoryService as any,
      sessionService as any,
      {} as any,
      {} as any,
      {} as any,
    );

    return { controller, memoryService, sessionService };
  }

  it('成功：校验通过后按 messageId 覆盖落库，并返回成功标记', async () => {
    const { controller, memoryService } = buildController();

    const result = await controller.updateMessageArtifact(
      user,
      messageId,
      { artifact: validArtifact },
    );

    expect(result).toEqual({ success: true, messageId });
    expect(memoryService.updateMessageArtifact).toHaveBeenCalledWith(
      messageId,
      expect.objectContaining({ destination: '洛阳', days: 1 }),
    );
  });

  it('消息不存在：抛 404「消息不存在」，且不进入归属校验与落库', async () => {
    const { controller, memoryService, sessionService } = buildController();
    memoryService.getMessage.mockResolvedValue(null);

    const err = await controller
      .updateMessageArtifact(user, messageId, { artifact: validArtifact })
      .catch((e) => e);

    expect(err).toBeInstanceOf(NotFoundException);
    expect(err.message).toBe('消息不存在');
    expect(sessionService.assertSessionOwner).not.toHaveBeenCalled();
    expect(memoryService.updateMessageArtifact).not.toHaveBeenCalled();
  });

  it('非助手消息：抛 400「仅支持编辑助手消息」，不落库', async () => {
    const { controller, memoryService } = buildController();
    memoryService.getMessage.mockResolvedValue({
      id: messageId,
      sessionId,
      role: MessageRole.USER,
    });

    const err = await controller
      .updateMessageArtifact(user, messageId, { artifact: validArtifact })
      .catch((e) => e);

    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.message).toBe('仅支持编辑助手消息');
    expect(memoryService.updateMessageArtifact).not.toHaveBeenCalled();
  });

  it('artifact 结构非法：抛 400「行程数据格式不正确」，不落库', async () => {
    const { controller, memoryService } = buildController();

    const err = await controller
      .updateMessageArtifact(user, messageId, {
        // 缺 plan，且 period 非法
        artifact: { destination: '洛阳', days: 1 },
      })
      .catch((e) => e);

    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.message).toBe('行程数据格式不正确');
    expect(memoryService.updateMessageArtifact).not.toHaveBeenCalled();
  });

  it('非本人会话：由 assertSessionOwner 抛 403，不落库（越权防护）', async () => {
    const { controller, memoryService, sessionService } = buildController();
    sessionService.assertSessionOwner.mockRejectedValue(
      new ForbiddenException('无权访问该会话'),
    );

    const err = await controller
      .updateMessageArtifact(user, messageId, { artifact: validArtifact })
      .catch((e) => e);

    expect(err).toBeInstanceOf(ForbiddenException);
    expect(memoryService.updateMessageArtifact).not.toHaveBeenCalled();
  });
});