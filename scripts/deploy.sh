#!/bin/bash

echo "🚀 开始部署流程..."

# 切换到前端项目目录
cd artcamera_front

# 1. 清理旧文件
echo "📦 清理旧的构建文件..."
rm -rf dist

# 2. 安装依赖（如果需要）
if [ ! -d "node_modules" ]; then
  echo "📥 安装依赖..."
  npm install
fi

# 3. 构建项目
echo "🔨 构建项目..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ 构建失败，请检查错误信息"
  exit 1
fi

# 4. 选择部署平台
echo ""
echo "请选择部署平台:"
echo "1) Vercel (推荐，速度最快)"
echo "2) Netlify (简单易用)"
echo "3) GitHub Pages (当前方案)"
read -p "输入选项 (1-3): " choice

case $choice in
  1)
    echo "🚀 部署到 Vercel..."
    if ! command -v vercel &> /dev/null; then
      echo "⚠️  未安装 Vercel CLI，正在安装..."
      npm install -g vercel
    fi
    vercel --prod
    ;;
  2)
    echo "🚀 部署到 Netlify..."
    if ! command -v netlify &> /dev/null; then
      echo "⚠️  未安装 Netlify CLI，正在安装..."
      npm install -g netlify-cli
    fi
    netlify deploy --prod --dir=dist
    ;;
  3)
    echo "🚀 部署到 GitHub Pages..."
    npm run deploy
    ;;
  *)
    echo "❌ 无效选项"
    exit 1
    ;;
esac

echo ""
echo "✅ 部署完成!"
echo "💡 提示: 如果图片加载还是很慢，请运行 ./scripts/compress-images.sh 压缩图片"
