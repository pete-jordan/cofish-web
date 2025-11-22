/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const createUser = /* GraphQL */ `
  mutation CreateUser(
    $input: CreateUserInput!
    $condition: ModelUserConditionInput
  ) {
    createUser(input: $input, condition: $condition) {
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
export const updateUser = /* GraphQL */ `
  mutation UpdateUser(
    $input: UpdateUserInput!
    $condition: ModelUserConditionInput
  ) {
    updateUser(input: $input, condition: $condition) {
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
export const deleteUser = /* GraphQL */ `
  mutation DeleteUser(
    $input: DeleteUserInput!
    $condition: ModelUserConditionInput
  ) {
    deleteUser(input: $input, condition: $condition) {
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
export const createCatch = /* GraphQL */ `
  mutation CreateCatch(
    $input: CreateCatchInput!
    $condition: ModelCatchConditionInput
  ) {
    createCatch(input: $input, condition: $condition) {
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
export const updateCatch = /* GraphQL */ `
  mutation UpdateCatch(
    $input: UpdateCatchInput!
    $condition: ModelCatchConditionInput
  ) {
    updateCatch(input: $input, condition: $condition) {
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
export const deleteCatch = /* GraphQL */ `
  mutation DeleteCatch(
    $input: DeleteCatchInput!
    $condition: ModelCatchConditionInput
  ) {
    deleteCatch(input: $input, condition: $condition) {
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
export const createInfoPurchase = /* GraphQL */ `
  mutation CreateInfoPurchase(
    $input: CreateInfoPurchaseInput!
    $condition: ModelInfoPurchaseConditionInput
  ) {
    createInfoPurchase(input: $input, condition: $condition) {
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
export const updateInfoPurchase = /* GraphQL */ `
  mutation UpdateInfoPurchase(
    $input: UpdateInfoPurchaseInput!
    $condition: ModelInfoPurchaseConditionInput
  ) {
    updateInfoPurchase(input: $input, condition: $condition) {
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
export const deleteInfoPurchase = /* GraphQL */ `
  mutation DeleteInfoPurchase(
    $input: DeleteInfoPurchaseInput!
    $condition: ModelInfoPurchaseConditionInput
  ) {
    deleteInfoPurchase(input: $input, condition: $condition) {
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
export const createKarmaEvent = /* GraphQL */ `
  mutation CreateKarmaEvent(
    $input: CreateKarmaEventInput!
    $condition: ModelKarmaEventConditionInput
  ) {
    createKarmaEvent(input: $input, condition: $condition) {
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
export const updateKarmaEvent = /* GraphQL */ `
  mutation UpdateKarmaEvent(
    $input: UpdateKarmaEventInput!
    $condition: ModelKarmaEventConditionInput
  ) {
    updateKarmaEvent(input: $input, condition: $condition) {
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
export const deleteKarmaEvent = /* GraphQL */ `
  mutation DeleteKarmaEvent(
    $input: DeleteKarmaEventInput!
    $condition: ModelKarmaEventConditionInput
  ) {
    deleteKarmaEvent(input: $input, condition: $condition) {
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
