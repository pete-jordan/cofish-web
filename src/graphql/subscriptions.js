/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const onCreateUser = /* GraphQL */ `
  subscription OnCreateUser(
    $filter: ModelSubscriptionUserFilterInput
    $owner: String
  ) {
    onCreateUser(filter: $filter, owner: $owner) {
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
export const onUpdateUser = /* GraphQL */ `
  subscription OnUpdateUser(
    $filter: ModelSubscriptionUserFilterInput
    $owner: String
  ) {
    onUpdateUser(filter: $filter, owner: $owner) {
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
export const onDeleteUser = /* GraphQL */ `
  subscription OnDeleteUser(
    $filter: ModelSubscriptionUserFilterInput
    $owner: String
  ) {
    onDeleteUser(filter: $filter, owner: $owner) {
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
export const onCreateCatch = /* GraphQL */ `
  subscription OnCreateCatch(
    $filter: ModelSubscriptionCatchFilterInput
    $owner: String
  ) {
    onCreateCatch(filter: $filter, owner: $owner) {
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
export const onUpdateCatch = /* GraphQL */ `
  subscription OnUpdateCatch(
    $filter: ModelSubscriptionCatchFilterInput
    $owner: String
  ) {
    onUpdateCatch(filter: $filter, owner: $owner) {
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
export const onDeleteCatch = /* GraphQL */ `
  subscription OnDeleteCatch(
    $filter: ModelSubscriptionCatchFilterInput
    $owner: String
  ) {
    onDeleteCatch(filter: $filter, owner: $owner) {
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
export const onCreateInfoPurchase = /* GraphQL */ `
  subscription OnCreateInfoPurchase(
    $filter: ModelSubscriptionInfoPurchaseFilterInput
    $owner: String
  ) {
    onCreateInfoPurchase(filter: $filter, owner: $owner) {
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
export const onUpdateInfoPurchase = /* GraphQL */ `
  subscription OnUpdateInfoPurchase(
    $filter: ModelSubscriptionInfoPurchaseFilterInput
    $owner: String
  ) {
    onUpdateInfoPurchase(filter: $filter, owner: $owner) {
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
export const onDeleteInfoPurchase = /* GraphQL */ `
  subscription OnDeleteInfoPurchase(
    $filter: ModelSubscriptionInfoPurchaseFilterInput
    $owner: String
  ) {
    onDeleteInfoPurchase(filter: $filter, owner: $owner) {
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
export const onCreateKarmaEvent = /* GraphQL */ `
  subscription OnCreateKarmaEvent(
    $filter: ModelSubscriptionKarmaEventFilterInput
  ) {
    onCreateKarmaEvent(filter: $filter) {
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
export const onUpdateKarmaEvent = /* GraphQL */ `
  subscription OnUpdateKarmaEvent(
    $filter: ModelSubscriptionKarmaEventFilterInput
  ) {
    onUpdateKarmaEvent(filter: $filter) {
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
export const onDeleteKarmaEvent = /* GraphQL */ `
  subscription OnDeleteKarmaEvent(
    $filter: ModelSubscriptionKarmaEventFilterInput
  ) {
    onDeleteKarmaEvent(filter: $filter) {
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
