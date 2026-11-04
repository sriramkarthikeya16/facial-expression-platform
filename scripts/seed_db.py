"""
MoodLens - Database Seeding Script
Populates initial admin user, default model version, and sample preferences.
Supports both PostgreSQL and local SQLite databases.
"""
import asyncio
import os
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from app.db.base import AsyncSessionLocal, engine, Base
from app.models.user import User, UserPreferences
from app.models.integration import ModelVersion
from app.core.security import hash_password
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select


async def seed():
    print("=" * 50)
    print("MoodLens - Database Seeding")
    print("=" * 50)

    # Detect if local postgres is reachable; if not, use local sqlite db file for dev
    active_engine = engine
    session_maker = AsyncSessionLocal

    try:
        async with active_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        print(f"Notice: Live PostgreSQL unreachable ({e}). Using local dev SQLite database.")
        sqlite_url = "sqlite+aiosqlite:///moodlens_dev.db"
        active_engine = create_async_engine(sqlite_url, echo=False)
        session_maker = async_sessionmaker(bind=active_engine, class_=AsyncSession, expire_on_commit=False)
        async with active_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    async with session_maker() as session:
        # 1. Create Admin User
        result = await session.execute(select(User).where(User.email == "admin@moodlens.app"))
        admin_user = result.scalar_one_or_none()

        if not admin_user:
            admin_user = User(
                username="admin",
                email="admin@moodlens.app",
                password_hash=hash_password("AdminSecurePass123!"),
                role="admin",
                is_verified=True,
            )
            session.add(admin_user)
            await session.flush()

            admin_prefs = UserPreferences(user_id=admin_user.id)
            session.add(admin_prefs)
            print("✓ Created default admin user: admin@moodlens.app (Password: AdminSecurePass123!)")
        else:
            print("• Admin user already exists")

        # 2. Register Initial Model Version
        model_res = await session.execute(select(ModelVersion).where(ModelVersion.version == "1.0.0"))
        model_v1 = model_res.scalar_one_or_none()

        if not model_v1:
            model_v1 = ModelVersion(
                model_name="MobileNetV3-Large",
                version="1.0.0",
                architecture="MobileNetV3-Large (7-class Linear Classifier)",
                accuracy_overall=0.814,
                macro_f1=0.762,
                balanced_accuracy=0.789,
                quantization="fp32/wasm",
                is_active=True,
                notes="Initial production edge model trained on FER-2013 + RAF-DB + CK+48 + Natural datasets.",
            )
            session.add(model_v1)
            print("✓ Registered initial active model version 1.0.0")
        else:
            print("• Model version 1.0.0 already exists")

        # 3. Seed ModelRegistry from ml/registry/model_metadata.json
        from app.models.model_registry import ModelRegistry
        import json

        reg_check = await session.execute(select(ModelRegistry))
        existing_registry = reg_check.scalars().all()

        if not existing_registry:
            meta_path = Path(__file__).parent.parent / "ml" / "registry" / "model_metadata.json"
            if meta_path.exists():
                with open(meta_path, "r", encoding="utf-8") as f:
                    meta_list = json.load(f)
                for item in meta_list:
                    metrics = item.get("metrics", {})
                    benchmarks = item.get("benchmarks", {})
                    reg_entry = ModelRegistry(
                        model_id=item["model_id"],
                        version=item["version"],
                        architecture=item["architecture"],
                        quantization=item["quantization"],
                        format=item["format"],
                        file_name=item["file_name"],
                        sha256_hash=item["sha256_hash"],
                        size_bytes=item["size_bytes"],
                        dataset_version=item.get("dataset_version", "v1.0-balanced"),
                        accuracy=metrics.get("accuracy", 0.0),
                        macro_f1=metrics.get("macro_f1", 0.0),
                        balanced_accuracy=metrics.get("balanced_accuracy", 0.0),
                        expected_calibration_error=metrics.get("expected_calibration_error", 0.0),
                        metrics_json=metrics,
                        benchmarks_json=benchmarks,
                        is_active=item.get("is_active", False),
                        is_fallback=item.get("quantization") == "int8",
                    )
                    session.add(reg_entry)
                print(f"✓ Seeded {len(meta_list)} model registry releases from model_metadata.json")
        else:
            print(f"• ModelRegistry already contains {len(existing_registry)} records")

        await session.commit()

    await active_engine.dispose()
    print("=" * 50)
    print("Seeding complete.")


if __name__ == "__main__":
    asyncio.run(seed())
