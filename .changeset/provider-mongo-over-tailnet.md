---
"@prosopo/provider": patch
---

Pin `mongo1.prosopo.io` to its tailnet address inside the provider containers.

The providers reached the database over the public internet: out to a traefik TCP router on `prosvr3`, which terminated TLS and re-originated plaintext to the guest. Both provider services now carry an `extra_hosts` entry mapping `mongo1.prosopo.io` to `100.64.0.21`, so the connection goes over WireGuard instead and the encryption terminates on `mongo1` itself rather than on a proxy.

The host mapping is the part that makes this work. `mongod` runs `--replSet rs0`, so it advertises itself as `mongo1.prosopo.io:27018`, and the driver re-dials that advertised name in preference to the address it was seeded with. Changing only the connection string sends the traffic straight back out to the load balancer — that is what rolled back the two previous attempts. Overriding the name covers the seed and the advertised host together.

The address is written literally rather than interpolated from a compose variable. Eighteen playbooks run `docker compose` against this file, each supplying its own environment, and a variable that any one of them forgets expands to `mongo1.prosopo.io:` and stops the container from starting. It is inert where `mongo1` is not the database — staging points at a different host.
