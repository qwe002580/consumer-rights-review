# 消费纠纷评估站点

这是一个给客户提交消费纠纷信息、自动生成分析结果、并在后台查看案件记录的站点。

## 当前功能

- 客户填写案件信息
- 自动生成分析结果
- 结果页引导客户点击咨询
- 后台查看案件列表
- 后台查看单个案件详情和处理备注

## 本地预览

```bash
npm install
npm run dev
```

打开：

- `http://localhost:3000/`
- `http://localhost:3000/cases`

## 环境变量

参考：

- [`.env.example`](/Users/chill/Documents/Codex/2026-06-18/new-chat-2/.env.example:1)
- [`.env.production.example`](/Users/chill/Documents/Codex/2026-06-18/new-chat-2/.env.production.example:1)

## 上线说明

- 公众号公网部署说明：[deploy-wechat-public.md](/Users/chill/Documents/Codex/2026-06-18/new-chat-2/docs/deploy-wechat-public.md:1)
- Zeabur 部署说明：[deploy-zeabur.md](/Users/chill/Documents/Codex/2026-06-18/new-chat-2/docs/deploy-zeabur.md:1)

## 现在最推荐的上线方式

如果你是第一次正式上线，当前推荐：

- GitHub
- Zeabur Dev
- 自己的正式域名

这样成本低、部署快，也比较适合先放到公众号里测试。
