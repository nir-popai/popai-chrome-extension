// Hardcoded configuration for customer4
// TODO: Move to environment variables for production

export const config = {
  firebase: {
    apiKey: 'AIzaSyDFY2-PnXBlGzvTHhql6Fmw6xVfJXD4Ipk',
    authDomain: 'popai-chrome-notifications.firebaseapp.com',
    projectId: 'popai-chrome-notifications',
    storageBucket: 'popai-chrome-notifications.firebasestorage.app',
    messagingSenderId: '297905441330',
    appId: '1:297905441330:web:28f3bd3294d1a8244dca2b',
    vapidKey: 'BBg7hqevRuPFHH8y4weq2YhF6za9AudqnrelSk8Wf29gyxpqkd-P5NNtSjtms-c2pVAX9nsnESwoOtjjBHy1VyE',
  },
  aws: {
    region: 'us-east-2',
    cognito: {
      // Production customer4 Cognito pool
      userPoolId: 'us-east-2_f0AxRtDj2',
      userPoolClientId: '2pld4r92diup01a9409kak9e60',
    },
  },
  api: {
    graphqlEndpoint: 'https://u3y7rmcx55fb7pxgkuusca5oqu.appsync-api.us-east-2.amazonaws.com/graphql',
  },
} as const
