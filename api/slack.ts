import { sendGPTResponse } from "./chat"

export const config = {
    maxDuration: 30,
}

export async function POST(request: Request) {
    const rawBody = await request.text()
    const body = JSON.parse(rawBody)
    const requestType = body.type

    if (requestType === "url_verification")
        return new Response(body.challenge, { status: 200 })

    if (requestType === "event_callback") {
        const eventType = body.event.type
        if (eventType === "app_mention" || (eventType == "message" && body.event.user == process.env.SLACK_ADMIN_ID)) {
            await sendGPTResponse(body.event)
            return new Response("Success!", { status: 200 })
        }
    }

    return new Response("OK", { status: 200 })
}