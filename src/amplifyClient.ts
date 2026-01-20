// src/amplifyClient.ts
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/api";
import { getUrl } from "aws-amplify/storage";
import awsExports from "./aws-exports";

// Configure Amplify with your existing backend
Amplify.configure(awsExports);

// Simple GraphQL client for use across the app
export const apiClient = generateClient();

// Export Storage utilities
export { getUrl as getStorageUrl };
