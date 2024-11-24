import { Jetstream } from '@skyware/jetstream';
import WebSocket from 'ws';
import config from './config.js';
import { addPost, removePost } from './lib/db/index.js';

const jetstream = new Jetstream({
  ws: WebSocket,
  wantedCollections: ['app.bsky.feed.post'],
});

jetstream.onCreate('app.bsky.feed.post', async (event) => {
  const isFirebotAccount = event.did === config.firebotAccountDid;
  const mentionsFirebot = event.commit.record.text
    .toLowerCase()
    .includes('firebot');

  if (!isFirebotAccount && !mentionsFirebot) {
    return;
  }

  await addPost({
    uri: getAtUri(event.did, event.commit.rkey),
    cid: event.commit.cid,
    indexedAt: new Date().toISOString(),
  });
});

jetstream.onDelete('app.bsky.feed.post', async (event) => {
  await removePost(getAtUri(event.did, event.commit.rkey));
});

function getAtUri(did: string, rkey: string) {
  return `at://${did}/app.bsky.feed.post/${rkey}`;
}

jetstream.start();
