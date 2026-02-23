# カスタム Gotenberg イメージ — 日本語フォント追加
# ＭＳ Ｐゴシック等の代替として Noto Sans CJK JP / IPAGothic を含む
FROM gotenberg/gotenberg:8

USER root

# 日本語フォントをインストール
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      fonts-noto-cjk \
      fonts-noto-cjk-extra \
      fonts-ipafont-gothic \
      fonts-ipafont-mincho && \
    fc-cache -f -v && \
    rm -rf /var/lib/apt/lists/*

USER gotenberg
