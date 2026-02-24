const asTrimmedString = (value) =>
  typeof value === 'string' ? value.trim() : ''

export const getDefaultCollegeId = () =>
  asTrimmedString(process.env.DEFAULT_COLLEGE_ID) || 'default'

export const resolveCollegeIdFromUser = (user) =>
  asTrimmedString(user?.collegeId) || getDefaultCollegeId()

export const buildCollegeScope = (collegeId) => ({
  $or: [{ collegeId }, { collegeId: { $exists: false } }],
})

export const withCollegeScope = (collegeId, query = {}) => ({
  ...(Object.keys(query || {}).length
    ? { $and: [query, buildCollegeScope(collegeId)] }
    : buildCollegeScope(collegeId)),
})

export const injectCollegeId = (collegeId, payload = {}) => ({
  ...payload,
  collegeId,
})
