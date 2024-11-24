import Fastify from 'fastify';
import config from './config.js';
import { getFirebotPostsFeed } from './lib/feed.js';
import { AtUri } from '@atproto/syntax';
import { getAllPosts } from './lib/db/index.js';

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
      id: config.publisherDid,
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

const port = config.port;
server.listen({ port, host: '::' }).then(() => {
  console.log(`Server listening on port ${port}`);
});
