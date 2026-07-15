"""
途旅 AI 小程序 - 视觉素材处理脚本
1. 裁剪 AI 生成图的水印
2. 重命名为规范的英文名
3. 生成 6 个现代 tabbar 图标
"""

import os
from PIL import Image, ImageDraw

# 路径配置
BASE = r"C:\Users\ma-xi\Desktop\WORKSPACE\travel-ai-agent\apps\miniprogram\src\static"
HERO_DIR = os.path.join(BASE, "hero")
TABBAR_DIR = os.path.join(BASE, "tabbar")

# AI 生成图源文件
SOURCE_FILES = {
    "login_bg": "A_breathtaking_travel_landscap_2026-07-14T13-20-33.png",
    "chat_empty": "A_cute_friendly_AI_travel_assi_2026-07-14T13-20-33.png",
    "sessions_empty": "A_charming_empty_travel_journa_2026-07-14T13-20-33.png",
    "logo": "A_modern_travel_app_logo_icon__2026-07-14T13-20-33.png",
    "mine_bg": "A_serene_tropical_beach_travel_2026-07-14T13-20-33.png",
}

# 输出文件名
OUT_FILES = {
    "login_bg": "login-bg.png",
    "chat_empty": "chat-empty.png",
    "sessions_empty": "sessions-empty.png",
    "logo": "logo.png",
    "mine_bg": "mine-bg.png",
}


def crop_watermark(img: Image.Image, ratio: float = 0.06) -> Image.Image:
    """裁掉右下角水印区域。"""
    w, h = img.size
    # 右下角裁掉 ratio 比例的高度和宽度
    crop_w = int(w * ratio)
    crop_h = int(h * ratio)
    # 裁掉右下角
    return img.crop((0, 0, w - crop_w, h - crop_h))


def process_ai_images():
    """处理 AI 生成的图片：裁水印 + 重命名。"""
    print("==> 处理 AI 生成图片")
    for key, src in SOURCE_FILES.items():
        src_path = os.path.join(HERO_DIR, src)
        if not os.path.exists(src_path):
            print(f"   跳过: {src} 不存在")
            continue
        img = Image.open(src_path)
        original_size = img.size
        img = crop_watermark(img, ratio=0.07)
        # 对插画类（透明或纯白背景）保持原样，对大幅风景图保持原样
        out_path = os.path.join(HERO_DIR, OUT_FILES[key])
        img.save(out_path, "PNG", optimize=True)
        print(f"   {src}  {original_size} -> {img.size}  -> {OUT_FILES[key]}")


# ============ Tabbar 图标 ============
ICON_SIZE = 96  # 用 96x96 高清渲染，缩放更清晰（实际会被压缩到 81x81）
INACTIVE = (152, 152, 160, 255)  # #9898A0
ACTIVE = (255, 107, 61, 255)  # #FF6B3D 主色

# 浅色高光（用于 active 图标的渐变效果）
ACTIVE_LIGHT = (255, 143, 94, 255)  # #FF8F5E
ACTIVE_DARK = (235, 92, 48, 255)  # #EB5C30


def new_canvas() -> Image.Image:
    return Image.new("RGBA", (ICON_SIZE, ICON_SIZE), (0, 0, 0, 0))


def draw_chat(active: bool) -> Image.Image:
    """对话：聊天气泡，含三个点。"""
    img = new_canvas()
    d = ImageDraw.Draw(img)

    # 圆角矩形气泡参数
    s = ICON_SIZE
    pad = 14
    bubble_box = [pad, pad + 4, s - pad - 4, s - pad]

    color = ACTIVE if active else INACTIVE

    # 绘制气泡（小尾巴先画，再用白色覆盖做缺口）
    # 气泡主体
    radius = 18
    d.rounded_rectangle(bubble_box, radius=radius, fill=color)

    # 气泡小尾巴（左下）
    tail = [
        (bubble_box[0] + 18, bubble_box[3] - 2),
        (bubble_box[0] + 6, bubble_box[3] + 14),
        (bubble_box[0] + 30, bubble_box[3] - 2),
    ]
    d.polygon(tail, fill=color)

    # 三个圆点
    dot_color = (255, 255, 255, 255) if active else (200, 200, 205, 255)
    cy = (bubble_box[1] + bubble_box[3]) // 2
    cx_start = (bubble_box[0] + bubble_box[2]) // 2 - 12
    for i in range(3):
        cx = cx_start + i * 12
        d.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=dot_color)

    return img


def draw_history(active: bool) -> Image.Image:
    """会话：时钟 + 箭头（代表历史/会话）。"""
    img = new_canvas()
    d = ImageDraw.Draw(img)

    s = ICON_SIZE
    color = ACTIVE if active else INACTIVE

    # 主体：圆角矩形"卡片堆叠"效果
    # 后面两张半透明卡片
    if active:
        # active 态：彩色渐变效果（用两层）
        back_color = (255, 143, 94, 180)
        back2_color = (255, 107, 61, 130)
    else:
        back_color = (200, 200, 205, 180)
        back2_color = (200, 200, 205, 130)

    d.rounded_rectangle([16, 12, 80, 76], radius=10, fill=back2_color)
    d.rounded_rectangle([12, 16, 76, 80], radius=10, fill=back_color)
    # 主体卡片
    d.rounded_rectangle([8, 20, 72, 84], radius=10, fill=color)

    # 主体卡片上的"时间线"横线
    line_color = (255, 255, 255, 255) if active else (255, 255, 255, 230)
    d.line([18, 38, 62, 38], fill=line_color, width=3)
    d.line([18, 52, 56, 52], fill=line_color, width=3)
    d.line([18, 66, 48, 66], fill=line_color, width=3)

    # 三个小圆点（列表标记）
    d.ellipse([12, 34, 14, 36], fill=line_color)
    d.ellipse([12, 48, 14, 50], fill=line_color)
    d.ellipse([12, 62, 14, 64], fill=line_color)

    return img


def draw_mine(active: bool) -> Image.Image:
    """我的：用户头像。"""
    img = new_canvas()
    d = ImageDraw.Draw(img)

    s = ICON_SIZE
    color = ACTIVE if active else INACTIVE

    # 整体是一个圆角矩形（卡片背景）
    if active:
        d.rounded_rectangle([8, 8, 88, 88], radius=20, fill=color)
    else:
        d.rounded_rectangle([8, 8, 88, 88], radius=20, outline=color, width=3)

    # 头部圆形
    head_color = (255, 255, 255, 255) if active else color
    head_box = [32, 22, 64, 54]
    d.ellipse(head_box, fill=head_color)

    # 身体半圆（肩部）
    body_box = [22, 52, 74, 88]
    d.ellipse(body_box, fill=head_color)

    # 修正下半部分：覆盖卡片底边以下的部分，让肩部在卡片内
    if not active:
        # 轮廓态：把肩部内圈画成白色（镂空）
        inner_body = [28, 58, 68, 88]
        d.ellipse(inner_body, fill=(0, 0, 0, 0))  # 透明
        # 实际需要覆盖背景
        # 在 PNG 透明背景上用白色遮罩不现实，改为：只画肩部上半部分
        pass

    if not active:
        # 重新画：先画卡片外框，再画头部和肩部的轮廓
        img = new_canvas()
        d = ImageDraw.Draw(img)
        d.rounded_rectangle([8, 8, 88, 88], radius=20, outline=color, width=4)
        # 头部
        d.ellipse([32, 22, 64, 54], outline=color, width=4)
        # 肩部弧线（用 arc）
        d.arc([22, 48, 74, 100], start=180, end=360, fill=color, width=4)
    else:
        # active 态：填充色卡片
        d.rounded_rectangle([8, 8, 88, 88], radius=20, fill=color)
        # 头部（白色填充）
        d.ellipse([32, 22, 64, 54], fill=(255, 255, 255, 255))
        # 肩部（白色填充）
        d.ellipse([22, 48, 74, 100], fill=(255, 255, 255, 255))
        # 用卡片色覆盖超出卡片的肩部
        d.rounded_rectangle([8, 8, 88, 88], radius=20, fill=color)
        d.ellipse([32, 22, 64, 54], fill=(255, 255, 255, 255))
        d.ellipse([22, 48, 74, 96], fill=(255, 255, 255, 255))
        # 重新覆盖超出卡片下边的部分（用透明挖空）
        # 实际用更简单方法：先画卡片，再画半圆到卡片下边线
        img = new_canvas()
        d = ImageDraw.Draw(img)
        d.rounded_rectangle([8, 8, 88, 88], radius=20, fill=color)
        # 头部
        d.ellipse([32, 22, 64, 54], fill=(255, 255, 255, 255))
        # 肩部半圆：用半圆 - 大半圆在下边，clip 到卡片内
        # 简化为：用 ellipse 但只画卡片内可见部分
        d.ellipse([22, 50, 74, 102], fill=(255, 255, 255, 255))
        # 把卡片外的白色擦掉：用卡片色盖一层
        d.rounded_rectangle([8, 86, 88, 100], radius=0, fill=color)

    return img


def draw_mine_v2(active: bool) -> Image.Image:
    """我的：用户头像 v2 - 简洁版。"""
    img = new_canvas()
    d = ImageDraw.Draw(img)

    color = ACTIVE if active else INACTIVE
    white = (255, 255, 255, 255)

    if active:
        # 实心圆角矩形
        d.rounded_rectangle([6, 6, 90, 90], radius=20, fill=color)
        # 头部
        d.ellipse([33, 22, 63, 52], fill=white)
        # 身体（一个圆，让下边缘与卡片底边齐平）
        d.ellipse([22, 50, 74, 100], fill=white)
        # 用同色覆盖超出卡片外的部分
        d.rectangle([6, 90, 90, 100], fill=color)
    else:
        # 圆角矩形描边
        d.rounded_rectangle([6, 6, 90, 90], radius=20, outline=color, width=4)
        # 头部描边
        d.ellipse([33, 22, 63, 52], outline=color, width=4)
        # 身体弧线
        d.arc([22, 46, 74, 98], start=20, end=160, fill=color, width=4)

    return img


def generate_tabbar_icons():
    """生成 6 个 tabbar 图标。"""
    print("==> 生成 tabbar 图标")
    icons = [
        ("chat.png", draw_chat(False)),
        ("chat-active.png", draw_chat(True)),
        ("history.png", draw_history(False)),
        ("history-active.png", draw_history(True)),
        ("mine.png", draw_mine_v2(False)),
        ("mine-active.png", draw_mine_v2(True)),
    ]
    for name, img in icons:
        out_path = os.path.join(TABBAR_DIR, name)
        img.save(out_path, "PNG", optimize=True)
        print(f"   生成: {name} ({img.size})")


if __name__ == "__main__":
    process_ai_images()
    generate_tabbar_icons()
    print("==> 完成！")
