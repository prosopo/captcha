put daemon.json in /etc/docker/daemon.json to enable docker ipv6

```json
{
    "ipv6": true,
    "fixed-cidr-v6": "2001:db8:1::/64"
}
```
