import {
  GROK_AUTO_REVIEW_RESOLUTION,
  GROK_CONNECTOR_GRANT_RESOLUTION,
  GROK_LOCAL_TOOL_RESOLUTION,
  type GrokAutoReviewResolution,
  type GrokConnectorGrantResolution,
  type GrokLocalToolResolution
} from './types'
import type { GrokRpcRequest } from '@shared/ipc'
import type { ApprovalDecision } from '../types'

function isDeny(decision: ApprovalDecision): boolean {
  return decision === 'deny' || decision === 'deny_always'
}

/** Map BotHub Allow/Deny to Grok Auto-review proto enums. */
export function autoReviewResolutionFromDecision(
  decision: ApprovalDecision
): GrokAutoReviewResolution {
  if (isDeny(decision)) return 'DENIED'
  if (decision === 'allow_always') return 'ALWAYS'
  return 'APPROVED'
}

export function localToolResolutionFromDecision(
  decision: ApprovalDecision
): GrokLocalToolResolution {
  if (decision === 'deny_always') return 'NEVER'
  if (decision === 'deny') return 'DENY'
  if (decision === 'allow_always') return 'ALWAYS'
  return 'ALLOW_ONCE'
}

export function connectorGrantResolutionFromDecision(
  decision: ApprovalDecision
): GrokConnectorGrantResolution {
  if (isDeny(decision)) return 'SKIPPED'
  if (decision === 'allow_always') return 'ALWAYS_THIS_BOT'
  return 'ALLOWED'
}

export type GrokApprovalKind =
  | 'auto-review'
  | 'local-tool'
  | 'connector'
  | 'connector-grant'
  | 'virtual-card'
  | 'messaging-card'

/** Build main-process RPC request for any 0.79.3 Grok approval or messaging card decision. */
export function grokApprovalRpcRequest(
  accountId: string,
  kind: GrokApprovalKind,
  args: {
    agentId: string
    requestId: string
    entryId?: string
    cardVersion?: number
    decision: ApprovalDecision
    sessionId?: string
    approvalPlatform?: string
    approvedCommand?: string
  }
): GrokRpcRequest {
  if (kind === 'messaging-card') {
    const answer = isDeny(args.decision)
      ? 'DENY'
      : args.decision === 'allow_always'
        ? 'ALWAYS'
        : 'APPROVE'
    return {
      accountId,
      op: 'answerMessagingCard',
      cardId: args.requestId,
      version: args.cardVersion ?? 1,
      answer
    }
  }
  if (kind === 'auto-review') {
    return {
      accountId,
      op: 'resolveAutoReview',
      agentId: args.agentId,
      requestId: args.requestId,
      resolution: GROK_AUTO_REVIEW_RESOLUTION[autoReviewResolutionFromDecision(args.decision)],
      approvalPlatform: args.approvalPlatform ?? 'desktop',
      approvedCommand: args.approvedCommand,
      sessionId: args.sessionId
    }
  }
  if (kind === 'local-tool') {
    return {
      accountId,
      op: 'resolveLocalTool',
      agentId: args.agentId,
      entryId: args.entryId ?? args.requestId,
      requestId: args.requestId,
      resolution: GROK_LOCAL_TOOL_RESOLUTION[localToolResolutionFromDecision(args.decision)],
      sessionId: args.sessionId
    }
  }
  if (kind === 'virtual-card') {
    return {
      accountId,
      op: 'resolveVirtualCard',
      agentId: args.agentId,
      entryId: args.entryId ?? args.requestId,
      requestId: args.requestId,
      resolution: isDeny(args.decision) ? 2 : 1
    }
  }
  return {
    accountId,
    op: 'resolveConnectorGrant',
    agentId: args.agentId,
    entryId: args.entryId,
    requestId: args.requestId,
    resolution:
      GROK_CONNECTOR_GRANT_RESOLUTION[connectorGrantResolutionFromDecision(args.decision)],
    sessionId: args.sessionId
  }
}
