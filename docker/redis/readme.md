# 1. Tools usage

## 1.1) CLI

```
# docker composer up
sudo docker exec -it {container_id} redis-cli
AUTH {password}
```

## 1.2) Benchmark

```
# docker composer up
sudo docker exec -it {container_id} redis-benchmark -a {pass}
```
