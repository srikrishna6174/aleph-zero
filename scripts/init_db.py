"""
Appwrite Database Initialization Script (SDK v24+)
====================================================
Creates collections (tables), columns, and indexes inside
your existing Appwrite database using the new TablesDB API.

Usage:
    1. Ensure worker/.env has your APPWRITE_API_KEY filled in.
    2. Your API key must have scopes: tables.write, columns.write, indexes.write
    3. Run: python scripts/init_db.py
"""

import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "worker"))

from dotenv import load_dotenv

worker_env = os.path.join(os.path.dirname(__file__), "..", "worker", ".env")
load_dotenv(worker_env)

from appwrite.client import Client
from appwrite.services.tables_db import TablesDB
from appwrite.exception import AppwriteException

# --- Configuration -----------------------------------------------------------

APPWRITE_ENDPOINT = os.getenv("APPWRITE_ENDPOINT", "https://fra.cloud.appwrite.io/v1")
APPWRITE_PROJECT_ID = os.getenv("APPWRITE_PROJECT_ID", "6a9d0a3c0016b6eb0753")
APPWRITE_API_KEY = os.getenv("APPWRITE_API_KEY")

DATABASE_ID = os.getenv("APPWRITE_DATABASE_ID", "6a9d0bb90033cb018bb0")

CHANNELS_TABLE_ID = os.getenv("APPWRITE_CHANNELS_COLLECTION_ID", "channels")
SUBSCRIPTIONS_TABLE_ID = os.getenv("APPWRITE_SUBSCRIPTIONS_COLLECTION_ID", "subscriptions")
VIDEOS_TABLE_ID = os.getenv("APPWRITE_VIDEOS_COLLECTION_ID", "videos")

if not APPWRITE_API_KEY or APPWRITE_API_KEY.startswith("<"):
    print("[ERROR] Set your APPWRITE_API_KEY in worker/.env first")
    sys.exit(1)

# --- Initialize Client -------------------------------------------------------

client = Client()
client.set_endpoint(APPWRITE_ENDPOINT)
client.set_project(APPWRITE_PROJECT_ID)
client.set_key(APPWRITE_API_KEY)

tables_db = TablesDB(client)


def safe_create(fn, resource_name, *args, **kwargs):
    """Execute a creation function, ignoring 'already exists' (409) errors."""
    try:
        result = fn(*args, **kwargs)
        print(f"  [OK] Created {resource_name}")
        return result
    except AppwriteException as e:
        if e.code == 409:
            print(f"  [SKIP] {resource_name} already exists")
        else:
            print(f"  [FAIL] {resource_name}: {e.message}")
            raise


# --- Create Channels Table ---------------------------------------------------

print(f"\n[1/3] Creating 'channels' table in database {DATABASE_ID}...")
safe_create(
    tables_db.create_table,
    "Table 'channels'",
    database_id=DATABASE_ID,
    table_id=CHANNELS_TABLE_ID,
    name="Channels",
    permissions=[
        'read("any")',
        'create("users")',
        'update("users")',
    ],
    row_security=False,
    columns=[
        {"key": "channel_id", "type": "varchar", "size": 64, "required": True},
        {"key": "name", "type": "varchar", "size": 256, "required": True},
        {"key": "rss_url", "type": "varchar", "size": 512, "required": True},
        {"key": "thumbnail_url", "type": "varchar", "size": 512, "required": False, "default": ""},
    ],
    indexes=[
        {"key": "unique_channel_id", "type": "unique", "attributes": ["channel_id"]},
    ],
)

# --- Create Subscriptions Table -----------------------------------------------

print(f"\n[2/3] Creating 'subscriptions' table...")
safe_create(
    tables_db.create_table,
    "Table 'subscriptions'",
    database_id=DATABASE_ID,
    table_id=SUBSCRIPTIONS_TABLE_ID,
    name="Subscriptions",
    permissions=[
        'read("users")',
        'create("users")',
        'delete("users")',
    ],
    row_security=False,
    columns=[
        {"key": "user_id", "type": "varchar", "size": 64, "required": True},
        {"key": "channel_id", "type": "varchar", "size": 64, "required": True},
    ],
    indexes=[
        {"key": "unique_user_channel", "type": "unique", "attributes": ["user_id", "channel_id"]},
        {"key": "idx_user_id", "type": "key", "attributes": ["user_id"]},
        {"key": "idx_channel_id", "type": "key", "attributes": ["channel_id"]},
    ],
)

# --- Create Videos Table ------------------------------------------------------

print(f"\n[3/3] Creating 'videos' table...")
safe_create(
    tables_db.create_table,
    "Table 'videos'",
    database_id=DATABASE_ID,
    table_id=VIDEOS_TABLE_ID,
    name="Videos",
    permissions=[
        'read("any")',
        'create("users")',
        'update("users")',
    ],
    row_security=False,
    columns=[
        {"key": "video_id", "type": "varchar", "size": 32, "required": True},
        {"key": "channel_id", "type": "varchar", "size": 64, "required": True},
        {"key": "title", "type": "varchar", "size": 512, "required": True},
        {"key": "published_at", "type": "varchar", "size": 64, "required": True},
        {"key": "thumbnail_url", "type": "varchar", "size": 512, "required": False, "default": ""},
        {"key": "ai_summary", "type": "longtext", "required": False, "default": ""},
        {"key": "status", "type": "varchar", "size": 32, "required": True},
        {"key": "error_message", "type": "varchar", "size": 1024, "required": False, "default": ""},
    ],
    indexes=[
        {"key": "unique_video_id", "type": "unique", "attributes": ["video_id"]},
        {"key": "idx_channel_published", "type": "key", "attributes": ["channel_id", "published_at"], "orders": ["ASC", "DESC"]},
        {"key": "idx_status", "type": "key", "attributes": ["status"]},
    ],
)

# --- Done ---------------------------------------------------------------------

print("\n" + "=" * 55)
print("[DONE] Database initialization complete!")
print("=" * 55)
print(f"   Endpoint:        {APPWRITE_ENDPOINT}")
print(f"   Project ID:      {APPWRITE_PROJECT_ID}")
print(f"   Database ID:     {DATABASE_ID}")
print(f"   Channels:        {CHANNELS_TABLE_ID}")
print(f"   Subscriptions:   {SUBSCRIPTIONS_TABLE_ID}")
print(f"   Videos:          {VIDEOS_TABLE_ID}")
