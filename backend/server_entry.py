"""PyInstaller 打包用的入口：以独立进程方式启动 FastAPI 服务。
被 Tauri 作为 sidecar 拉起，监听 127.0.0.1:8000。"""

import multiprocessing
import sys


def main() -> None:
    import uvicorn
    from app import app

    print("[medviz-backend] starting uvicorn on 127.0.0.1:8000 ...", flush=True)
    config = uvicorn.Config(app, host="127.0.0.1", port=8000, log_level="info")
    server = uvicorn.Server(config)
    server.run()


if __name__ == "__main__":
    multiprocessing.freeze_support()  # PyInstaller 冻结后多进程必需
    print(f"[medviz-backend] boot, frozen={getattr(sys, 'frozen', False)}", flush=True)
    main()
