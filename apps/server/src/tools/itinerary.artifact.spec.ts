import { buildItineraryArtifact, itineraryArtifactSchema } from './itinerary.artifact.js';
import { createChatModel } from '../llm/create-chat-model.js';

// 结构化整理会真实调用 DeepSeek，单测必须打桩，否则依赖网络/余额/耗时
jest.mock('../llm/create-chat-model.js', () => ({
  createChatModel: jest.fn(),
}));

const mockedCreateChatModel = createChatModel as jest.MockedFunction<
  typeof createChatModel
>;

/**
 * 把一个假的「结构化器」装进 createChatModel 的返回值。
 * buildItineraryArtifact 的调用链是 createChatModel() → withStructuredOutput() → invoke()，
 * 只需替掉最外层的 createChatModel 即可控制 invoke 的产出。
 */
function stubStructurer(invoke: jest.Mock) {
  mockedCreateChatModel.mockReturnValue({
    withStructuredOutput: jest.fn(() => ({ invoke })),
  } as unknown as ReturnType<typeof createChatModel>);
}

const baseParams = {
  destination: '洛阳',
  days: 3,
  style: '文化',
  budgetLevel: '中等',
  source: 'rag',
  content: '第一天：龙门石窟……',
};

describe('buildItineraryArtifact', () => {
  beforeEach(() => {
    mockedCreateChatModel.mockReset();
  });

  it('正文为空时直接返回 null，且不调用模型', async () => {
    const invoke = jest.fn();
    stubStructurer(invoke);

    await expect(
      buildItineraryArtifact({ ...baseParams, content: '   ' }),
    ).resolves.toBeNull();

    expect(mockedCreateChatModel).not.toHaveBeenCalled();
    expect(invoke).not.toHaveBeenCalled();
  });

  it('模型调用抛错时降级为 null，绝不把异常透传给工具', async () => {
    stubStructurer(jest.fn().mockRejectedValue(new Error('upstream 500')));

    await expect(buildItineraryArtifact(baseParams)).resolves.toBeNull();
  });

  it('模型返回空 plan（结构化失败）时返回 null', async () => {
    stubStructurer(
      jest.fn().mockResolvedValue({
        destination: '洛阳',
        days: 3,
        plan: [],
      }),
    );

    await expect(buildItineraryArtifact(baseParams)).resolves.toBeNull();
  });

  it('模型返回缺失 plan 时返回 null', async () => {
    stubStructurer(jest.fn().mockResolvedValue({ destination: '洛阳', days: 3 }));

    await expect(buildItineraryArtifact(baseParams)).resolves.toBeNull();
  });

  it('成功时以调用方参数覆盖模型输出，保证 artifact 与工具入参一致', async () => {
    stubStructurer(
      jest.fn().mockResolvedValue({
        // 故意给出与入参冲突的值，验证覆盖逻辑
        destination: '模型编的目的地',
        days: 99,
        summary: '三天人文之旅',
        plan: [{ day: 1, items: [{ period: '上午', title: '龙门石窟' }] }],
      }),
    );

    const result = await buildItineraryArtifact(baseParams);

    expect(result).toMatchObject({
      destination: '洛阳',
      days: 3,
      style: '文化',
      budgetLevel: '中等',
      source: 'rag',
      summary: '三天人文之旅',
    });
    expect(result?.plan).toHaveLength(1);
  });

  it('结构化时关闭 DeepSeek 思考模式（推理 token 会挤占输出预算导致 JSON 截断）', async () => {
    stubStructurer(
      jest.fn().mockResolvedValue({
        plan: [{ day: 1, items: [{ period: '上午', title: 'A' }] }],
      }),
    );

    await buildItineraryArtifact(baseParams);

    expect(mockedCreateChatModel).toHaveBeenCalledWith(0.2, false, 4096, {
      thinking: { type: 'disabled' },
    });
  });
});

describe('itineraryArtifactSchema', () => {
  it('接受最小合法结构（destination + days + plan）', () => {
    const parsed = itineraryArtifactSchema.safeParse({
      destination: '洛阳',
      days: 1,
      plan: [{ day: 1, items: [{ period: '上午', title: '龙门石窟' }] }],
    });

    expect(parsed.success).toBe(true);
  });

  it('拒绝缺失 destination / days / plan 的结构', () => {
    expect(itineraryArtifactSchema.safeParse({}).success).toBe(false);
    expect(
      itineraryArtifactSchema.safeParse({ destination: '洛阳', days: 1 }).success,
    ).toBe(false);
  });

  it('拒绝非法的 period 取值（前端按固定时段渲染）', () => {
    const parsed = itineraryArtifactSchema.safeParse({
      destination: '洛阳',
      days: 1,
      plan: [{ day: 1, items: [{ period: '清晨', title: '看日出' }] }],
    });

    expect(parsed.success).toBe(false);
  });
});