export const queryKeys = {
  assets: {
    all:    () => ['assets'],
    search: (filters) => ['assets', 'search', filters],
    detail: (id)      => ['assets', id],
  },
  requests: {
    all:  () => ['requests'],
    list: (filters) => ['requests', 'list', filters],
  },
  admin: {
    stats:     () => ['admin', 'stats'],
    users:     (f) => ['admin', 'users', f],
    auditLogs: (f) => ['admin', 'audit-logs', f],
  },
  branches: { all: () => ['branches'] },
  manager: {
    teamRequests: (f) => ['manager', 'team-requests', f],
    teamAssets:   (f) => ['manager', 'team-assets', f],
    teamStats:    ()  => ['manager', 'stats'],
  },
};
