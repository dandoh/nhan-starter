/**
 * Example database queries using createServerFn for TanStack Start
 * 
 * IMPORTANT: All database operations must be wrapped in createServerFn
 * to ensure they only run on the server, never on the client.
 */

import { createServerFn } from '@tanstack/react-start';
import { eq } from 'drizzle-orm';
import { db } from './index';
import { users, posts } from './schema';
import type { NewUser, NewPost } from './schema';

// Get all users
export const getUsers = createServerFn({
  method: 'GET',
}).handler(async () => {
  return await db.select().from(users);
});

// Get user by ID
export const getUserById = createServerFn({
  method: 'GET',
})
  .inputValidator((id: string) => id)
  .handler(async ({ data: id, context }) => {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0] || null;
  });

// Create user
export const createUser = createServerFn({
  method: 'POST',
})
  .inputValidator((data: NewUser) => data)
  .handler(async ({ data }) => {
    const result = await db.insert(users).values(data).returning();
    return result[0];
  });

// Get posts with authors
export const getPostsWithAuthors = createServerFn({
  method: 'GET',
}).handler(async () => {
  return await db.query.posts.findMany({
    with: {
      author: true,
    },
  });
});

// Get published posts
export const getPublishedPosts = createServerFn({
  method: 'GET',
}).handler(async () => {
  return await db.query.posts.findMany({
    where: (posts, { eq }) => eq(posts.published, true),
    with: {
      author: true,
    },
  });
});

// Create post
export const createPost = createServerFn({
  method: 'POST',
})
  .inputValidator((data: NewPost) => data)
  .handler(async ({ data }) => {
    const result = await db.insert(posts).values(data).returning();
    return result[0];
  });

