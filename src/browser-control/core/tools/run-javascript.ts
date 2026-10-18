// `run_javascript`: an expression evaluated in the page's main frame, with the page's full access. The confirmation
// gate treats it as a write of category 'script': outside Auto mode the user allows each script on its card, and no
// site rule covers it. The value comes back as JSON inside the untrusted boundary, since it is page-derived.
import { LayerError } from '../../protocol/errors';
import type { ActionReceipt } from '../../protocol/results';
import type { RunJavascriptArgs } from '../../protocol/schemas';
import type { ToolContext, ToolOutcome } from '../controller';
import { checkCancelled } from '../controller';
import { confirmGate } from '../interaction/gate';
import { quote } from '../text';
import { sensitivity } from './act';
import { withPageState } from './navigate';

/** What the model gets back of a value: enough to read, never a whole page dump. */
const VALUE_CAP = 20_000;
const DEFAULT_TIMEOUT_MS = 30_000;

interface EvaluateResult {
  result: { type: string; subtype?: string; value?: unknown; description?: string };
  exceptionDetails?: { text: string; exception?: { description?: string } };
}

function cap(text: string): string {
  return text.length > VALUE_CAP
    ? `${text.slice(0, VALUE_CAP)}… (${text.length - VALUE_CAP} more characters cut)`
    : text;
}

export async function runJavascript(ctx: ToolContext, args: RunJavascriptArgs): Promise<ToolOutcome> {
  const attachment = await ctx.attach();
  const mainFrameId = attachment.topology.mainFrameId();
  const main = (await attachment.topology.frames()).find(f => f.frameId === mainFrameId);
  if (!main) throw new LayerError('PAGE_NOT_SUPPORTED', 'The page has no main frame to run a script in.');
  // The card shows the whole script (within reason); the receipt only its start.
  const gate = await confirmGate(ctx, {
    action: 'run_javascript',
    mode: 'none',
    frame: main,
    objectId: '',
    name: '',
    role: '',
    description: `script ${quote(args.code, 1000)}`,
    intent: args.intent,
    category: 'script',
    reason: "a script runs with the page's full access",
  });
  checkCancelled(ctx);
  ctx.tab().actionSeq++;
  const timeoutMs = args.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const { result, exceptionDetails } = await attachment.cdp.send<EvaluateResult>(
    main.sessionId,
    'Runtime.evaluate',
    { expression: args.code, awaitPromise: true, returnByValue: true, userGesture: true, timeout: timeoutMs },
    timeoutMs + 5_000,
  );
  const receipt: ActionReceipt = {
    action: 'run_javascript',
    target: `script ${quote(args.code, 160)}`,
    mechanism: 'script',
    dispatched: true,
    effect: { verdict: 'unattributable', signals: [] },
    ...sensitivity(gate),
  };
  if (exceptionDetails) {
    const error = exceptionDetails.exception?.description ?? exceptionDetails.text;
    return withPageState(ctx, args.observe, {
      receipt,
      data: { error },
      lines: ['run_javascript · the script threw; the error follows'],
      pageText: cap(error),
    });
  }
  const text = result.value === undefined ? (result.description ?? result.type) : JSON.stringify(result.value);
  return withPageState(ctx, args.observe, {
    receipt,
    data: { value: result.value },
    lines: [`run_javascript · returned ${result.subtype ?? result.type}; the value follows`],
    pageText: cap(text ?? 'undefined'),
  });
}
