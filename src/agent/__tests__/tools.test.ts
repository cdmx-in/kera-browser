import { describe, expect, it } from 'vitest';
import { allTools, kindOf, PAGE_ACTIONS, withTabId } from '../tools';

describe('run_javascript', () => {
  it('is not offered (agent sessions have no page script), and stays a page action and a mutation', () => {
    expect(allTools().some(t => t.name === 'run_javascript')).toBe(false);
    expect(PAGE_ACTIONS.has('run_javascript')).toBe(true);
    expect(kindOf('run_javascript', { code: '1' })).toBe('mutate');
  });
});

describe('tab ids', () => {
  it('are offered as strings of digits, so a renderer cannot print them as floats', () => {
    for (const tool of allTools()) {
      const tabId = (tool.parameters as { properties?: Record<string, { type?: string }> }).properties?.tabId;
      if (tabId) expect(tabId.type, tool.name).toBe('string');
    }
  });

  it('take digits as a number, and refuse anything that is not exactly an id', () => {
    expect(withTabId({ tabId: '1657934587' })).toEqual({ tabId: 1657934587 });
    expect(withTabId({ tabId: 1657934587 })).toEqual({ tabId: 1657934587 });
    expect(withTabId({ action: 'list' })).toEqual({ action: 'list' });
    expect(withTabId({ tabId: '1.657934582e+09' })).toBeNull();
    expect(withTabId({ tabId: 1657934582.5 })).toBeNull();
    expect(withTabId({ tabId: 'tab 3' })).toBeNull();
  });
});

describe('targets', () => {
  it('offer a ref or a role and name, not coordinates or selectors', () => {
    const text = JSON.stringify(allTools().map(t => t.parameters));
    expect(text).not.toContain('"selector"');
    expect(text).not.toMatch(/"x":\{"type":"number"/);
    expect(text).toContain('"ref"');
  });
});
