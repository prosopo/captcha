# 1. Tools usage

## 1.1) CLI

```
# docker composer up
docker exec -it <redis-stack> redis-cli
AUTH {password}
PING
```

## 1.2) Benchmark

```
# docker composer up
docker exec -it <redis-stack> redis-benchmark -a {pass}
```

# 2. "Hash vs. JSON" benchmark

## 2.1) Results

| Data Type | Record size, B | Record index size, B | 1M items size, MB | 1M item inserts throughput | 
|-----------|----------------|----------------------|-------------------|----------------------------|
| hash      | 376            | 52                   | 407 (358 + 49)    | 171K requests / second     |
| json      | 709            | 52                   | 725 (676 + 49)    | 135K requests / second     |

## 2.2) Reproducing

### Item size

```
docker exec -it redis-stack redis-cli
auth <password>

hset hash-item ip "3232235520" rangeStart "3232235521" rangeEnd "3232235522" configSolvedCount "434" configUnsolvedCount "124" isUserBlocked "1" ja4 "098f6bcd4621d373cade4e832627b4f6" userId "8b04d5e3775d298e78455efc5ca404d5" clientId "a9f0e61a137d86aa9db53465e0801612" headerHash "dd5c8bf51558ffcbe5007071908e9524"
json.set json-item $ '{"ip":3232235520,"rangeStart":3232235521,"rangeEnd":3232235522,"configSolvedCount":434,"configUnsolvedCount":124,"isUserBlocked":1,"ja4":"098f6bcd4621d373cade4e832627b4f6","userId":"8b04d5e3775d298e78455efc5ca404d5","clientId":"a9f0e61a137d86aa9db53465e0801612","headerHash":"dd5c8bf51558ffcbe5007071908e9524"}'

memory usage hash-item
memory usage json-item

ft.create idx:hash-item ON HASH PREFIX 1 hash- SCHEMA ip NUMERIC rangeStart NUMERIC rangeEnd NUMERIC isUserBlocked NUMERIC ja4 TEXT userId TEXT clientId TEXT headerHash TEXT
ft.create idx:json-item ON JSON PREFIX 1 json- SCHEMA $.ip AS ip NUMERIC $.rangeStart AS rangeStart NUMERIC $.rangeEnd AS rangeEnd NUMERIC $.isUserBlocked AS isUserBlocked NUMERIC $.ja4 AS ja4 TEXT $.userId AS userId TEXT $.clientId AS clientId TEXT $.headerHash AS headerHash TEXT

ft.info idx:hash-item
# bytes_per_record_avg
ft.info idx:json-item
# bytes_per_record_avg
```

### 1M item inserts throughput

```
docker exec -it redis-stack redis-benchmark  -n 1000000 -r 1000000 -a <password> script load 'local key = KEYS[1]; local value = ARGV[1]; return redis.call("HSET", key, "ip", value, "rangeStart", value+1, "rangeEnd", value+2, "configSolvedCount", "434", "configUnsolvedCount", "124", "isUserBlocked", "1", "ja4", "098f6bcd4621d373cade4e832627b4f6", "userId", "8b04d5e3775d298e78455efc5ca404d5", "clientId", "a9f0e61a137d86aa9db53465e0801612", "headerHash", "dd5c8bf51558ffcbe5007071908e9524")'
# throughput summary: <x> requests per second

docker exec -it redis-stack redis-benchmark -n 1000000 -r 1000000 -a <password> script load 'local key = KEYS[1]; local value = ARGV[1]; return redis.call("JSON.SET", key, "$", string.format("{\"ip\":\"%s\",\"rangeStart\":\"%s\",\"rangeEnd\":\"%s\",\"configSolvedCount\":\"434\",\"configUnsolvedCount\":\"124\",\"isUserBlocked\":\"1\",\"ja4\":\"098f6bcd4621d373cade4e832627b4f6\",\"userId\":\"8b04d5e3775d298e78455efc5ca404d5\",\"clientId\":\"a9f0e61a137d86aa9db53465e0801612\",\"headerHash\":\"dd5c8bf51558ffcbe5007071908e9524\"}", value, value+1, value+2))'
# throughput summary: <x> requests per second
```
