/**
 * Browser Console Script to Seed Dummy Catches
 * 
 * Instructions:
 * 1. Open your app in the browser
 * 2. Open browser console (F12)
 * 3. Copy and paste this ENTIRE script
 * 4. Run: await seedDummyCatches({ email: 'petejordan63@gmail.com', centerLat: 41.1720, centerLng: -71.5778, count: 30, radiusMiles: 15 })
 */

// Helper: Generate random location within radius
function randomLocationNear(centerLat, centerLng, radiusMiles) {
  const milesToDegLat = 1 / 69; // 1 degree latitude ≈ 69 miles
  const milesToDegLng = 1 / (69 * Math.cos((centerLat * Math.PI) / 180));
  const angle = Math.random() * 2 * Math.PI;
  const distance = Math.random() * radiusMiles;
  const latOffset = (distance * Math.cos(angle)) * milesToDegLat;
  const lngOffset = (distance * Math.sin(angle)) * milesToDegLng;
  return {
    lat: centerLat + latOffset,
    lng: centerLng + lngOffset,
  };
}

// Helper: Generate random timestamp within last N days
function randomRecentTimestamp(daysAgo = 3) {
  const now = Date.now();
  const daysAgoMs = daysAgo * 24 * 60 * 60 * 1000;
  const randomMs = Math.random() * daysAgoMs;
  return new Date(now - randomMs).toISOString();
}

// Helper: Generate unique catch ID
function generateCatchId() {
  return `catch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Main function
async function seedDummyCatches(options) {
  const {
    centerLat,
    centerLng,
    count = 10,
    radiusMiles = 5,
    email,
    userId: providedUserId,
    species,
  } = options;

  // Access app's API client and mutations
  // These should be available in the browser console if the app is loaded
  const { apiClient } = window.__AMPLIFY_API_CLIENT__ || {};
  if (!apiClient) {
    // Try to import from the app's modules
    try {
      // If using ES modules, we need to use dynamic import
      const apiModule = await import('/src/amplifyClient.js');
      var apiClient = apiModule.apiClient;
    } catch (e) {
      throw new Error(
        'Could not access apiClient. Make sure you are running this in the browser console with the app loaded. ' +
        'You may need to expose apiClient globally or use a different method.'
      );
    }
  }

  // Import mutations and queries
  const mutations = await import('/src/graphql/mutations.js');
  const queries = await import('/src/graphql/queries.js');

  let userId = providedUserId;

  // Find user by email if needed
  if (email && !userId) {
    console.log(`Finding user with email: ${email}...`);
    const listUsersQuery = queries.listUsers;
    const result = await apiClient.graphql({
      query: listUsersQuery,
      variables: {
        filter: { email: { eq: email } },
        limit: 1,
      },
    });
    const users = result.data?.listUsers?.items ?? [];
    if (users.length === 0) {
      throw new Error(`User with email ${email} not found. Please create the user first.`);
    }
    userId = users[0].id;
    console.log(`✓ Found user ID: ${userId}`);
  }

  if (!userId) {
    throw new Error('Either userId or email is required.');
  }

  const createCatchMutation = mutations.createCatch;
  if (!createCatchMutation) {
    throw new Error('createCatch mutation not found');
  }

  const speciesList = species
    ? [species]
    : [
        'Striped Bass',
        'Bluefish',
        'Flounder',
        'Black Sea Bass',
        'Tautog',
        'Scup',
        'Weakfish',
      ];

  console.log(`Creating ${count} dummy catches...`);
  console.log(`Center: ${centerLat}, ${centerLng}`);
  console.log(`Radius: ${radiusMiles} miles`);
  console.log(`User ID: ${userId}`);

  const results = [];

  for (let i = 0; i < count; i++) {
    const location = randomLocationNear(centerLat, centerLng, radiusMiles);
    const randomSpecies =
      speciesList[Math.floor(Math.random() * speciesList.length)];
    const createdAt = randomRecentTimestamp(3); // Within last 3 days

    const input = {
      id: generateCatchId(),
      userId,
      createdAt,
      species: randomSpecies,
      lat: location.lat,
      lng: location.lng,
      videoKey: `dummy/catch-${i + 1}.mp4`,
      thumbnailKey: `dummy/thumb-${i + 1}.jpg`,
      basePoints: 100,
      karmaPoints: 0,
      verificationStatus: 'VERIFIED', // Must be VERIFIED for TargetZone
    };

    try {
      const result = await apiClient.graphql({
        query: createCatchMutation,
        variables: { input },
      });

      if (result.data?.createCatch) {
        results.push({ id: input.id, success: true });
        console.log(
          `✓ Created catch ${i + 1}/${count}: ${randomSpecies} at ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
        );
      } else {
        results.push({ id: input.id, success: false, error: 'No data returned' });
        console.error(`✗ Failed to create catch ${i + 1}/${count}: No data`);
      }
    } catch (error) {
      const errorMsg =
        error?.errors?.[0]?.message || error?.message || 'Unknown error';
      results.push({ id: input.id, success: false, error: errorMsg });
      console.error(`✗ Failed to create catch ${i + 1}/${count}:`, errorMsg);
    }

    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  const successCount = results.filter((r) => r.success).length;
  console.log(`\n✅ Created ${successCount}/${count} catches successfully`);

  if (successCount < count) {
    console.log('\nFailed catches:');
    results
      .filter((r) => !r.success)
      .forEach((r) => {
        console.log(`  - ${r.id}: ${r.error}`);
      });
  }

  return results;
}

// Make it available globally
window.seedDummyCatches = seedDummyCatches;

console.log(`
✅ seedDummyCatches function loaded!

Usage:
  await seedDummyCatches({
    email: 'petejordan63@gmail.com',
    centerLat: 41.1720,    // Block Island, RI
    centerLng: -71.5778,
    count: 30,
    radiusMiles: 15
  });
`);

