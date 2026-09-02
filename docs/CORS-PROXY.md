# 智能客服 CORS 代理部署说明

## 为什么需要它

站点部署在 GitHub Pages（静态托管），浏览器要直连 `https://minnimax.chat/v1/chat/completions` 属于**跨域请求**，且必须带 `Authorization` 头。

实测结论：

| 项目 | 结果 |
| --- | --- |
| POST 响应头 | 带 `Access-Control-Allow-Origin`，CORS 本身是放行的 |
| **OPTIONS 预检** | **返回 405，且不带任何 CORS 头** |
| 浏览器行为 | 带自定义头 + `application/json` 必触发预检 → 预检失败 → 请求被拦截 |
| 绕过尝试 | token 放 URL 参数 / body / 换 `Token` 头 → 全部 401，服务端只认 `Authorization: Bearer` |

**结论：纯前端无论如何都绕不过浏览器预检，必须加一层代理。** 公共 CORS 代理（codetabs / allorigins / cors.workers.dev / corsproxy.io）实测全部不可用（522 / 520 / 429 / 需付费 key），因此建议自建。

代理只需做两件事：**正确响应 OPTIONS 预检**（返回 204 + CORS 头），以及**转发真实请求**。

---

## 方案一：Cloudflare Worker（推荐，免费）

免费额度 10 万次/天，无需自备服务器，全程网页操作约 2 分钟。

### 步骤 1 · 注册 / 登录

打开 <https://dash.cloudflare.com>，用邮箱注册（免费）并登录。

### 步骤 2 · 进入 Workers

左侧菜单点击 **Workers 和 Pages**（新版界面可能叫 **Compute (Workers)**）。
若左侧看不到该入口，点左上角切换一下账号/区域即可。

### 步骤 3 · 创建 Worker

点右上角 **创建**（Create）→ 选 **创建 Worker**（Create Worker）：

- 名称随便填，如 `minimax-proxy`（只能用小写字母、数字、连字符）
- 点 **部署**（Deploy）

### 步骤 4 · 替换代码（关键）

部署完成后点 **编辑代码**（Edit code）：

- **删掉编辑器里全部默认代码**（Hello World 模板）
- 粘贴下面这段代码
- 点右上角 **保存并部署**（Save and Deploy）

```js
/**
 * MiniMax Chat CORS 代理（Cloudflare Worker）
 * 作用：正确响应浏览器 OPTIONS 预检 + 转发真实请求
 */
export default {
  async fetch(request) {
    // 1) 浏览器预检：必须返回 2xx + CORS 头，否则真实请求会被拦截
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() })
    }

    const target = new URL(request.url).searchParams.get('url')
    if (!target) return json({ error: '缺少 url 参数' }, 400)

    // 2) 白名单：只允许转发到 MiniMax，避免被当作开放代理滥用
    if (!/^https:\/\/[a-z0-9.-]*minnimax\.chat\//i.test(target)) {
      return json({ error: '目标地址不在允许范围内' }, 403)
    }

    // 3) 转发（保留 method / body / Authorization 头）
    const fwd = new Headers(request.headers)
    fwd.delete('host')
    const upstream = await fetch(target, {
      method: request.method,
      headers: fwd,
      body: request.method === 'GET' ? undefined : await request.text()
    })

    const body = await upstream.text()
    const headers = corsHeaders()
    headers.set('Content-Type', upstream.headers.get('Content-Type') || 'application/json')
    return new Response(body, { status: upstream.status, headers })
  }
}

function corsHeaders() {
  return new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Gateway-Id',
    'Access-Control-Max-Age': '86400'
  })
}

function json(obj, status) {
  const h = corsHeaders()
  h.set('Content-Type', 'application/json')
  return new Response(JSON.stringify(obj), { status, headers: h })
}
```

### 步骤 5 · 拿到 Worker 地址

部署成功后页面会显示访问地址，形如：

```
https://minimax-proxy.你的账号.workers.dev
```

点地址右侧的复制图标即可。

### 步骤 6 · 先验证代理是否真的能用（建议做）

把下面命令里的 `<你的worker地址>` 换成上一步的地址。

**① 验证预检能否通过（最关键的一步）**

```bash
curl -i -X OPTIONS "https://<你的worker地址>/?url=https%3A%2F%2Fminnimax.chat%2Fv1%2Fchat%2Fcompletions" \
  -H "Origin: https://defen-dfate.github.io" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: authorization,content-type"
```

**预期**：返回 `204`，且响应头里有 `access-control-allow-origin: *`。
若返回 405 或没有 CORS 头 → 说明代码没保存成功，回到步骤 4 检查是否**删干净了默认代码**。

**② 验证能否正常转发对话**

```bash
curl -s -X POST "https://<你的worker地址>/?url=https%3A%2F%2Fminnimax.chat%2Fv1%2Fchat%2Fcompletions" \
  -H "Authorization: Bearer <你的APIKey>" \
  -H "Content-Type: application/json" \
  -d '{"model":"MiniMax-M2.7","messages":[{"role":"user","content":"一句话介绍你自己"}],"max_tokens":60}'
```

> `<你的APIKey>` 就是系统设置里预填的那串 `gw-` 开头的值，去「综合管理 → 系统设置 → AI 智能客服 → API Key」复制即可。

**预期**：返回 JSON，里面有 `"choices"` 和模型的回复内容。

### 步骤 7 · 填入站点设置

打开站点 → **综合管理 → 系统设置 → AI 智能客服 → CORS 代理地址**，填入：

```
https://minimax-proxy.你的账号.workers.dev/?url=
```

> ⚠️ 末尾的 `?url=` **不能少** —— 前端会把目标接口地址编码后拼在它后面。
> 填完即可直接对话，**不需要重新构建或部署站点**（配置存在浏览器本地，刷新即可）。

### 常见问题

| 现象 | 原因 / 处理 |
| --- | --- |
| 站点仍提示跨域被拦截 | 填的地址末尾漏了 `?url=`；或填成了 Worker 编辑页地址 |
| 返回「目标地址不在允许范围内」 | 白名单生效了，说明 `url` 参数不对，检查是否漏了 `?url=` |
| 返回「缺少 url 参数」 | 同上，前端没把目标地址拼上去 |
| 对话超时无响应 | Worker 首次冷启动较慢，再试一次；或检查 Worker 是否部署成功 |
| 想收紧安全 | 把代码里 `'Access-Control-Allow-Origin': '*'` 改成 `'https://defen-dfate.github.io'` |

---

## 方案二：自有服务器（Node.js）

适合已有公网服务器 / K8s 集群。Node 18+ 内置 `fetch`，无需额外依赖。

```js
// server.js —— 运行：node server.js （默认监听 8787）
const http = require('http')

const PORT = process.env.PORT || 8787
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Gateway-Id',
  'Access-Control-Max-Age': '86400'
}

http.createServer(async (req, res) => {
  // 预检
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS)
    return res.end()
  }

  const target = new URL(req.url, 'http://localhost').searchParams.get('url')
  if (!target) {
    res.writeHead(400, { ...CORS, 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: '缺少 url 参数' }))
  }
  if (!/^https:\/\/[a-z0-9.-]*minnimax\.chat\//i.test(target)) {
    res.writeHead(403, { ...CORS, 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: '目标地址不在允许范围内' }))
  }

  try {
    const chunks = []
    for await (const c of req) chunks.push(c)

    const fwd = { ...req.headers }
    delete fwd.host
    const upstream = await fetch(target, {
      method: req.method,
      headers: fwd,
      body: req.method === 'GET' ? undefined : Buffer.concat(chunks)
    })
    const body = await upstream.text()

    res.writeHead(upstream.status, {
      ...CORS,
      'Content-Type': upstream.headers.get('content-type') || 'application/json'
    })
    res.end(body)
  } catch (e) {
    res.writeHead(502, { ...CORS, 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: String(e && e.message) }))
  }
}).listen(PORT, () => console.log('proxy listening on ' + PORT))
```

用 Docker / K8s 部署均可，对外暴露后（建议套 HTTPS），在设置里填：

```
https://你的域名或IP:端口/?url=
```

---

## 方案三：Nginx（固定转发，最省事）

不需要读 `url` 参数，直接把某个路径固定转发到 MiniMax：

```nginx
location /mmproxy {
    # 预检直接放行
    if ($request_method = OPTIONS) {
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods 'GET,POST,OPTIONS';
        add_header Access-Control-Allow-Headers 'Content-Type,Authorization';
        add_header Access-Control-Max-Age 86400;
        return 204;
    }

    add_header Access-Control-Allow-Origin * always;
    proxy_pass https://minnimax.chat/v1/chat/completions;
    proxy_set_header Host minnimax.chat;
    proxy_ssl_server_name on;
}
```

在设置里填：`https://你的域名/mmproxy?url=`
（Nginx 会忽略多余的 `url` 参数，固定转发到 MiniMax，不影响功能。）

---

## 前端对应实现

- 配置项：`AIConfig.proxyUrl`（综合管理 → 系统设置 → AI 智能客服）
- 拼接规则：`最终URL = proxyUrl + encodeURIComponent(目标URL)`
- 代码位置：`src/api/ai.ts` 的 `buildUrl()`；未填代理时走直连
- 捕获到跨域/网络错误时，界面会提示去设置里填写代理地址

## 安全提醒

- 三个方案都加了**目标白名单**，只允许转发到 `minnimax.chat`，避免服务器被当作开放代理利用。
- 建议把 `Access-Control-Allow-Origin: *` 改成你的站点域名（如 `https://defen-dfate.github.io`）以进一步收紧。
