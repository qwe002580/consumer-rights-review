# GitHub 到 Zeabur 部署步骤

这份说明是给“不会部署”的情况准备的。

我已经把项目本地整理好了，你现在只需要按下面步骤操作。

## 先说清楚哪些步骤必须你自己点

下面这些我不能替你完成，只能指导你：

- 注册 GitHub
- 登录 GitHub
- 注册 Zeabur
- 登录 Zeabur
- 绑定银行卡或付款
- 绑定你的域名
- 需要短信、人机验证、邮箱验证的步骤

除此之外，其余我都已经尽量帮你准备好了。

## 第 1 步：创建 GitHub 仓库

1. 打开 [GitHub](https://github.com)
2. 登录你的账号
3. 点击右上角 `+`
4. 选择 `New repository`
5. 仓库名建议填：
   - `consumer-rights-review`
6. 选择：
   - `Private`
7. 不要勾选自动生成 README
8. 点击 `Create repository`

创建完以后，GitHub 会显示一个空仓库页面。

## 第 2 步：把本地项目传到 GitHub

因为你这边不是技术用户，我建议你直接用图形界面工具上传，最省心的是：

- GitHub Desktop

如果你机器上没有，我下一步也可以继续带你装。

如果你已经装了 GitHub Desktop，就按这个做：

1. 打开 GitHub Desktop
2. 选择 `Add an Existing Repository from your Hard Drive`
3. 选择这个目录：

```text
/Users/chill/Documents/Codex/2026-06-18/new-chat-2
```

4. 如果它提示不是已发布仓库，不用怕，继续
5. 填一个提交说明，比如：
   - `first deploy version`
6. 点击提交
7. 再点击 `Publish repository`
8. 选择：
   - 保持 `Private`
9. 发布到你刚才的 GitHub 账号

## 第 3 步：注册并登录 Zeabur

1. 打开 [Zeabur Pricing](https://zeabur.com/pricing)
2. 登录或注册
3. 选择 `Dev`

原因：

- 前 14 天免费
- 后续 `5 美元/月`
- 可以绑定自定义域名

## 第 4 步：在 Zeabur 导入 GitHub 项目

1. 进入 Zeabur Dashboard
2. 点击新建 Project
3. 选择从 GitHub 导入
4. 授权 Zeabur 访问你的 GitHub
5. 选择刚才那个仓库

这个项目已经有 `Dockerfile`，通常 Zeabur 会自动识别。

## 第 5 步：在 Zeabur 填环境变量

把下面这些填进去：

```env
DATABASE_URL=file:./data/dev.db
DEEPSEEK_API_KEY=你的DeepSeekKey
DEEPSEEK_API_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
NEXT_PUBLIC_CONSULTATION_URL=你的企微获客链接
```

注意：

- 这里的 `DEEPSEEK_API_KEY` 要填你自己的真实 Key
- 因为这个 Key 曾经在本地使用过，正式上线前我建议你后面把旧 Key 旋转一下，换一个新的

## 第 6 步：给数据库留存储目录

你的项目现在用的是 SQLite。

所以要在 Zeabur 里给它一个持久化目录，建议使用：

```text
/app/data
```

这样客户提交过的资料不会因为重新部署而丢掉。

## 第 7 步：第一次部署完成后先测 4 件事

拿到 Zeabur 给你的公网地址后，先测试：

1. 首页能否打开
2. 提交案件后是否能成功出结果
3. `/cases` 后台是否能看到记录
4. 咨询按钮是否跳转到你的企微链接

## 第 8 步：绑定正式域名

如果你要给公众号正式用，建议不要直接用临时地址。

推荐绑定：

- `rights.你的域名.com`
- `service.你的域名.com`
- `fw.你的域名.com`

绑定后，把正式的 `https://` 链接放进公众号。

## 第 9 步：公众号对外只放前台地址

对客户公开：

- `https://你的正式域名/`

不要公开后台：

- `https://你的正式域名/cases`

## 你下一步最简单的动作

如果你现在就要继续，最简单的顺序是：

1. 先注册 GitHub
2. 再注册 Zeabur
3. 然后告诉我你现在卡在哪一步

你只要跟我说：

- `我已经建好 GitHub 仓库了`

或者：

- `我已经登录 Zeabur 了`

我就继续往下带你走。
