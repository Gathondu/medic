import os

from dotenv import load_dotenv
from fastapi import Depends, FastAPI  # type: ignore
from fastapi.responses import StreamingResponse  # type: ignore
from fastapi_clerk_auth import (  # type: ignore
    ClerkConfig,
    ClerkHTTPBearer,
    HTTPAuthorizationCredentials,
)
from openai import AsyncOpenAI  # type: ignore
from pydantic import BaseModel  # type: ignore

load_dotenv(override=True)

app = FastAPI()
clerk_config = ClerkConfig(
    jwks_url=os.getenv("CLERK_JWKS_URL") or "",
    jwks_client_timeout=60,
)
clerk_guard = ClerkHTTPBearer(clerk_config)


class Visit(BaseModel):
    patient_name: str
    date_of_visit: str
    notes: str


system_prompt = """
You are provided with notes written by a doctor from a patient's visit.
Your job is to summarize the visit for the doctor and provide an email.
Reply with exactly three sections with the headings:
### Summary of visit for the doctor's records
### Next steps for the doctor
### Draft of email to patient in patient-friendly language
"""


def user_prompt_for(visit: Visit) -> str:
    return f"""Create the summary, next steps and draft email for:
Patient Name: {visit.patient_name}
Date of Visit: {visit.date_of_visit}
Notes:
{visit.notes}"""


@app.post("/api")
async def consultation_summary(
    visit: Visit,
    creds: HTTPAuthorizationCredentials = Depends(clerk_guard),
):
    _user_id = creds.decoded[
        "sub"
    ]  # Available for tracking/auditing  # ty:ignore[not-subscriptable]
    client = AsyncOpenAI(
        api_key=os.getenv("OPENROUTER_API_KEY"),
        base_url=os.getenv("OPENROUTER_BASE_URL"),
    )

    user_prompt = user_prompt_for(visit)

    prompt = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    async def event_stream():
        try:
            # Use await for the async client
            stream = await client.chat.completions.create(
                model="deepseek/deepseek-r1",
                messages=prompt,
                stream=True,
            )  # ty:ignore[no-matching-overload]
            async for chunk in stream:
                text = chunk.choices[0].delta.content
                if text:
                    # Simple yield for SSE format
                    yield f"data: {text}\n\n"
        except Exception as e:
            # This logs the actual error to your terminal
            print(f"Streaming Error: {e}")
            yield f"data: [ERROR] {str(e)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
