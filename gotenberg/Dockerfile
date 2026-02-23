# カスタム Gotenberg イメージ — 日本語フォント追加 + フォント置換設定
# ＭＳ Ｐゴシック → IPAGothic, Yu Gothic → Noto Sans CJK JP 等
FROM gotenberg/gotenberg:8

USER root

# 日本語フォントをインストール + Noto Serif（Century代替）
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      fonts-noto-cjk \
      fonts-noto-cjk-extra \
      fonts-ipafont-gothic \
      fonts-ipafont-mincho \
      fonts-noto-core \
      locales && \
    sed -i '/ja_JP.UTF-8/s/^# //g' /etc/locale.gen && \
    locale-gen ja_JP.UTF-8 && \
    fc-cache -f -v && \
    rm -rf /var/lib/apt/lists/*

# fontconfig: Windows日本語フォント → インストール済み日本語フォントへ置換
COPY 99-japanese-fonts.conf /etc/fonts/conf.d/99-japanese-fonts.conf

# LibreOffice フォント置換テーブル（registrymodifications.xcu）
RUN mkdir -p /home/gotenberg/.config/libreoffice/4/user && \
    echo '<?xml version="1.0" encoding="UTF-8"?>' > /home/gotenberg/.config/libreoffice/4/user/registrymodifications.xcu && \
    echo '<oor:items xmlns:oor="http://openoffice.org/2001/registry" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' >> /home/gotenberg/.config/libreoffice/4/user/registrymodifications.xcu && \
    echo '<item oor:path="/org.openoffice.Office.Common/Font/Substitution"><prop oor:name="Replacement" oor:op="fuse"><value>true</value></prop></item>' >> /home/gotenberg/.config/libreoffice/4/user/registrymodifications.xcu && \
    echo '<item oor:path="/org.openoffice.Office.Common/Font/Substitution/FontPairs"><node oor:name="MSPGothic" oor:op="fuse"><prop oor:name="Always"><value>true</value></prop><prop oor:name="OnScreenOnly"><value>false</value></prop><prop oor:name="ReplaceFont"><value>ＭＳ Ｐゴシック</value></prop><prop oor:name="SubstFont"><value>IPAGothic</value></prop></node></item>' >> /home/gotenberg/.config/libreoffice/4/user/registrymodifications.xcu && \
    echo '<item oor:path="/org.openoffice.Office.Common/Font/Substitution/FontPairs"><node oor:name="MSGothic" oor:op="fuse"><prop oor:name="Always"><value>true</value></prop><prop oor:name="OnScreenOnly"><value>false</value></prop><prop oor:name="ReplaceFont"><value>ＭＳ ゴシック</value></prop><prop oor:name="SubstFont"><value>IPAGothic</value></prop></node></item>' >> /home/gotenberg/.config/libreoffice/4/user/registrymodifications.xcu && \
    echo '<item oor:path="/org.openoffice.Office.Common/Font/Substitution/FontPairs"><node oor:name="YuGothic" oor:op="fuse"><prop oor:name="Always"><value>true</value></prop><prop oor:name="OnScreenOnly"><value>false</value></prop><prop oor:name="ReplaceFont"><value>Yu Gothic</value></prop><prop oor:name="SubstFont"><value>Noto Sans CJK JP</value></prop></node></item>' >> /home/gotenberg/.config/libreoffice/4/user/registrymodifications.xcu && \
    echo '<item oor:path="/org.openoffice.Office.Common/Font/Substitution/FontPairs"><node oor:name="MSPMincho" oor:op="fuse"><prop oor:name="Always"><value>true</value></prop><prop oor:name="OnScreenOnly"><value>false</value></prop><prop oor:name="ReplaceFont"><value>ＭＳ Ｐ明朝</value></prop><prop oor:name="SubstFont"><value>IPAMincho</value></prop></node></item>' >> /home/gotenberg/.config/libreoffice/4/user/registrymodifications.xcu && \
    echo '<item oor:path="/org.openoffice.Office.Common/Font/Substitution/FontPairs"><node oor:name="MSMincho" oor:op="fuse"><prop oor:name="Always"><value>true</value></prop><prop oor:name="OnScreenOnly"><value>false</value></prop><prop oor:name="ReplaceFont"><value>ＭＳ 明朝</value></prop><prop oor:name="SubstFont"><value>IPAMincho</value></prop></node></item>' >> /home/gotenberg/.config/libreoffice/4/user/registrymodifications.xcu && \
    echo '</oor:items>' >> /home/gotenberg/.config/libreoffice/4/user/registrymodifications.xcu && \
    chown -R gotenberg:gotenberg /home/gotenberg/.config

# フォントキャッシュを再構築
RUN fc-cache -f -v

# 日本語ロケールを設定
ENV LANG=ja_JP.UTF-8
ENV LC_ALL=ja_JP.UTF-8

USER gotenberg
