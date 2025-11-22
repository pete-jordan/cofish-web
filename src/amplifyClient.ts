// src/amplifyClient.ts
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/api";
import awsExports from "./aws-exports";

// Configure Amplify with your existing backend
Amplify.configure(awsExports);

// Simple GraphQL client for use across the app
export const apiClient = generateClient();
