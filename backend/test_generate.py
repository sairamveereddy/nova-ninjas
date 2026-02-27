import asyncio
from document_generator import generate_expert_documents

async def main():
    try:
        expert_docs = await generate_expert_documents(
            "Software engineer with 5 years experience.",
            "Looking for Senior Python Developer.",
            user_info={"email": "test@test.com", "name": "Test User"},
            byok_config=None
        )
        print("Success!")
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(main())
