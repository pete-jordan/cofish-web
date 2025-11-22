/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const getUser = /* GraphQL */ `
  query GetUser($id: ID!) {
    getUser(id: $id) {
      id
      email
      displayName
      pointsBalance
      createdAt
      expoPushToken
      catches {
        nextToken
        startedAt
        __typename
      }
      purchases {
        nextToken
        startedAt
        __typename
      }
      updatedAt
      _version
      _deleted
      _lastChangedAt
      owner
      __typename
    }
  }
`;
export const listUsers = /* GraphQL */ `
  query ListUsers(
    $filter: ModelUserFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listUsers(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        email
        displayName
        pointsBalance
        createdAt
        expoPushToken
        updatedAt
        _version
        _deleted
        _lastChangedAt
        owner
        __typename
      }
      nextToken
      startedAt
      __typename
    }
  }
`;
export const syncUsers = /* GraphQL */ `
  query SyncUsers(
    $filter: ModelUserFilterInput
    $limit: Int
    $nextToken: String
    $lastSync: AWSTimestamp
  ) {
    syncUsers(
      filter: $filter
      limit: $limit
      nextToken: $nextToken
      lastSync: $lastSync
    ) {
      items {
        id
        email
        displayName
        pointsBalance
        createdAt
        expoPushToken
        updatedAt
        _version
        _deleted
        _lastChangedAt
        owner
        __typename
      }
      nextToken
      startedAt
      __typename
    }
  }
`;
export const getCatch = /* GraphQL */ `
  query GetCatch($id: ID!) {
    getCatch(id: $id) {
      id
      userId
      user {
        id
        email
        displayName
        pointsBalance
        createdAt
        expoPushToken
        updatedAt
        _version
        _deleted
        _lastChangedAt
        owner
        __typename
      }
      createdAt
      species
      lat
      lng
      videoKey
      thumbnailKey
      basePoints
      karmaPoints
      verificationStatus
      updatedAt
      _version
      _deleted
      _lastChangedAt
      owner
      __typename
    }
  }
`;
export const listCatches = /* GraphQL */ `
  query ListCatches(
    $filter: ModelCatchFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listCatches(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        userId
        createdAt
        species
        lat
        lng
        videoKey
        thumbnailKey
        basePoints
        karmaPoints
        verificationStatus
        updatedAt
        _version
        _deleted
        _lastChangedAt
        owner
        __typename
      }
      nextToken
      startedAt
      __typename
    }
  }
`;
export const syncCatches = /* GraphQL */ `
  query SyncCatches(
    $filter: ModelCatchFilterInput
    $limit: Int
    $nextToken: String
    $lastSync: AWSTimestamp
  ) {
    syncCatches(
      filter: $filter
      limit: $limit
      nextToken: $nextToken
      lastSync: $lastSync
    ) {
      items {
        id
        userId
        createdAt
        species
        lat
        lng
        videoKey
        thumbnailKey
        basePoints
        karmaPoints
        verificationStatus
        updatedAt
        _version
        _deleted
        _lastChangedAt
        owner
        __typename
      }
      nextToken
      startedAt
      __typename
    }
  }
`;
export const getInfoPurchase = /* GraphQL */ `
  query GetInfoPurchase($id: ID!) {
    getInfoPurchase(id: $id) {
      id
      userId
      user {
        id
        email
        displayName
        pointsBalance
        createdAt
        expoPushToken
        updatedAt
        _version
        _deleted
        _lastChangedAt
        owner
        __typename
      }
      createdAt
      centerLat
      centerLng
      radiusMiles
      speciesFilter
      baseCostPoints
      discountPercent
      finalCostPoints
      avgAgeHours
      includedCatchIds
      updatedAt
      _version
      _deleted
      _lastChangedAt
      owner
      __typename
    }
  }
`;
export const listInfoPurchases = /* GraphQL */ `
  query ListInfoPurchases(
    $filter: ModelInfoPurchaseFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listInfoPurchases(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        userId
        createdAt
        centerLat
        centerLng
        radiusMiles
        speciesFilter
        baseCostPoints
        discountPercent
        finalCostPoints
        avgAgeHours
        includedCatchIds
        updatedAt
        _version
        _deleted
        _lastChangedAt
        owner
        __typename
      }
      nextToken
      startedAt
      __typename
    }
  }
`;
export const syncInfoPurchases = /* GraphQL */ `
  query SyncInfoPurchases(
    $filter: ModelInfoPurchaseFilterInput
    $limit: Int
    $nextToken: String
    $lastSync: AWSTimestamp
  ) {
    syncInfoPurchases(
      filter: $filter
      limit: $limit
      nextToken: $nextToken
      lastSync: $lastSync
    ) {
      items {
        id
        userId
        createdAt
        centerLat
        centerLng
        radiusMiles
        speciesFilter
        baseCostPoints
        discountPercent
        finalCostPoints
        avgAgeHours
        includedCatchIds
        updatedAt
        _version
        _deleted
        _lastChangedAt
        owner
        __typename
      }
      nextToken
      startedAt
      __typename
    }
  }
`;
export const getKarmaEvent = /* GraphQL */ `
  query GetKarmaEvent($id: ID!) {
    getKarmaEvent(id: $id) {
      id
      helperUserId
      beneficiaryUserId
      sourceCatchId
      beneficiaryCatchId
      points
      createdAt
      updatedAt
      _version
      _deleted
      _lastChangedAt
      __typename
    }
  }
`;
export const listKarmaEvents = /* GraphQL */ `
  query ListKarmaEvents(
    $filter: ModelKarmaEventFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listKarmaEvents(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        helperUserId
        beneficiaryUserId
        sourceCatchId
        beneficiaryCatchId
        points
        createdAt
        updatedAt
        _version
        _deleted
        _lastChangedAt
        __typename
      }
      nextToken
      startedAt
      __typename
    }
  }
`;
export const syncKarmaEvents = /* GraphQL */ `
  query SyncKarmaEvents(
    $filter: ModelKarmaEventFilterInput
    $limit: Int
    $nextToken: String
    $lastSync: AWSTimestamp
  ) {
    syncKarmaEvents(
      filter: $filter
      limit: $limit
      nextToken: $nextToken
      lastSync: $lastSync
    ) {
      items {
        id
        helperUserId
        beneficiaryUserId
        sourceCatchId
        beneficiaryCatchId
        points
        createdAt
        updatedAt
        _version
        _deleted
        _lastChangedAt
        __typename
      }
      nextToken
      startedAt
      __typename
    }
  }
`;
export const catchesByUser = /* GraphQL */ `
  query CatchesByUser(
    $userId: ID!
    $createdAt: ModelStringKeyConditionInput
    $sortDirection: ModelSortDirection
    $filter: ModelCatchFilterInput
    $limit: Int
    $nextToken: String
  ) {
    catchesByUser(
      userId: $userId
      createdAt: $createdAt
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        userId
        createdAt
        species
        lat
        lng
        videoKey
        thumbnailKey
        basePoints
        karmaPoints
        verificationStatus
        updatedAt
        _version
        _deleted
        _lastChangedAt
        owner
        __typename
      }
      nextToken
      startedAt
      __typename
    }
  }
`;
export const purchasesByUser = /* GraphQL */ `
  query PurchasesByUser(
    $userId: ID!
    $createdAt: ModelStringKeyConditionInput
    $sortDirection: ModelSortDirection
    $filter: ModelInfoPurchaseFilterInput
    $limit: Int
    $nextToken: String
  ) {
    purchasesByUser(
      userId: $userId
      createdAt: $createdAt
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        userId
        createdAt
        centerLat
        centerLng
        radiusMiles
        speciesFilter
        baseCostPoints
        discountPercent
        finalCostPoints
        avgAgeHours
        includedCatchIds
        updatedAt
        _version
        _deleted
        _lastChangedAt
        owner
        __typename
      }
      nextToken
      startedAt
      __typename
    }
  }
`;
