const CRISIS_PATTERNS: RegExp[] = [
  /\bsj[äa]lvmord/i,
  /\bta\s+(mitt|sitt)\s+liv\b/i,
  /\bdöda?\s+mig\b/i,
  /\borka(r)?\s+inte\s+(leva|mer)\b/i,
  /\bvill\s+inte\s+leva\b/i,
  /\bskada\s+mig\s+sj[äa]lv/i,
  /\bsk[äa]ra\s+mig\b/i,
  /\bsuicid/i,
]

export function detectCrisis(text: string | null | undefined): boolean {
  if (!text) return false
  return CRISIS_PATTERNS.some((re) => re.test(text))
}

export const CRISIS_FALLBACK_SV = `Det du skriver låter tungt. Om du har tankar på att skada dig själv eller inte vill leva — ring 112 vid akut fara, eller 1177 för vårdrådgivning. Mind Självmordslinjen når du på 90101 (chatt: mind.se).`

const NEGATIVE_HINTS: RegExp[] = [
  /\bjag\s+(är|känner mig)\s+(värdelös|misslyckad|hopplös|dum|äcklig)/i,
  /\b(hat|hatar)\s+mig\s+sj[äa]lv\b/i,
  /\binget\s+(blir|går)\s+bra\b/i,
  /\b(kan|orkar)\s+inte\s+(göra\s+något|mer|alls)\b/i,
  /\balltid\s+(fel|misslyckas)\b/i,
]

export function looksSelfCritical(text: string | null | undefined): boolean {
  if (!text || text.trim().length < 8) return false
  return NEGATIVE_HINTS.some((re) => re.test(text))
}
