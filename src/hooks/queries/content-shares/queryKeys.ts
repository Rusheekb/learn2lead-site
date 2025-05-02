
/**
 * Query keys for content shares
 */
export const contentSharesKeys = {
  all: ['contentShares'] as const,
  lists: () => [...contentSharesKeys.all, 'list'] as const,
  detail: (id: string) => [...contentSharesKeys.all, 'detail', id] as const,
  user: (userId: string) => [...contentSharesKeys.all, 'user', userId] as const,
};
