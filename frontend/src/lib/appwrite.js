/**
 * Appwrite Client Configuration (SDK v17+)
 * ==========================================
 * Uses the new TablesDB service instead of the deprecated Databases service.
 */

import { Client, Account, TablesDB } from "appwrite";

// --- Configuration Constants -------------------------------------------------

const APPWRITE_ENDPOINT =
  import.meta.env.VITE_APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID || "";

export const DATABASE_ID =
  import.meta.env.VITE_APPWRITE_DATABASE_ID || "6a9d0bb90033cb018bb0";
export const CHANNELS_TABLE_ID =
  import.meta.env.VITE_APPWRITE_CHANNELS_COLLECTION_ID || "channels";
export const SUBSCRIPTIONS_TABLE_ID =
  import.meta.env.VITE_APPWRITE_SUBSCRIPTIONS_COLLECTION_ID || "subscriptions";
export const VIDEOS_TABLE_ID =
  import.meta.env.VITE_APPWRITE_VIDEOS_COLLECTION_ID || "videos";

// --- Appwrite Client ---------------------------------------------------------

const client = new Client();
client.setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID);

// --- Service Instances -------------------------------------------------------

export const account = new Account(client);
export const tablesDB = new TablesDB(client);

// Export the raw client for Realtime subscriptions
export { client };
