#!/bin/bash

echo "🖼️  开始压缩图片..."

# 切换到前端项目目录
cd artcamera_front/public

# 检查是否安装了 ImageMagick
if ! command -v convert &> /dev/null; then
  echo "⚠️  未安装 ImageMagick"
  echo "请运行: brew install imagemagick (macOS)"
  echo "或访问 https://tinypng.com 手动压缩图片"
  exit 1
fi

# 检查是否安装了 cwebp (WebP 转换工具)
if ! command -v cwebp &> /dev/null; then
  echo "⚠️  未安装 WebP 工具"
  echo "请运行: brew install webp (macOS)"
  echo ""
  read -p "是否继续使用 JPG 压缩? (y/n): " continue
  if [ "$continue" != "y" ]; then
    exit 1
  fi
  USE_WEBP=false
else
  USE_WEBP=true
fi

# 创建备份目录
BACKUP_DIR="../public-backup-$(date +%Y%m%d%H%M%S)"
echo "📦 创建备份到 $BACKUP_DIR"
cp -r . "$BACKUP_DIR"

# 压缩 JPG 图片
echo "📉 压缩 JPG 图片 (质量: 75)..."
find . -name "*.jpg" -o -name "*.jpeg" | while read img; do
  echo "  处理: $img"
  convert "$img" -quality 75 -strip "$img.tmp"
  mv "$img.tmp" "$img"
done

# 压缩 PNG 图片
echo "📉 压缩 PNG 图片..."
find . -name "*.png" | while read img; do
  echo "  处理: $img"
  convert "$img" -strip "$img.tmp"
  mv "$img.tmp" "$img"
done

# 转换为 WebP（可选）
if [ "$USE_WEBP" = true ]; then
  echo "🎨 转换为 WebP 格式..."
  find . -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" | while read img; do
    webp_name="${img%.*}.webp"
    echo "  转换: $img -> $webp_name"
    cwebp -q 75 "$img" -o "$webp_name" 2>/dev/null
  done
fi

# 计算压缩效果
ORIGINAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
NEW_SIZE=$(du -sh . | cut -f1)

echo ""
echo "✅ 压缩完成!"
echo "📊 原始大小: $ORIGINAL_SIZE"
echo "📊 压缩后: $NEW_SIZE"
echo "💾 备份位置: $BACKUP_DIR"
echo ""
echo "💡 提示: 如果效果不满意，可以从备份恢复:"
echo "   rm -rf public/* && cp -r $BACKUP_DIR/* public/"
