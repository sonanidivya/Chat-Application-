import "dotenv/config";

export const ENV = {
  PORT: process.env.PORT,
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  NODE_ENV: process.env.NODE_ENV,
  CLIENT_URL: process.env.CLIENT_URL,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
  OPENAI_TEMPERATURE: process.env.OPENAI_TEMPERATURE,
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
  OPENAI_TIMEOUT_MS: process.env.OPENAI_TIMEOUT_MS,
  LUNA_PROVIDER: process.env.LUNA_PROVIDER, // openai | ollama
  OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL, // e.g. http://localhost:11434
  OLLAMA_MODEL: process.env.OLLAMA_MODEL, // e.g. llama3.2:latest
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL, // e.g. gemini-1.5-pro
  GEMINI_BASE_URL: process.env.GEMINI_BASE_URL, // default https://generativelanguage.googleapis.com/v1beta
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM,
  EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  ARCJET_KEY: process.env.ARCJET_KEY,
  ARCJET_ENV: process.env.ARCJET_ENV,
};
