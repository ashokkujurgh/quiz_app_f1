import logging
from fastapi import FastAPI
from pydantic import BaseModel
from filter import run_policy_check
from config import PORT

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="QuizHub Post Filter", version="1.0.0")


class FilterRequest(BaseModel):
    content: str
    image_url: str | None = None


class FilterResponse(BaseModel):
    allowed: bool
    reason: str | None = None
    checks: dict | None = None


@app.get("/health")
def health():
    return {"status": "ok", "service": "post-filter"}


@app.post("/filter", response_model=FilterResponse)
def filter_post(req: FilterRequest):
    logger.info("Filtering post — text length: %d, has image: %s", len(req.content), bool(req.image_url))
    result = run_policy_check(req.content, req.image_url)
    if not result["allowed"]:
        logger.warning("Post BLOCKED — reason: %s", result.get("reason"))
    return FilterResponse(**result)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=False)
