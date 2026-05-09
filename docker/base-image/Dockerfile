FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    bash \
    build-essential \
    ca-certificates \
    curl \
    git \
    less \
    nano \
    nodejs \
    npm \
    python3 \
    python3-pip \
    ripgrep \
    vim \
  && rm -rf /var/lib/apt/lists/*

RUN useradd --create-home --shell /bin/bash sandbox \
  && mkdir -p /workspace \
  && chown -R sandbox:sandbox /workspace /home/sandbox

USER sandbox
WORKDIR /workspace

CMD ["sleep", "infinity"]