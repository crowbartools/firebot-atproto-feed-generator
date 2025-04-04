export const maybeStr = (val?: string) => {
  if (!val) return undefined
  return val
}

export const maybeInt = (val?: string) => {
  if (!val) return undefined
  const int = parseInt(val, 10)
  if (isNaN(int)) return undefined
  return int
}

export const getPostAtUri = (did: string, rkey: string) => {
  return `at://${did}/app.bsky.feed.post/${rkey}`;
};