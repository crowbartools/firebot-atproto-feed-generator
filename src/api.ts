import Fastify from 'fastify';
import config from './config.js';
import { getFirebotPostsFeed } from './lib/feed.js';
import { AtUri } from '@atproto/syntax';
import { addPost, getAllPosts, postInFeed, removePost } from './lib/db/index.js';
import { AtpAgent } from '@atproto/api';
import { getPostAtUri } from './lib/util.js';

const server = Fastify({
  logger: true,
});

// Tell Bluesky about the feed
server.route({
  method: 'GET',
  url: '/.well-known/did.json',
  handler: async (_, res) => {
    res.send({
      '@context': ['https://www.w3.org/ns/did/v1'],
      id: config.serviceDid,
      service: [
        {
          id: '#bsky_fg',
          serviceEndpoint: `https://${config.hostname}`,
          type: 'BskyFeedGenerator',
        },
      ],
    });
  },
});

// Define the feeds we support
server.route({
  method: 'GET',
  url: '/xrpc/app.bsky.feed.describeFeedGenerator',
  handler: async (_, res) => {
    res.send({
      did: config.serviceDid,
      feeds: [
        { uri: `at://${config.publisherDid}/app.bsky.feed.generator/firebot` },
      ],
    });
  },
});

// Construct the feed
server.route({
  method: 'GET',
  url: '/xrpc/app.bsky.feed.getFeedSkeleton',
  handler: async (req, res) => {
    const query = req.query as {
      feed: string;
      cursor?: string;
      limit?: string;
    };

    let limit = parseInt(query.limit ?? '50');

    if (limit < 1) {
      limit = 1;
    }

    if (limit > 100) {
      limit = 100;
    }

    const cursor = query.cursor;

    const feedUri = new AtUri(query.feed);

    switch (feedUri.rkey) {
      case 'firebot': {
        const feed = await getFirebotPostsFeed(limit, cursor);
        res.send(feed);
        return;
      }
      default: {
        res.code(404).send();
      }
    }
  },
});

// Get all post data
server.route({
  method: 'GET',
  url: '/dump',
  handler: async (_, res) => {
    res.send({
      posts: await getAllPosts(),
    });
  },
});

if (!!config.apiToken?.length) {
  // remove post from feed
  server.delete('/post', {}, async (req, res) => {
    const { postUrl, token } = req.query as {
      postUrl?: string;
      token?: string;
    };

    if (token !== config.apiToken) {
      res.code(403).send({ error: 'Invalid token' });
      return;
    }

    if (typeof postUrl !== 'string') {
      res.code(400).send({ error: 'Invalid post URL' });
      return;
    }

    // regex to extract the user handle and post rkey from the URL
    const regex = /https:\/\/bsky\.app\/profile\/([^/]+)\/post\/([^/]+)/;
    const match = postUrl.match(regex);
    if (!match) {
      res.code(400).send({ error: 'Invalid post URL' });
      return;
    }

    const handle = match[1] as string;
    const postRkey = match[2] as string;

    const agent = new AtpAgent({
      service: 'https://bsky.social',
    });

    let did: string | undefined;
    try {
      const response = await agent.resolveHandle({
        handle,
      });      
      did = response.data.did;
    } catch (error) {
      res.code(400).send({ error: 'Invalid handle' });
      return;
    }

    const postUri = getPostAtUri(did, postRkey);

    if (!(await postInFeed(postUri))) {
      res.code(404).send({ error: 'Post not found' });
      return;
    }

    await removePost(postUri);

    res.send({
      success: true,
    });
  });

  // add post to feed
  server.post('/post', {}, async (req, res) => {
    const { postUrl, token } = req.query as {
      postUrl?: string;
      token?: string;
    };

    if (token !== config.apiToken) {
      res.code(403).send({ error: 'Invalid token' });
      return;
    }

    if (typeof postUrl !== 'string') {
      res.code(400).send({ error: 'Invalid post URL' });
      return;
    }

    // regex to extract the user handle and post rkey from the URL
    const regex = /https:\/\/bsky\.app\/profile\/([^/]+)\/post\/([^/]+)/;
    const match = postUrl.match(regex);
    if (!match) {
      res.code(400).send({ error: 'Invalid post URL' });
      return;
    }

    const handle = match[1] as string;
    const postRkey = match[2] as string;

    const agent = new AtpAgent({
      service: 'https://bsky.social',
    });

    let uri: string | undefined;
    let cid: string | undefined;
    try {
      const post = await agent.getPost({ rkey: postRkey, repo: handle });
      uri = post.uri;
      cid = post.cid;
    } catch (error) {
      res.code(400).send({ error: 'Invalid handle' });
      return;
    }

    if ((await postInFeed(uri))) {
      res.code(404).send({ error: 'Post already in feed' });
      return;
    }

    await addPost({
      uri,
      cid,
      indexedAt: new Date().toISOString(),
    });

    res.send({
      success: true,
    });
  });
}


const port = config.port;
server.listen({ port, host: '::' }).then(() => {
  console.log(`Server listening on port ${port}`);
});
