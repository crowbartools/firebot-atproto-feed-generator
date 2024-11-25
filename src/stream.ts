import { Jetstream } from '@skyware/jetstream';
import WebSocket from 'ws';
import config from './config.js';
import { addPost } from './lib/db/index.js';

const jetstream = new Jetstream({
  ws: WebSocket,
  wantedCollections: [
    'app.bsky.feed.post',
    'app.bsky.feed.repost',
    'app.bsky.feed.like',
  ],
});

jetstream.onCreate('app.bsky.feed.post', async (event) => {
  const fromFirebotAccount = event.did === config.firebotAccountDid;
  const taggedFirebotAccount = event.commit.record.facets?.some(
    (f) =>
      f.features?.[0]?.$type === 'app.bsky.richtext.facet#mention' &&
      f.features?.[0]?.did === config.firebotAccountDid,
  );
  const includesFirebotInText = event.commit.record.text
    .toLowerCase()
    .includes('firebot');

  if (fromFirebotAccount || taggedFirebotAccount || includesFirebotInText) {
    await addPost({
      uri: getAtUri(event.did, event.commit.rkey),
      cid: event.commit.cid,
      indexedAt: new Date().toISOString(),
    });
  }
});

jetstream.onCreate('app.bsky.feed.like', async (event) => {
  const fromFirebotAccount = event.did === config.firebotAccountDid;
  if (fromFirebotAccount) {
    await addPost({
      uri: event.commit.record.subject.uri,
      cid: event.commit.record.subject.cid,
      indexedAt: new Date().toISOString(),
    });
  }
});

jetstream.onCreate('app.bsky.feed.repost', async (event) => {
  const fromFirebotAccount = event.did === config.firebotAccountDid;
  if (fromFirebotAccount) {
    await addPost({
      uri: event.commit.record.subject.uri,
      cid: event.commit.record.subject.cid,
      indexedAt: new Date().toISOString(),
    });
  }
});

function getAtUri(did: string, rkey: string) {
  return `at://${did}/app.bsky.feed.post/${rkey}`;
}

jetstream.start();
