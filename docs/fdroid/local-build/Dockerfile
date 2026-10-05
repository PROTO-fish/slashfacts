# fdroidserver's image plus the recipe's sudo step: local `fdroid build` skips `sudo`,
# so Node comes from Debian forky here, as it does on the buildserver.
FROM registry.gitlab.com/fdroid/docker-executable-fdroidserver:master
USER root
RUN echo "deb https://deb.debian.org/debian forky main" > /etc/apt/sources.list.d/forky.list \
 && apt-get update && apt-get install -y -t forky nodejs npm && rm -rf /var/lib/apt/lists/*
USER vagrant
