// Settings → About: the version, the project's licence, the website, and the open-source packages the extension ships with theirs.
import type { ProviderConfig } from '@src/store/settings';
import { SettingsCard } from './SettingsCard';
import { t } from '@src/ui/i18n';
import { LICENCES } from './licences';
import { KERA_PROJECT_URL, websiteUrl } from '@src/ui/links';
import { keraAddressOf, providersStorage } from '@src/store/settings';
import { useStorage } from '@src/ui/hooks';

const NO_PROVIDERS: ProviderConfig[] = [];

export function AboutSection() {
  const manifest = chrome.runtime.getManifest();
  const server = keraAddressOf(useStorage(providersStorage, NO_PROVIDERS), null);
  return (
    <div className="flex flex-col gap-6">
      <h2 className="sr-only">{t('settings.nav.about')}</h2>
      <SettingsCard title="Kera Browser" className="flex flex-col gap-1">
        <p className="text-sm">{t('about.version', { version: manifest.version })}</p>
        <p className="text-sm text-nb-muted">{t('about.license', { license: 'Apache-2.0' })}</p>
        {server ? (
          <p className="text-sm">
            {t('about.server')}{' '}
            <a
              className="text-nb-link underline"
              href={websiteUrl('/', 'about', server)}
              target="_blank"
              rel="noreferrer">
              {server}
            </a>
          </p>
        ) : null}
        <p className="text-sm">
          {t('about.website')}{' '}
          <a className="text-nb-link underline" href={KERA_PROJECT_URL} target="_blank" rel="noreferrer">
            github.com/cdmx-in/kera
          </a>
        </p>
        <p className="text-sm text-nb-muted">
          Based on{' '}
          <a
            className="text-nb-link underline"
            href="https://github.com/nanobrowser/nanobrowser"
            target="_blank"
            rel="noreferrer">
            Nanobrowser
          </a>{' '}
          (Apache-2.0).
        </p>
      </SettingsCard>
      <SettingsCard title={t('about.licences')}>
        <ul className="flex flex-col gap-1 text-sm">
          {LICENCES.map(l => (
            <li key={l.name} className="flex flex-wrap gap-x-2">
              <a className="break-all font-mono text-nb-link underline" href={l.url} target="_blank" rel="noreferrer">
                {l.name}
              </a>
              <span className="text-nb-muted">{l.licence}</span>
            </li>
          ))}
        </ul>
      </SettingsCard>
    </div>
  );
}
