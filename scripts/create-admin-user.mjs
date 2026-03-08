#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import bcrypt from "bcryptjs"
import { PrismaClient } from "@prisma/client"

loadEnvFile(".env.local")
loadEnvFile(".env")

const args = parseArgs(process.argv.slice(2))
const email = args.email || process.env.ADMIN_EMAIL || ""
const password = args.password || process.env.ADMIN_PASSWORD || ""
const name = args.name || process.env.ADMIN_NAME || "Admin"
const role = normalizeRole(args.role || process.env.ADMIN_ROLE || "ADMIN")

if (!process.env.DATABASE_URL) {
  console.error("Missing DATABASE_URL. Create .env or .env.local first.")
  process.exit(1)
}

if (!email || !password) {
  console.error("Usage: npm run user:create-admin -- --email admin@example.com --password 'secret123' [--name 'Admin'] [--role ADMIN]")
  process.exit(1)
}

const prisma = new PrismaClient()

try {
  const hashedPassword = await bcrypt.hash(password, 10)
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      password: hashedPassword,
      role,
    },
    create: {
      email,
      name,
      password: hashedPassword,
      role,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  })

  console.log(JSON.stringify({ ok: true, user }, null, 2))
} catch (error) {
  console.error("Failed to create admin user:", error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}

function parseArgs(argv) {
  const parsed = {}

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (!token.startsWith("--")) {
      continue
    }

    const key = token.slice(2)
    const nextValue = argv[index + 1]
    if (!nextValue || nextValue.startsWith("--")) {
      parsed[key] = "1"
      continue
    }

    parsed[key] = nextValue
    index += 1
  }

  return parsed
}

function loadEnvFile(filename) {
  const filepath = path.resolve(process.cwd(), filename)
  if (!fs.existsSync(filepath)) {
    return
  }

  const content = fs.readFileSync(filepath, "utf8")
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) {
      continue
    }

    const separatorIndex = trimmed.indexOf("=")
    if (separatorIndex === -1) {
      continue
    }

    const key = trimmed.slice(0, separatorIndex).trim()
    const rawValue = trimmed.slice(separatorIndex + 1).trim()
    const value = rawValue.replace(/^['"]|['"]$/g, "")

    if (key && !(key in process.env)) {
      process.env[key] = value
    }
  }
}

function normalizeRole(value) {
  const candidate = String(value || "").toUpperCase()
  if (candidate === "EDITOR" || candidate === "VIEWER") {
    return candidate
  }

  return "ADMIN"
}
