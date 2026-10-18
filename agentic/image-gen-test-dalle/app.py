from flask import Flask, request, jsonify
from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
client = OpenAI(api_key=os.getenv("OPENAI_DALLE_E_API_KEY") or os.getenv("OPENAI_API_KEY"))


@app.post("/generate-image")
def generate_image():
    body = request.get_json(silent=True) or {}
    prompt = body.get("prompt", "").strip()
    if not prompt:
        return jsonify({"error": "prompt is required"}), 400

    try:
        resp = client.images.generate(
            model="gpt-image-1",
            prompt=prompt,
            size="1024x1024",
            n=1,
        )
        item = resp.data[0] if resp.data else None
        if item and item.b64_json:
            return jsonify({"model": "gpt-image-1", "url": f"data:image/png;base64,{item.b64_json}"})
        if item and item.url:
            return jsonify({"model": "gpt-image-1", "url": item.url})
        return jsonify({"error": "No image returned"}), 500
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=6000, debug=True)
