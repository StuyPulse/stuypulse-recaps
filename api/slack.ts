import { sendGPTResponse } from "./chat"

export const config = {
    maxDuration: 30,
}

export async function POST(request: Request) {
    const body = await request.json()
    const requestType = body.type

    console.log(`Request type: ${requestType}`)
    console.log(`Body: ${body}`)

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