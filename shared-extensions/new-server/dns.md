
注意cloudflare把 橙云关掉，开启 dns only。

![Cloudflare 关闭橙云、切换为 DNS only](./assets/cloudflare-dns-only.png)

否则，端口会无人应答哦
```bash
➜  ~ ssh my-account@aliyun.viruspc.tech
ssh: connect to host aliyun.viruspc.tech port 22: Operation timed out
```

原因其实是打到 Cloudflare 边缘节点上了,而 Cloudflare 默认只反代 HTTP/HTTPS 那批端口,**不转发 22**,

```bash
➜  ~ dig +short aliyun.viruspc.tech
104.21.72.224
172.67.187.208
```

