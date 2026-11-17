import { useState, type FormEvent } from 'react';
import { ExternalLink, KeyRound, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthProvider';
import { Button } from './ui/Button';
import { Segmented } from './ui/Controls';

type Kind = 'classic' | 'fine-grained';

const CLASSIC_URL = 'https://github.com/settings/tokens/new?scopes=repo,notifications,read:user&description=GitPulse';
const FINE_GRAINED_URL = 'https://github.com/settings/personal-access-tokens/new';

function A({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent underline-offset-2 hover:underline">
      {children}
      <ExternalLink size={12} aria-hidden />
    </a>
  );
}

export function ConnectPanel({ invalid = false }: { invalid?: boolean }) {
  const { connect } = useAuth();
  const [kind, setKind] = useState<Kind>('classic');
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const message = await connect(token);
    if (message) {
      setError(message);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <h1 className="text-xl font-semibold tracking-tight">{invalid ? 'Reconnect your GitHub account' : 'Connect your GitHub account'}</h1>
      <p className="mt-1.5 text-sm text-muted">
        {invalid
          ? 'GitHub no longer accepts the saved token. Create a new one and paste it below.'
          : 'GitPulse reads your pull requests, issues, repositories and notifications using a personal access token that you create and control.'}
      </p>

      <div className="mt-6">
        <Segmented
          label="Token type"
          value={kind}
          onChange={setKind}
          options={[
            { value: 'classic', label: 'Classic token' },
            { value: 'fine-grained', label: 'Fine-grained token' },
          ]}
        />
      </div>

      <div className="mt-4 rounded-lg border border-line bg-surface p-4 text-sm">
        {kind === 'classic' ? (
          <div className="space-y-2.5">
            <p>
              <A href={CLASSIC_URL}>Create a classic token</A> with these scopes already selected:
            </p>
            <ul className="space-y-1 text-muted">
              <li><code className="font-mono text-xs text-ink">repo</code> to read private repositories, issues and pull requests</li>
              <li><code className="font-mono text-xs text-ink">notifications</code> to read and mark notifications</li>
              <li><code className="font-mono text-xs text-ink">read:user</code> to include private contributions in your totals</li>
            </ul>
            <p className="text-xs text-muted">
              Only need public data? Use <code className="font-mono text-ink">public_repo</code> instead of <code className="font-mono text-ink">repo</code>. A
              classic token is the only kind GitHub allows to read notifications.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            <p>
              <A href={FINE_GRAINED_URL}>Create a fine-grained token</A>, choose the repositories to include, then grant read-only access:
            </p>
            <ul className="space-y-1 text-muted">
              <li><span className="text-ink">Metadata</span>: read (added automatically)</li>
              <li><span className="text-ink">Issues</span>: read</li>
              <li><span className="text-ink">Pull requests</span>: read</li>
            </ul>
            <p className="text-xs text-muted">
              Limits: a fine-grained token covers one account or organization, and GitHub doesn&rsquo;t let it read notifications, so the Notifications page and
              toolbar badge stay off.
            </p>
          </div>
        )}
      </div>

      <form onSubmit={submit} className="mt-4">
        <label htmlFor="token" className="mb-1.5 block text-sm font-medium">
          Personal access token
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <KeyRound aria-hidden size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
            <input
              id="token"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={kind === 'classic' ? 'ghp_…' : 'github_pat_…'}
              aria-invalid={!!error}
              aria-describedby={error ? 'token-error' : undefined}
              className="h-9 w-full rounded-md border border-line-strong bg-surface pl-8 pr-3 font-mono text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none"
            />
          </div>
          <Button type="submit" variant="primary" size="md" disabled={busy || !token.trim()} className="h-9">
            {busy ? 'Checking…' : 'Connect'}
          </Button>
        </div>
        {error && (
          <p id="token-error" role="alert" className="mt-2 text-sm text-closed">
            {error}
          </p>
        )}
      </form>

      <div className="mt-6 flex gap-3 rounded-lg border border-line px-4 py-3 text-sm text-muted">
        <ShieldCheck aria-hidden size={16} className="mt-0.5 shrink-0 text-open" />
        <p>
          Your token stays in this browser&rsquo;s extension storage and is only ever sent to <span className="font-mono text-xs text-ink">api.github.com</span>.
          There is no GitPulse server. You can disconnect in Settings and revoke the token at any time from{' '}
          <A href="https://github.com/settings/tokens">GitHub token settings</A>.
        </p>
      </div>
    </div>
  );
}
