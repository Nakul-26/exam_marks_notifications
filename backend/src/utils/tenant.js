const asTrimmedString = (value) =>
  typeof value === 'string' ? value.trim() : ''

const allowLegacyUnscopedData =
  asTrimmedString(process.env.ALLOW_LEGACY_UNSCOPED_DATA).toLowerCase() === 'true'

export const getDefaultCollegeId = () =>
  asTrimmedString(process.env.DEFAULT_COLLEGE_ID) || 'default'

export const resolveCollegeIdFromUser = (user) =>
  asTrimmedString(user?.collegeId) || getDefaultCollegeId()

export const buildCollegeScope = (collegeId) => {
  const effectiveCollegeId = asTrimmedString(collegeId) || getDefaultCollegeId()
  if (allowLegacyUnscopedData) {
    return {
      $or: [{ collegeId: effectiveCollegeId }, { collegeId: { $exists: false } }],
    }
  }
  return { collegeId: effectiveCollegeId }
}

export const withCollegeScope = (collegeId, query = {}) => ({
  ...(Object.keys(query || {}).length
    ? { $and: [query, buildCollegeScope(collegeId)] }
    : buildCollegeScope(collegeId)),
})

export const injectCollegeId = (collegeId, payload = {}) => ({
  ...payload,
  collegeId,
})
