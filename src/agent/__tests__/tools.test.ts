import { describe, expect, it } from 'vitest';
import { allTools, kindOf, PAGE_ACTIONS } from '../tools';

describe('run_javascript', () => {
  it('is offered as an acting tool, a page action and a mutation', () => {
    const tool = allTools().find(t => t.name === 'run_javascript');
    expect(tool?.group).toBe('acting');
    expect(PAGE_ACTIONS.has('run_javascript')).toBe(true);
    expect(kindOf('run_javascript', { code: '1' })).toBe('mutate');
  });
});
