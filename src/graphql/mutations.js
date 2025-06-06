/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const sendEmail = /* GraphQL */ `
  mutation SendEmail(
    $to: String!
    $customerName: String!
    $eta: String!
    $summary: String!
  ) {
    sendEmail(
      to: $to
      customerName: $customerName
      eta: $eta
      summary: $summary
    )
  }
`;
export const createDelivery = /* GraphQL */ `
  mutation CreateDelivery(
    $input: CreateDeliveryInput!
    $condition: ModelDeliveryConditionInput
  ) {
    createDelivery(input: $input, condition: $condition) {
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
export const updateDelivery = /* GraphQL */ `
  mutation UpdateDelivery(
    $input: UpdateDeliveryInput!
    $condition: ModelDeliveryConditionInput
  ) {
    updateDelivery(input: $input, condition: $condition) {
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
export const deleteDelivery = /* GraphQL */ `
  mutation DeleteDelivery(
    $input: DeleteDeliveryInput!
    $condition: ModelDeliveryConditionInput
  ) {
    deleteDelivery(input: $input, condition: $condition) {
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
export const createDriver = /* GraphQL */ `
  mutation CreateDriver(
    $input: CreateDriverInput!
    $condition: ModelDriverConditionInput
  ) {
    createDriver(input: $input, condition: $condition) {
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
export const updateDriver = /* GraphQL */ `
  mutation UpdateDriver(
    $input: UpdateDriverInput!
    $condition: ModelDriverConditionInput
  ) {
    updateDriver(input: $input, condition: $condition) {
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
export const deleteDriver = /* GraphQL */ `
  mutation DeleteDriver(
    $input: DeleteDriverInput!
    $condition: ModelDriverConditionInput
  ) {
    deleteDriver(input: $input, condition: $condition) {
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
