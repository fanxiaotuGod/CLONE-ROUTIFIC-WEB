/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const onCreateDelivery = /* GraphQL */ `
  subscription OnCreateDelivery($filter: ModelSubscriptionDeliveryFilterInput) {
    onCreateDelivery(filter: $filter) {
      id
      name
      address
      email
      lat
      lng
      status
      duration
      owner
      photoUrl
      notes
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onUpdateDelivery = /* GraphQL */ `
  subscription OnUpdateDelivery($filter: ModelSubscriptionDeliveryFilterInput) {
    onUpdateDelivery(filter: $filter) {
      id
      name
      address
      email
      lat
      lng
      status
      duration
      owner
      photoUrl
      notes
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onDeleteDelivery = /* GraphQL */ `
  subscription OnDeleteDelivery($filter: ModelSubscriptionDeliveryFilterInput) {
    onDeleteDelivery(filter: $filter) {
      id
      name
      address
      email
      lat
      lng
      status
      duration
      owner
      photoUrl
      notes
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onCreateDriver = /* GraphQL */ `
  subscription OnCreateDriver($filter: ModelSubscriptionDriverFilterInput) {
    onCreateDriver(filter: $filter) {
      id
      name
      email
      owner
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onUpdateDriver = /* GraphQL */ `
  subscription OnUpdateDriver($filter: ModelSubscriptionDriverFilterInput) {
    onUpdateDriver(filter: $filter) {
      id
      name
      email
      owner
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onDeleteDriver = /* GraphQL */ `
  subscription OnDeleteDriver($filter: ModelSubscriptionDriverFilterInput) {
    onDeleteDriver(filter: $filter) {
      id
      name
      email
      owner
      createdAt
      updatedAt
      __typename
    }
  }
`;
