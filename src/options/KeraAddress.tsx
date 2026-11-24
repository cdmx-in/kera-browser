// What the pages say about a Kera server's address: the sentence naming the origin Kera Browser will talk to, the
// warning for plain http, the problems of a failed connection in words, and the address field of a Kera provider in
// Settings → Providers (the welcome page has its own input and uses the notes and the problem text).
import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { BUILD_DEFAULT_ADDRESS, isLoopback, isPlainHttp, parseKeraAddress, resolveKeraAddress } from '@src/llm/kera';
import { providersStorage, withBaseUrl } from '@src/store/settings';
import type { ProviderConfig } from '@src/store/settings';
import { Button, Input, Notice } from '@src/ui/components';
import { CheckIcon, CloseIcon } from '@src/ui/icons';
import { t } from '@src/ui/i18n';
import { releaseServerPermission, requestServerPermission } from '@src/ui/server-permission';
import { connectToServer, useServerPermission } from './kera-server';
import type { ConnectResult } from './kera-server';

/** A failed connection in words. */
export function problemText(result: Extract<ConnectResult, { ok: false }>): string {
  if (result.problem === 'address') return t(`kera.address.${result.addressProblem ?? 'invalid'}`);
  return t(`kera.problem.${result.problem}`, { origin: result.address ?? '', detail: result.detail ?? '' });
}

/** "Kera Browser will talk to <origin>", and what the address being plain http means. Nothing for no valid address. */
export function ServerAddressNotes({ address, willAsk = true }: { address?: string; willAsk?: boolean }) {
  const allowed = useServerPermission(address);
  if (!address) return null;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-nb-muted">
        {t('kera.talksTo', { origin: address })}
        {willAsk && allowed === false ? ` ${t('kera.willAsk')}` : ''}
      </p>
      {isPlainHttp(address) ? (
        isLoopback(address) ? (
          <p className="text-sm text-nb-muted">{t('kera.http.local')}</p>
        ) : (
          <Notice tone="warn">{t('kera.http.network')}</Notice>
        )
      ) : null}
    </div>
  );
}

const ICON_BUTTON =
  'rounded-md p-1.5 text-nb-muted hover:bg-nb-surface hover:text-nb-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-nb-accent';

/**
 * The address of a Kera provider. An edit is a draft until the check (or Enter) saves it: the address is checked, Chrome
 * is asked for its origin, the server is asked who it is and the saved key is tried, and only then is it stored with the
 * provider. The old origin's permission is dropped unless another provider or the build still uses it. A provider with no
 * stored address shows the build's default, which is what it talks to.
 */
export function KeraAddressField({
  provider,
  providers,
  apiKey,
  onSaved,
}: {
  provider: ProviderConfig;
  providers: ProviderConfig[];
  apiKey: string;
  /** The address changed: the provider's models are tested again. */
  onSaved: (address: string) => void;
}) {
  const current = resolveKeraAddress(provider.baseUrl);
  const [draft, setDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const allowed = useServerPermission(current);
  const changed = draft !== null && draft.trim() !== (current ?? '');
  const shown = draft ?? current ?? '';
  const typed = parseKeraAddress(shown);

  const save = () => {
    if (draft === null || busy) return;
    setBusy(true);
    setProblem(null);
    // connectToServer asks Chrome for the origin before its first await, so the click still counts.
    void connectToServer(draft, apiKey)
      .then(async result => {
        if (!result.ok) return setProblem(problemText(result));
        const previous = current;
        await providersStorage.set(list =>
          list.map(p =>
            p.id !== provider.id
              ? p
              : result.address === previous
                ? { ...p, baseUrl: result.address }
                : withBaseUrl(p, result.address),
          ),
        );
        setDraft(null);
        if (previous && previous !== result.address) {
          const others = providers
            .filter(p => p.id !== provider.id && p.kind === 'kera')
            .map(p => resolveKeraAddress(p.baseUrl));
          await releaseServerPermission(
            previous,
            [...others, BUILD_DEFAULT_ADDRESS].filter((a): a is string => !!a),
          );
        }
        if (result.address !== previous) onSaved(result.address);
      })
      .finally(() => setBusy(false));
  };
  const key = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && changed) save();
    else if (e.key === 'Escape' && draft !== null) {
      e.stopPropagation();
      setDraft(null);
      setProblem(null);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        <Input
          aria-label={t('kera.address')}
          className="w-full sm:max-w-sm"
          autoComplete="off"
          spellCheck={false}
          inputMode="url"
          placeholder="https://kera.example.com"
          value={shown}
          disabled={busy}
          onChange={e => {
            setDraft(e.target.value);
            setProblem(null);
          }}
          onKeyDown={key}
        />
        {busy ? <span className="text-nb-muted">{t('kera.checking')}</span> : null}
        {changed && !busy ? (
          <>
            <button
              type="button"
              aria-label={t('kera.saveAddress')}
              title={t('kera.saveAddress')}
              className="rounded-md p-1.5 text-emerald-700 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-nb-accent dark:text-emerald-400 dark:hover:bg-emerald-950"
              onClick={save}>
              <CheckIcon size={16} />
            </button>
            <button
              type="button"
              aria-label={t('common.cancel')}
              title={t('common.cancel')}
              className={ICON_BUTTON}
              onClick={() => {
                setDraft(null);
                setProblem(null);
              }}>
              <CloseIcon size={16} />
            </button>
          </>
        ) : null}
      </div>
      <ServerAddressNotes address={typed.ok ? typed.address : undefined} willAsk={changed} />
      {problem ? <Notice tone="error">{problem}</Notice> : null}
      {!changed && current && allowed === false ? (
        <Notice tone="warn">
          <p className="mb-2">{t('kera.permissionLost', { origin: current })}</p>
          {/* The request comes first in the click: Chrome takes it only while the click lasts. */}
          <Button onClick={() => void requestServerPermission(current)}>{t('kera.allow')}</Button>
        </Notice>
      ) : null}
      {!current ? <Notice tone="info">{t('kera.noAddress')}</Notice> : null}
    </div>
  );
}
