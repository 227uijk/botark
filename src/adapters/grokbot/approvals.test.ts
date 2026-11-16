import { describe, expect, it } from 'vitest'
import { grokApprovalRpcRequest } from './approvals'
import { GROK_CONNECTOR_GRANT_RESOLUTION, GROK_LOCAL_TOOL_RESOLUTION } from './types'

describe('grokApprovalRpcRequest', () => {
  it('routes messaging-card approvals to AnswerGrokBotMessagingCard', () => {
    const req = grokApprovalRpcRequest('acc-1', 'messaging-card', {
      agentId: 'agent-1',
      requestId: 'card-77',
      cardVersion: 2,
      decision: 'allow_once'
    })
    expect(req).toEqual({
      accountId: 'acc-1',
      op: 'answerMessagingCard',
      cardId: 'card-77',
      version: 2,
      answer: 'APPROVE'
    })
  })

  it('passes mandatory entryId on ResolveGrokBotLocalToolPermission', () => {
    const req = grokApprovalRpcRequest('acc-1', 'local-tool', {
      agentId: 'agent-1',
      entryId: 'tbs_42',
      requestId: 'req_42',
      decision: 'allow_always',
      sessionId: 'sess_1'
    })
    expect(req).toEqual({
      accountId: 'acc-1',
      op: 'resolveLocalTool',
      agentId: 'agent-1',
      entryId: 'tbs_42',
      requestId: 'req_42',
      resolution: GROK_LOCAL_TOOL_RESOLUTION.ALWAYS,
      sessionId: 'sess_1'
    })
  })

  it('maps allow_always on connector-grant to ALWAYS_THIS_BOT (3)', () => {
    const req = grokApprovalRpcRequest('acc-1', 'connector-grant', {
      agentId: 'agent-1',
      requestId: 'cg_1',
      entryId: 'tbs_cg',
      decision: 'allow_always'
    })
    expect(req).toEqual({
      accountId: 'acc-1',
      op: 'resolveConnectorGrant',
      agentId: 'agent-1',
      entryId: 'tbs_cg',
      requestId: 'cg_1',
      resolution: GROK_CONNECTOR_GRANT_RESOLUTION.ALWAYS_THIS_BOT,
      sessionId: undefined
    })
  })

  it('routes virtual-card approvals to ResolveGrokBotVirtualCardApproval', () => {
    const req = grokApprovalRpcRequest('acc-1', 'virtual-card', {
      agentId: 'agent-1',
      requestId: 'vc_9',
      entryId: 'tbs_vc',
      decision: 'deny'
    })
    expect(req).toEqual({
      accountId: 'acc-1',
      op: 'resolveVirtualCard',
      agentId: 'agent-1',
      entryId: 'tbs_vc',
      requestId: 'vc_9',
      resolution: 2
    })
  })
})
