发布客户端新版本更新（推送到 GitHub 并打 tag）的完整步骤与命令总结如下：

### 1. 修改版本号 (Bumping Versions)
发布前需要同步修改前端、Tauri 配置文件以及 Rust 后壳的版本号（以更新到 `0.6.1` 为例）：

* **前端配置** `package.json`：
  ```json
  "version": "0.6.1"
  ```
* **Tauri 桌面配置** `src-tauri/tauri.conf.json`：
  ```json
  "version": "0.6.1"
  ```
* **Rust 依赖配置** `src-tauri/Cargo.toml`：
  ```toml
  [package]
  version = "0.6.1"
  ```

修改完毕后，在 `src-tauri` 目录下更新 Rust 的锁文件以同步版本：
```bash
cd src-tauri
cargo update -p app
cd ..
```

---

### 2. 提交代码并推送到远端主分支 (Pushing Code)
将本地所有的修改提交到本地 Git，然后推送到远端 GitHub `main` 分支（此时只会同步代码，不会触发客户端打包流程）：

```bash
# 暂存所有更改
git add -A

# 提交并备注版本说明
git commit -m "v0.6.1：一级菜单默认不展开 + 13种场景Excel导出 + 图表还原复位功能"

# 推送到远端主分支
git push origin main
```

---

### 3. 创建并推送 Git Tag 触发自动构建发布 (Tagging & Triggering CI)
推送 `v` 开头的版本标签到远端 GitHub。GitHub Actions 检测到新 tag 推送后，会自动启动 CI 构建服务器，为 macOS (dmg) 和 Windows (exe/msi) 平台打包生成携带更新证书签名的最新客户端，并自动发布到 GitHub Releases 页：

```bash
# 在本地打上版本 tag（例如 v0.6.1）
git tag v0.6.1

# 推送 tag 到远端 GitHub
git push origin v0.6.1
```

---

### 4. 客户端检测自动更新 (User Client Auto Update)
新版本在 GitHub Actions 构建完毕后（耗时约 15~25 分钟），客户端用户侧会发生以下行为：
* 每次打开应用会读取最新的 `latest.json` 并与本地版本比较，若检测到 `0.6.1` 会弹出**“发现新版本”**更新提示。
* 用户也可以在应用内头像菜单中手动点击 **“检查更新”** 来立即获取并下载安装最新版本。