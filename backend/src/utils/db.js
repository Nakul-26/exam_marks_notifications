const asTrimmedString = (value) =>
  typeof value === 'string' ? value.trim() : ''

export const getMongoConnectionConfig = () => {
  const mongoUri = asTrimmedString(process.env.MONGO_URI)
  const mongoDbName = asTrimmedString(process.env.MONGO_DB_NAME)

  if (!mongoUri) {
    throw new Error('MONGO_URI is required')
  }

  if (!mongoDbName) {
    throw new Error('MONGO_DB_NAME is required')
  }

  return {
    mongoUri,
    mongoOptions: {
      dbName: mongoDbName,
    },
  }
}
