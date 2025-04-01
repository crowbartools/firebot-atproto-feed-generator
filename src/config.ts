import 'dotenv/config';

import { maybeStr, maybeInt } from './lib/util.js';

const hostname = maybeStr(process.env.FEEDGEN_HOSTNAME) ?? 'example.com';

export default {
  port: maybeInt(process.env.FEEDGEN_PORT) ?? 3000,
  listenhost: maybeStr(process.env.FEEDGEN_LISTENHOST) ?? 'localhost',
  sqliteLocation: maybeStr(process.env.FEEDGEN_SQLITE_LOCATION) ?? ':memory:',
  subscriptionEndpoint:
    maybeStr(process.env.FEEDGEN_SUBSCRIPTION_ENDPOINT) ?? 'wss://bsky.network',
  publisherDid:
    maybeStr(process.env.FEEDGEN_PUBLISHER_DID) ?? 'did:example:alice',
  subscriptionReconnectDelay:
    maybeInt(process.env.FEEDGEN_SUBSCRIPTION_RECONNECT_DELAY) ?? 3000,
  hostname,
  serviceDid:
    maybeStr(process.env.FEEDGEN_SERVICE_DID) ?? `did:web:${hostname}`,
  firebotAccountDid: 'did:plc:gnk67eteayfs2qx76xvecu6f',
  apiToken: maybeStr(process.env.API_TOKEN),
  blacklistedWords: ['fireboth', 'pantsonfirebot', 'hellfirebot'],
};
