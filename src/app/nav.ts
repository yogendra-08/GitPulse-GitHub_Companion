import { BarChart3, BookMarked, Bell, CircleDot, GitPullRequest, LayoutDashboard, Settings, type LucideIcon } from 'lucide-react';

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  /** Second key of the "g then …" shortcut. */
  key: string;
}

export const NAV: NavItem[] = [
  { path: '/', label: 'Overview', icon: LayoutDashboard, key: 'o' },
  { path: '/pulls', label: 'Pull requests', icon: GitPullRequest, key: 'p' },
  { path: '/issues', label: 'Issues', icon: CircleDot, key: 'i' },
  { path: '/notifications', label: 'Notifications', icon: Bell, key: 'n' },
  { path: '/repos', label: 'Repositories', icon: BookMarked, key: 'r' },
  { path: '/analytics', label: 'Analytics', icon: BarChart3, key: 'a' },
  { path: '/settings', label: 'Settings', icon: Settings, key: 's' },
];

export const GITHUB_URL = 'https://github.com';
