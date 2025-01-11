import { WebClient } from "@slack/web-api"
import { getGPTResponse, generatePromptFromMessage } from "./openai"

const slack = new WebClient(process.env.SLACK_BOT_TOKEN)

type Event = {
    channel: string
    ts: string | null
}

export async function sendGPTResponse(event: Event) {
    const { channel, ts } = event

    try {
        const messages = await fetchMessages()
        const prompts = await generatePromptFromMessage(messages)
        const gptResponse = await getGPTResponse(prompts)

        await slack.chat.postMessage({
            channel,
            text: gptResponse.choices[0].message.content || `<@${process.env.SLACK_ADMIN_ID}> Error: Response from ChatGPT was empty.`,
            ...(ts != null && {thread_ts: ts})
        })
    } catch (error) {
        if (error instanceof Error) {
            await slack.chat.postMessage({
                channel,
                text: `<@${process.env.SLACK_ADMIN_ID}> Error: ${error.message}`,
                ...(ts != null && {thread_ts: ts})
            })
        }
    }
}

async function fetchMessages() {
    const messages: string[] = []

    const recapChannels = process.env.SLACK_RECAP_CHANNELS?.split(" ") || []

    const today = new Date()
    today.setHours(0)
    const oldest = String(Math.floor(today.getTime() / 1000))

    for (let recapChannel of recapChannels) {
        const response = await slack.conversations.history({
            channel: recapChannel,
            oldest,
        })
        
        response.messages?.forEach(message => {
            messages.push(message.text!)
        })
    }

    return messages.join("\n")
}