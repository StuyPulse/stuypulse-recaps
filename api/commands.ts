import { WebClient } from "@slack/web-api"
import { get } from "@vercel/edge-config"

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

    const user = formData.get("user_id")?.toString()
    const channel = formData.get("channel_id")?.toString() || ""

    if (channel != process.env.SLACK_COMMANDS_CHANNEL_ID && user != process.env.SLACK_ADMIN_ID)
        return new Response(`You can only use commands in <@${channel}>.`)

    switch (commandName) {
        case "/changeprompt":
            if (!prompt || prompt.length < 50)
                return new Response("Please provide a prompt with at least 50 characters.")

            await changePrompt(prompt)
        
            await slack.chat.postMessage({
                channel,
                text: `<@${user}> has changed the prompt to:\n${prompt}`,
            })
            break
        case "/getprompt":
            const currentPrompt = await get("prompt")
            await slack.chat.postMessage({
                channel,
                text: `The current prompt is:\n${currentPrompt}`,
            })
            break
    }
}

async function changePrompt(prompt: string) {
    try {
        const updateEdgeConfig = await fetch(
            `https://api.vercel.com/v1/edge-config/${process.env.VERCEL_EDGE_CONFIG_ID}/items`,
            {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    items: [
                        {
                            operation: "update",
                            key: "prompt",
                            value: prompt,
                        },
                    ],
                }),
            },
        )
        const response = await updateEdgeConfig.json()
        console.log(response)

    } catch (error) {
        console.log(error)
    }
}