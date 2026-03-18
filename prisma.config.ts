import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config(); // load .env file

export default defineConfig({
  datasource: {
    url: process.env.POSTGRES_URL!,
  },
});
