/**
 * Utility to delete all Catch, InfoPurchase, and KarmaEvent records
 * 
 * Can be called from browser console:
 * await window.deleteAllData();
 */

import { apiClient } from "../amplifyClient";
import * as queries from "../graphql/queries";
import * as mutations from "../graphql/mutations";

async function deleteAllCatches() {
  console.log("🗑️  Deleting all Catches...");
  let nextToken: string | null = null;
  let totalDeleted = 0;
  let totalFailed = 0;
  const failedIds: string[] = [];

  do {
    const result: any = await apiClient.graphql({
      query: queries.listCatches,
      variables: { 
        limit: 100, 
        nextToken,
        filter: {
          _deleted: { ne: true } // Exclude already deleted records
        }
      },
    });

    const items = (result.data.listCatches.items || []).filter((item: any) => !item._deleted);
    nextToken = result.data.listCatches.nextToken || null;

    console.log(`  Found ${items.length} active catches in this batch (excluding already deleted)`);

    for (const item of items) {
      try {
        // Fetch fresh version before deleting to avoid version conflicts
        const getResult: any = await apiClient.graphql({
          query: queries.getCatch,
          variables: { id: item.id },
        });
        
        const freshItem = getResult.data?.getCatch;
        if (!freshItem) {
          console.log(`  Catch ${item.id} already deleted, skipping`);
          continue;
        }

        const deleteResult: any = await apiClient.graphql({
          query: mutations.deleteCatch,
          variables: {
            input: {
              id: freshItem.id,
              _version: freshItem._version,
            },
          },
        });

        // Check for GraphQL errors in the response
        if (deleteResult.errors) {
          throw new Error(`GraphQL errors: ${JSON.stringify(deleteResult.errors)}`);
        }

        if (deleteResult.data?.deleteCatch) {
          totalDeleted++;
          console.log(`  ✓ Deleted catch ${freshItem.id}`);
          if (totalDeleted % 10 === 0) {
            console.log(`  Progress: ${totalDeleted} catches deleted...`);
          }
        } else {
          throw new Error("Delete returned no data - check authorization");
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error: any) {
        totalFailed++;
        failedIds.push(item.id);
        const errorMsg = error.message || JSON.stringify(error);
        console.error(`  ❌ Error deleting catch ${item.id}:`, errorMsg);
        
        // Check for specific error types
        if (error.errors && Array.isArray(error.errors)) {
          error.errors.forEach((err: any) => {
            console.error(`    - ${err.errorType || 'Error'}: ${err.message || JSON.stringify(err)}`);
          });
        } else if (error.errors) {
          console.error(`    GraphQL errors:`, error.errors);
        }
        
        // Log full error for debugging
        console.error(`    Full error object:`, error);
        
        // Check if it's an authorization error
        const errorStr = JSON.stringify(error).toLowerCase();
        if (errorStr.includes('unauthorized') || errorStr.includes('not authorized') || errorStr.includes('permission')) {
          console.error(`    ⚠️  This appears to be an authorization error. You may not own this catch.`);
        }
      }
    }
  } while (nextToken);

  console.log(`✅ Deleted ${totalDeleted} catches total`);
  if (totalFailed > 0) {
    console.warn(`⚠️  Failed to delete ${totalFailed} catches:`, failedIds);
  }
  return totalDeleted;
}

async function deleteAllInfoPurchases() {
  console.log("🗑️  Deleting all InfoPurchases...");
  let nextToken: string | null = null;
  let totalDeleted = 0;
  let totalFailed = 0;
  const failedIds: string[] = [];

  do {
    const result: any = await apiClient.graphql({
      query: queries.listInfoPurchases,
      variables: { 
        limit: 100, 
        nextToken,
        filter: {
          _deleted: { ne: true } // Exclude already deleted records
        }
      },
    });

    const items = (result.data.listInfoPurchases.items || []).filter((item: any) => !item._deleted);
    nextToken = result.data.listInfoPurchases.nextToken || null;

    console.log(`  Found ${items.length} active purchases in this batch (excluding already deleted)`);

    for (const item of items) {
      try {
        // Fetch fresh version before deleting to avoid version conflicts
        const getResult: any = await apiClient.graphql({
          query: queries.getInfoPurchase,
          variables: { id: item.id },
        });
        
        const freshItem = getResult.data?.getInfoPurchase;
        if (!freshItem) {
          console.log(`  Purchase ${item.id} already deleted, skipping`);
          continue;
        }

        const deleteResult: any = await apiClient.graphql({
          query: mutations.deleteInfoPurchase,
          variables: {
            input: {
              id: freshItem.id,
              _version: freshItem._version,
            },
          },
        });

        // Check for GraphQL errors in the response
        if (deleteResult.errors) {
          throw new Error(`GraphQL errors: ${JSON.stringify(deleteResult.errors)}`);
        }

        if (deleteResult.data?.deleteInfoPurchase) {
          totalDeleted++;
          console.log(`  ✓ Deleted purchase ${freshItem.id}`);
          if (totalDeleted % 10 === 0) {
            console.log(`  Progress: ${totalDeleted} purchases deleted...`);
          }
        } else {
          throw new Error("Delete returned no data - check authorization");
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error: any) {
        totalFailed++;
        failedIds.push(item.id);
        const errorMsg = error.message || JSON.stringify(error);
        console.error(`  ❌ Error deleting purchase ${item.id}:`, errorMsg);
        
        // Check for specific error types
        if (error.errors && Array.isArray(error.errors)) {
          error.errors.forEach((err: any) => {
            console.error(`    - ${err.errorType || 'Error'}: ${err.message || JSON.stringify(err)}`);
          });
        } else if (error.errors) {
          console.error(`    GraphQL errors:`, error.errors);
        }
        
        // Log full error for debugging
        console.error(`    Full error object:`, error);
        
        // Check if it's an authorization error
        const errorStr = JSON.stringify(error).toLowerCase();
        if (errorStr.includes('unauthorized') || errorStr.includes('not authorized') || errorStr.includes('permission')) {
          console.error(`    ⚠️  This appears to be an authorization error. You may not own this purchase.`);
        }
      }
    }
  } while (nextToken);

  console.log(`✅ Deleted ${totalDeleted} purchases total`);
  if (totalFailed > 0) {
    console.warn(`⚠️  Failed to delete ${totalFailed} purchases:`, failedIds);
  }
  return totalDeleted;
}

async function deleteAllKarmaEvents() {
  console.log("🗑️  Deleting all KarmaEvents...");
  let nextToken: string | null = null;
  let totalDeleted = 0;

  do {
    const result: any = await apiClient.graphql({
      query: queries.listKarmaEvents,
      variables: { limit: 100, nextToken },
    });

    const items = result.data.listKarmaEvents.items || [];
    nextToken = result.data.listKarmaEvents.nextToken || null;

    console.log(`  Found ${items.length} karma events in this batch`);

    for (const item of items) {
      try {
        await apiClient.graphql({
          query: mutations.deleteKarmaEvent,
          variables: {
            input: {
              id: item.id,
              _version: item._version,
            },
          },
        });
        totalDeleted++;
        if (totalDeleted % 10 === 0) {
          console.log(`  Deleted ${totalDeleted} karma events...`);
        }
      } catch (error: any) {
        console.error(`  Error deleting karma event ${item.id}:`, error.message);
      }
    }
  } while (nextToken);

  console.log(`✅ Deleted ${totalDeleted} karma events total`);
  return totalDeleted;
}

export async function deleteAllData() {
  console.log("🚀 Starting deletion of all data...");
  console.log("⚠️  WARNING: This will delete ALL Catches, InfoPurchases, and KarmaEvents!");
  
  try {
    // Run sequentially to avoid conflicts
    const catches = await deleteAllCatches();
    const purchases = await deleteAllInfoPurchases();
    const karmaEvents = await deleteAllKarmaEvents();

    console.log("\n📊 Summary:");
    console.log(`  Catches deleted: ${catches}`);
    console.log(`  Purchases deleted: ${purchases}`);
    console.log(`  Karma events deleted: ${karmaEvents}`);
    console.log("\n✅ All data deletion complete!");
    console.log("💡 Note: You may need to reset user points balance separately with resetUserPoints()");
    
    // Verify deletion by checking counts
    console.log("\n🔍 Verifying deletion...");
    const verifyResult: any = await apiClient.graphql({
      query: queries.listCatches,
      variables: { limit: 1 },
    });
    const remainingCatches = verifyResult.data?.listCatches?.items?.length || 0;
    if (remainingCatches > 0) {
      console.warn(`⚠️  WARNING: ${verifyResult.data.listCatches.nextToken ? 'More than 1' : remainingCatches} catch(es) still remain. You may need to run deleteAllData() again.`);
    } else {
      console.log("✅ Verification: No catches remaining");
    }
  } catch (error) {
    console.error("❌ Error during deletion:", error);
    throw error;
  }
}

// Reset current user's points balance to 0
export async function resetUserPoints() {
  console.log("🔄 Resetting user points balance to 0...");
  
  const { getCurrentUser } = await import("aws-amplify/auth");
  const queries = await import("../graphql/queries");
  const mutations = await import("../graphql/mutations");
  
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Not signed in");
    }

    // Get current user record to get _version
    const getUserQuery = (queries as any).getUser;
    if (!getUserQuery) {
      throw new Error("getUser query not found");
    }

    const userResult: any = await apiClient.graphql({
      query: getUserQuery,
      variables: { id: user.userId },
    });

    const userRecord = userResult.data?.getUser;
    if (!userRecord) {
      throw new Error("User record not found");
    }

    // Update points balance to 0
    const updateUserMutation = (mutations as any).updateUser;
    if (!updateUserMutation) {
      throw new Error("updateUser mutation not found");
    }

    await apiClient.graphql({
      query: updateUserMutation,
      variables: {
        input: {
          id: user.userId,
          pointsBalance: 0,
          _version: userRecord._version,
        },
      },
    });

    console.log("✅ User points balance reset to 0");
  } catch (error: any) {
    console.error("❌ Error resetting points:", error.message);
    throw error;
  }
}

// For browser console access
if (typeof window !== "undefined") {
  (window as any).deleteAllData = deleteAllData;
  (window as any).resetUserPoints = resetUserPoints;
}
