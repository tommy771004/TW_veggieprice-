import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

export async function GET() {
  try {
    const localFile = path.join(process.cwd(), 'public', 'data', 'latest-seafood.json')
    const fileContent = await fs.promises.readFile(localFile, 'utf-8')
    const parsed = JSON.parse(fileContent)
    return NextResponse.json(parsed)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '無法取得漁產品行情' },
      { status: 502 }
    )
  }
}
