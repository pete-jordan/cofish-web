// src/api/authApi.ts
import { apiClient } from "../amplifyClient";
import {
  signUp as amplifySignUp,
  signIn as amplifySignIn,
  signOut as amplifySignOut,
  getCurrentUser,
  fetchAuthSession,
} from "aws-amplify/auth";

import * as queries from "../graphql/queries";
import * as mutations from "../graphql/mutations";

type SignUpInput = {
  email: string;
  password: string;
  displayName?: string;
};

// ---------- BASIC AUTH ----------

export async function signUp({ email, password, displayName }: SignUpInput) {
  const result = await amplifySignUp({
    username: email,
    password,
    options: {
      userAttributes: {
        email,
        name: displayName,
      },
    },
  });

  return result;
}

export async function signIn(email: string, password: string) {
  const result = await amplifySignIn({
    username: email,
    password,
  });

  return result;
}

export async function signOut() {
  await amplifySignOut();
}

// ---------- CURRENT USER HELPERS ----------

export async function getCurrentAuthUser() {
  try {
    const user = await getCurrentUser();
    return user;
  } catch {
    return null;
  }
}

async function getAuthIds() {
  const currentUser = await getCurrentAuthUser();
  if (!currentUser) return null;

  let sub: string | undefined = currentUser.userId;
  let email: string | undefined;

  try {
    const session = await fetchAuthSession();
    const tokens: any = session.tokens ?? {};
    const idPayload = tokens.idToken?.payload ?? {};

    sub = idPayload.sub ?? sub;
    email = idPayload.email ?? email;
  } catch (e) {
    console.warn("getAuthIds: fetchAuthSession failed, falling back:", e);
  }

  if (!sub) {
    console.warn("getAuthIds: no sub / userId found");
    return null;
  }

  return { sub, email };
}

// ---------- USER RECORD CREATION (same idea as RN app) ----------

export async function ensureUserRecord() {
  try {
    const ids = await getAuthIds();
    if (!ids) return null;
    const { sub, email } = ids;

    const getUserQuery = (queries as any).getUser;
    if (!getUserQuery) {
      console.warn("getUser query not found in graphql/queries");
      return null;
    }

    const result: any = await apiClient.graphql({
      query: getUserQuery,
      variables: { id: sub },
    });

    let user = result.data?.getUser;

    if (!user) {
      const createUserMutation = (mutations as any).createUser;
      if (!createUserMutation) {
        console.warn("createUser mutation not found in graphql/mutations");
        return null;
      }

      const createResult: any = await apiClient.graphql({
        query: createUserMutation,
        variables: {
          input: {
            id: sub,
            email: email ?? "unknown@example.com",
            displayName: email ?? "Unknown Angler",
            pointsBalance: 0,
          },
        },
      });

      user = createResult.data?.createUser;
    }

    return user;
  } catch (e) {
    console.warn("ensureUserRecord failed:", e);
    return null;
  }
}

export async function getCurrentUserProfileWithBalance() {
  const user = await ensureUserRecord();
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    pointsBalance: user.pointsBalance ?? 0,
    version: user._version,
  };
}
