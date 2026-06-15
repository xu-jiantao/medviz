# 云同步后端免费部署指南（Render + Neon）

把 MedViz 的云同步后端免费部署到公网，实现跨设备的账号 + 项目备份。
**全程不用绑银行卡。** 三步，约 10 分钟。

> 列线图「从数据拟合」走的是桌面内置后端（localhost），和这里的云同步是两套独立地址，互不影响。

---

## 第 1 步：建免费 Postgres 数据库（Neon）

1. 打开 https://neon.tech ，用 GitHub 账号登录（免费，不要卡）
2. 点 **Create project**（项目名随意，区域选离你近的）
3. 创建后会显示一个 **Connection string（连接串）**，形如：
   ```
   postgresql://用户名:密码@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
4. **复制这串**，下一步要用（先存到记事本）

---

## 第 2 步：部署后端（Render）

1. 打开 https://render.com ，用 GitHub 账号登录（免费，不要卡）
2. 点 **New → Blueprint**
3. 选你的仓库 **marinerxyz/medviz** → Render 会自动读到根目录的 `render.yaml`
4. 部署时它会让你填一个环境变量 **DATABASE_URL** → 把第 1 步复制的 Neon 连接串粘进去
   （`MEDVIZ_SECRET` 会自动生成，不用管）
5. 点 **Apply / Create**，等 3~5 分钟构建完成
6. 完成后得到一个公网地址，形如：
   ```
   https://medviz-backend.onrender.com
   ```

> 如果不用 Blueprint，也可手动 **New → Web Service**：
> Root Directory 填 `backend`；
> Build Command 填 `pip install -r requirements-cloud.txt`；
> Start Command 填 `uvicorn app:app --host 0.0.0.0 --port $PORT`；
> 再到 Environment 加 `DATABASE_URL`（Neon 串）和 `MEDVIZ_SECRET`（任意一长串随机字符）。

**验证**：浏览器打开 `https://你的地址.onrender.com/health`，看到 `{"status":"ok"}` 即成功。

---

## 第 3 步：在 MedViz 里启用

1. 打开 MedViz → 顶栏 **我的项目** → 拉到底 **云同步**
2. **后端地址** 改成你的 Render 地址：`https://medviz-backend.onrender.com`
3. 点 **注册** → 建一个云账号（和本地账号可以不同）
4. 以后用 **上传到云** 备份、换设备时 **从云恢复**

---

## 免费版注意事项

- **冷启动**：Render 免费机闲置约 15 分钟后会休眠，**下次首访要等 ~50 秒**唤醒，之后就快了。属正常现象。
- **Neon**：免费额度对个人/小团队完全够用；计算实例闲置会自动挂起，连接时自动唤醒。
- **数据持久**：账号和项目存在 Neon 的 Postgres 里，Render 重启/重新部署都不会丢（这正是不用 SQLite 的原因）。
- 想换成始终在线、不冷启动，可升级 Render 付费档（不是必须）。
