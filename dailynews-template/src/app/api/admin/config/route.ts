import { NextResponse } from 'next/server'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const CONFIG_PATH = join(process.cwd(), 'admin-config.json')

function getDefaults() {
  return {
    AI_API_KEY: process.env.AI_API_KEY || '',
    AI_BASE_URL: process.env.AI_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    AI_MODEL: process.env.AI_MODEL || 'qwen3.6-flash',
  }
}

function readConfig() {
  if (existsSync(CONFIG_PATH)) {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'))
  }
  return getDefaults()
}

function writeConfig(config: Record<string, string>) {
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2))
}

export async function GET() {
  return NextResponse.json(readConfig())
}

export async function PUT(request: Request) {
  const body = await request.json()
  const config = readConfig()
  if (body.AI_API_KEY !== undefined) config.AI_API_KEY = body.AI_API_KEY
  if (body.AI_BASE_URL !== undefined) config.AI_BASE_URL = body.AI_BASE_URL
  if (body.AI_MODEL !== undefined) config.AI_MODEL = body.AI_MODEL
  writeConfig(config)
  return NextResponse.json({ ok: true, config })
}
