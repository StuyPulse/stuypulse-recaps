export const config = {
    maxDuration: 30,
}

export async function POST(request: Request) {
    const formData = await request.formData()

    console.log(`Command: ${formData.get("command")}`)

    return new Response("OK", { status: 200 })
}