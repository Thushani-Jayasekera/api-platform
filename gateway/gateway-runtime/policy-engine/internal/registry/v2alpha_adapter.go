package registry

import (
	v1 "github.com/wso2/api-platform/sdk/gateway/policy/v1alpha"
	v2 "github.com/wso2/api-platform/sdk/gateway/policy/v2alpha"
)

// v2AlphaAdapter wraps a v2alpha.Policy so that it satisfies v1alpha.Policy.
// The kernel works exclusively with v1alpha.Policy; this adapter is the bridge
// that lets v2alpha policies participate in the existing chain machinery.
//
// Mode() is computed from whichever sub-interfaces the wrapped policy implements.
// OnRequest/OnResponse dispatch to the appropriate sub-interfaces, bridging the
// context and action types where necessary.
type v2AlphaAdapter struct {
	impl v2.Policy
}

// newV2AlphaAdapter wraps a v2alpha.Policy in an adapter that satisfies v1alpha.Policy.
func newV2AlphaAdapter(impl v2.Policy) v1.Policy {
	return &v2AlphaAdapter{impl: impl}
}

// Unwrap returns the underlying v2alpha.Policy instance.
// Used by the kernel when it needs direct access to v2alpha sub-interfaces
// (e.g., for streaming dispatch).
func (a *v2AlphaAdapter) Unwrap() v2.Policy {
	return a.impl
}

// Mode computes the ProcessingMode by inspecting which v2alpha sub-interfaces
// the wrapped policy implements.
func (a *v2AlphaAdapter) Mode() v1.ProcessingMode {
	mode := v1.ProcessingMode{}
	if _, ok := a.impl.(v2.RequestHeaderPolicy); ok {
		mode.RequestHeaderMode = v1.HeaderModeProcess
	}
	if _, ok := a.impl.(v2.ResponseHeaderPolicy); ok {
		mode.ResponseHeaderMode = v1.HeaderModeProcess
	}
	if _, ok := a.impl.(v2.RequestPolicy); ok {
		mode.RequestBodyMode = v1.BodyModeBuffer
	}
	if _, ok := a.impl.(v2.ResponsePolicy); ok {
		mode.ResponseBodyMode = v1.BodyModeBuffer
	}
	return mode
}

// OnRequest dispatches to the v2alpha sub-interfaces appropriate for the
// request phase. RequestHeaderPolicy runs first (header mutations), then
// RequestPolicy (body mutations). Their results are merged.
//
// v2alpha policies do not receive params — they consume all configuration
// once inside GetPolicy. The params argument is intentionally ignored.
func (a *v2AlphaAdapter) OnRequest(ctx *v1.RequestContext, _ map[string]interface{}) v1.RequestAction {
	result := v1.UpstreamRequestModifications{}

	if rhp, ok := a.impl.(v2.RequestHeaderPolicy); ok {
		headerCtx := requestContextToHeaderContext(ctx)
		switch action := rhp.OnRequestHeaders(headerCtx).(type) {
		case *v1.ImmediateResponse:
			return action
		case v1.ImmediateResponse:
			return &action
		case v1.UpstreamRequestHeaderModifications:
			result.Header = &action
		case *v1.UpstreamRequestHeaderModifications:
			result.Header = action
		}
	}

	if rp, ok := a.impl.(v2.RequestPolicy); ok && ctx.Body != nil && ctx.Body.Present {
		switch action := rp.OnRequestBody(ctx).(type) {
		case *v1.ImmediateResponse:
			return action
		case v1.ImmediateResponse:
			return &action
		case v1.UpstreamRequestModifications:
			mergeRequestMods(&result, &action)
		case *v1.UpstreamRequestModifications:
			mergeRequestMods(&result, action)
		}
	}

	return &result
}

// OnResponse dispatches to the v2alpha sub-interfaces appropriate for the
// response phase. ResponseHeaderPolicy runs first, then ResponsePolicy.
func (a *v2AlphaAdapter) OnResponse(ctx *v1.ResponseContext, _ map[string]interface{}) v1.ResponseAction {
	result := v1.DownstreamResponseModifications{}

	if rhp, ok := a.impl.(v2.ResponseHeaderPolicy); ok {
		headerCtx := responseContextToHeaderContext(ctx)
		switch action := rhp.OnResponseHeaders(headerCtx).(type) {
		case *v1.ImmediateResponse:
			return action
		case v1.ImmediateResponse:
			return &action
		case v1.DownstreamResponseHeaderModifications:
			result.Header = &action
		case *v1.DownstreamResponseHeaderModifications:
			result.Header = action
		}
	}

	if rp, ok := a.impl.(v2.ResponsePolicy); ok && ctx.ResponseBody != nil && ctx.ResponseBody.Present {
		switch action := rp.OnResponseBody(ctx).(type) {
		case *v1.ImmediateResponse:
			return action
		case v1.ImmediateResponse:
			return &action
		case v1.DownstreamResponseModifications:
			mergeResponseMods(&result, &action)
		case *v1.DownstreamResponseModifications:
			mergeResponseMods(&result, action)
		}
	}

	return &result
}

// ─── Context bridge helpers ───────────────────────────────────────────────────

func requestContextToHeaderContext(ctx *v1.RequestContext) *v1.RequestHeaderContext {
	return &v1.RequestHeaderContext{
		SharedContext: ctx.SharedContext,
		Headers:       ctx.Headers,
		Path:          ctx.Path,
		Method:        ctx.Method,
		Authority:     ctx.Authority,
		Scheme:        ctx.Scheme,
		Vhost:         ctx.Vhost,
	}
}

func responseContextToHeaderContext(ctx *v1.ResponseContext) *v1.ResponseHeaderContext {
	return &v1.ResponseHeaderContext{
		SharedContext:   ctx.SharedContext,
		RequestHeaders:  ctx.RequestHeaders,
		RequestBody:     ctx.RequestBody,
		RequestPath:     ctx.RequestPath,
		RequestMethod:   ctx.RequestMethod,
		ResponseHeaders: ctx.ResponseHeaders,
		ResponseStatus:  ctx.ResponseStatus,
	}
}

// ─── Action merge helpers ─────────────────────────────────────────────────────

// mergeRequestMods applies src's fields onto dst, with src taking precedence.
func mergeRequestMods(dst, src *v1.UpstreamRequestModifications) {
	if src.Body != nil {
		dst.Body = src.Body
	}
	if src.Header != nil {
		dst.Header = src.Header
	}
	if src.Path != nil {
		dst.Path = src.Path
	}
	if src.Method != nil {
		dst.Method = src.Method
	}
	if src.UpstreamName != nil {
		dst.UpstreamName = src.UpstreamName
	}
	if len(src.QueryParametersToAdd) > 0 {
		dst.QueryParametersToAdd = src.QueryParametersToAdd
	}
	if len(src.QueryParametersToRemove) > 0 {
		dst.QueryParametersToRemove = src.QueryParametersToRemove
	}
	if len(src.AnalyticsMetadata) > 0 {
		dst.AnalyticsMetadata = src.AnalyticsMetadata
	}
	if len(src.DynamicMetadata) > 0 {
		dst.DynamicMetadata = src.DynamicMetadata
	}
}

// mergeResponseMods applies src's fields onto dst, with src taking precedence.
func mergeResponseMods(dst, src *v1.DownstreamResponseModifications) {
	if src.Body != nil {
		dst.Body = src.Body
	}
	if src.StatusCode != nil {
		dst.StatusCode = src.StatusCode
	}
	if src.Header != nil {
		dst.Header = src.Header
	}
	if len(src.AnalyticsMetadata) > 0 {
		dst.AnalyticsMetadata = src.AnalyticsMetadata
	}
	if len(src.DynamicMetadata) > 0 {
		dst.DynamicMetadata = src.DynamicMetadata
	}
}
