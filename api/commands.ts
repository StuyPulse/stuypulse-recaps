import { WebClient } from "@slack/web-api"

export const config = {
    maxDuration: 30,
}

const slack = new WebClient(process.env.SLACK_BOT_TOKEN)

export async function POST(request: Request) {
    const formData = await request.formData()

    const commandName = formData.get("command")?.toString()
    const prompt = formData.get("text")?.toString().trim()
    console.log(`Command: ${commandName}`)
    console.log(`Argument: ${prompt}`)

    if (!prompt || prompt.length < 50)
        return new Response("Please provide a prompt with at least 50 characters.")

    const user = formData.get("user_id")?.toString()
    const channel = formData.get("channel_id")?.toString() || ""

    await slack.chat.postMessage({
        channel,
        text: `<@${user}> has changed the prompt to ${prompt}`,
    })
    
    return new Response("Success!", { status: 200 })
}