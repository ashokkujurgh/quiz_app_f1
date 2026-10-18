FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ libffi-dev && \
    rm -rf /var/lib/apt/lists/*

# OpenArt CLI (image generation) — pinned release, checksum-verified.
# Sign-in lives on the host in ~/.openart and is mounted in by docker-compose.
ADD --checksum=sha256:f94373ce27ee3b94f47b6eb337bcc66c78b0138f500ece6a71010626169c042d \
    https://github.com/OpenArt-AI/cli/releases/download/v0.1.1/openart_0.1.1_linux_amd64.tar.gz /tmp/openart.tar.gz
RUN tar -xzf /tmp/openart.tar.gz -C /usr/local/bin openart && rm /tmp/openart.tar.gz

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "main.py"]
