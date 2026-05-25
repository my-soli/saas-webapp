import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const url = request.nextUrl.searchParams.get("url");
    const filename = request.nextUrl.searchParams.get("filename") || "download";

    if (!url) {
        return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }

    try {
        const upstream = await fetch(url);
        if (!upstream.ok) {
            return NextResponse.json({ error: "File not found" }, { status: 404 });
        }

        const contentType = upstream.headers.get("Content-Type") || "application/octet-stream";
        const buffer = await upstream.arrayBuffer();

        return new NextResponse(buffer, {
            headers: {
                "Content-Type": contentType,
                "Content-Disposition": `attachment; filename="${filename.replace(/"/g, '\\"')}"`,
                "Cache-Control": "no-store",
            },
        });
    } catch {
        return NextResponse.json({ error: "Download failed" }, { status: 500 });
    }
}
