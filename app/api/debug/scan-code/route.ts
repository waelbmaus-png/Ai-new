import { NextRequest, NextResponse } from "next/server";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

export async function GET(request: NextRequest) {
  try {
    const findings: Record<string, Array<{ line: number; code: string }>> = {};

    const dirs = [
      { path: "lib/services", name: "Services" },
      { path: "app/api/cron", name: "Cron Jobs" },
      { path: "lib/services", name: "Services" },
    ];

    for (const { path: dirPath, name } of dirs) {
      const fullPath = join(process.cwd(), dirPath);

      try {
        const files = readdirSync(fullPath, { recursive: true });

        for (const file of files) {
          if (typeof file !== "string") continue;
          if (!file.endsWith(".ts") && !file.endsWith(".tsx")) continue;

          const filePath = join(fullPath, file);
          const content = readFileSync(filePath, "utf-8");
          const lines = content.split("\n");

          const matches: Array<{ line: number; code: string }> = [];

          lines.forEach((line, index) => {
            if (line.includes(".on(")) {
              matches.push({
                line: index + 1,
                code: line.trim(),
              });
            }
          });

          if (matches.length > 0) {
            findings[`${name}/${file}`] = matches;
          }
        }
      } catch (e) {
        console.log(`Could not scan ${dirPath}:`, e);
      }
    }

    if (Object.keys(findings).length === 0) {
      return NextResponse.json({
        success: true,
        message: "No .on( patterns found - codebase is clean!",
        findings: {},
      });
    }

    return NextResponse.json({
      success: false,
      message: `Found ${Object.keys(findings).length} files with .on( patterns`,
      findings,
    });
  } catch (error) {
    console.error("[v0] Scan error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
