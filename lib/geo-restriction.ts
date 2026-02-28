export const DEFAULT_GEO_RESTRICTION_SETTINGS = {
  pakistanOnly: true,
}

function asRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

export function extractGeoRestrictionSettings(testSettings: unknown) {
  const root = asRecord(testSettings)
  const source = asRecord(root.geoRestriction)
  const legacyRegionSource = asRecord(root.regionRestriction)

  const pakistanOnlyCandidate =
    source.pakistanOnly ??
    legacyRegionSource.pakistanOnly ??
    root.pakistanOnly ??
    root.pakistanOnlyAccess

  return {
    pakistanOnly:
      typeof pakistanOnlyCandidate === 'boolean'
        ? pakistanOnlyCandidate
        : DEFAULT_GEO_RESTRICTION_SETTINGS.pakistanOnly,
  }
}
