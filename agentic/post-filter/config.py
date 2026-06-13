import os
from dotenv import load_dotenv

load_dotenv()

OLLAMA_BASE_URL  = os.getenv("OLLAMA_BASE_URL",  "http://host.docker.internal:11434")
TEXT_MODEL       = os.getenv("TEXT_MODEL",        "qwen3:1.7b")
IMAGE_MODEL      = os.getenv("IMAGE_MODEL",        "qwen3:1.7b")
PORT             = int(os.getenv("PORT", "5100"))
