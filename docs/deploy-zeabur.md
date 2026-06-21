# Zeabur 低成本上线说明

这套站点很适合先用 Zeabur 上线，原因很简单：

- 上手快
- 成本低
- 已经支持你这个项目当前的 Docker 部署方式
- 后面你想再换到国内云服务器，也不会白做

## 适不适合你现在

如果你现在目标是：

- 先让公众号里能放一个能打开的正式链接
- 先用较低成本跑起来
- 先验证客户会不会真的提交

那 Zeabur 很适合拿来做第一版公网发布。

## 当前价格重点

Zeabur 官方价格页现在显示：

- `Free`：`$0/月`
- `Dev`：`前 14 天免费，之后 $5/月`

并且价格对比里写了：

- `Free` 计划可用域名数：`0`
- `Dev` 计划可用域名数：`5`

所以如果你想绑自己的正式域名给公众号用，实际上更适合直接上 `Dev`。

## 这套项目现在已经准备好的内容

我已经帮你准备好了这些：

- `Dockerfile`
- 生产环境变量示例：`.env.production.example`
- Next 独立部署输出
- 生产启动方式

也就是说，这个项目已经是“可以上 Zeabur”的状态了。

## 最推荐的上线方式

推荐你用：

1. 把项目放到 GitHub
2. Zeabur 连接 GitHub 仓库
3. 让 Zeabur 按 `Dockerfile` 部署
4. 配置环境变量
5. 绑定你自己的域名
6. 把最终 `https://` 链接放进公众号

## 上线步骤

### 1. 准备代码仓库

先把当前项目放到一个 GitHub 仓库。

建议仓库里不要提交：

- `.env`
- 本地数据库
- `.next`
- `node_modules`

这些当前项目已经在忽略列表里处理了。

### 2. 注册并登录 Zeabur

打开：

- [Zeabur Pricing](https://zeabur.com/pricing)
- [Zeabur Docs](https://zeabur.com/docs/en-US)

如果你要正式域名，建议直接开 `Dev`。

### 3. 在 Zeabur 新建项目

进入 Zeabur 后：

1. 新建一个 Project
2. 选择从 GitHub 导入
3. 选择你的这个仓库
4. 让它识别并使用仓库里的 `Dockerfile`

因为我已经给你补了 `Dockerfile`，通常不需要你手动拼复杂命令。

### 4. 配置环境变量

把下面这些环境变量填到 Zeabur 里：

```env
DATABASE_URL=file:./data/dev.db
DEEPSEEK_API_KEY=你的DeepSeekKey
DEEPSEEK_API_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
NEXT_PUBLIC_CONSULTATION_URL=你的企微获客链接
WECOM_CASE_WEBHOOK_URL=你的企业微信群机器人Webhook
PUBLIC_SITE_URL=https://consumer-rights-review.zeabur.app
```

说明：

- `DATABASE_URL` 这里我已经按当前项目部署方式改成服务器内可用的相对路径
- `NEXT_PUBLIC_CONSULTATION_URL` 就是你现在要给客户点的咨询按钮链接
- `WECOM_CASE_WEBHOOK_URL` 只用于服务端发送新案件通知，不能写进网页或提交到 GitHub
- `PUBLIC_SITE_URL` 用于生成通知里的案件后台链接

### 新案件企业微信通知

配置完成后，客户案件成功保存时，指定企业微信群会收到一条不含客户姓名和联系方式的案件摘要。

验证方式：

1. 在 Zeabur 服务变量中添加 `WECOM_CASE_WEBHOOK_URL` 和 `PUBLIC_SITE_URL`
2. 重新部署服务
3. 使用不含真实客户资料的测试案件验证一次
4. 确认群里收到通知，且后台链接指向正式域名
5. 如果测试案件进入后台，验证后将其标记为关闭

Webhook 属于敏感密钥，不要把真实地址提交到仓库、粘贴到公开页面或放进浏览器端代码。

### 5. 给数据库留持久化空间

你的项目现在用的是 SQLite。

所以在 Zeabur 上，最好给项目挂一个持久化目录，用来存数据库文件。推荐目录：

```text
/app/data
```

这样即使重新部署，客户提交过的案件资料也不会丢。

如果你后面客户量大了，我建议再升级成 PostgreSQL，但第一版先不一定要动。

### 6. 获取公网测试地址

部署完成后，Zeabur 会先给你一个临时公网地址。

你先拿这个地址测试：

- 首页能不能打开
- 提交表单后能不能生成结果
- 后台 `/cases` 能不能看到记录
- 咨询按钮能不能跳到企微链接

### 7. 绑定正式域名

如果要给公众号使用，我建议不要直接用临时地址，最好绑自己的域名。

建议格式：

- `https://rights.你的域名.com`
- 或 `https://fw.你的域名.com`

绑定完成后，把正式域名作为公众号入口使用。

## 给公众号时怎么放

正式上线后，你对外只放这个：

- `https://你的正式域名/`

后台入口：

- `https://你的正式域名/cases`

后台入口不要公开发给客户。

## 我对你当前阶段的建议

如果你现在是“先低成本试跑”，我建议就这么做：

1. 先上 Zeabur `Dev`
2. 先用临时地址测通
3. 没问题后再绑正式域名
4. 再把正式域名放到公众号

这样是最稳、最省时间的一条路。

## 下一步我还能继续帮你做什么

我可以继续帮你做 2 种事情：

1. 帮你把项目整理成“更适合上传 GitHub 的版本”
内容包括：补 README、检查忽略文件、避免敏感信息误传

2. 继续做“上线前保护”
内容包括：给 `/cases` 后台加登录保护，不让客户直接看到后台入口
