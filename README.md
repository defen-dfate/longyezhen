# WorkBench · 个人工作门户

基于 **Vue 3 + Vite + TypeScript + Pinia + ECharts** 的个人工作门户，集成四大模块：

1. **个人简历** —— 基本信息 / 专业技能 / 工作经历 / 项目作品 / 教育背景
2. **实用工具** —— 图像压缩（可指定目标大小、批量、打包下载）等本地小工具
3. **WebGIS** —— 复现的水库地震监测与层析成像
4. **综合管理** —— 各模块运行状态监测、健康检测、真实运行时指标与系统日志

---

## 本地开发

npm install
npm run dev
npm run build
npm run build:only
npm run preview

## 部署到 GitHub Pages

1. 将本目录初始化为 Git 仓库并提交：

   git init
   git add .
   git commit -m "init"

2. 在 GitHub 新建仓库，并关联为 origin：

   git remote add origin https://github.com/<你的用户名>/<仓库名>.git
   git branch -M main
   git push -u origin main

3. 仓库 Settings → Pages → Build and deployment → Source：GitHub Actions。
4. （可选）仓库 Settings → Secrets and variables → Actions → Variables 添加：
   - VITE_AUTH_MODE（api 或留空用 mock）
   - VITE_API_BASE（真实后端地址）
   - VITE_TIANDITU_KEY（天地图 key，启用瓦片底图）
5. 推送 main 分支即触发 .github/workflows/deploy.yml 自动构建并发布。
   站点地址：https://<用户名>.github.io/<仓库名>/

> 工作流会自动以 /<仓库名>/ 作为 VITE_PUBLIC_PATH，无需手动设置。

## 说明

- 所有数据均为确定性合成演示数据，仅用于展示功能链路，不代表真实地质结论。
- WebGIS 的噪声面波成像、棋盘格测试、成像结果等为方法链路的示意性仿真。
- 运营数据（访问、日志、压缩统计、健康检测）持久化于浏览器 localStorage。
