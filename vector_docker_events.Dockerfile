FROM prosopo/vector:latest

# Add Docker's official GPG key:
RUN apt-get update \
&& apt-get install -y ca-certificates curl \
&& install -m 0755 -d /etc/apt/keyrings \
&& curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc \
&& chmod a+r /etc/apt/keyrings/docker.asc \
# Add the repository to Apt sources:
&& echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null \
&& apt-get update \
&& apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin \
&& apt-get clean \
&& rm -rf /var/lib/apt/lists/*

# https://docs.docker.com/reference/cli/docker/system/events/#containers
# start – Indicates that the container has been started.
# stop – Indicates that the container has been stopped.
# restart – Indicates that the container has been restarted.
# die – Indicates that the container has stopped running (either due to a crash or intentional termination).
# pause – Indicates that the container is paused, meaning it is not actively running but hasn't been stopped.
# unpause – Indicates that the container has resumed running after being paused.
# kill – Indicates that the container has been forcefully terminated.
# oom – Indicates that the container was terminated due to running out of memory (Out-Of-Memory).
ENTRYPOINT ["bash", "-c", "docker events --format json --filter label=vector.events=true --filter event=start --filter event=stop --filter event=restart --filter event=die --filter event=pause --filter event=unpause --filter event=kill --filter event=oom | /vector.sh"]
