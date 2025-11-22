declare module "./aws-exports" {
  const config: any;
  export default config;
}

declare module "../graphql/queries" {
  const queries: any;
  export = queries;
}

declare module "../graphql/mutations" {
  const mutations: any;
  export = mutations;
}
