## 获取api key
kimi plan key 获取地址：https://www.kimi.com/code/console
minimax plan key获取地址：https://platform.minimaxi.com/console/plan

## 配置bash命令
```bash

~/.bashrc


# ===== 切到 Kimi =====
use_kimi() {
  export ANTHROPIC_BASE_URL="https://api.kimi.com/coding/"
  export ANTHROPIC_API_KEY="你的Kimi-Key"   # 会员页拿的,sk-kimi- 开头
  export ANTHROPIC_MODEL="kimi-for-coding"
  export ANTHROPIC_DEFAULT_OPUS_MODEL="kimi-for-coding"
  export ANTHROPIC_DEFAULT_SONNET_MODEL="kimi-for-coding"
  export ANTHROPIC_DEFAULT_HAIKU_MODEL="kimi-for-coding"
  export CLAUDE_CODE_SUBAGENT_MODEL="kimi-for-coding"
  export CLAUDE_CODE_AUTO_COMPACT_WINDOW="262144"
  echo "已切换到 Kimi"
}

# ===== 切到 MiniMax =====
use_minimax() {
  export ANTHROPIC_BASE_URL="https://api.minimaxi.com/anthropic"
  export ANTHROPIC_API_KEY="你的MiniMax-Key"
  export ANTHROPIC_MODEL="minimax-m2"
  export ANTHROPIC_DEFAULT_OPUS_MODEL="minimax-m2"
  export ANTHROPIC_DEFAULT_SONNET_MODEL="minimax-m2"
  echo "已切换到 MiniMax"
}

# ===== 恢复官方(在这台 ECS 上其实用不了,留作参考)=====
use_official() {
  unset ANTHROPIC_BASE_URL ANTHROPIC_API_KEY ANTHROPIC_MODEL
  unset ANTHROPIC_DEFAULT_OPUS_MODEL ANTHROPIC_DEFAULT_SONNET_MODEL ANTHROPIC_DEFAULT_HAIKU_MODEL
  echo "已恢复官方 Claude"
}
```

## 跳过引导登录

```bash
node --eval "
const os=require('os'),fs=require('fs'),path=require('path');
const fp=path.join(os.homedir(),'.claude.json');
const c=fs.existsSync(fp)?JSON.parse(fs.readFileSync(fp,'utf-8')):{};
c.hasCompletedOnboarding=true;
fs.writeFileSync(fp,JSON.stringify(c,null,2));
console.log('done');
"

```