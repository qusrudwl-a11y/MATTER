export type Bindings = {
  DB: D1Database
  R2: R2Bucket
  OPENAI_API_KEY: string
  OPENAI_BASE_URL: string
}

export type Variables = {
  userId: number
  userCompany: string
  userName: string
  userPosition: string
  userPhone: string
}

export type AppEnv = {
  Bindings: Bindings
  Variables: Variables
}
