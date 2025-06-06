/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const getTodo = /* GraphQL */ `
  query GetTodo($id: ID!) {
    getTodo(id: $id) {
      id
      name
      description
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listTodos = /* GraphQL */ `
  query ListTodos(
    $filter: ModelTodoFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listTodos(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        name
        description
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getDelivery = /* GraphQL */ `
  query GetDelivery($id: ID!) {
    getDelivery(id: $id) {
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
export const listDeliveries = /* GraphQL */ `
  query ListDeliveries(
    $filter: ModelDeliveryFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listDeliveries(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
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
      nextToken
      __typename
    }
  }
`;
export const getDriver = /* GraphQL */ `
  query GetDriver($id: ID!) {
    getDriver(id: $id) {
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
export const listDrivers = /* GraphQL */ `
  query ListDrivers(
    $filter: ModelDriverFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listDrivers(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        name
        email
        createdAt
        updatedAt
        owner
        __typename
      }
      nextToken
      __typename
    }
  }
`;
