#!/bin/bash

echo "🚀 ArtCamera 前端快速部署"
echo ""

# 检查 dist 目录
if [ ! -d "dist" ]; then
    echo "❌ dist 目录不存在，请先构建项目"
    exit 1
fi

echo "📦 dist 目录大小: $(du -sh dist | cut -f1)"
echo ""

# 检查可用的服务器
if command -v python3 &> /dev/null; then
    echo "✅ 检测到 Python 3"
    echo "🚀 启动服务器在 http://localhost:8080"
    echo ""
    cd dist
    python3 -m http.server 8080
elif command -v python &> /dev/null; then
    echo "✅ 检测到 Python 2"
    echo "🚀 启动服务器在 http://localhost:8080"
    echo ""
    cd dist
    python -m SimpleHTTPServer 8080
elif command -v serve &> /dev/null; then
    echo "✅ 检测到 serve"
    echo "🚀 启动服务器在 http://localhost:8080"
    echo ""
    serve -s dist -p 8080
else
    echo "❌ 未检测到可用的服务器"
    echo ""
    echo "请选择安装方式："
    echo "1) 安装 serve (需要 Node.js)"
    echo "2) 手动使用 Python"
    read -p "输入选项 (1-2): " choice

    case $choice in
        1)
            npm install -g serve
            serve -s dist -p 8080
            ;;
        2)
            echo "请手动运行: cd dist && python3 -m http.server 8080"
            ;;
        *)
            echo "❌ 无效选项"
            exit 1
            ;;
    esac
fi
