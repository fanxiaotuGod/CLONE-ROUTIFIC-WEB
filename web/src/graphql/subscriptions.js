/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const onCreateTodo = /* GraphQL */ `
  subscription OnCreateTodo($filter: ModelSubscriptionTodoFilterInput) {
    onCreateTodo(filter: $filter) {
      id
      name
      description
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onUpdateTodo = /* GraphQL */ `
  subscription OnUpdateTodo($filter: ModelSubscriptionTodoFilterInput) {
    onUpdateTodo(filter: $filter) {
      id
      name
      description
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onDeleteTodo = /* GraphQL */ `
  subscription OnDeleteTodo($filter: ModelSubscriptionTodoFilterInput) {
    onDeleteTodo(filter: $filter) {
      id
      name
      description
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onCreateDelivery = /* GraphQL */ `
  subscription OnCreateDelivery(
    $filter: ModelSubscriptionDeliveryFilterInput
    $owner: String
  ) {
    onCreateDelivery(filter: $filter, owner: $owner) {
      id
      name
      address
      lat
      lng
      status
      duration
      createdAt
      updatedAt
      owner
      __typename
    }
  }
`;
export const onUpdateDelivery = /* GraphQL */ `
  subscription OnUpdateDelivery(
    $filter: ModelSubscriptionDeliveryFilterInput
    $owner: String
  ) {
    onUpdateDelivery(filter: $filter, owner: $owner) {
      id
      name
      address
      lat
      lng
      status
      duration
      createdAt
      updatedAt
      owner
      __typename
    }
  }
`;
export const onDeleteDelivery = /* GraphQL */ `
  subscription OnDeleteDelivery(
    $filter: ModelSubscriptionDeliveryFilterInput
    $owner: String
  ) {
    onDeleteDelivery(filter: $filter, owner: $owner) {
      id
      name
      address
      lat
      lng
      status
      duration
      createdAt
      updatedAt
      owner
      __typename
    }
  }
`;
export const onCreateDriver = /* GraphQL */ `
  subscription OnCreateDriver(
    $filter: ModelSubscriptionDriverFilterInput
    $owner: String
  ) {
    onCreateDriver(filter: $filter, owner: $owner) {
      id
      name
      email
      createdAt
      updatedAt
      owner
      __typename
    }
  }
`;
export const onUpdateDriver = /* GraphQL */ `
  subscription OnUpdateDriver(
    $filter: ModelSubscriptionDriverFilterInput
    $owner: String
  ) {
    onUpdateDriver(filter: $filter, owner: $owner) {
      id
      name
      email
      createdAt
      updatedAt
      owner
      __typename
    }
  }
`;
export const onDeleteDriver = /* GraphQL */ `
  subscription OnDeleteDriver(
    $filter: ModelSubscriptionDriverFilterInput
    $owner: String
  ) {
    onDeleteDriver(filter: $filter, owner: $owner) {
      id
      name
      email
      createdAt
      updatedAt
      owner
      __typename
    }
  }
`;
