// Kera's gpt-oss is marked "reading pages only" in the model menu: on 2026-11-02 it failed 3/3 runs of filling a sheet
// (eval sheets-test-data) while gpt-6-luna passed. The mark comes from the catalogue; nothing is blocked.
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { limitOf } from '@src/store/settings';
import type { ProviderConfig } from '@src/store/settings';
import { ModelMenu } from '../ModelMenu';

const kera = {
  id: 'k',
  kind: 'kera',
  name: 'Kera',
  models: [{ name: 'gpt-oss:20b' }, { name: 'gpt-6-luna' }],
} as unknown as ProviderConfig;
const ollama = {
  id: 'o',
  kind: 'ollama',
  name: 'Ollama',
  models: [{ name: 'gpt-oss:20b' }],
} as unknown as ProviderConfig;

describe('model limit', () => {
  it("marks Kera's gpt-oss reading-only and nothing else", () => {
    expect(limitOf([kera], { providerId: 'k', model: 'gpt-oss:20b' })).toBe('reading');
    expect(limitOf([kera], { providerId: 'k', model: 'gpt-6-luna' })).toBeUndefined();
    expect(limitOf([ollama], { providerId: 'o', model: 'gpt-oss:20b' })).toBeUndefined();
    expect(limitOf([kera], { providerId: 'x', model: 'gpt-oss:20b' })).toBeUndefined();
  });

  it('puts the note on the chosen model button as a tooltip', () => {
    const html = renderToStaticMarkup(
      <ModelMenu
        models={[
          {
            ref: { providerId: 'k', model: 'gpt-oss:20b' },
            label: 'gpt-oss:20b · Kera',
            name: 'gpt-oss:20b',
            limit: 'reading',
          },
        ]}
        model={{ providerId: 'k', model: 'gpt-oss:20b' }}
        reasoning="medium"
        running={false}
        onModel={() => undefined}
        onReasoning={() => undefined}
      />,
    );
    expect(html).toMatch(
      /title="Reading pages only: not reliable for filling forms or sheets\. Use gpt-6-luna for that\."/,
    );
  });
});

describe("Kera's local browser model", () => {
  it('Qwen3.8 through Kera sees screenshots, has a 64k window, no effort choice and no reading-only note', async () => {
    const { resolveProfile } = await import('@src/llm/profiles');
    const p = resolveProfile({ kind: 'kera', modelName: 'qwen3.8:27b' });
    expect(p).toMatchObject({ contextWindow: 65_536, vision: true, reasoning: 'none' });
    const k = { id: 'k', kind: 'kera', name: 'Kera', models: [{ name: 'qwen3.8:27b' }] } as unknown as ProviderConfig;
    expect(limitOf([k], { providerId: 'k', model: 'qwen3.8:27b' })).toBeUndefined();
  });
});
